const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const database = require('../database/sqlite');

// ===== GET /api/dashboard/resumen =====
// Dashboard principal con métricas clave
router.get('/resumen', async (req, res) => {
  try {
    // Citas hoy
    const citasHoy = await database.get(`
      SELECT COUNT(*) as cantidad 
      FROM citas 
      WHERE DATE(fecha_cita) = DATE('now')
      AND estado_cita != 'Anulado'
    `);

    // Citas próximas 7 días
    const citasProximas7Dias = await database.get(`
      SELECT COUNT(*) as cantidad 
      FROM citas 
      WHERE DATE(fecha_cita) BETWEEN DATE('now') AND DATE('now', '+7 days')
      AND estado_cita != 'Anulado'
    `);

    // Notificaciones enviadas hoy
    const notificacionesHoy = await database.get(`
      SELECT COUNT(*) as cantidad 
      FROM notificaciones 
      WHERE DATE(fecha_envio) = DATE('now')
      AND estado = 'enviada'
    `);

    // Respuestas recibidas hoy
    const respuestasHoy = await database.get(`
      SELECT COUNT(*) as cantidad 
      FROM respuestas 
      WHERE DATE(timestamp_respuesta) = DATE('now')
    `);

    // Tasa de confirmación
    const tasaConfirmacion = await database.get(`
      SELECT 
        ROUND(
          SUM(CASE WHEN tipo_respuesta = 'si_confirmo' THEN 1 ELSE 0 END) * 100.0 / 
          COUNT(*), 2
        ) as porcentaje
      FROM respuestas
      WHERE DATE(timestamp_respuesta) = DATE('now')
    `);

    // Últimas sincronizaciones
    const ultimasSincronizaciones = await database.all(`
      SELECT * FROM sincronizaciones
      ORDER BY fecha_sync DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        hoy: {
          citasHoy: citasHoy?.cantidad || 0,
          notificacionesEnviadas: notificacionesHoy?.cantidad || 0,
          respuestasRecibidas: respuestasHoy?.cantidad || 0,
          tasaConfirmacion: tasaConfirmacion?.porcentaje || 0
        },
        proximos7Dias: {
          citasPendientes: citasProximas7Dias?.cantidad || 0
        },
        ultimasSincronizaciones: ultimasSincronizaciones || []
      }
    });
  } catch (error) {
    logger.error('Error obteniendo resumen:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/dashboard/citas-por-estado =====
// Distribución de citas por estado
router.get('/citas-por-estado', async (req, res) => {
  try {
    const citasPorEstado = await database.all(`
      SELECT 
        estado_cita as estado,
        COUNT(*) as cantidad
      FROM citas
      WHERE DATE(fecha_cita) >= DATE('now', '-30 days')
      GROUP BY estado_cita
      ORDER BY cantidad DESC
    `);

    res.json({
      success: true,
      data: citasPorEstado
    });
  } catch (error) {
    logger.error('Error obteniendo citas por estado:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/dashboard/respuestas-por-tipo =====
// Distribución de respuestas
router.get('/respuestas-por-tipo', async (req, res) => {
  try {
    const respuestasPorTipo = await database.all(`
      SELECT 
        tipo_respuesta as tipo,
        COUNT(*) as cantidad
      FROM respuestas
      WHERE DATE(timestamp_respuesta) >= DATE('now', '-30 days')
      GROUP BY tipo_respuesta
      ORDER BY cantidad DESC
    `);

    res.json({
      success: true,
      data: respuestasPorTipo
    });
  } catch (error) {
    logger.error('Error obteniendo respuestas por tipo:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/dashboard/citas-sin-respuesta =====
// Citas que enviaron notificación pero sin respuesta
router.get('/citas-sin-respuesta', async (req, res) => {
  try {
    const citasSinRespuesta = await database.all(`
      SELECT 
        c.id,
        c.id_medilink2,
        c.nombre_paciente,
        c.telefono_whatsapp,
        c.fecha_cita,
        c.hora_inicio,
        c.nombre_profesional,
        n.fecha_envio,
        CAST((julianday('now') - julianday(n.fecha_envio)) * 24 AS INTEGER) as horas_sin_respuesta
      FROM citas c
      JOIN notificaciones n ON c.id = n.id_cita
      LEFT JOIN respuestas r ON n.id = r.id_notificacion
      WHERE r.id IS NULL
      AND n.estado = 'enviada'
      AND DATE(c.fecha_cita) >= DATE('now')
      ORDER BY horas_sin_respuesta DESC
    `);

    res.json({
      success: true,
      data: citasSinRespuesta,
      total: citasSinRespuesta.length
    });
  } catch (error) {
    logger.error('Error obteniendo citas sin respuesta:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/dashboard/performance =====
// Métricas de performance
router.get('/performance', async (req, res) => {
  try {
    const ultimosDias = 30;

    // Citas creadas por día
    const citasPorDia = await database.all(`
      SELECT 
        DATE(fecha_cita) as fecha,
        COUNT(*) as cantidad
      FROM citas
      WHERE DATE(fecha_cita) >= DATE('now', '-${ultimosDias} days')
      GROUP BY DATE(fecha_cita)
      ORDER BY fecha ASC
    `);

    // Notificaciones enviadas por día
    const notificacionesPorDia = await database.all(`
      SELECT 
        DATE(fecha_envio) as fecha,
        COUNT(*) as cantidad
      FROM notificaciones
      WHERE DATE(fecha_envio) >= DATE('now', '-${ultimosDias} days')
      GROUP BY DATE(fecha_envio)
      ORDER BY fecha ASC
    `);

    // Respuestas recibidas por día
    const respuestasPorDia = await database.all(`
      SELECT 
        DATE(timestamp_respuesta) as fecha,
        COUNT(*) as cantidad
      FROM respuestas
      WHERE DATE(timestamp_respuesta) >= DATE('now', '-${ultimosDias} days')
      GROUP BY DATE(timestamp_respuesta)
      ORDER BY fecha ASC
    `);

    res.json({
      success: true,
      data: {
        citasPorDia,
        notificacionesPorDia,
        respuestasPorDia
      }
    });
  } catch (error) {
    logger.error('Error obteniendo performance:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== GET /api/dashboard/salud-sistema =====
// Estado de salud del sistema
router.get('/salud-sistema', async (req, res) => {
  try {
    const ultimaSincronizacion = await database.get(`
      SELECT * FROM sincronizaciones
      ORDER BY fecha_sync DESC
      LIMIT 1
    `);

    const sincronizacionesExitosas = await database.get(`
      SELECT COUNT(*) as cantidad
      FROM sincronizaciones
      WHERE estado = 'exitosa'
      AND DATE(fecha_sync) = DATE('now')
    `);

    const erroresRecientes = await database.all(`
      SELECT * FROM sincronizaciones
      WHERE estado = 'error'
      ORDER BY fecha_sync DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        ultimaSincronizacion: ultimaSincronizacion || {},
        sincronizacionesExitosasHoy: sincronizacionesExitosas?.cantidad || 0,
        erroresRecientes: erroresRecientes || [],
        estado: ultimaSincronizacion?.estado === 'exitosa' ? 'operativo' : 'con_problemas'
      }
    });
  } catch (error) {
    logger.error('Error obteniendo salud del sistema:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
