const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooks.controller');

router.post('/chatico', webhooksController.recibirRespuesta);
router.get('/test', webhooksController.test);

module.exports = router;
