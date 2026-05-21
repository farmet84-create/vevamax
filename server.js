const app = require('./src/app');
require('dotenv').config();
const logger = require('./src/utils/logger');
const schedulerService = require('./src/services/scheduler.service');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║    🏥 VIVEMAX IPS - SISTEMA DE NOTIFICACIONES DE CITAS         ║
║                                                                ║
║    ✅ Servidor iniciado correctamente                          ║
║    📍 Puerto: ${PORT}                                             ║
║    🌍 Entorno: ${process.env.NODE_ENV}                             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  schedulerService.iniciar();
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Error no manejado:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
  process.exit(1);
});

module.exports = server;
