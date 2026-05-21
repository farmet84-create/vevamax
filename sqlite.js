const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || './data/vivemax.db';

// Crear directorio si no existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    logger.error('Error abriendo base de datos:', err);
  } else {
    logger.info(`Base de datos conectada: ${DB_PATH}`);
  }
});

// Habilitar foreign keys
db.run('PRAGMA foreign_keys = ON');

const database = {
  initialize: async () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // ===== TABLA: CITAS =====
        db.run(`
          CREATE TABLE IF NOT EXISTS citas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_medilink2 INTEGER NOT NULL UNIQUE,
            id_paciente INTEGER NOT NULL,
            nombre_paciente TEXT NOT NULL,
            apellidos_paciente TEXT,
            telefono_whatsapp TEXT NOT NULL,
            email TEXT,
            fecha_cita DATE NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fin TIME,
            nombre_profesional TEXT NOT NULL,
            id_profesional INTEGER,
            sede TEXT,
            id_sucursal INTEGER,
            tipo_atencion TEXT,
            comentario TEXT,
            estado_cita TEXT DEFAULT 'Pendiente',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) logger.error('Error creando tabla citas:', err);
        });

        // ===== TABLA: NOTIFICACIONES =====
        db.run(`
          CREATE TABLE IF NOT EXISTS notificaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_cita INTEGER NOT NULL,
            id_contacto_chatico TEXT,
            estado TEXT DEFAULT 'pendiente',
            fecha_envio DATETIME,
            fecha_programada DATETIME,
            intentos_envio INTEGER DEFAULT 0,
            ultimo_error TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_cita) REFERENCES citas(id)
          )
        `, (err) => {
          if (err) logger.error('Error creando tabla notificaciones:', err);
        });

        // ===== TABLA: RESPUESTAS =====
        db.run(`
          CREATE TABLE IF NOT EXISTS respuestas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_notificacion INTEGER NOT NULL,
            id_cita INTEGER NOT NULL,
            tipo_respuesta TEXT NOT NULL,
            respuesta_usuario TEXT,
            timestamp_respuesta DATETIME NOT NULL,
            procesada INTEGER DEFAULT 0,
            estado_actualizado TEXT,
            fecha_actualizacion_medilink2 DATETIME,
            error_actualizacion TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_notificacion) REFERENCES notificaciones(id),
            FOREIGN KEY (id_cita) REFERENCES citas(id)
          )
        `, (err) => {
          if (err) logger.error('Error creando tabla respuestas:', err);
        });

        // ===== TABLA: SINCRONIZACIONES =====
        db.run(`
          CREATE TABLE IF NOT EXISTS sincronizaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_sync DATETIME NOT NULL,
            citas_obtenidas INTEGER DEFAULT 0,
            citas_nuevas INTEGER DEFAULT 0,
            citas_actualizadas INTEGER DEFAULT 0,
            notificaciones_enviadas INTEGER DEFAULT 0,
            estado TEXT DEFAULT 'exitosa',
            error_mensaje TEXT,
            duracion_ms INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) logger.error('Error creando tabla sincronizaciones:', err);
        });

        // ===== TABLA: LOGS =====
        db.run(`
          CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT,
            mensaje TEXT,
            datos_adicionales TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) logger.error('Error creando tabla logs:', err);
          else resolve();
        });

        // ===== ÍNDICES =====
        db.run('CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_cita)');
        db.run('CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado_cita)');
        db.run('CREATE INDEX IF NOT EXISTS idx_notificaciones_estado ON notificaciones(estado)');
        db.run('CREATE INDEX IF NOT EXISTS idx_respuestas_cita ON respuestas(id_cita)');
      });
    });
  },

  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
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
