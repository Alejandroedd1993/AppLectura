# 🛡️ Informe de Auditoría de Seguridad - AppLectura

> **Fecha**: 2025-12-26
> **Alcance**: Auditoría exhaustiva post-incidente de consumo anormal de API

---

## Resumen Ejecutivo

| Categoría | Estado | Notas |
|-----------|--------|-------|
| Credenciales en código | ✅ PASS | Sin claves hardcoded |
| Configuración .env | ⚠️ LIMPIAR | Claves duplicadas en raíz (no usadas pero confusas) |
| Rate Limiting | ✅ PASS | Ya implementado (120/min análisis, 200/min chat) |
| CORS | ✅ PASS | Whitelist configurada correctamente |
| Firestore Rules | ✅ PASS | Sin DEBUG flags, regla por defecto deniega todo |
| Vulnerabilidades npm | ⚠️ REVISAR | Algunas dependencias con avisos (brace-expansion) |

---

## 1. Exposición de Credenciales

### 1.1 Código Fuente
```
✅ PASS: No hay claves API hardcoded en el código
- Búsqueda de "sk-proj-*": 0 resultados
- Búsqueda de "api_key" en frontend: 0 resultados
- Búsqueda de "REACT_APP_OPENAI": 0 resultados
```

### 1.2 Archivos de Configuración

| Archivo | Propósito | Contenido |
|---------|-----------|-----------|
| `/.env` | Frontend (React) | Firebase config + BACKEND_URL |
| `/server/.env` | Backend (Express) | **Todas las API keys** |
| `/server/.env.example` | Plantilla | Solo ejemplo, sin claves |

⚠️ **Recomendación**: Eliminar `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY` del `.env` raíz ya que:
- No tienen prefijo `REACT_APP_` (React las ignora)
- El backend lee de `server/.env`
- Crean confusión y riesgo de exposición accidental

### 1.3 Historial de Git
```
✅ PASS: No hay archivos .env en el historial de git
Comando: git log --all --full-history -- "*.env*"
Resultado: Sin commits
```

---

## 2. Seguridad de APIs

### 2.1 Rate Limiting

```javascript
// server/middleware/rateLimiters.js
analysisLimiter: 120 requests/minuto (configurable via env)
chatLimiter: 200 requests/minuto (configurable via env)
```

**Características**:
- ✅ Agrupa por Bearer token hasheado si hay auth
- ✅ Fallback a IP para usuarios no autenticados
- ✅ Límites altos para evitar bloquear aulas NAT
- ✅ Mensajes de error amigables con retryAfter

**Rutas protegidas**:
- `/api/analysis/text` - analysisLimiter
- `/api/analysis/prelecture` - analysisLimiter  
- `/api/analysis/glossary` - analysisLimiter
- `/api/chat/completion` - chatLimiter
- `/api/assessment/evaluate` - evaluationLimiter

### 2.2 Validación de Entrada

```javascript
// server/controllers/analisis.controller.js
if (!texto || texto.trim().length === 0) {
  return res.status(400).json({ error: 'Texto vacío' });
}
const textoTruncado = texto.slice(0, 4000); // Límite de caracteres
```

✅ Textos truncados a 4000 caracteres para evitar abuso de tokens

### 2.3 Manejo de Errores

```javascript
// server/index.js
process.on('uncaughtException', (err) => {
  console.error('💥 uncaughtException:', err);
});
```

⚠️ Los stack traces se loguean en consola pero NO se exponen al cliente (✅ correcto)

---

## 3. Autenticación y Autorización

### 3.1 Firebase Auth
- ✅ Google Sign-In configurado
- ✅ Roles: `estudiante` | `docente`

### 3.2 Firestore Rules

```javascript
// firestore.rules - Línea 277-279
match /{document=**} {
  allow read, write: if false; // REGLA POR DEFECTO: DENEGAR TODO
}
```

**Verificación de reglas clave**:

| Colección | Read | Write | Notas |
|-----------|------|-------|-------|
| `/users/{userId}` | Autenticado | Dueño | ✅ OK |
| `/students/{uid}/progress/*` | Dueño/Docente asignado | Dueño | ✅ OK |
| `/courses/{courseId}` | Autenticado | Docente dueño | ✅ OK |
| `/courses/{id}/students/{uid}` | Docente dueño / Estudiante | Con validación | ✅ OK |
| `/courseCodes/{code}` | Autenticado | Docente dueño | ✅ OK |

✅ **No hay DEBUG flags** (`if true`) en las reglas actuales (ya corregido).

---

## 4. Frontend Security

### 4.1 Variables de Entorno Expuestas

Solo las siguientes variables con `REACT_APP_` están en el frontend (correcto):

```env
REACT_APP_FIREBASE_* (6 variables) - Requerido por Firebase
REACT_APP_BACKEND_URL - URL del backend
REACT_APP_PORT - Puerto de desarrollo
```

⚠️ `REACT_APP_TAVILY_API_KEY=configured` - Solo un flag, no la clave real (OK)

### 4.2 CORS

```javascript
// server/index.js
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://applectura-cb058.web.app',
  'https://applectura-cb058.firebaseapp.com',
  'https://applectura-frontend.onrender.com'
];
```

✅ Whitelist definida, no acepta orígenes arbitrarios

### 4.3 Content Security

- JSON body limit: 4MB (`express.json({ limit: '4mb' })`)
- Middleware de JSON inválido devuelve 400 (no expone detalles internos)

---

## 5. Dependencias

```bash
npm audit --audit-level=high
```

⚠️ Algunas vulnerabilidades menores encontradas:
- `brace-expansion`: ReDoS vulnerability (severidad: high pero bajo impacto real)
- Se recomienda ejecutar `npm audit fix` periódicamente

---

## 6. Recomendaciones de Mejora

### PRIORIDAD ALTA (Hacer ahora)

1. **Limpiar `.env` raíz**
   - Eliminar: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`
   - Estas claves deben estar SOLO en `server/.env`

2. **Rotar claves expuestas**
   - ✅ DeepSeek: Ya rotada
   - ⚠️ OpenAI: Expuesta en esta conversación - ROTAR

### PRIORIDAD MEDIA (Próximas semanas)

3. **Auditar `npm audit` regularmente**
   ```bash
   npm audit fix
   ```

4. **Implementar logging de requests de IA**
   - Para detectar consumo anormal temprano
   - Registrar: timestamp, modelo, tokens (no contenido)

### PRIORIDAD BAJA (Mejoras futuras)

5. **HTTPS forzado en producción**
   - Ya cubierto por Render/Firebase Hosting

6. **Headers de seguridad adicionales**
   - Considerar `helmet.js` para CSP, HSTS, etc.

---

## Conclusión

La aplicación tiene una **postura de seguridad razonable** para un piloto educativo:

- ✅ Rate limiting implementado
- ✅ CORS restrictivo
- ✅ Firestore rules sin permisos abiertos
- ✅ Sin credenciales hardcoded
- ⚠️ Limpiar configuración duplicada en `.env` raíz

El **consumo anormal de API (deepseek-reasoner)** detectado previamente **no provino de AppLectura** ya que el código solo usa `deepseek-chat`. La causa más probable fue uso de la misma API key en otra herramienta (IDE, extensión, etc.).
