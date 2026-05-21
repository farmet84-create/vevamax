const schedule = require('node-schedule');
const moment = require('moment');
const logger = require('../utils/logger');
const database = require('../database/sqlite');
const medilinkService = require('./medilink.service');
const chaticoService = require('./chatico.service');

const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL_MINUTES) || 5;
const HORAS_ANTES = parseInt(process.env.NOTIFICATION_HOURS_BEFORE) || 24;

const scheduler = {
  jobs: {},

  // ===== INICIAR SCHEDULER =====
  startScheduler: () => {
    logger.info('🕐 Iniciando scheduler de sincronización y notificaciones');

    // Job 1: Sincronizar citas cada X minutos
    scheduler.jobs.syncCitas = schedule.scheduleJob(`*/${SYNC_INTERVAL} * * * *`, async () => {
      try {
        await scheduler.sincronizarCitas();
      } catch (error) {
        logger.error('Error en job de sincronización:', error);
      }
    });

    // Job 2: Enviar notificaciones cada 5 minutos
    scheduler.jobs.enviarNotificaciones = schedule.scheduleJob('*/5 * * * *', async () => {
      try {
        await scheduler.enviarNotificacionesProgramadas();
      } catch (error) {
        logger.error('Error en job de notificaciones:', error);
      }
    });

    logger.info(`✅ Scheduler iniciado`);
    logger.info(`   - Sincronización: cada ${SYNC_INTERVAL} minutos`);
    logger.info(`   - Notificaciones: cada 5 minutos`);
    logger.info(`   - Anticipación: ${HORAS_ANTES} horas antes de cita`);
  },

  // ===== SINCRONIZAR CITAS =====
  sincronizarCitas: async () => {
    const startTime = Date.now();

    try {
      logger.info('🔄 Iniciando sincronización de citas...');

      // Obtener citas próximas de Medilink2 (próximos 2 días)
      const citasMedialink = await medilinkService.obtenerCitasProximas(2);

      if (!citasMedialink || citasMedialink.length === 0) {
        logger.info('ℹ️ No hay citas próximas para sincronizar');
        await registrarSincronizacion(0, 0, 0, 0, 'exitosa');
        return;
      }

      let citasNuevas = 0;
      let citasActualizadas = 0;

      // Procesar cada cita
      for (const cita of citasMedialink) {
        try {
          const citaExistente = await database.get(
            'SELECT id FROM citas WHERE id_medilink2 = ?',
            [cita.id_cita]
          );

          if (citaExistente) {
            // Actualizar cita existente
            await database.run(`
              UPDATE citas SET
                fecha_cita = ?,
                hora_inicio = ?,
                hora_fin = ?,
                nombre_profesional = ?,
                estado_cita = ?,
                comentario = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id_medilink2 = ?
            `, [
              cita.fecha || moment().format('YYYY-MM-DD'),
              cita.hora_inicio || '00:00:00',
              cita.hora_fin || '00:00:00',
              cita.nombre_profesional || 'N/A',
              cita.estado_cita || 'Pendiente',
              cita.comentario || '',
              cita.id_cita
            ]);
            citasActualizadas++;
          } else {
            // Insertar cita nueva
            await database.run(`
              INSERT INTO citas (
                id_medilink2,
                id_paciente,
                nombre_paciente,
                apellidos_paciente,
                telefono_whatsapp,
                email,
                fecha_cita,
                hora_inicio,
                hora_fin,
                nombre_profesional,
                id_profesional,
                sede,
                id_sucursal,
                tipo_atencion,
                comentario,
                estado_cita
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              cita.id_cita,
              cita.id_paciente || 0,
              cita.nombre_paciente || 'N/A',
              cita.apellidos_paciente || '',
              cita.telefono_paciente || '',
              cita.email_paciente || '',
              cita.fecha || moment().format('YYYY-MM-DD'),
              cita.hora_inicio || '00:00:00',
              cita.hora_fin || '00:00:00',
              cita.nombre_profesional || 'N/A',
              cita.id_profesional || 0,
              cita.sede || '',
              cita.id_sucursal || process.env.MEDILINK2_SUCURSAL_ID || 1,
              cita.tipo_atencion || '',
              cita.comentario || '',
              cita.estado_cita || 'Pendiente'
            ]);
            citasNuevas++;
          }
        } catch (error) {
          logger.error(`Error procesando cita ${cita.id_cita}:`, error.message);
        }
      }

      const duracion = Date.now() - startTime;
      await registrarSincronizacion(
        citasMedialink.length,
        citasNuevas,
        citasActualizadas,
        0,
        'exitosa',
        duracion
      );

      logger.info(`✅ Sincronización completada`, {
        citasObtenidas: citasMedialink.length,
        citasNuevas,
        citasActualizadas,
        duracion: `${duracion}ms`
      });
    } catch (error) {
      const duracion = Date.now() - startTime;
      await registrarSincronizacion(0, 0, 0, 0, 'error', duracion, error.message);
      logger.error('❌ Error en sincronización:', error.message);
    }
  },

  // ===== ENVIAR NOTIFICACIONES PROGRAMADAS =====
  enviarNotificacionesProgramadas: async () => {
    try {
      // Buscar citas sin notificación pendiente para las próximas HORAS_ANTES
      const ahora = moment();
      const ventanaInicioHora = HORAS_ANTES - 1; // Enviar entre HORAS_ANTES-1 y HORAS_ANTES
      const ventanaFinHora = HORAS_ANTES;

      const fechaMinima = ahora.clone().add(ventanaInicioHora, 'hours').format('YYYY-MM-DD HH:00:00');
      const fechaMaxima = ahora.clone().add(ventanaFinHora, 'hours').format('YYYY-MM-DD HH:59:59');

      // Obtener citas que necesitan notificación
      const citasPendientes = await database.all(`
        SELECT c.* FROM citas c
        LEFT JOIN notificaciones n ON c.id = n.id_cita
        WHERE n.id IS NULL
        AND c.estado_cita != 'Anulado'
        AND datetime(c.fecha_cita || ' ' || c.hora_inicio) 
            BETWEEN datetime(?) AND datetime(?)
      `, [fechaMinima, fechaMaxima]);

      if (citasPendientes.length === 0) {
        logger.debug('ℹ️ No hay notificaciones pendientes en este momento');
        return;
      }

      logger.info(`📢 Encontradas ${citasPendientes.length} citas para notificar`);

      for (const cita of citasPendientes) {
        try {
          // Preparar datos para Chatico
          const datosContacto = {
            telefono: cita.telefono_whatsapp,
            email: cita.email,
            nombre_paciente: cita.nombre_paciente,
            apellidos_paciente: cita.apellidos_paciente
          };

          const datosNotificacion = {
            fecha_cita: moment(cita.fecha_cita).format('DD/MM/YYYY'),
            hora_cita: cita.hora_inicio,
            sede: cita.sede,
            profesional: cita.nombre_profesional,
            id_cita_medilink2: cita.id_medilink2
          };

          // Enviar notificación a Chatico
          const resultado = await chaticoService.enviarNotificacion(
            datosContacto,
            datosNotificacion
          );

          if (resultado.success) {
            // Registrar notificación en BD
            const notif = await database.run(`
              INSERT INTO notificaciones (
                id_cita,
                id_contacto_chatico,
                estado,
                fecha_envio
              ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              cita.id,
              resultado.contactId || '',
              'enviada'
            ]);

            logger.info(`✅ Notificación registrada para cita ${cita.id_medilink2}`);
          } else {
            // Registrar intento fallido
            await database.run(`
              INSERT INTO notificaciones (
                id_cita,
                estado,
                ultimo_error,
                intentos_envio
              ) VALUES (?, ?, ?, 1)
            `, [
              cita.id,
              'pendiente',
              resultado.error || 'Error desconocido'
            ]);

            logger.warn(`⚠️ Fallo en notificación para cita ${cita.id_medilink2}`);
          }
        } catch (error) {
          logger.error(`Error procesando notificación para cita ${cita.id_medilink2}:`, error.message);
        }
      }

      logger.info(`✅ Lote de notificaciones procesado`);
    } catch (error) {
      logger.error('Error en envío de notificaciones:', error.message);
    }
  }
};

// ===== FUNCIÓN AUXILIAR: REGISTRAR SINCRONIZACIÓN =====
async function registrarSincronizacion(citasObtenidas, citasNuevas, citasActualizadas, notificacionesEnviadas, estado, duracion = 0, errorMensaje = null) {
  try {
    await database.run(`
      INSERT INTO sincronizaciones (
        fecha_sync,
        citas_obtenidas,
        citas_nuevas,
        citas_actualizadas,
        notificaciones_enviadas,
        estado,
        error_mensaje,
        duracion_ms
      ) VALUES (CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?)
    `, [
      citasObtenidas,
      citasNuevas,
      citasActualizadas,
      notificacionesEnviadas,
      estado,
      errorMensaje || null,
      duracion
    ]);
  } catch (error) {
    logger.error('Error registrando sincronización:', error.message);
  }
}

module.exports = scheduler;
