# 🚀 Guía Completa de Deploy - AppLectura v1.0

**Fecha**: 21 de noviembre de 2025  
**Target**: Producción beta (5-10 estudiantes)  
**Stack**: React + Express + Firebase

---

## 📋 Pre-requisitos

- ✅ Testing completado (ver `TESTING_CHECKLIST.md`)
- ✅ Código sin errores de compilación
- ✅ Variables de entorno configuradas
- ✅ Cuenta GitHub con repositorio actualizado
- ✅ Cuenta Vercel (frontend) + Render (backend)
- ✅ Firebase configurado y funcionando

---

## 🔐 Paso 1: Variables de Entorno

### Frontend (.env.production)

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=tu-api-key-aqui
REACT_APP_FIREBASE_AUTH_DOMAIN=applectura-cb058.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=applectura-cb058
REACT_APP_FIREBASE_STORAGE_BUCKET=applectura-cb058.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
REACT_APP_FIREBASE_APP_ID=tu-app-id

# Backend API URL (actualizar después del deploy de backend)
REACT_APP_API_URL=https://tu-backend.onrender.com
```

### Backend (server/.env.production)

```bash
# Server Configuration
PORT=3001
NODE_ENV=production
BACKEND_PORT=3001

# CORS Configuration
CORS_ORIGIN=https://tu-app.vercel.app

# OpenAI API
OPENAI_API_KEY=tu-openai-key
OPENAI_BASE_URL=https://api.openai.com/v1

# DeepSeek API (opcional)
DEEPSEEK_API_KEY=tu-deepseek-key

# Google Search API (opcional)
GOOGLE_SEARCH_API_KEY=tu-google-key
GOOGLE_SEARCH_ENGINE_ID=tu-engine-id

# Brave Search API (opcional)
BRAVE_SEARCH_API_KEY=tu-brave-key

# Glossary API (opcional)
GLOSSARY_API_URL=tu-glossary-api-url
```

**⚠️ Importante**: Nunca commitear archivos `.env` a Git

---

## 🏗️ Paso 2: Build de Producción

### 2.1 Limpiar build anterior

```powershell
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue
```

### 2.2 Instalar dependencias

```powershell
npm ci
```

### 2.3 Build optimizado

```powershell
npm run build
```

**Verificaciones post-build**:
- ✅ Carpeta `build/` creada
- ✅ Sin warnings críticos en consola
- ✅ Bundle size < 500KB (gzipped)

### 2.4 Testing local del build

```powershell
npx serve -s build -l 3000
```

Abrir `http://localhost:3000` y verificar:
- Login funciona
- Cargar texto funciona
- Evaluaciones funcionan
- Analíticas funcionan

---

## ☁️ Paso 3: Deploy en Render (Frontend + Backend)

### 🎯 Configuración: RENDER STARTER ($7/mes)

Siguiendo la decisión en `DECISION_FINAL_HOSTING.md`, usaremos:
- **Frontend**: Render Static Site (Free)
- **Backend**: Render Web Service - Plan Starter ($7/mes)

### 3.1 Deploy Frontend (Static Site - Free)

1. **Push a GitHub**
   ```powershell
   git add .
   git commit -m "feat: Preparación para producción v1.0"
   git push origin main
   ```

2. **Crear Static Site en Render**
   - Ir a [render.com](https://render.com/dashboard)
   - Click "New +" → "Static Site"
   - Conectar repositorio GitHub "AppLectura"

3. **Configurar Build Settings**
   ```
   Name: applectura-frontend
   Branch: main
   Root Directory: (vacío, usa raíz)
   Build Command: npm ci && npm run build
   Publish Directory: build
   ```

4. **Variables de Entorno**
   - Click "Advanced" → "Add Environment Variable"
   - Agregar:
     ```
     REACT_APP_FIREBASE_API_KEY=tu-api-key
     REACT_APP_FIREBASE_AUTH_DOMAIN=applectura-cb058.firebaseapp.com
     REACT_APP_FIREBASE_PROJECT_ID=applectura-cb058
     REACT_APP_FIREBASE_STORAGE_BUCKET=applectura-cb058.appspot.com
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
     REACT_APP_FIREBASE_APP_ID=tu-app-id
     REACT_APP_API_URL=https://applectura-backend.onrender.com
     ```

5. **Deploy**
   - Click "Create Static Site"
   - Esperar ~3-5 minutos
   - URL: `https://applectura-frontend.onrender.com`

**Post-deploy checks**:
- ✅ Sitio accesible
- ✅ HTTPS automático
- ✅ No errores en consola del navegador

---

## 🖥️ Paso 4: Deploy Backend (Render Starter - $7/mes)

### 4.1 Preparar backend para producción

**Verificar `server/package.json`**:
```json
{
  "name": "applectura-backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 4.2 Deploy a Render

1. **Crear cuenta en Render**
   - Ir a [render.com](https://render.com)
   - Signup con GitHub

2. **Crear Web Service**
   - Dashboard → New → Web Service
   - Conectar repositorio GitHub
   - Seleccionar "AppLectura"

3. **Configurar Service**
   ```
   Name: applectura-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: server
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Starter ($7/mes)
   ```
   
   **⚡ Por qué Starter:**
   - Sin spin down (siempre activo)
   - 512 MB RAM + 0.5 vCPU
   - Response time <500ms
   - 99.9% uptime
   - Experiencia profesional para estudiantes

4. **Variables de Entorno**
   - Settings → Environment
   - Agregar todas las variables de `server/.env.production`

5. **Deploy**
   - Click "Create Web Service"
   - Esperar ~5-10 minutos
   - URL: `https://applectura-backend.onrender.com`

**✅ Beneficios del Plan Starter**:
- ✅ Siempre activo (sin spin down)
- ✅ Primera carga instantánea
- ✅ Ideal para uso educativo
- ✅ $0.35-0.55 por estudiante/mes

### 4.3 Actualizar CORS

En `server/index.js`, actualizar CORS con URL de frontend:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://applectura-frontend.onrender.com'
  ],
  credentials: true
}));
```

Commitear y push para redeploy automático.

---

## 🔗 Paso 5: Conectar Frontend y Backend

### 5.1 Actualizar variables de entorno en Render

- Render Dashboard → applectura-frontend → Environment
- Actualizar `REACT_APP_API_URL` con URL del backend:
  ```
  REACT_APP_API_URL=https://applectura-backend.onrender.com
  ```

### 5.2 Redeploy frontend

- Render Dashboard → applectura-frontend
- Click "Manual Deploy" → "Clear build cache & deploy"

### 5.3 Verificar integración

Abrir `https://applectura-frontend.onrender.com` y probar:
- [ ] Login funciona
- [ ] Cargar texto llama al backend correctamente
- [ ] Generación de preguntas funciona
- [ ] Evaluación de respuestas funciona
- [ ] Generación de notas funciona
- [ ] No errores CORS en consola

---

## 🔥 Paso 6: Configurar Firebase para Producción

### 6.1 Firestore Security Rules

Actualizar `firestore.rules` para producción:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer/escribir sus propios datos
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /sesiones/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Denegar todo lo demás
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deployar rules:
```powershell
firebase deploy --only firestore:rules
```

### 6.2 Firebase Hosting (Opcional - NO recomendado)

Si prefieres usar Firebase Hosting en lugar de Render Static:

```powershell
# Inicializar hosting
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy --only hosting
```

**Comparación Render Static vs Firebase Hosting**:

| Feature | Render Static | Firebase Hosting |
|---------|---------------|------------------|
| CDN Global | ✅ | ✅ |
| Auto SSL | ✅ | ✅ |
| Deploy time | ~2 min | ~3-5 min |
| GitHub integration | ✅ Excelente | ⚠️ Manual |
| Same platform as backend | ✅ | ❌ |
| Free tier | 100GB/mes | 10GB/mes |
| Analytics | ✅ | ✅ |

**Recomendación**: Render Static (mismo dashboard que backend, mejor DX).

---

## 🧪 Paso 7: Testing en Producción

### 7.1 Smoke Tests

Ejecutar todos los flujos críticos:

1. **Autenticación**
   ```
   ✅ Registro nuevo usuario
   ✅ Login
   ✅ Logout
   ✅ Persistencia sesión
   ```

2. **Carga de texto**
   ```
   ✅ Subir TXT
   ✅ Subir PDF
   ✅ Subir DOCX
   ✅ Guardar sesión
   ```

3. **Evaluación**
   ```
   ✅ Generar pregunta
   ✅ Evaluar respuesta
   ✅ Ver feedback
   ✅ Guardar progreso
   ```

4. **Analíticas**
   ```
   ✅ Ver gráficos sesión actual
   ✅ Comparar sesiones
   ✅ Dashboard interactivo
   ✅ Filtros funcionan
   ```

5. **Sincronización**
   ```
   ✅ Datos se guardan en Firestore
   ✅ Cerrar sesión y volver a loguear
   ✅ Datos persisten
   ```

### 7.2 Performance Testing

Usar Lighthouse en producción:

```
Target scores:
- Performance: > 70
- Accessibility: > 80
- Best Practices: > 80
- SEO: > 80
```

### 7.3 Monitoring

Configurar herramientas de monitoreo:

**Frontend (Render Analytics)**:
- Render Dashboard → applectura-frontend → Metrics
- Monitorear:
  * Requests per second
  * Bandwidth usage
  * Build times
  * Deploy history

**Backend (Render Metrics)**:
- Render Dashboard → Logs
- Monitorear:
  * Errores 500
  * Requests lentas (>5s)
  * CORS errors
  * Rate limiting

**Firebase (Console)**:
- Firebase Console → Analytics
- Monitorear:
  * Active users
  * Authentication events
  * Firestore reads/writes
  * Errores

---

## 👥 Paso 8: Beta Testing con Estudiantes

### 8.1 Seleccionar beta testers

**Perfil ideal**:
- 3-5 estudiantes secundaria (15-17 años)
- 2-3 estudiantes universidad (18-22 años)
- 1-2 profesores (feedback pedagógico)

**Total**: 5-10 personas

### 8.2 Preparar onboarding

**Email de invitación**:
```
Asunto: 🎓 ¡Bienvenido a AppLectura Beta!

Hola [Nombre],

¡Gracias por unirte al programa beta de AppLectura!

AppLectura es una herramienta de IA que te ayuda a mejorar tu 
comprensión lectora a través de evaluaciones personalizadas.

🚀 Cómo empezar:
1. Ve a: https://applectura-frontend.onrender.com
2. Crea tu cuenta con email y contraseña
3. Sube un texto que quieras estudiar
4. ¡Empieza a responder preguntas!

📊 Después de unas sesiones, podrás ver tus analíticas y progreso.

💡 Necesitamos tu feedback:
- ¿Qué te gusta?
- ¿Qué te confunde?
- ¿Qué mejorarías?

Formulario de feedback: [Google Form URL]

¡Gracias por ayudarnos a mejorar! 🙏

Equipo AppLectura
```

### 8.3 Guía de uso rápida

Crear documento con screenshots:
1. **Cómo registrarse**
2. **Cómo cargar un texto**
3. **Cómo responder preguntas**
4. **Cómo ver tus analíticas**
5. **Cómo guardar y restaurar sesiones**

### 8.4 Formulario de feedback

Crear Google Form con preguntas:

**Sección 1: Información básica**
- Nombre (opcional)
- Edad
- Nivel educativo (secundaria/universidad/profesor)

**Sección 2: Experiencia de uso**
- ¿Fue fácil crear tu cuenta? (1-5)
- ¿Fue fácil cargar un texto? (1-5)
- ¿Las preguntas eran relevantes? (1-5)
- ¿El feedback fue útil? (1-5)
- ¿Las analíticas eran claras? (1-5)

**Sección 3: Feedback abierto**
- ¿Qué fue lo que más te gustó?
- ¿Qué fue lo más confuso?
- ¿Qué mejorarías?
- ¿Usarías esto regularmente? ¿Por qué?
- ¿Algo que te haya sorprendido?

**Sección 4: Bugs reportados**
- ¿Encontraste algún error? (descripción)

### 8.5 Monitoreo durante beta

**Primera semana**:
- [ ] Revisar logs diariamente
- [ ] Contactar testers que no se loguean (ayuda onboarding)
- [ ] Documentar bugs reportados
- [ ] Hotfix para bugs críticos

**Segunda semana**:
- [ ] Recopilar feedback
- [ ] Analizar métricas (engagement, retención)
- [ ] Priorizar mejoras
- [ ] Planificar v1.1

---

## 📊 Paso 9: Métricas de Éxito

### KPIs Críticos (primeras 2 semanas)

| Métrica | Target | Método |
|---------|--------|--------|
| Tasa de registro | ≥80% invitados | Firebase Auth |
| Creación de sesión | ≥80% usuarios | Firestore query |
| Retención D1 | ≥50% | Firebase Analytics |
| Retención D7 | ≥30% | Firebase Analytics |
| Evaluaciones completadas | ≥3 por usuario | Firestore query |
| Satisfacción | ≥4/5 estrellas | Google Form |
| Bugs críticos | ≤3 | Issue tracker |
| Tiempo de carga | <3s | Vercel Analytics |

### Queries útiles (Firestore)

**Contar usuarios registrados**:
```javascript
// Firebase Console → Firestore → Run query
db.collection('usuarios').count()
```

**Contar sesiones totales**:
```javascript
db.collectionGroup('sesiones').count()
```

**Promedio de sesiones por usuario**:
```javascript
// Script custom en Cloud Functions
```

---

## 🐛 Paso 10: Troubleshooting Común

### Problema: Frontend no conecta con backend

**Síntomas**: Error CORS, requests fallan

**Solución**:
1. Verificar `REACT_APP_API_URL` en Vercel
2. Verificar CORS en `server/index.js`
3. Verificar que backend esté up (abrir URL en navegador)

### Problema: Backend lento o timeouts

**Síntomas**: Requests tardan >5 segundos

**Solución**:
1. Verificar que estás en Plan Starter (no Free)
2. Revisar logs en Render Dashboard
3. Optimizar queries pesadas en el código
4. Verificar que OpenAI API responde rápido

### Problema: Firestore Security Rules bloquean acceso

**Síntomas**: Error "Missing or insufficient permissions"

**Solución**:
1. Verificar que usuario esté autenticado
2. Verificar que userId en path coincide con `auth.uid`
3. Revisar rules en Firebase Console

### Problema: Build falla en Render

**Síntomas**: Deploy falla, error en build logs

**Solución**:
1. Verificar que `npm run build` funciona localmente
2. Verificar versión de Node (debe ser ≥18)
3. Limpiar cache en Render: Manual Deploy → Clear build cache & deploy

### Problema: Variables de entorno no funcionan

**Síntomas**: `process.env.REACT_APP_...` es undefined

**Solución**:
1. Verificar que variables empiezan con `REACT_APP_`
2. Redeploy después de agregar variables
3. Variables se leen en build time, no runtime

---

## ✅ Checklist Final Pre-Lanzamiento

### Técnico
- [ ] ✅ Build de producción sin errores
- [ ] ✅ Tests pasando
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Frontend deployado en Render Static Site
- [ ] ✅ Backend deployado en Render Starter ($7/mes)
- [ ] ✅ Firebase configurado para producción
- [ ] ✅ CORS configurado correctamente
- [ ] ✅ Smoke tests pasando en producción
- [ ] ✅ Performance score >70 en Lighthouse
- [ ] ✅ No errores en consola del navegador
- [ ] ✅ SSL/HTTPS funcionando
- [ ] ✅ Backend siempre activo (sin spin down)

### Documentación
- [ ] ✅ Guía de onboarding para usuarios
- [ ] ✅ Formulario de feedback creado
- [ ] ✅ Email de invitación preparado
- [ ] ✅ Troubleshooting guide interna

### Monitoreo
- [ ] ✅ Vercel Analytics activo
- [ ] ✅ Render Logs configurados
- [ ] ✅ Firebase Analytics activo
- [ ] ✅ Plan de revisión diaria primera semana

### Beta Testers
- [ ] ✅ Lista de 5-10 testers confirmada
- [ ] ✅ Emails de invitación enviados
- [ ] ✅ Canal de soporte definido (email/WhatsApp/Discord)
- [ ] ✅ Expectativas claras comunicadas

---

## 🎉 Post-Lanzamiento

### Primera semana
- Monitoreo diario de logs y métricas
- Respuesta rápida a bugs críticos (<24h)
- Check-in con beta testers
- Documentar feedback

### Segunda semana
- Análisis de métricas agregadas
- Recopilar feedback completo
- Priorizar mejoras para v1.1
- Decidir features de ROADMAP_V2.md

### Tercera semana
- Revisar KPIs vs targets
- Decidir si expandir beta (más usuarios)
- Planificar v1.1 sprint
- Celebrar 🎉

---

## 🔗 Enlaces Útiles

- **Frontend**: https://applectura-frontend.onrender.com
- **Backend**: https://applectura-backend.onrender.com
- **Firebase Console**: https://console.firebase.google.com/project/applectura-cb058
- **Render Dashboard**: https://dashboard.render.com
- **GitHub Repo**: https://github.com/AlejandroCordova1993/AppLectura
- **Formulario Feedback**: [Google Form aquí]

## 💰 Costos Mensuales (según DECISION_FINAL_HOSTING.md)

```
HOSTING:
├─ Render Backend (Starter)        $7.00
├─ Render Frontend (Static)         $0.00
└─ Subtotal Hosting:                $7.00

APIS IA:
├─ OpenAI (gpt-4o-mini)         $5-10.00
├─ DeepSeek (deepseek-chat)      $2-5.00
└─ Subtotal APIs:               $7-15.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL MENSUAL:              $14-22/mes
Por alumno (40):         $0.35-0.55/mes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

**Última actualización**: 21 de noviembre de 2025  
**Versión**: 1.0  
**Próxima revisión**: Después de 2 semanas de beta
