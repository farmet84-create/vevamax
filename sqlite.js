const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/vivemax.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error al conectar SQLite:', err);
  } else {
    logger.info('✅ Conectado a SQLite: ' + dbPath);
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
    logger.info('✅ Tablas inicializadas');
  } catch (err) {
    logger.error('Error inicializando tablas:', err);
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
