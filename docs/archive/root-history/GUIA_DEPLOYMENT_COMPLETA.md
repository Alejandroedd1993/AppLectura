# 🚀 Guía de Deployment AppLectura - Render + Firebase

## 📋 Resumen

- **Backend**: Render (Node.js Web Service)
- **Frontend**: Firebase Hosting
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth

---

## 🎯 FASE 1: Deploy Backend en Render

### 1.1 Preparar Repositorio

```bash
# Asegúrate de que todos los cambios estén commiteados
git add .
git commit -m "Preparar backend para producción Render"
git push origin main
```

### 1.2 Crear Web Service en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Conecta tu repositorio GitHub: `AlejandroCordova1993/AppLectura`
4. Configura el servicio:

```yaml
Name: applectura-backend
Region: Oregon (US West)
Branch: main
Root Directory: (dejar vacío)
Environment: Node
Build Command: cd server && npm install
Start Command: cd server && node index.js
Plan: Starter ($7/mes) # IMPORTANTE: Sin spin-down
```

### 1.3 Configurar Variables de Entorno

En Render Dashboard → Tu servicio → Environment:

```bash
NODE_ENV=production
OPENAI_API_KEY=tu_clave_openai_aqui
DEEPSEEK_API_KEY=tu_clave_deepseek_aqui
TAVILY_API_KEY=tu_clave_tavily_aqui_opcional
```

**⚠️ IMPORTANTE**: NO configures `PORT` (Render lo hace automáticamente)

### 1.4 Deploy y Verificar

1. Click **"Create Web Service"**
2. Espera a que termine el deploy (~3-5 min)
3. Copia la URL generada: `https://applectura-backend.onrender.com`
4. Verifica health endpoint:

```bash
curl https://applectura-backend.onrender.com/health
# Debería devolver: {"status":"ok",...}
```

---

## 🎯 FASE 2: Deploy Frontend en Firebase Hosting

### 2.1 Actualizar URL del Backend

Edita `.env.production`:

```bash
REACT_APP_BACKEND_URL=https://applectura-backend.onrender.com
```

### 2.2 Build del Frontend

```bash
npm run build
```

Esto creará la carpeta `build/` con el frontend optimizado.

### 2.3 Deploy a Firebase

```bash
firebase deploy --only hosting
```

Output esperado:
```
✔ Deploy complete!
Hosting URL: https://applectura-cb058.web.app
```

### 2.4 Verificar CORS

El backend ya está configurado para permitir:
- `https://applectura-cb058.web.app`
- `https://applectura-cb058.firebaseapp.com`

---

## 🎯 FASE 3: Testing End-to-End

### 3.1 Checklist de Funcionalidades

Abre `https://applectura-cb058.web.app` y verifica:

- [ ] **Login/Register**: Crear cuenta con email/password
- [ ] **Cargar Texto**: Subir PDF o pegar texto
- [ ] **Análisis IA**: Ejecutar Pre-lectura
- [ ] **Tutor IA**: Hacer preguntas en Lectura Guiada
- [ ] **Sistema de Puntos**: Verificar que suma puntos
- [ ] **Evaluaciones**: Completar una actividad
- [ ] **Sesión Única**: Abrir en 2 navegadores → debe mostrar modal

### 3.2 Verificar Logs

**Backend (Render)**:
1. Dashboard → Tu servicio → Logs
2. Buscar errores de CORS o API

**Frontend (Firebase)**:
1. Console del navegador (F12)
2. Buscar errores de conexión al backend

---

## 🔧 Troubleshooting

### Error: CORS Blocked

**Síntoma**: Frontend no puede conectar al backend

**Solución**:
1. Verifica que `.env.production` tenga la URL correcta
2. Rebuild del frontend: `npm run build && firebase deploy --only hosting`
3. Verifica logs del backend en Render

### Error: 503 Service Unavailable (Render)

**Síntoma**: Backend no responde

**Causas**:
- Plan FREE con spin-down (cambiar a Starter $7/mes)
- Error en el código (revisar logs en Render)

**Solución**:
```bash
# Ver logs en tiempo real
render logs --tail applectura-backend
```

### Error: Firebase Auth

**Síntoma**: No puede hacer login

**Solución**:
1. Firebase Console → Authentication → Settings
2. Agregar dominio autorizado:
   - `applectura-cb058.web.app`
   - `applectura-cb058.firebaseapp.com`

---

## 📊 Costos Mensuales

| Servicio | Plan | Costo |
|----------|------|-------|
| Render Backend | Starter | $7/mes |
| Firebase Hosting | Spark (Free) | $0 |
| Firebase Firestore | Spark (Free) | $0* |
| Firebase Auth | Spark (Free) | $0* |
| **TOTAL** | | **$7/mes** |

*Hasta 50K lecturas/día y 20K escrituras/día

---

## 🎓 Para 40 Alumnos

**Estimación de uso diario**:
- 40 usuarios × 10 requests/día = 400 requests/día
- Firestore: ~2,000 lecturas + 500 escrituras/día
- Storage: ~100 MB de PDFs

**Conclusión**: Plan FREE de Firebase + Starter de Render es suficiente.

---

## 📝 Siguientes Pasos Opcionales

1. **Custom Domain**: Configurar `app.tusitio.com`
2. **Monitoring**: Agregar Firebase Analytics
3. **Backup**: Configurar exports automáticos de Firestore
4. **CDN**: Usar Firebase CDN para PDFs grandes

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisa logs en Render Dashboard
2. Revisa Console del navegador (F12)
3. Verifica variables de entorno en `.env.production`
4. Confirma que Firebase rules están desplegadas: `firebase deploy --only firestore:rules`

**Última actualización**: 23 de noviembre de 2025
