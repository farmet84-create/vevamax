const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const database = require('../database/sqlite');

// ===== GET /api/citas =====
// Obtener todas las citas
router.get('/', async (req, res) => {
  try {
    const { estado, fecha, limite } = req.query;
    let query = 'SELECT * FROM citas WHERE 1=1';
    const params = [];

    if (estado) {
      query += ' AND estado_cita = ?';
      params.push(estado);
    }

    if (fecha) {
      query += ' AND DATE(fecha_cita) = ?';
      params.push(fecha);
    }

    query += ' ORDER BY fecha_cita DESC, hora_inicio ASC';

    if (limite) {
      query += ' LIMIT ?';
      params.push(parseInt(limite));
    }

    const citas = await database.all(query, params);

    res.json({
      success: true,
      data: citas,
      total: citas.length
    });
  } catch (error) {
    logger.error('Error obteniendo citas:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/citas/:id =====
// Obtener una cita específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cita = await database.get(
      'SELECT * FROM citas WHERE id = ?',
      [id]
    );

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      });
    }

    // Obtener notificaciones asociadas
    const notificaciones = await database.all(
      'SELECT * FROM notificaciones WHERE id_cita = ?',
      [id]
    );

    // Obtener respuestas asociadas
    const respuestas = await database.all(
      'SELECT * FROM respuestas WHERE id_cita = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        cita,
        notificaciones,
        respuestas
      }
    });
  } catch (error) {
    logger.error('Error obteniendo cita:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/citas/proximas/24h =====
// Obtener citas próximas a 24 horas
router.get('/proximas/24h', async (req, res) => {
  try {
    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

    const citas = await database.all(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM notificaciones WHERE id_cita = c.id AND estado = 'enviada') as notificaciones_enviadas,
        (SELECT COUNT(*) FROM respuestas WHERE id_cita = c.id) as respuestas_recibidas
      FROM citas c
      WHERE estado_cita != 'Anulado'
      AND datetime(c.fecha_cita || ' ' || c.hora_inicio) 
          BETWEEN datetime(?) AND datetime(?)
      ORDER BY fecha_cita ASC, hora_inicio ASC
    `, [
      ahora.toISOString(),
      en24Horas.toISOString()
    ]);

    res.json({
      success: true,
      data: citas,
      total: citas.length
    });
  } catch (error) {
    logger.error('Error obteniendo citas próximas:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/citas/pendientes/notificacion =====
// Obtener citas pendientes de notificación
router.get('/pendientes/notificacion', async (req, res) => {
  try {
    const citas = await database.all(`
      SELECT c.* FROM citas c
      LEFT JOIN notificaciones n ON c.id = n.id_cita
      WHERE n.id IS NULL
      AND c.estado_cita != 'Anulado'
      ORDER BY c.fecha_cita ASC
    `);

    res.json({
      success: true,
      data: citas,
      total: citas.length
    });
  } catch (error) {
    logger.error('Error obteniendo citas pendientes:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== POST /api/citas/sincronizar =====
// Forzar sincronización manual
router.post('/sincronizar', async (req, res) => {
  try {
    logger.info('Sincronización manual solicitada');

    const scheduler = require('../services/scheduler.service');
    await scheduler.sincronizarCitas();

    res.json({
      success: true,
      message: 'Sincronización iniciada'
    });
  } catch (error) {
    logger.error('Error en sincronización:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
