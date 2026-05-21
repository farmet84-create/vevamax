# ⚡ Guía Rápida - ViveMax IPS

## 5 pasos para empezar

### 1️⃣ Conectar al VPS
```bash
ssh root@76.13.124.146
```

### 2️⃣ Descargar el proyecto
```bash
cd /home
git clone <tu-repo> vivemax-ips
cd vivemax-ips

# O descargar ZIP
# Descomprime en /home/vivemax-ips
```

### 3️⃣ Instalación automática
```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

### 4️⃣ Configurar credenciales
```bash
nano .env

# Editar:
CHATICO_ACCESS_TOKEN=GVWc140dsRsPpHoXtvVf9d837ojUp5uGihUTARZh.vFf6igLKb71CSuFewg5q6sTSRGNj7ZVegDApa27m
CHATICO_FLOW_ID=1779232370347
MEDILINK2_BEARER_TOKEN=TU_TOKEN_AQUI
MEDILINK2_SUCURSAL_ID=1
WEBHOOK_URL=https://tu-dominio.com/api/webhooks/chatico

# Guardar: Ctrl+X, Y, Enter
```

### 5️⃣ Reiniciar y verificar
```bash
pm2 restart vivemax-ips
pm2 logs vivemax-ips

# Verificar que funciona
curl http://localhost:3000/api/health
```

---

## 🔗 URLs principales

| Función | URL |
|---------|-----|
| Health Check | `https://tu-dominio.com/api/health` |
| Dashboard | `https://tu-dominio.com/dashboard` |
| API Citas | `https://tu-dominio.com/api/citas` |
| Webhook | `https://tu-dominio.com/api/webhooks/chatico` |

---

## 📱 Configurar Chatico

En tu **flujo de notificación**:

1. Agregar **External Request** (POST)
2. URL: `https://tu-dominio.com/api/webhooks/chatico`
3. Campos: Campo_01 (cita_id), Campo_02 (fecha), etc.

Ver: **WEBHOOK_SETUP.md** para detalles completos

---

## 🆘 Comandos útiles

```bash
# Ver estado
pm2 status

# Ver logs en vivo
pm2 logs vivemax-ips

# Reiniciar
pm2 restart vivemax-ips

# Detener
pm2 stop vivemax-ips

# Reanudar
pm2 start vivemax-ips
```

---

## ✅ Checklist

- [ ] SSH conectado
- [ ] Proyecto descargado
- [ ] npm install completado
- [ ] .env configurado
- [ ] App iniciada con PM2
- [ ] Health check OK
- [ ] Nginx configurado
- [ ] SSL/HTTPS funcionando
- [ ] Webhook en Chatico configurado
- [ ] Prueba de envío exitosa

---

**¿Listo para usar?** 🚀

Ver README.md para instalación completa o WEBHOOK_SETUP.md para configurar webhooks.
