const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citas.controller');

router.get('/proximas', citasController.obtenerProximas);
router.post('/sincronizar', citasController.sincronizar);
router.post('/:id_cita/notificacion', citasController.enviarNotificacion);
router.post('/:id_cita/confirmar', citasController.confirmar);
router.post('/:id_cita/cancelar', citasController.cancelar);
router.get('/:id_cita', citasController.obtenerDetalle);

module.exports = router;
