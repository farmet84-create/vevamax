const logger = require('../utils/logger');
const database = require('../database/sqlite');
const medilinkService = require('../services/medilink.service');

module.exports = {
  async recibirRespuesta(req, res) {
    try {
      logger.info('🔔 Webhook recibido de Chatico');
      logger.info('📋 Body:', JSON.stringify(req.body));

      const { phone, message, id_cita } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Teléfono no proporcionado' });
      }

      const respuesta = message?.toLowerCase() || '';
      let tipoRespuesta = 'desconocida';
      let accion = null;

      if (respuesta.includes('sí') || respuesta.includes('si') || respuesta.includes('confirmo')) {
        tipoRespuesta = 'confirmado';
        accion = 'confirmar';
      } else if (respuesta.includes('no') || respuesta.includes('cancelar')) {
        tipoRespuesta = 'cancelado';
        accion = 'cancelar';
      } else if (respuesta.includes('reprogra') || respuesta.includes('otro')) {
        tipoRespuesta = 'reprogramar';
        accion = 'reprogramar';
      }

      const cita = await database.get(
        'SELECT * FROM citas WHERE telefono = ? ORDER BY fecha DESC LIMIT 1',
        [phone]
      );

      if (!cita) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      await database.run(
        'INSERT INTO respuestas (id_cita, telefono, tipo_respuesta, contenido) VALUES (?, ?, ?, ?)',
        [cita.id_cita, phone, tipoRespuesta, message]
      );

      if (accion === 'confirmar') {
        await database.run(
          'UPDATE citas SET confirmado = 1, confirmado_timestamp = datetime("now"), estado = ? WHERE id_cita = ?',
          ['Confirmado por paciente vía WhatsApp', cita.id_cita]
        );
        try {
          await medilinkService.confirmarCita(cita.id_cita);
        } catch (err) {
          logger.error(`Error confirmando en Medilink2: ${err.message}`);
        }
      } else if (accion === 'cancelar') {
        await database.run(
          'UPDATE citas SET cancelado = 1, cancelado_timestamp = datetime("now"), estado = ? WHERE id_cita = ?',
          ['Anulado', cita.id_cita]
        );
        try {
          await medilinkService.anularCita(cita.id_cita);
        } catch (err) {
          logger.error(`Error anulando en Medilink2: ${err.message}`);
        }
      }

      res.json({
        success: true,
        message: 'Respuesta procesada correctamente',
        tipo_respuesta: tipoRespuesta,
        id_cita: cita.id_cita,
        timestamp: new Date().toISOString(),
      });

      logger.info(`✅ Respuesta procesada exitosamente`);
    } catch (error) {
      logger.error('Error procesando webhook:', error.message);
      res.status(500).json({ error: 'Error al procesar respuesta' });
    }
  },

  test(req, res) {
    res.json({
      message: '✅ Webhook funciona correctamente',
      timestamp: new Date().toISOString(),
    });
  }
};
