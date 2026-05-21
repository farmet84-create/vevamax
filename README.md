# 🏥 ViveMax IPS - Sistema de Notificaciones de Citas

Sistema robusto y escalable de notificaciones automáticas de citas médicas integrado con WhatsApp (Chatico) y Medilink2.

## 📋 Características

✅ **Sincronización automática de citas** desde Medilink2  
✅ **Notificaciones por WhatsApp** 24h antes de la cita  
✅ **Respuestas interactivas** (Confirmar/Cancelar/Reprogramar)  
✅ **Actualización automática de estados** en Medilink2  
✅ **Dashboard de monitoreo** en tiempo real  
✅ **Base de datos SQLite** con sincronización bidireccional  
✅ **Logs estructurados** para auditoría  
✅ **Reintentos automáticos** de envíos fallidos  

---

## 🚀 Instalación en VPS Hostinger (Ubuntu 24.04 LTS)

### Paso 1: Conectar a tu VPS

```bash
ssh root@76.13.124.146
```

### Paso 2: Actualizar el sistema

```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential python3-dev
```

### Paso 3: Instalar Node.js (v20)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs npm
node --version  # Verificar
npm --version   # Verificar
```

### Paso 4: Clonar o descargar el proyecto

```bash
cd /home
git clone <URL_DE_TU_REPO> vivemax-ips
cd vivemax-ips
```

O si no tienes Git, descarga los archivos directamente:

```bash
mkdir -p /home/vivemax-ips
cd /home/vivemax-ips
# Copia aquí todos los archivos del proyecto
```

### Paso 5: Instalar dependencias

```bash
npm install
```

### Paso 6: Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env
```

**Valores necesarios en `.env`:**

```env
# CHATICO (Ya tienes estos)
CHATICO_ACCESS_TOKEN=GVWc140dsRsPpHoXtvVf9d837ojUp5uGihUTARZh.vFf6igLKb71CSuFewg5q6sTSRGNj7ZVegDApa27m
CHATICO_FLOW_ID=1779232370347
CHATICO_CLIENT_ID=GVWc140dsRsPpHoXtvVf9d837ojUp5uGihUTARZh

# MEDILINK2 (Completa esto)
MEDILINK2_BEARER_TOKEN=TU_TOKEN_AQUI
MEDILINK2_SUCURSAL_ID=1

# SERVIDOR
PORT=3000
NODE_ENV=production

# WEBHOOK URL (Tu dominio)
WEBHOOK_URL=https://tu-dominio.com/api/webhooks/chatico
```

### Paso 7: Instalar y configurar PM2 (para que corra siempre)

```bash
npm install -g pm2

# Iniciar la aplicación
pm2 start server.js --name "vivemax-ips"

# Guardar configuración
pm2 save

# Hacer que se inicie al reiniciar el VPS
pm2 startup
```

### Paso 8: Configurar Nginx (Proxy inverso)

```bash
apt install -y nginx

# Crear configuración
nano /etc/nginx/sites-available/vivemax-ips
```

**Contenido:**

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL (obtener con Certbot)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Proxy a Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
}
```

**Activar configuración:**

```bash
ln -s /etc/nginx/sites-available/vivemax-ips /etc/nginx/sites-enabled/
nginx -t  # Verificar sintaxis
systemctl restart nginx
```

### Paso 9: Instalar SSL (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx

certbot certonly --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### Paso 10: Configurar webhook en Chatico

En el **flujo de Chatico**, en la sección de **External Request**, agregar:

```
URL: https://tu-dominio.com/api/webhooks/chatico
Método: POST
Headers:
  - Content-Type: application/json
Cuerpo: El mensaje del paciente
```

---

## 📊 Acceder a la aplicación

- **API**: `https://tu-dominio.com/api`
- **Health Check**: `https://tu-dominio.com/api/health`
- **Dashboard**: `https://tu-dominio.com/dashboard`
- **Webhook Chatico**: `https://tu-dominio.com/api/webhooks/chatico`

---

## 🔧 Comandos útiles

```bash
# Ver logs en tiempo real
pm2 logs vivemax-ips

# Ver estado
pm2 status

# Reiniciar aplicación
pm2 restart vivemax-ips

# Detener aplicación
pm2 stop vivemax-ips

# Ver base de datos
sqlite3 database/vivemax.db

# Ver tablas
sqlite3 database/vivemax.db ".tables"
```

---

## 📈 Monitoreo

```bash
# Dashboard de PM2
pm2 monit

# Ver uso de recursos
free -h
df -h
top
```

---

## 🆘 Solución de problemas

### La app no inicia

```bash
# Verificar errores
npm start

# Ver logs
pm2 logs vivemax-ips -n 50
```

### Nginx no funciona

```bash
nginx -t  # Verificar configuración
systemctl status nginx
systemctl restart nginx
```

### Base de datos corrupta

```bash
# Respaldar
cp database/vivemax.db database/vivemax.db.backup

# Recrear (se creará automáticamente)
rm database/vivemax.db
pm2 restart vivemax-ips
```

---

## 📝 Estructura de carpetas

```
vivemax-ips/
├── src/
│   ├── services/          # Lógica de negocio
│   ├── controllers/       # Manejadores HTTP
│   ├── routes/            # Rutas de API
│   ├── database/          # Base de datos
│   └── utils/             # Utilidades
├── database/              # Archivos SQLite
├── logs/                  # Logs de la app
├── public/                # Archivos estáticos
├── server.js              # Servidor principal
├── package.json           # Dependencias
├── .env                   # Variables de entorno
└── README.md              # Este archivo
```

---

## 🔐 Seguridad

- ✅ Usar HTTPS siempre
- ✅ Guardar `.env` privado
- ✅ Cambiar `WEBHOOK_SECRET` en producción
- ✅ Configurar firewall
- ✅ Backup regular de la BD

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisar logs: `pm2 logs`
2. Verificar `/api/health`
3. Revisar base de datos: `sqlite3 database/vivemax.db`

---

**Versión**: 1.0.0  
**Última actualización**: 2026-05-21
