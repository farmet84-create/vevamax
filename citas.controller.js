const logger = require('../utils/logger');
const database = require('../database/sqlite');
const medilinkService = require('../services/medilink.service');
const chaticoService = require('../services/chatico.service');

module.exports = {
  async obtenerProximas(req, res) {
    try {
      const horas = parseInt(req.query.horas) || 24;
      logger.info(`Obteniendo citas próximas en ${horas} horas...`);
      const citas = await medilinkService.obtenerCitas();
      res.json({ success: true, total: citas.length, data: citas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async sincronizar(req, res) {
    try {
      logger.info('Sincronizando citas manualmente...');
      const citas = await medilinkService.obtenerCitas();
      let sincronizadas = 0;

      for (const cita of citas) {
        try {
          await database.run(`
            INSERT OR REPLACE INTO citas (
              id_cita, id_paciente, nombre_paciente, apellidos_paciente,
              telefono, email, fecha, hora_inicio, nombre_profesional, sede, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            cita.id_cita, cita.id_paciente, cita.nombre_paciente, cita.apellidos_paciente || '',
            cita.telefono || '', cita.email || '', cita.fecha, cita.hora_inicio || cita.inicio,
            cita.nombre_profesional || '', cita.sede || 'Principal', cita.estado || 'Pendiente',
          ]);
          sincronizadas++;
        } catch (err) {
          logger.error(`Error sincronizando cita #${cita.id_cita}`);
        }
      }

      res.json({
        success: true,
        message: 'Sincronización completada',
        total_citas: citas.length,
        sincronizadas: sincronizadas,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async enviarNotificacion(req, res) {
    try {
      const { id_cita } = req.params;
      logger.info(`Enviando notificación para cita #${id_cita}...`);

      const cita = await database.get('SELECT * FROM citas WHERE id_cita = ?', [id_cita]);

      if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
      if (!cita.telefono) return res.status(400).json({ error: 'Cita sin teléfono' });

      await chaticoService.enviarNotificacionCita(cita);
      await database.run(
        'UPDATE citas SET notificacion_enviada = 1, notificacion_timestamp = datetime("now") WHERE id_cita = ?',
        [id_cita]
      );

      res.json({
        success: true,
        message: 'Notificación enviada',
        id_cita: id_cita,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async confirmar(req, res) {
    try {
      const { id_cita } = req.params;
      await database.run(
        'UPDATE citas SET confirmado = 1, confirmado_timestamp = datetime("now"), estado = ? WHERE id_cita = ?',
        ['Confirmado', id_cita]
      );
      await medilinkService.confirmarCita(id_cita);
      res.json({ success: true, message: 'Cita confirmada', id_cita });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async cancelar(req, res) {
    try {
      const { id_cita } = req.params;
      const { razon } = req.body;

      await database.run(
        'UPDATE citas SET cancelado = 1, cancelado_timestamp = datetime("now"), estado = ? WHERE id_cita = ?',
        ['Anulado', id_cita]
      );
      await medilinkService.anularCita(id_cita, razon || 'Cancelado');

      res.json({ success: true, message: 'Cita cancelada', id_cita });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerDetalle(req, res) {
    try {
      const { id_cita } = req.params;
      const cita = await database.get('SELECT * FROM citas WHERE id_cita = ?', [id_cita]);

      if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

      const respuestas = await database.all(
        'SELECT * FROM respuestas WHERE id_cita = ? ORDER BY created_at DESC',
        [id_cita]
      );

      res.json({ success: true, data: { ...cita, respuestas } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
