# 🚀 VIVEMAX IPS - ARCHIVOS LISTOS PARA SUBIR A GITHUB

## ✅ TODO ESTÁ LISTO

Se han creado **TODOS los archivos corregidos y completos** en dos opciones:

### 📦 Opción 1: Descargar carpeta comprimida
- Archivo: `vivemax-ips-completo.tar.gz`
- Extrae: `tar -xzf vivemax-ips-completo.tar.gz`
- Copia el contenido de `vivemax-ips-files/` a tu repo en GitHub

### 📄 Opción 2: Descargar archivos individuales
Todos los archivos están disponibles para descargar uno por uno.

---

## 📋 ESTRUCTURA COMPLETA

```
vivemax-ips-notificaciones/
├── package.json                    ✅ Corregido (SIN "type": "module")
├── .env.example                    ✅ Nuevo
├── .gitignore                      ✅ Nuevo
├── server.js                       ✅ Nuevo
└── src/
    ├── app.js                      ✅ Nuevo
    ├── utils/
    │   └── logger.js               ✅ Nuevo
    ├── database/
    │   └── sqlite.js               ✅ Nuevo
    ├── services/
    │   ├── medilink.service.js     ✅ Nuevo
    │   ├── chatico.service.js      ✅ Nuevo
    │   └── scheduler.service.js    ✅ Nuevo
    ├── routes/
    │   ├── webhooks.routes.js      ✅ Nuevo
    │   ├── citas.routes.js         ✅ Nuevo
    │   └── dashboard.routes.js     ✅ Nuevo
    └── controllers/
        ├── webhooks.controller.js  ✅ Nuevo
        ├── citas.controller.js     ✅ Nuevo
        └── dashboard.controller.js ✅ Nuevo
```

---

## 🔄 PASOS PARA GITHUB

### 1️⃣ En tu computadora:
```bash
# Ir al repo
cd vivemax-ips-notificaciones

# Opción A: Si tienes la carpeta comprimida
cd tu-repo
# Extrae vivemax-ips-completo.tar.gz aquí

# O Opción B: Si descargas archivos uno por uno
# Copia cada archivo en su carpeta correspondiente
```

### 2️⃣ Sube a GitHub:
```bash
git add .
git commit -m "Archivos corregidos y completos - Version 1.0.0"
git push origin main
```

### 3️⃣ En Render:
- Ve a tu servicio en Render
- Click en **"Deployments"**
- Click en **"Re-deploy"**
- Espera 3-5 minutos

Debería ver:
```
✓ Building...
✓ Build successful
✓ Deployed successfully
```

---

## ✅ PUNTOS IMPORTANTES

✅ **SIN `"type": "module"` en package.json**
✅ **Todos los archivos usan CommonJS** (require/module.exports)
✅ **Incluye `morgan`** en dependencias
✅ **Base de datos SQLite** inicializada automáticamente
✅ **Logger Winston** configurado
✅ **Tareas programadas** con node-cron

---

## 🔑 CONFIGURACIÓN EN RENDER

Asegúrate de tener estas **Environment Variables** en Render:

```
MEDILINK2_BEARER_TOKEN = tu_token_aqui
MEDILINK2_SUCURSAL_ID = 1
CHATICO_ACCESS_TOKEN = 1426001.aI8l9ac3QQl3gK4N7zkwGeZVWwi5AyN5Z9PUvIZaWlBIfh
CHATICO_FLOW_ID = 1779232370347
NODE_ENV = production
PORT = 3000
```

---

## 📞 URL FINAL EN RENDER

Una vez deployed, tu app estará en:
```
https://vevamax.onrender.com
```

Testa con:
```
https://vevamax.onrender.com/api/status
```

---

## 🎯 ¿PROBLEMAS?

Si algo no funciona:

1. **Ver logs en Render**
   - Dashborad → Logs

2. **Error común: "Cannot find module"**
   - Verificar que `package.json` NO tiene `"type": "module"`
   - Hacer Re-deploy

3. **Error: "Token inválido"**
   - Verificar env vars en Render
   - Verificar .env local para pruebas

---

¡Listo! 🚀 Todo está correcto y completo.
