const app = require('./app');
const logger = require('./utils/logger');
const database = require('./database/sqlite');
const scheduler = require('./services/scheduler.service');

const PORT = process.env.PORT || 3000;

// ===== INICIALIZAR BASE DE DATOS =====
database.initialize().then(() => {
  logger.info('✅ Base de datos inicializada correctamente');
  
  // ===== INICIAR SCHEDULER =====
  scheduler.startScheduler();
  logger.info('✅ Scheduler de sincronización iniciado');
  
  // ===== INICIAR SERVIDOR =====
  app.listen(PORT, () => {
    logger.info(`
    
╔════════════════════════════════════════════════════════════╗
║   🏥 ViveMax IPS - Sistema de Notificaciones de Citas      ║
║                                                            ║
║   ✅ Servidor ejecutándose en puerto: ${PORT}                ║
║   ✅ Endpoint: http://localhost:${PORT}                      ║
║   ✅ Health Check: http://localhost:${PORT}/health          ║
║   ✅ Dashboard: http://localhost:${PORT}/api/dashboard      ║
║                                                            ║
║   📡 Sincronización: Cada ${process.env.SYNC_INTERVAL_MINUTES || 5} minutos         ║
║   ⏰ Notificación: ${process.env.NOTIFICATION_HOURS_BEFORE || 24} horas antes de cita      ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}).catch(error => {
  logger.error('❌ Error inicializando base de datos:', error);
  process.exit(1);
});

// ===== MANEJO DE ERRORES NO CAPTURADOS =====
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
