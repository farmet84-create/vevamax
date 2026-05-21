const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/resumen', dashboardController.obtenerResumen);
router.get('/estadisticas', dashboardController.obtenerEstadisticas);
router.get('/citas', dashboardController.obtenerCitas);
router.get('/pendientes', dashboardController.obtenerPendientes);
router.get('/notificaciones', dashboardController.obtenerNotificaciones);
router.get('/respuestas', dashboardController.obtenerRespuestas);
router.get('/logs', dashboardController.obtenerLogs);

module.exports = router;
