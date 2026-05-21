const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let metaStr = '';
      if (Object.keys(meta).length > 0) {
        metaStr = JSON.stringify(meta);
      }
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
    })
  ),
  defaultMeta: { service: 'vivemax-ips' },
  transports: [
    // Archivo de logs general
    new winston.transports.File({ 
      filename: path.join(logsDir, 'vivemax.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Archivo de errores
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    // Consola en desarrollo
    ...(process.env.NODE_ENV !== 'production' ? [new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })] : [])
  ]
});

// Stream para Morgan
logger.stream = {
  write: (message) => logger.info(message)
};

module.exports = logger;
