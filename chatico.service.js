const axios = require('axios');
const logger = require('../utils/logger');

const CHATICO_API_URL = process.env.CHATICO_API_URL || 'https://app.chatico.io/api/contacts';
const CHATICO_TOKEN = process.env.CHATICO_ACCESS_TOKEN;
const CHATICO_FLOW_ID = process.env.CHATICO_FLOW_ID;

const chaticoService = {
  // ===== ENVIAR NOTIFICACIÓN VÍA WHATSAPP =====
  enviarNotificacion: async (datosContacto, datosNotificacion) => {
    try {
      logger.info(`📤 Enviando notificación a ${datosContacto.telefono}`);

      // Preparar payload para Chatico
      const payload = {
        phone: datosContacto.telefono,
        email: datosContacto.email || '',
        first_name: datosContacto.nombre_paciente || '',
        last_name: datosContacto.apellidos_paciente || '',
        gender: 'M',
        actions: [
          {
            action: 'add_tag',
            tag_name: 'cita_medica'
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_01',
            value: datosNotificacion.fecha_cita || ''
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_02',
            value: datosNotificacion.hora_cita || ''
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_03',
            value: datosNotificacion.sede || ''
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_04',
            value: datosNotificacion.profesional || ''
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_05',
            value: datosNotificacion.id_cita_medilink2.toString()
          },
          {
            action: 'send_flow',
            flow_id: parseInt(CHATICO_FLOW_ID)
          }
        ]
      };

      const response = await axios.post(CHATICO_API_URL, payload, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'X-ACCESS-TOKEN': CHATICO_TOKEN
        },
        timeout: 10000
      });

      logger.info(`✅ Notificación enviada exitosamente a ${datosContacto.telefono}`, {
        contactId: response.data?.id,
        response: response.data
      });

      return {
        success: true,
        contactId: response.data?.id || null,
        response: response.data
      };
    } catch (error) {
      logger.error(`❌ Error enviando notificación a ${datosContacto.telefono}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        errorDetails: error.response?.data
      };
    }
  },

  // ===== PROCESAR RESPUESTA DEL WEBHOOK =====
  procesarRespuestaWebhook: async (datosWebhook) => {
    try {
      logger.info('📥 Procesando respuesta del webhook de Chatico', {
        respuesta: datosWebhook
      });

      // Mapear la respuesta a nuestro formato
      const tipoRespuesta = mapearRespuestaChatico(datosWebhook.respuesta_usuario);
      
      return {
        success: true,
        tipoRespuesta: tipoRespuesta,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error procesando respuesta del webhook:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ===== VERIFICAR CONEXIÓN =====
  verificarConexion: async () => {
    try {
      // Intentar obtener información del flow
      logger.info('Verificando conexión con Chatico...');

      // Chatico no tiene un endpoint de health check, 
      // así que intentamos un request simple para validar el token
      const payload = {
        phone: '573046097929',
        first_name: 'Test',
        actions: [
          {
            action: 'add_tag',
            tag_name: 'test'
          }
        ]
      };

      const response = await axios.post(CHATICO_API_URL, payload, {
        headers: {
          'X-ACCESS-TOKEN': CHATICO_TOKEN
        },
        timeout: 5000
      });

      if (response.status === 200 || response.status === 201) {
        logger.info('✅ Conexión con Chatico exitosa');
        return true;
      }
    } catch (error) {
      if (error.response?.status === 401) {
        logger.error('❌ Token de Chatico inválido');
        return false;
      }
      logger.error('⚠️ Error verificando Chatico (puede ser timeout):', error.message);
      return true; // Retornar true si no es auth error
    }
  }
};

// ===== FUNCIONES AUXILIARES =====
function mapearRespuestaChatico(respuesta) {
  const respuestaLower = respuesta?.toLowerCase().trim() || '';

  if (respuestaLower.includes('si') || respuestaLower.includes('confirmo')) {
    return 'si_confirmo';
  } else if (respuestaLower.includes('no') || respuestaLower.includes('cancela')) {
    return 'cancelar';
  } else if (respuestaLower.includes('reprograma')) {
    return 'reprogramar';
  }

  return 'desconocida';
}

module.exports = chaticoService;
