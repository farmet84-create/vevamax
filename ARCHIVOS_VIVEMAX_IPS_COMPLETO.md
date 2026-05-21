# 🏥 VIVEMAX IPS - TODOS LOS ARCHIVOS COMPLETOS Y CORREGIDOS

---

# 📄 ARCHIVO 1: package.json

```json
{
  "name": "vivemax-ips-notificaciones",
  "version": "1.0.0",
  "description": "Sistema inteligente de notificaciones de citas médicas ViveMax IPS con integración Medilink2 y Chatico WhatsApp",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["vivemax", "medilink2", "chatico", "whatsapp", "citas"],
  "author": "ViveMax IPS",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.2",
    "dotenv": "^16.3.1",
    "sqlite3": "^5.1.6",
    "node-cron": "^3.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "body-parser": "^1.20.2",
    "moment": "^2.29.4",
    "uuid": "^9.0.1",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "pm2": "^5.3.0"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}
```

---

# 📄 ARCHIVO 2: .env.example

```
PORT=3000
NODE_ENV=production

MEDILINK2_API_URL=https://api.medilink2.healthatom.com/api/v5
MEDILINK2_BEARER_TOKEN=tu_bearer_token_aqui
MEDILINK2_SUCURSAL_ID=1

CHATICO_API_URL=https://app.chatico.io/api/contacts
CHATICO_ACCESS_TOKEN=1426001.aI8l9ac3QQl3gK4N7zkwGeZVWwi5AyN5Z9PUvIZaWlBIfh
CHATICO_FLOW_ID=1779232370347

DATABASE_PATH=./data/vivemax.db

HORAS_NOTIFICACION=24
INTERVALO_SINCRONIZACION=5

LOG_LEVEL=info
```

---

# 📄 ARCHIVO 3: .gitignore

```
node_modules/
package-lock.json
yarn.lock

.env
.env.local
.env.*.local

data/
*.db
*.sqlite

logs/
*.log
npm-debug.log*

.vscode/
.idea/
*.swp
*~
.DS_Store

tmp/
temp/
```

---

# 📄 ARCHIVO 4: server.js

```javascript
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

  // Iniciar scheduler
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
```

---

# 📄 ARCHIVO 5: src/utils/logger.js

```javascript
const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'vivemax-ips' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

---

# 📄 ARCHIVO 6: src/database/sqlite.js

```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/vivemax.db');

// Crear directorio si no existe
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error al conectar SQLite:', err);
  } else {
    logger.info('Conectado a SQLite: ' + dbPath);
    inicializarTablas();
  }
});

db.run('PRAGMA foreign_keys = ON');

const inicializarTablas = async () => {
  try {
    await database.exec(`
      CREATE TABLE IF NOT EXISTS citas (
        id_cita INTEGER PRIMARY KEY,
        id_paciente INTEGER,
        nombre_paciente TEXT,
        apellidos_paciente TEXT,
        telefono TEXT UNIQUE,
        email TEXT,
        fecha TEXT,
        hora_inicio TEXT,
        hora_fin TEXT,
        nombre_profesional TEXT,
        sede TEXT,
        estado TEXT DEFAULT 'Pendiente',
        notificacion_enviada INTEGER DEFAULT 0,
        notificacion_timestamp TEXT,
        confirmado INTEGER DEFAULT 0,
        confirmado_timestamp TEXT,
        cancelado INTEGER DEFAULT 0,
        cancelado_timestamp TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_cita INTEGER NOT NULL,
        telefono TEXT NOT NULL,
        estado TEXT DEFAULT 'Pendiente',
        intento INTEGER DEFAULT 1,
        error_mensaje TEXT,
        response_chatico TEXT,
        enviado_timestamp TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(id_cita) REFERENCES citas(id_cita)
      );

      CREATE TABLE IF NOT EXISTS respuestas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_cita INTEGER NOT NULL,
        telefono TEXT NOT NULL,
        tipo_respuesta TEXT,
        contenido TEXT,
        procesado INTEGER DEFAULT 0,
        procesado_timestamp TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(id_cita) REFERENCES citas(id_cita)
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT,
        mensaje TEXT,
        datos TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('✅ Tablas inicializadas correctamente');
  } catch (err) {
    logger.error('Error al inicializar tablas:', err);
  }
};

const database = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          logger.error('Error en run:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Error en get:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Error en all:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  exec: (sql) => {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) {
          logger.error('Error en exec:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  close: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

module.exports = database;
```

---

# 📄 ARCHIVO 7: src/services/medilink.service.js

```javascript
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
      
      const params = {
        sucursal_id: process.env.MEDILINK2_SUCURSAL_ID,
        ...filtros,
      };

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
    return this.actualizarCita(idCita, {
      estado: 'Confirmado por paciente vía WhatsApp',
    });
  },

  async anularCita(idCita, razon = 'Cancelado por paciente vía WhatsApp') {
    return this.actualizarCita(idCita, {
      estado: 'Anulado',
      razon_anulacion: razon,
    });
  }
};
```

---

# 📄 ARCHIVO 8: src/services/chatico.service.js

```javascript
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
          {
            action: 'add_tag',
            tag_name: 'Cita_Proxima',
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_01',
            value: cita.id_cita?.toString() || '',
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_02',
            value: cita.fecha || '',
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_03',
            value: cita.hora_inicio || '',
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_04',
            value: cita.nombre_profesional || '',
          },
          {
            action: 'set_field_value',
            field_name: 'Campo_05',
            value: cita.sede || '',
          },
          {
            action: 'send_flow',
            flow_id: parseInt(process.env.CHATICO_FLOW_ID),
          },
        ],
      };

      const response = await client.post('/contacts', payload);

      logger.info(`✅ Notificación enviada a ${cita.telefono}`);
      return {
        success: true,
        message: 'Notificación enviada',
        data: response.data,
      };
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
```

---

# 📄 ARCHIVO 9: src/services/scheduler.service.js

```javascript
const cron = require('node-cron');
const moment = require('moment');
const logger = require('../utils/logger');
const medilinkService = require('./medilink.service');
const chaticoService = require('./chatico.service');
const database = require('../database/sqlite');

module.exports = {
  tareas: [],

  iniciar() {
    logger.info('⏰ Iniciando tareas programadas...');

    // Sincronizar cada 5 minutos
    this.sincronizarCitasRegularmente();

    // Verificar y enviar notificaciones cada 5 minutos
    this.verificarYEnviarNotificaciones();

    logger.info('✅ Tareas programadas iniciadas');
  },

  sincronizarCitasRegularmente() {
    const intervalo = parseInt(process.env.INTERVALO_SINCRONIZACION) || 5;

    const task = cron.schedule(`*/${intervalo} * * * *`, async () => {
      try {
        logger.info(`📡 Sincronizando citas de Medilink2...`);
        
        const citas = await medilinkService.obtenerCitas();

        for (const cita of citas) {
          try {
            await database.run(`
              INSERT OR REPLACE INTO citas (
                id_cita, id_paciente, nombre_paciente, apellidos_paciente,
                telefono, email, fecha, hora_inicio, nombre_profesional, sede, estado
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              cita.id_cita,
              cita.id_paciente,
              cita.nombre_paciente,
              cita.apellidos_paciente || '',
              cita.telefono || '',
              cita.email || '',
              cita.fecha,
              cita.hora_inicio || cita.inicio,
              cita.nombre_profesional || '',
              cita.sede || 'Principal',
              cita.estado || 'Pendiente',
            ]);
          } catch (err) {
            logger.error(`Error guardando cita #${cita.id_cita}:`, err.message);
          }
        }

        logger.info(`✅ Sincronización completada`);
      } catch (err) {
        logger.error('Error en sincronización:', err.message);
      }
    });

    this.tareas.push(task);
  },

  verificarYEnviarNotificaciones() {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info(`📬 Verificando notificaciones a enviar...`);

        const horasNotificacion = parseInt(process.env.HORAS_NOTIFICACION) || 24;
        const citas = await database.all(`
          SELECT * FROM citas 
          WHERE notificacion_enviada = 0 
          AND estado NOT IN ('Anulado', 'Cancelado')
          ORDER BY fecha ASC, hora_inicio ASC
        `);

        for (const cita of citas) {
          try {
            const citaMoment = moment(`${cita.fecha} ${cita.hora_inicio}`, 'YYYY-MM-DD HH:mm');
            const horasHasta = citaMoment.diff(moment(), 'hours');

            if (horasHasta <= horasNotificacion && horasHasta > (horasNotificacion - 1)) {
              await chaticoService.enviarNotificacionCita({
                id_cita: cita.id_cita,
                telefono: cita.telefono,
                email: cita.email,
                nombre_paciente: cita.nombre_paciente,
                apellidos_paciente: cita.apellidos_paciente,
                fecha: cita.fecha,
                hora_inicio: cita.hora_inicio,
                nombre_profesional: cita.nombre_profesional,
                sede: cita.sede,
              });

              await database.run(
                'UPDATE citas SET notificacion_enviada = 1, notificacion_timestamp = datetime("now") WHERE id_cita = ?',
                [cita.id_cita]
              );
            }
          } catch (err) {
            logger.error(`Error procesando cita #${cita.id_cita}:`, err.message);
          }
        }

        logger.info(`✅ Verificación completada`);
      } catch (err) {
        logger.error('Error en verificación:', err.message);
      }
    });

    this.tareas.push(task);
  },

  detener() {
    this.tareas.forEach(task => task.stop());
    logger.info('✅ Tareas detenidas');
  }
};
```

---

# 📄 ARCHIVO 10: src/app.js

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

const logger = require('./utils/logger');

// Rutas
const webhooksRoutes = require('./routes/webhooks.routes');
const citasRoutes = require('./routes/citas.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '✅ OK',
    message: 'ViveMax IPS - Sistema de Notificaciones de Citas',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Rutas
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
  });
});

// Error global
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

module.exports = app;
```

---

# 📄 ARCHIVO 11: src/routes/webhooks.routes.js

```javascript
const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooks.controller');

router.post('/chatico', webhooksController.recibirRespuesta);
router.get('/test', webhooksController.test);

module.exports = router;
```

---

# 📄 ARCHIVO 12: src/routes/citas.routes.js

```javascript
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
```

---

# 📄 ARCHIVO 13: src/routes/dashboard.routes.js

```javascript
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
```

---

# 📄 ARCHIVO 14: src/controllers/webhooks.controller.js

```javascript
const logger = require('../utils/logger');
const database = require('../database/sqlite');
const medilinkService = require('../services/medilink.service');

module.exports = {
  async recibirRespuesta(req, res) {
    try {
      logger.info('🔔 Webhook recibido de Chatico');
      logger.info('📋 Body:', JSON.stringify(req.body));

      const { phone, message, id_cita } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Teléfono no proporcionado' });
      }

      const respuesta = message?.toLowerCase() || '';
      let tipoRespuesta = 'desconocida';
      let accion = null;

      if (respuesta.includes('sí') || respuesta.includes('si') || respuesta.includes('confirmo')) {
        tipoRespuesta = 'confirmado';
        accion = 'confirmar';
      } else if (respuesta.includes('no') || respuesta.includes('cancelar')) {
        tipoRespuesta = 'cancelado';
        accion = 'cancelar';
      } else if (respuesta.includes('reprogra') || respuesta.includes('otro')) {
        tipoRespuesta = 'reprogramar';
        accion = 'reprogramar';
      }

      const cita = await database.get(
        'SELECT * FROM citas WHERE telefono = ? ORDER BY fecha DESC LIMIT 1',
        [phone]
      );

      if (!cita) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      // Guardar respuesta
      await database.run(
        'INSERT INTO respuestas (id_cita, telefono, tipo_respuesta, contenido) VALUES (?, ?, ?, ?)',
        [cita.id_cita, phone, tipoRespuesta, message]
      );

      // Procesar según respuesta
      if (accion === 'confirmar') {
        await database.run(
          'UPDATE citas SET confirmado = 1, confirmado_timestamp = datetime("now"), estado = ? WHERE id_cita = ?',
          ['Confirmado por paciente vía WhatsApp', cita.id_cita]
        );
        try {
          await medilinkService.confirmarCita(cita.id_cita);
        } catch (err) {
          logger.error(`Error confirmando en Medilink2: ${err.message}`);
        }
      } else if (accion === 'cancelar') {
        await database.run(
          'UPDATE citas SET cancelado = 1, cancelado_timestamp = datetime("now"), estado = ? WHERE id_cita = ?',
          ['Anulado', cita.id_cita]
        );
        try {
          await medilinkService.anularCita(cita.id_cita);
        } catch (err) {
          logger.error(`Error anulando en Medilink2: ${err.message}`);
        }
      }

      res.json({
        success: true,
        message: 'Respuesta procesada correctamente',
        tipo_respuesta: tipoRespuesta,
        id_cita: cita.id_cita,
        timestamp: new Date().toISOString(),
      });

      logger.info(`✅ Respuesta procesada exitosamente`);
    } catch (error) {
      logger.error('Error procesando webhook:', error.message);
      res.status(500).json({ error: 'Error al procesar respuesta' });
    }
  },

  test(req, res) {
    res.json({
      message: '✅ Webhook funciona correctamente',
      timestamp: new Date().toISOString(),
    });
  }
};
```

---

# 📄 ARCHIVO 15: src/controllers/citas.controller.js

```javascript
const logger = require('../utils/logger');
const database = require('../database/sqlite');
const medilinkService = require('../services/medilink.service');
const chaticoService = require('../services/chatico.service');

module.exports = {
  async obtenerProximas(req, res) {
    try {
      const horas = parseInt(req.query.horas) || 24;
      logger.info(`Obteniendo citas próximas en ${horas} horas...`);

      const citas = await medilinkService.obtenerCitas();
      res.json({
        success: true,
        total: citas.length,
        data: citas,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async sincronizar(req, res) {
    try {
      logger.info('Sincronizando citas manualmente...');

      const citas = await medilinkService.obtenerCitas();
      let sincronizadas = 0;

      for (const cita of citas) {
        try {
          await database.run(`
            INSERT OR REPLACE INTO citas (
              id_cita, id_paciente, nombre_paciente, apellidos_paciente,
              telefono, email, fecha, hora_inicio, nombre_profesional, sede, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            cita.id_cita, cita.id_paciente, cita.nombre_paciente, cita.apellidos_paciente || '',
            cita.telefono || '', cita.email || '', cita.fecha, cita.hora_inicio || cita.inicio,
            cita.nombre_profesional || '', cita.sede || 'Principal', cita.estado || 'Pendiente',
          ]);
          sincronizadas++;
        } catch (err) {
          logger.error(`Error sincronizando cita #${cita.id_cita}`);
        }
      }

      res.json({
        success: true,
        message: 'Sincronización completada',
        total_citas: citas.length,
        sincronizadas: sincronizadas,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async enviarNotificacion(req, res) {
    try {
      const { id_cita } = req.params;
      logger.info(`Enviando notificación para cita #${id_cita}...`);

      const cita = await database.get('SELECT * FROM citas WHERE id_cita = ?', [id_cita]);

      if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
      if (!cita.telefono) return res.status(400).json({ error: 'Cita sin teléfono' });

      await chaticoService.enviarNotificacionCita(cita);
      await database.run(
        'UPDATE citas SET notificacion_enviada = 1, notificacion_timestamp = datetime("now") WHERE id_cita = ?',
        [id_cita]
      );

      res.json({
        success: true,
        message: 'Notificación enviada',
        id_cita: id_cita,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async confirmar(req, res) {
    try {
      const { id_cita } = req.params;
      await database.run(
        'UPDATE citas SET confirmado = 1, confirmado_timestamp = datetime("now"), estado = ? WHERE id_cita = ?',
        ['Confirmado', id_cita]
      );
      await medilinkService.confirmarCita(id_cita);

      res.json({ success: true, message: 'Cita confirmada', id_cita });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async cancelar(req, res) {
    try {
      const { id_cita } = req.params;
      const { razon } = req.body;

      await database.run(
        'UPDATE citas SET cancelado = 1, cancelado_timestamp = datetime("now"), estado = ? WHERE id_cita = ?',
        ['Anulado', id_cita]
      );
      await medilinkService.anularCita(id_cita, razon || 'Cancelado');

      res.json({ success: true, message: 'Cita cancelada', id_cita });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerDetalle(req, res) {
    try {
      const { id_cita } = req.params;
      const cita = await database.get('SELECT * FROM citas WHERE id_cita = ?', [id_cita]);

      if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

      const respuestas = await database.all(
        'SELECT * FROM respuestas WHERE id_cita = ? ORDER BY created_at DESC',
        [id_cita]
      );

      res.json({ success: true, data: { ...cita, respuestas } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
```

---

# 📄 ARCHIVO 16: src/controllers/dashboard.controller.js

```javascript
const logger = require('../utils/logger');
const database = require('../database/sqlite');

module.exports = {
  async obtenerResumen(req, res) {
    try {
      const stats = await database.get(`
        SELECT
          COUNT(*) as total_citas,
          SUM(CASE WHEN notificacion_enviada = 1 THEN 1 ELSE 0 END) as notificaciones_enviadas,
          SUM(CASE WHEN confirmado = 1 THEN 1 ELSE 0 END) as citas_confirmadas,
          SUM(CASE WHEN cancelado = 1 THEN 1 ELSE 0 END) as citas_canceladas
        FROM citas
      `);

      const respuestas = await database.all(`
        SELECT tipo_respuesta, COUNT(*) as total 
        FROM respuestas 
        GROUP BY tipo_respuesta
      `);

      res.json({ success: true, data: { stats, respuestas } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerEstadisticas(req, res) {
    try {
      const stats = await database.get(`
        SELECT COUNT(*) as total FROM citas
      `);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerCitas(req, res) {
    try {
      const citas = await database.all('SELECT * FROM citas ORDER BY fecha DESC');
      res.json({ success: true, total: citas.length, data: citas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerPendientes(req, res) {
    try {
      const citas = await database.all(`
        SELECT * FROM citas 
        WHERE notificacion_enviada = 0 
        ORDER BY fecha ASC
      `);
      res.json({ success: true, total: citas.length, data: citas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerNotificaciones(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const notificaciones = await database.all(`
        SELECT n.*, c.nombre_paciente, c.telefono 
        FROM notificaciones n
        JOIN citas c ON n.id_cita = c.id_cita
        ORDER BY n.created_at DESC
        LIMIT ?
      `, [limit]);
      res.json({ success: true, data: notificaciones });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerRespuestas(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const respuestas = await database.all(`
        SELECT r.*, c.nombre_paciente, c.telefono 
        FROM respuestas r
        JOIN citas c ON r.id_cita = c.id_cita
        ORDER BY r.created_at DESC
        LIMIT ?
      `, [limit]);
      res.json({ success: true, data: respuestas });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async obtenerLogs(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const logs = await database.all(`
        SELECT * FROM logs 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [limit]);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
```

---

## ✅ INSTRUCCIONES FINALES:

1. En GitHub, **actualiza/crea cada archivo** en su carpeta correspondiente
2. Los nombres de archivos deben ser **exactos**
3. **Sin `"type": "module"` en package.json**
4. Haz un commit: `git add . && git commit -m "Archivos corregidos y completos"`
5. En Render, click **"Re-deploy"**

