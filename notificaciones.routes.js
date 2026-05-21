const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const database = require('../database/sqlite');
const chaticoService = require('../services/chatico.service');

// ===== GET /api/notificaciones =====
// Obtener todas las notificaciones
router.get('/', async (req, res) => {
  try {
    const { estado, limite } = req.query;
    let query = `
      SELECT n.*, c.nombre_paciente, c.telefono_whatsapp, c.fecha_cita
      FROM notificaciones n
      JOIN citas c ON n.id_cita = c.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ' AND n.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY n.created_at DESC';

    if (limite) {
      query += ' LIMIT ?';
      params.push(parseInt(limite));
    }

    const notificaciones = await database.all(query, params);

    res.json({
      success: true,
      data: notificaciones,
      total: notificaciones.length
    });
  } catch (error) {
    logger.error('Error obteniendo notificaciones:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/notificaciones/:id =====
// Obtener una notificación específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notificacion = await database.get(
      'SELECT * FROM notificaciones WHERE id = ?',
      [id]
    );

    if (!notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    // Obtener respuestas asociadas
    const respuestas = await database.all(
      'SELECT * FROM respuestas WHERE id_notificacion = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        notificacion,
        respuestas
      }
    });
  } catch (error) {
    logger.error('Error obteniendo notificación:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/notificaciones/pendientes =====
// Obtener notificaciones pendientes
router.get('/estado/pendientes', async (req, res) => {
  try {
    const notificaciones = await database.all(`
      SELECT n.*, c.nombre_paciente, c.telefono_whatsapp
      FROM notificaciones n
      JOIN citas c ON n.id_cita = c.id
      WHERE n.estado IN ('pendiente', 'error')
      ORDER BY n.created_at ASC
    `);

    res.json({
      success: true,
      data: notificaciones,
      total: notificaciones.length
    });
  } catch (error) {
    logger.error('Error obteniendo notificaciones pendientes:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== POST /api/notificaciones/enviar-manual =====
// Enviar notificación manual a una cita específica
router.post('/enviar-manual', async (req, res) => {
  try {
    const { id_cita } = req.body;

    if (!id_cita) {
      return res.status(400).json({
        success: false,
        message: 'ID de cita requerido'
      });
    }

    // Obtener cita
    const cita = await database.get(
      'SELECT * FROM citas WHERE id = ?',
      [id_cita]
    );

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Preparar datos para Chatico
    const datosContacto = {
      telefono: cita.telefono_whatsapp,
      email: cita.email,
      nombre_paciente: cita.nombre_paciente,
      apellidos_paciente: cita.apellidos_paciente
    };

    const datosNotificacion = {
      fecha_cita: new Date(cita.fecha_cita).toLocaleDateString('es-CO'),
      hora_cita: cita.hora_inicio,
      sede: cita.sede,
      profesional: cita.nombre_profesional,
      id_cita_medilink2: cita.id_medilink2
    };

    // Enviar a Chatico
    const resultado = await chaticoService.enviarNotificacion(
      datosContacto,
      datosNotificacion
    );

    if (resultado.success) {
      // Registrar notificación
      const notif = await database.run(`
        INSERT INTO notificaciones (
          id_cita,
          id_contacto_chatico,
          estado,
          fecha_envio
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        id_cita,
        resultado.contactId || '',
        'enviada'
      ]);

      res.json({
        success: true,
        message: 'Notificación enviada exitosamente',
        data: {
          notificacionId: notif.id,
          contactId: resultado.contactId
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error enviando notificación',
        error: resultado.error
      });
    }
  } catch (error) {
    logger.error('Error enviando notificación manual:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/notificaciones/estadisticas =====
// Obtener estadísticas de notificaciones
router.get('/estadisticas/resumen', async (req, res) => {
  try {
    const stats = await database.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'enviada' THEN 1 ELSE 0 END) as enviadas,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'error' THEN 1 ELSE 0 END) as con_error
      FROM notificaciones
    `);

    const respuestas = await database.get(`
      SELECT
        COUNT(*) as total_respuestas,
        SUM(CASE WHEN tipo_respuesta = 'si_confirmo' THEN 1 ELSE 0 END) as confirmadas,
        SUM(CASE WHEN tipo_respuesta = 'cancelar' THEN 1 ELSE 0 END) as canceladas,
        SUM(CASE WHEN tipo_respuesta = 'reprogramar' THEN 1 ELSE 0 END) as reprogramadas
      FROM respuestas
    `);

    res.json({
      success: true,
      data: {
        notificaciones: stats,
        respuestas: respuestas
      }
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
