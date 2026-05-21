const cron = require('node-cron');
const moment = require('moment');
const logger = require('../utils/logger');
const medilinkService = require('./medilink.service');
const chaticoService = require('./chatico.service');
const database = require('../database/sqlite');

module.exports = {
  tareas: [],

  iniciar() {
    logger.info('⏰ Iniciando tareas programadas...');
    this.sincronizarCitasRegularmente();
    this.verificarYEnviarNotificaciones();
    logger.info('✅ Tareas programadas iniciadas');
  },

  sincronizarCitasRegularmente() {
    const intervalo = parseInt(process.env.INTERVALO_SINCRONIZACION) || 5;
    const task = cron.schedule(`*/${intervalo} * * * *`, async () => {
      try {
        logger.info(`📡 Sincronizando citas de Medilink2...`);
        const citas = await medilinkService.obtenerCitas();

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
          } catch (err) {
            logger.error(`Error guardando cita #${cita.id_cita}:`, err.message);
          }
        }
        logger.info(`✅ Sincronización completada`);
      } catch (err) {
        logger.error('Error en sincronización:', err.message);
      }
    });
    this.tareas.push(task);
  },

  verificarYEnviarNotificaciones() {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info(`📬 Verificando notificaciones a enviar...`);
        const horasNotificacion = parseInt(process.env.HORAS_NOTIFICACION) || 24;
        const citas = await database.all(`
          SELECT * FROM citas 
          WHERE notificacion_enviada = 0 
          AND estado NOT IN ('Anulado', 'Cancelado')
          ORDER BY fecha ASC, hora_inicio ASC
        `);

        for (const cita of citas) {
          try {
            const citaMoment = moment(`${cita.fecha} ${cita.hora_inicio}`, 'YYYY-MM-DD HH:mm');
            const horasHasta = citaMoment.diff(moment(), 'hours');

            if (horasHasta <= horasNotificacion && horasHasta > (horasNotificacion - 1)) {
              await chaticoService.enviarNotificacionCita({
                id_cita: cita.id_cita,
                telefono: cita.telefono,
                email: cita.email,
                nombre_paciente: cita.nombre_paciente,
                apellidos_paciente: cita.apellidos_paciente,
                fecha: cita.fecha,
                hora_inicio: cita.hora_inicio,
                nombre_profesional: cita.nombre_profesional,
                sede: cita.sede,
              });

              await database.run(
                'UPDATE citas SET notificacion_enviada = 1, notificacion_timestamp = datetime("now") WHERE id_cita = ?',
                [cita.id_cita]
              );
            }
          } catch (err) {
            logger.error(`Error procesando cita #${cita.id_cita}:`, err.message);
          }
        }
        logger.info(`✅ Verificación completada`);
      } catch (err) {
        logger.error('Error en verificación:', err.message);
      }
    });
    this.tareas.push(task);
  },

  detener() {
    this.tareas.forEach(task => task.stop());
    logger.info('✅ Tareas detenidas');
  }
};
