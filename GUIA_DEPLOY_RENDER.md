# 🚀 Guía de Deploy en Render Starter - AppLectura

**Tiempo estimado:** 15 minutos  
**Costo:** $7/mes (Plan Starter - RECOMENDADO para 40 alumnos)  
**Capacidad:** 40-60 alumnos sin problemas

## ⭐ Por Qué Plan Starter (No Free)

**Plan Starter es OBLIGATORIO para uso educativo con estudiantes reales:**

✅ **Sin spin down** - Backend siempre disponible (crítico para clases)  
✅ **99.9% uptime** - Confiabilidad necesaria para evaluaciones  
✅ **Response <500ms** - Experiencia fluida para estudiantes  
✅ **512 MB RAM** - Suficiente para 40-60 usuarios  
✅ **Profesional** - No hay "primera carga lenta"

❌ **Plan Free NO recomendado:**
- Spin down tras 15 min inactividad
- Primera carga: 30-60 segundos
- Mala experiencia para estudiantes
- Solo para demos/prototipos

---

## 📋 Pre-requisitos

- ✅ Cuenta en GitHub con tu repositorio AppLectura
- ✅ Cuenta en Render.com (crear gratis en https://render.com)
- ✅ Proyecto Firebase configurado (credenciales en `.env`)
- ✅ Claves de API (OpenAI, DeepSeek) listas

---

## 🔧 Paso 1: Preparar el Repositorio (5 minutos)

### 1.1 Crear archivo de configuración para Render

Crear archivo `render.yaml` en la raíz del proyecto:

```yaml
services:
  # Backend Node.js/Express
  - type: web
    name: applectura-backend
    env: node
    region: oregon
    plan: free
    buildCommand: cd server && npm install
    startCommand: cd server && node index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: DEEPSEEK_API_KEY
        sync: false
      - key: BACKEND_PORT
        value: 3001
    healthCheckPath: /health
  
  # Frontend React (Static Site)
  - type: web
    name: applectura-frontend
    env: static
    region: oregon
    plan: free
    buildCommand: npm install && npm run build
    staticPublishPath: build
    envVars:
      - key: REACT_APP_FIREBASE_API_KEY
        sync: false
      - key: REACT_APP_FIREBASE_AUTH_DOMAIN
        sync: false
      - key: REACT_APP_FIREBASE_PROJECT_ID
        sync: false
      - key: REACT_APP_FIREBASE_STORAGE_BUCKET
        sync: false
      - key: REACT_APP_FIREBASE_MESSAGING_SENDER_ID
        sync: false
      - key: REACT_APP_FIREBASE_APP_ID
        sync: false
      - key: REACT_APP_BACKEND_URL
        fromService:
          type: web
          name: applectura-backend
          envVarKey: RENDER_EXTERNAL_URL
    routes:
      - type: rewrite
        source: /api/*
        destination: https://applectura-backend.onrender.com/api/*
      - type: rewrite
        source: /*
        destination: /index.html
```

### 1.2 Agregar endpoint de health check al backend

Editar `server/index.js`, agregar antes de las rutas existentes:

```javascript
// Health check para Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### 1.3 Verificar package.json del servidor

Verificar que `server/package.json` exista con las dependencias:

```json
{
  "name": "applectura-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "openai": "^4.104.0",
    "multer": "^2.0.2",
    "zod": "^3.25.76"
  }
}
```

### 1.4 Crear archivo .gitignore actualizado

```gitignore
# Archivos de entorno
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Dependencias
node_modules/
server/node_modules/

# Build
build/
dist/

# Logs
logs
*.log
npm-debug.log*

# Otros
.DS_Store
.vscode/
.idea/
```

### 1.5 Commit y push a GitHub

```powershell
git add .
git commit -m "Preparar para deploy en Render"
git push origin main
```

---

## 🌐 Paso 2: Deploy en Render (10 minutos)

### 2.1 Conectar Repositorio

1. Ir a https://dashboard.render.com/
2. Click en **"New +"** → **"Blueprint"**
3. Conectar tu cuenta de GitHub
4. Seleccionar repositorio `AppLectura`
5. Render detectará automáticamente el archivo `render.yaml`
6. Click en **"Apply"**

### 2.2 Configurar Variables de Entorno - Backend

En el dashboard de Render, ir a `applectura-backend` → **Environment**:

```
NODE_ENV=production
PORT=3001
BACKEND_PORT=3001

# Claves de API
OPENAI_API_KEY=tu_clave_openai_aqui
DEEPSEEK_API_KEY=tu_clave_deepseek_aqui

# (Opcional) Otras claves
GEMINI_API_KEY=
REACT_APP_TAVILY_API_KEY=
```

### 2.3 Configurar Variables de Entorno - Frontend

En el dashboard de Render, ir a `applectura-frontend` → **Environment**:

```
# Firebase
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=applectura-xxxxx.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=applectura-xxxxx
REACT_APP_FIREBASE_STORAGE_BUCKET=applectura-xxxxx.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxxx

# Backend URL (se llena automáticamente por render.yaml)
REACT_APP_BACKEND_URL=https://applectura-backend.onrender.com
```

### 2.4 Esperar el Deploy

- Backend: ~3-5 minutos
- Frontend: ~5-7 minutos

Verás logs en tiempo real. Busca:
```
✅ Backend: "Server is running on port 3001"
✅ Frontend: "Build completed successfully"
```

### 2.5 Obtener URLs

Una vez completado:
- **Backend:** `https://applectura-backend.onrender.com`
- **Frontend:** `https://applectura-frontend.onrender.com`

---

## ✅ Paso 3: Verificar el Deploy (2 minutos)

### 3.1 Probar Backend

```powershell
# Health check
curl https://applectura-backend.onrender.com/health

# Debería responder:
# {"status":"ok","timestamp":"2025-11-17T...","uptime":123.45}
```

### 3.2 Probar Frontend

1. Abrir `https://applectura-frontend.onrender.com`
2. Verificar que cargue correctamente
3. Abrir DevTools (F12) → Console
4. Buscar: `✅ Firebase initialized successfully`
5. Probar login/registro

### 3.3 Probar Integración Frontend → Backend

1. Cargar un texto en el visor
2. Usar el modo Tutor (LecturaInteractiva)
3. Enviar un mensaje
4. Verificar que responda correctamente

---

## 🔄 Paso 4: Configurar Deploy Automático

### 4.1 Habilitar Auto-Deploy

En Render dashboard, ambos servicios:
- Settings → Build & Deploy → **Auto-Deploy:** Yes

### 4.2 Desde ahora, cada push a GitHub desplegará automáticamente

```powershell
git add .
git commit -m "Nueva funcionalidad"
git push origin main
# ✅ Deploy automático en Render
```

---

## 📊 Limitaciones del Plan Free

### Backend (Web Service Free):
- ⚠️ **Spin down después de 15 minutos de inactividad**
- ⏰ **Primera request tras spin down: 30-60 segundos de arranque**
- ✅ **750 horas gratis al mes** (suficiente para pruebas)

### Frontend (Static Site Free):
- ✅ **Sin spin down** (siempre disponible)
- ✅ **100 GB de ancho de banda/mes**
- ✅ **CDN global**

### Soluciones al Spin Down:

**Opción 1: Upgrade a plan Starter ($7/mes)**
```
✅ Sin spin down
✅ 100% uptime
✅ Métricas avanzadas
```

**Opción 2: Keep-alive gratuito (workaround)**
```javascript
// Crear script keep-alive.js
setInterval(async () => {
  await fetch('https://applectura-backend.onrender.com/health');
  console.log('Keep-alive ping sent');
}, 14 * 60 * 1000); // Cada 14 minutos

// Ejecutar en tu máquina local o en un servidor gratuito
```

**Opción 3: UptimeRobot (gratis)**
```
1. Ir a https://uptimerobot.com/
2. Crear monitor HTTP(s)
3. URL: https://applectura-backend.onrender.com/health
4. Intervalo: 5 minutos
✅ Mantiene el backend siempre activo
```

---

## 🔒 Seguridad en Producción

### 1. Configurar CORS en el backend

Editar `server/index.js`:

```javascript
app.use(cors({
  origin: [
    'https://applectura-frontend.onrender.com',
    'http://localhost:3000' // Solo para desarrollo
  ],
  credentials: true
}));
```

### 2. Actualizar Firebase para permitir dominio de Render

1. Ir a Firebase Console → Authentication → Settings
2. En **Authorized domains**, agregar:
   ```
   applectura-frontend.onrender.com
   ```

### 3. Configurar variables de entorno como secretos

En Render, todas las variables con claves de API se marcan automáticamente como **secretas** y no se muestran en logs.

---

## 🐛 Troubleshooting Común

### Error: "Cannot connect to backend"
**Causa:** Frontend no puede alcanzar al backend  
**Solución:** Verificar que `REACT_APP_BACKEND_URL` esté correctamente configurado

### Error: "Firebase: Missing or insufficient permissions"
**Causa:** Reglas de Firestore no desplegadas  
**Solución:**
```powershell
firebase deploy --only firestore:rules
```

### Error: "Module not found" en backend
**Causa:** Dependencias no instaladas correctamente  
**Solución:** En Render dashboard → Manual Deploy → Clear cache & deploy

### Backend tarda mucho en responder (primera request)
**Causa:** Spin down del plan Free  
**Solución:** Usar UptimeRobot o upgrade a plan Starter

---

## 📈 Monitoreo y Logs

### Ver logs en tiempo real:

1. **Backend:** Render Dashboard → applectura-backend → Logs
2. **Frontend:** Render Dashboard → applectura-frontend → Logs

### Configurar alertas:

1. Render Dashboard → Settings → Notifications
2. Agregar email o Slack webhook
3. Recibir alertas de:
   - Deploy fallidos
   - Errores 500
   - Downtime

---

## 💰 Costos Proyectados

### Plan Free (primeros 3 meses):
```
Backend: $0/mes (con spin down)
Frontend: $0/mes
Total: $0/mes
```

### Plan Starter (producción):
```
Backend: $7/mes
Frontend: $0/mes
Total: $7/mes
```

### Escala con muchos usuarios (100+ estudiantes activos):
```
Backend: $25/mes (plan Pro)
Frontend: $0/mes
Total: $25/mes
```

---

## 🎯 Checklist Final

Antes de compartir con estudiantes:

- [ ] Backend responde correctamente en `/health`
- [ ] Frontend carga sin errores en consola
- [ ] Login/registro funcionan
- [ ] Firebase conectado correctamente
- [ ] Sistema de evaluación (DeepSeek/OpenAI) responde
- [ ] Modo Tutor funcional
- [ ] Artefactos se crean y evalúan correctamente
- [ ] Sistema de recompensas funciona
- [ ] Exportación CSV/JSON funcional
- [ ] Dominio en authorized domains de Firebase
- [ ] CORS configurado correctamente
- [ ] Variables de entorno verificadas

---

## 📞 Soporte

- **Render Docs:** https://render.com/docs
- **Render Status:** https://status.render.com/
- **Community Forum:** https://community.render.com/

---

**🎉 ¡Listo! Tu app está en producción y lista para recibir estudiantes.**

URLs finales:
- **App:** https://applectura-frontend.onrender.com
- **API:** https://applectura-backend.onrender.com

Comparte la URL del frontend con tus estudiantes y estarán listos para empezar. 🚀
