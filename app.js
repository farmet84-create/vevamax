const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

const logger = require('./utils/logger');
const citasRouter = require('./routes/citas.routes');
const webhooksRouter = require('./routes/webhooks.routes');
const notificacionesRouter = require('./routes/notificaciones.routes');
const dashboardRouter = require('./routes/dashboard.routes');

const app = express();

// ===== MIDDLEWARES =====
app.use(cors());
app.use(morgan('combined', { stream: logger.stream }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'ViveMax IPS - Notificaciones de Citas'
  });
});

// ===== RUTAS =====
app.use('/api/citas', citasRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/notificaciones', notificacionesRouter);
app.use('/api/dashboard', dashboardRouter);

// ===== MANEJO DE ERRORES =====
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    success: false,
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

module.exports = app;
