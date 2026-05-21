const axios = require('axios');
const logger = require('../utils/logger');

const client = axios.create({
  baseURL: process.env.CHATICO_API_URL || 'https://app.chatico.io/api',
  headers: {
    'Content-Type': 'application/json',
    'X-ACCESS-TOKEN': process.env.CHATICO_ACCESS_TOKEN,
  },
  timeout: 10000,
});

module.exports = {
  async enviarNotificacionCita(cita) {
    try {
      logger.info(`📱 Enviando notificación a ${cita.telefono}...`);

      const payload = {
        phone: cita.telefono,
        email: cita.email || '',
        first_name: cita.nombre_paciente || 'Paciente',
        last_name: cita.apellidos_paciente || '',
        actions: [
          { action: 'add_tag', tag_name: 'Cita_Proxima' },
          { action: 'set_field_value', field_name: 'Campo_01', value: cita.id_cita?.toString() || '' },
          { action: 'set_field_value', field_name: 'Campo_02', value: cita.fecha || '' },
          { action: 'set_field_value', field_name: 'Campo_03', value: cita.hora_inicio || '' },
          { action: 'set_field_value', field_name: 'Campo_04', value: cita.nombre_profesional || '' },
          { action: 'set_field_value', field_name: 'Campo_05', value: cita.sede || '' },
          { action: 'send_flow', flow_id: parseInt(process.env.CHATICO_FLOW_ID) },
        ],
      };

      const response = await client.post('/contacts', payload);
      logger.info(`✅ Notificación enviada a ${cita.telefono}`);
      return { success: true, message: 'Notificación enviada', data: response.data };
    } catch (error) {
      logger.error(`❌ Error al enviar notificación:`, error.response?.data || error.message);
      throw error;
    }
  },

  async crearContacto(datosContacto) {
    try {
      logger.info('👤 Creando contacto en Chatico...');
      const response = await client.post('/contacts', datosContacto);
      return response.data;
    } catch (error) {
      logger.error('❌ Error al crear contacto:', error.message);
      throw error;
    }
  }
};
