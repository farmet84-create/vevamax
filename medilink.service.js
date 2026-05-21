const axios = require('axios');
const logger = require('../utils/logger');
const moment = require('moment');

const MEDILINK2_API_URL = process.env.MEDILINK2_API_URL || 'https://api.medilink2.healthatom.com/api/v5';
const MEDILINK2_TOKEN = process.env.MEDILINK2_BEARER_TOKEN;
const MEDILINK2_SUCURSAL = process.env.MEDILINK2_SUCURSAL_ID || 1;

const medilinkService = {
  // ===== OBTENER CITAS PRÓXIMAS =====
  obtenerCitasProximas: async (diasAnticipacion = 1) => {
    try {
      const fechaActual = moment().format('YYYY-MM-DD');
      const fechaFin = moment().add(diasAnticipacion, 'days').format('YYYY-MM-DD');

      logger.info(`Obteniendo citas de Medilink2: ${fechaActual} a ${fechaFin}`);

      const response = await axios.get(`${MEDILINK2_API_URL}/citas`, {
        headers: {
          'Authorization': `Token ${MEDILINK2_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          id_sucursal: MEDILINK2_SUCURSAL,
          fecha: fechaActual
        }
      });

      if (response.data && response.data.data) {
        logger.info(`✅ ${response.data.data.length} citas obtenidas de Medilink2`);
        return response.data.data;
      }

      return [];
    } catch (error) {
      logger.error('Error obteniendo citas de Medilink2:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // ===== OBTENER CITA POR ID =====
  obtenerCitaPorId: async (idCita) => {
    try {
      const response = await axios.get(`${MEDILINK2_API_URL}/citas/${idCita}`, {
        headers: {
          'Authorization': `Token ${MEDILINK2_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data || null;
    } catch (error) {
      logger.error(`Error obteniendo cita ${idCita}:`, error.message);
      throw error;
    }
  },

  // ===== ACTUALIZAR ESTADO DE CITA =====
  actualizarEstadoCita: async (idCita, nuevoEstado, comentario = '') => {
    try {
      logger.info(`Actualizando cita ${idCita} a estado: ${nuevoEstado}`);

      const payload = {
        estado_cita: nuevoEstado
      };

      if (comentario) {
        payload.comentario = comentario;
      }

      const response = await axios.put(`${MEDILINK2_API_URL}/citas/${idCita}`, payload, {
        headers: {
          'Authorization': `Token ${MEDILINK2_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`✅ Cita ${idCita} actualizada exitosamente`);
      return response.data;
    } catch (error) {
      logger.error(`Error actualizando cita ${idCita}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // ===== MAPEAR RESPUESTA DE CHATICO A ESTADO DE MEDILINK2 =====
  mapearRespuestaAEstado: (tipoRespuesta) => {
    const mapeo = {
      'si_confirmo': 'Confirmado por paciente vía WhatsApp',
      'cancelar': 'Anulado',
      'reprogramar': 'Pendiente'
    };

    return mapeo[tipoRespuesta] || 'Pendiente';
  },

  // ===== OBTENER ESTADOS DISPONIBLES =====
  obtenerEstadosDisponibles: async () => {
    try {
      const response = await axios.get(`${MEDILINK2_API_URL}/citas/estados`, {
        headers: {
          'Authorization': `Token ${MEDILINK2_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data || [];
    } catch (error) {
      logger.error('Error obteniendo estados disponibles:', error.message);
      return [];
    }
  },

  // ===== VERIFICAR CONEXIÓN =====
  verificarConexion: async () => {
    try {
      const response = await axios.get(`${MEDILINK2_API_URL}/configuraciones`, {
        headers: {
          'Authorization': `Token ${MEDILINK2_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      logger.info('✅ Conexión con Medilink2 exitosa');
      return true;
    } catch (error) {
      logger.error('❌ Error conectando con Medilink2:', error.message);
      return false;
    }
  }
};

module.exports = medilinkService;
