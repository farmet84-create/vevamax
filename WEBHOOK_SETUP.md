# 🔗 Configuración del Webhook en Chatico

## ¿Por qué necesitamos un webhook?

El webhook permite que Chatico envíe las **respuestas del paciente** a nuestro sistema para que podamos:
- ✅ Procesar la confirmación/cancelación
- ✅ Actualizar el estado en Medilink2
- ✅ Registrar la respuesta en nuestra BD

---

## 📋 Pasos para configurar el webhook en Chatico

### 1. Obtener tu URL pública

Tu servidor estará disponible en:
```
https://tu-dominio.com/api/webhooks/chatico
```

O si usas IP directa:
```
https://76.13.124.146:3000/api/webhooks/chatico
```

---

### 2. En Chatico - Editar el flujo

1. Ve a **Flujos** → **notificacion** (tu flujo actual)
2. En la sección de **pasos**, busca o crea un paso de **"External Request"** o **"Solicitud HTTP"**

---

### 3. Configurar el External Request

**URL:**
```
https://tu-dominio.com/api/webhooks/chatico
```

**Método:** `POST`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer tu-webhook-secret-aqui
```

**Cuerpo (Body):**

Chatico automáticamente envía el mensaje en JSON. El formato típico es:

```json
{
  "phone": "573046097929",
  "message": "Sí confirmo",
  "contact_id": "12345",
  "flow_id": 1779232370347,
  "custom_fields": {
    "Campo_01": "cita_id",
    "Campo_02": "fecha",
    "Campo_03": "hora",
    "Campo_04": "sede",
    "Campo_05": "profesional"
  }
}
```

---

### 4. Configurar variables del flujo

En tu mensaje inicial de Chatico, cuando envíes la notificación, asegúrate de pasar estos campos:

```
Campo_01: ID de la cita (de Medilink2)
Campo_02: Fecha de la cita
Campo_03: Hora de la cita
Campo_04: Sede
Campo_05: Profesional
```

Ejemplo de mensaje con variables:

```
Hola {{1}}, Te escribimos desde ViveMax IPS para confirmar tu consulta médica:

📅 Fecha: {{2}}
🕐 Hora: {{3}}
🏢 Sede: {{4}}
👨‍⚕️ Profesional: {{5}}

Por favor, confirma tu asistencia.
```

---

### 5. Probar el webhook

#### Opción A: Usar curl desde terminal

```bash
curl -X POST https://tu-dominio.com/api/webhooks/chatico \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "573046097929",
    "message": "Sí confirmo",
    "contact_id": "test123",
    "flow_id": 1779232370347,
    "custom_fields": {
      "Campo_01": "123",
      "Campo_02": "2026-05-22",
      "Campo_03": "14:30",
      "Campo_04": "Sede Principal",
      "Campo_05": "Dr. García"
    }
  }'
```

#### Opción B: Usar Postman

1. Crear nuevo **POST request**
2. URL: `https://tu-dominio.com/api/webhooks/chatico`
3. Headers: `Content-Type: application/json`
4. Body (raw):
```json
{
  "phone": "573046097929",
  "message": "Sí confirmo",
  "contact_id": "test123",
  "custom_fields": {
    "Campo_01": "123",
    "Campo_02": "2026-05-22"
  }
}
```

#### Opción C: En el panel de prueba de Chatico

Si Chatico tiene un **"Test webhook"** integrado:
1. Click en el icono de prueba
2. Simular respuesta del usuario
3. Debería recibir confirmación

---

### 6. Verificar que funciona

**Webhook recibido correctamente:**
```json
{
  "success": true,
  "message": "Webhook recibido y procesado",
  "phone": "573046097929"
}
```

**Error:**
```json
{
  "error": "Error procesando webhook",
  "message": "..."
}
```

---

## 🔍 Ver logs del webhook

```bash
# En el servidor
pm2 logs vivemax-ips

# Buscar webhook específico
pm2 logs vivemax-ips | grep "webhook"
```

---

## 🛡️ Seguridad del webhook

1. **Validar origen**: Verificar que viene de Chatico
2. **HTTPS obligatorio**: Siempre usar SSL/TLS
3. **Autenticación**: Usar tokens/API keys
4. **Rate limiting**: Limitar requests por IP

---

## 📊 Flujo completo

```
Paciente recibe WhatsApp
        ↓
    Responde (Sí/No/Reprogramar)
        ↓
    Chatico ejecuta flujo
        ↓
    Chatico → POST /api/webhooks/chatico
        ↓
    Nuestro servidor procesa
        ↓
    Actualiza estado en Medilink2
        ↓
    Registra en BD
        ↓
    ✅ Completado
```

---

## ❓ Troubleshooting

### El webhook no llega

1. Verificar que la URL es correcta y accesible
2. Revisar logs: `pm2 logs vivemax-ips`
3. Probar con curl manualmente
4. Verificar firewall/puertos abiertos

### La respuesta no se procesa

1. Revisar estructura del JSON enviado
2. Verificar que Campo_01 contiene el ID de cita
3. Ver logs para errores específicos

### Medilink2 no se actualiza

1. Verificar que MEDILINK2_BEARER_TOKEN es correcto
2. Revisar logs de error
3. Probar actualización manual: `PUT /citas/{id}`

---

¿Preguntas? Revisar el README.md o los logs con `pm2 logs`
