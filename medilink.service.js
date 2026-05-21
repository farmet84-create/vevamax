const axios = require('axios');
const logger = require('../utils/logger');

const client = axios.create({
  baseURL: process.env.MEDILINK2_API_URL || 'https://api.medilink2.healthatom.com/api/v5',
  headers: {
    'Authorization': `Bearer ${process.env.MEDILINK2_BEARER_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

module.exports = {
  async obtenerCitas(filtros = {}) {
    try {
      logger.info('📥 Obteniendo citas de Medilink2...');
      const params = { sucursal_id: process.env.MEDILINK2_SUCURSAL_ID, ...filtros };
      const response = await client.get('/citas', { params });
      logger.info(`✅ Se obtuvieron ${response.data.data?.length || 0} citas`);
      return response.data.data || [];
    } catch (error) {
      logger.error('❌ Error al obtener citas:', error.message);
      throw error;
    }
  },

  async obtenerCita(idCita) {
    try {
      logger.info(`📥 Obteniendo cita #${idCita}`);
      const response = await client.get(`/citas/${idCita}`);
      return response.data.data || response.data;
    } catch (error) {
      logger.error(`❌ Error al obtener cita #${idCita}:`, error.message);
      throw error;
    }
  },

  async actualizarCita(idCita, datos) {
    try {
      logger.info(`📤 Actualizando cita #${idCita}...`, datos);
      const response = await client.put(`/citas/${idCita}`, datos);
      return response.data.data || response.data;
    } catch (error) {
      logger.error(`❌ Error al actualizar cita #${idCita}:`, error.message);
      throw error;
    }
  },

  async confirmarCita(idCita) {
    return this.actualizarCita(idCita, { estado: 'Confirmado por paciente vía WhatsApp' });
  },

  async anularCita(idCita, razon = 'Cancelado por paciente vía WhatsApp') {
    return this.actualizarCita(idCita, { estado: 'Anulado', razon_anulacion: razon });
  }
};
