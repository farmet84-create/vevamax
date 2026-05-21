const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const database = require('../database/sqlite');
const medilinkService = require('../services/medilink.service');

// ===== POST /api/webhooks/chatico =====
// Recibir respuesta del flujo de Chatico cuando el paciente responde
router.post('/chatico', async (req, res) => {
  try {
    const { 
      id_contacto,
      telefono,
      respuesta_usuario,
      timestamp_respuesta,
      id_campo_respuesta,
      metadata
    } = req.body;

    logger.info('📥 Webhook recibido de Chatico', {
      telefono,
      respuesta: respuesta_usuario,
      timestamp: timestamp_respuesta
    });

    // Validar datos básicos
    if (!respuesta_usuario) {
      return res.status(400).json({
        success: false,
        message: 'Respuesta del usuario vacía'
      });
    }

    // Mapear respuesta a nuestro tipo
    const tipoRespuesta = mapearRespuesta(respuesta_usuario);
    
    // Obtener el ID de cita de medilink2 desde metadata o campos
    const idCitaMedilink2 = extraerIdCitaDeMedilink(metadata);

    if (!idCitaMedilink2) {
      logger.warn('No se pudo extraer ID de cita de Medilink2', { metadata });
      return res.status(400).json({
        success: false,
        message: 'No se pudo identificar la cita'
      });
    }

    // Buscar la cita en BD
    const cita = await database.get(
      'SELECT id FROM citas WHERE id_medilink2 = ?',
      [idCitaMedilink2]
    );

    if (!cita) {
      logger.warn(`Cita ${idCitaMedilink2} no encontrada en BD`);
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Buscar la notificación
    const notificacion = await database.get(
      'SELECT id FROM notificaciones WHERE id_cita = ? ORDER BY created_at DESC LIMIT 1',
      [cita.id]
    );

    if (!notificacion) {
      logger.warn(`No hay notificación registrada para cita ${cita.id}`);
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Registrar respuesta en BD
    const respuestaId = await database.run(`
      INSERT INTO respuestas (
        id_notificacion,
        id_cita,
        tipo_respuesta,
        respuesta_usuario,
        timestamp_respuesta
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      notificacion.id,
      cita.id,
      tipoRespuesta,
      respuesta_usuario,
      timestamp_respuesta || new Date().toISOString()
    ]);

    logger.info(`✅ Respuesta registrada: ${tipoRespuesta}`, {
      respuestaId: respuestaId.id,
      citaId: cita.id,
      idMedilink: idCitaMedilink2
    });

    // Procesar respuesta según tipo
    let estadoMedilink2 = null;
    let comentario = '';

    switch (tipoRespuesta) {
      case 'si_confirmo':
        estadoMedilink2 = 'Confirmado por paciente vía WhatsApp';
        comentario = 'Confirmación recibida vía WhatsApp';
        break;
      case 'cancelar':
        estadoMedilink2 = 'Anulado';
        comentario = 'Cita cancelada por paciente vía WhatsApp';
        break;
      case 'reprogramar':
        estadoMedilink2 = 'Pendiente';
        comentario = 'Paciente solicitó reprogramación vía WhatsApp';
        break;
      default:
        logger.warn(`Tipo de respuesta desconocida: ${tipoRespuesta}`);
    }

    // Actualizar estado en Medilink2
    if (estadoMedilink2) {
      try {
        await medilinkService.actualizarEstadoCita(
          idCitaMedilink2,
          estadoMedilink2,
          comentario
        );

        // Registrar actualización en BD
        await database.run(`
          UPDATE respuestas SET
            procesada = 1,
            estado_actualizado = ?,
            fecha_actualizacion_medilink2 = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [estadoMedilink2, respuestaId.id]);

        logger.info(`✅ Estado de Medilink2 actualizado: ${estadoMedilink2}`);
      } catch (error) {
        logger.error(`Error actualizando Medilink2: ${error.message}`);
        
        // Registrar error
        await database.run(`
          UPDATE respuestas SET
            error_actualizacion = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [error.message, respuestaId.id]);

        return res.status(500).json({
          success: false,
          message: 'Error actualizando estado en Medilink2',
          error: error.message
        });
      }
    }

    // Responder a Chatico
    res.json({
      success: true,
      message: 'Respuesta procesada correctamente',
      data: {
        respuestaId: respuestaId.id,
        tipoRespuesta,
        estadoMedilink2,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error procesando webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== FUNCIONES AUXILIARES =====

function mapearRespuesta(respuesta) {
  const respuestaLower = respuesta?.toLowerCase().trim() || '';

  if (respuestaLower.includes('si') || respuestaLower.includes('confirmo') || respuestaLower === 'si confirmo') {
    return 'si_confirmo';
  } else if (respuestaLower.includes('no') || respuestaLower.includes('cancela') || respuestaLower === 'cancelar cita') {
    return 'cancelar';
  } else if (respuestaLower.includes('reprograma') || respuestaLower === 'reprogramar') {
    return 'reprogramar';
  }

  return 'desconocida';
}

function extraerIdCitaDeMedilink(metadata) {
  // Intenta extraer el ID de diferentes formas
  if (metadata?.id_cita_medilink2) {
    return metadata.id_cita_medilink2;
  }
  
  if (metadata?.Campo_05) {
    return parseInt(metadata.Campo_05);
  }

  // Si está en los datos del contacto
  if (metadata?.custom_fields?.id_cita_medilink2) {
    return metadata.custom_fields.id_cita_medilink2;
  }

  return null;
}

module.exports = router;
