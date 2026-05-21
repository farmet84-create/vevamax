const logger = require('../utils/logger');
const database = require('../database/sqlite');

module.exports = {
  async obtenerResumen(req, res) {
    try {
      const stats = await database.get(`
        SELECT
          COUNT(*) as total_citas,
          SUM(CASE WHEN notificacion_enviada = 1 THEN 1 ELSE 0 END) as notificaciones_enviadas,
          SUM(CASE WHEN confirmado = 1 THEN 1 ELSE 0 END) as citas_confirmadas,
          SUM(CASE WHEN cancelado = 1 THEN 1 ELSE 0 END) as citas_canceladas
        FROM citas
      `);

      const respuestas = await database.all(`
        SELECT tipo_respuesta, COUNT(*) as total 
        FROM respuestas 
        GROUP BY tipo_respuesta
      `);

      res.json({ success: true, data: { stats, respuestas } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerEstadisticas(req, res) {
    try {
      const stats = await database.get(`SELECT COUNT(*) as total FROM citas`);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerCitas(req, res) {
    try {
      const citas = await database.all('SELECT * FROM citas ORDER BY fecha DESC');
      res.json({ success: true, total: citas.length, data: citas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerPendientes(req, res) {
    try {
      const citas = await database.all(`
        SELECT * FROM citas 
        WHERE notificacion_enviada = 0 
        ORDER BY fecha ASC
      `);
      res.json({ success: true, total: citas.length, data: citas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerNotificaciones(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const notificaciones = await database.all(`
        SELECT n.*, c.nombre_paciente, c.telefono 
        FROM notificaciones n
        JOIN citas c ON n.id_cita = c.id_cita
        ORDER BY n.created_at DESC
        LIMIT ?
      `, [limit]);
      res.json({ success: true, data: notificaciones });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerRespuestas(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const respuestas = await database.all(`
        SELECT r.*, c.nombre_paciente, c.telefono 
        FROM respuestas r
        JOIN citas c ON r.id_cita = c.id_cita
        ORDER BY r.created_at DESC
        LIMIT ?
      `, [limit]);
      res.json({ success: true, data: respuestas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerLogs(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const logs = await database.all(`
        SELECT * FROM logs 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit]);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
