# 🔍 Auditoría Completa: Función de Búsqueda Web

**Fecha**: 23 de Noviembre de 2025  
**Componente**: PromptBar con botón "🌐 Con Web"  
**Estado**: ❌ NO FUNCIONAL

---

## 📋 Resumen Ejecutivo

La función de búsqueda web integrada en el `PromptBar` **NO está funcionando** debido a múltiples problemas de configuración y arquitectura que impiden la comunicación correcta entre frontend y backend.

### Problemas Críticos Identificados

1. ⛔ **Variable de entorno NO configurada en frontend** (.env)
2. ⛔ **WebEnrichmentButton deshabilitado permanentemente**
3. ⛔ **Servicio frontend intenta llamar APIs externas directamente** (violación CORS)
4. ⛔ **Falta proxy configurado para /api/web-search**
5. ⚠️ **Hook useWebSearchTutor no usa el backend**

---

## 🔬 Análisis Detallado

### 1. Configuración de Variables de Entorno

#### ❌ Problema en `.env` (Frontend)
```env
# Línea 6 - VACÍA
REACT_APP_TAVILY_API_KEY=
```

#### ✅ Correcto en `server/.env` (Backend)
```env
# Línea 18 - CONFIGURADA
TAVILY_API_KEY=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
```

**Impacto**: El frontend no puede determinar si la búsqueda web está disponible.

---

### 2. Lógica del Componente WebEnrichmentButton

#### Archivo: `src/components/chat/WebEnrichmentButton.js`

```javascript
// ❌ PROBLEMA: Hook siempre retorna loading=false, search=null
const { search, loading } = useWebSearchTutor({ 
  enabled: !disabled,  // disabled viene de enableWeb
  provider, 
  maxResults, 
  analysisType 
});

// ❌ BOTÓN SIEMPRE DESHABILITADO
<Btn
  disabled={disabled || loading || !query?.trim()}
  // Si enableWeb=false → disabled=true → botón desactivado
/>
```

#### Flujo Actual en ReadingWorkspace.js (línea 509):
```javascript
<WebEnrichmentButton
  query={prompt}
  disabled={!enableWeb || !prompt.trim()}  // ← enableWeb viene de props
  contextBuilder={contextBuilder}
  onEnriched={...}
/>
```

**Problema**: `enableWeb` se pasa como prop pero nunca se valida dinámicamente contra la API key.

---

### 3. Arquitectura del Servicio de Búsqueda

#### ❌ `webSearchService.js` - Intento de llamada directa a APIs externas

```javascript
// Líneas 60-90 - VIOLACIÓN CORS
async searchWithTavily(query, options) {
  const apiKey = process.env.REACT_APP_TAVILY_API_KEY; // ← VACÍA
  
  // ❌ Intento de fetch directo desde navegador
  const response = await this.makeRequest('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, ... })
  });
}
```

**Consecuencia**: Errores CORS porque las APIs externas no permiten llamadas desde navegador.

---

### 4. Backend Funcional Pero No Utilizado

#### ✅ Servidor configurado correctamente

**Rutas**: `server/routes/webSearch.routes.js`
```javascript
router.post('/', webSearchController.buscarWeb);
router.post('/answer', webSearchController.responderBusquedaIA);
```

**Controlador**: `server/controllers/webSearch.controller.js`
- ✅ Maneja Tavily API correctamente
- ✅ Tiene fallbacks (Serper, Bing, simulación)
- ✅ API key configurada: `TAVILY_API_KEY=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`

**Registro en server/index.js**:
```javascript
app.use('/api/web-search', webSearchRoutes); // ← FUNCIONAL
```

#### ❌ Problema: Frontend no llama a este endpoint

El hook `useWebSearchTutor.js` usa `webSearchService.searchWeb()` que intenta APIs externas directamente en lugar de `/api/web-search`.

---

## 🛠️ Soluciones Requeridas

### Solución 1: Configurar Variable de Entorno (Temporal)

**Archivo**: `.env` (raíz del proyecto)
```env
# Cambiar de:
REACT_APP_TAVILY_API_KEY=

# A:
REACT_APP_TAVILY_API_KEY=configured  # Flag booleano, no la key real
```

**Propósito**: Permitir que el frontend detecte que el backend tiene búsqueda web disponible.

---

### Solución 2: Modificar webSearchService para usar Backend

**Archivo**: `src/services/webSearchService.js`

#### Cambio en método `searchWeb()`:

```javascript
async searchWeb(query, provider = this.defaultProvider, options = {}) {
  try {
    console.log(`🔍 Buscando en web vía backend: "${query}"`);
    
    // ✅ USAR ENDPOINT DEL BACKEND en lugar de APIs externas
    const response = await fetchWithTimeout('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        type: options.analysisType || 'general',
        maxResults: options.maxResults || this.maxResults
      })
    }, this.timeout);

    if (!response.ok) {
      throw new Error(`Backend search error: ${response.status}`);
    }

    const data = await response.json();
    
    // Formatear resultados del backend al formato esperado
    return (data.resultados || []).map(r => ({
      title: r.titulo,
      url: r.url,
      snippet: r.resumen,
      source: r.fuente,
      relevanceScore: r.score || 0,
      publishedDate: r.fecha
    }));
    
  } catch (error) {
    console.error('❌ Error en búsqueda web:', error);
    throw new Error(`Error en búsqueda web: ${error.message}`);
  }
}
```

#### Eliminar métodos innecesarios:
- `searchWithTavily()` - ❌ Borrar
- `searchWithSerper()` - ❌ Borrar  
- `searchWithDuckDuckGo()` - ❌ Borrar

**Razón**: Toda la lógica de proveedores ya está en el backend.

---

### Solución 3: Configurar Proxy de Desarrollo

**Archivo**: `src/setupProxy.js` (si existe) o `package.json`

#### Opción A: setupProxy.js
```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );
};
```

#### Opción B: package.json
```json
{
  "proxy": "http://localhost:3001"
}
```

---

### Solución 4: Validación Dinámica de Disponibilidad

**Archivo**: `src/components/ReadingWorkspace.js`

#### Agregar verificación en tiempo real:

```javascript
const [webSearchAvailable, setWebSearchAvailable] = useState(false);

useEffect(() => {
  // Verificar si el backend tiene búsqueda web disponible
  fetch('/api/web-search/test')
    .then(res => res.json())
    .then(data => {
      const available = data.configuracion?.serper_disponible || 
                       data.configuracion?.bing_disponible ||
                       data.configuracion?.tavily_disponible ||
                       false;
      setWebSearchAvailable(available);
      console.log('🌐 Búsqueda web disponible:', available);
    })
    .catch(err => {
      console.warn('❌ No se pudo verificar búsqueda web:', err);
      setWebSearchAvailable(false);
    });
}, []);

// Usar en WebEnrichmentButton
<WebEnrichmentButton
  query={prompt}
  disabled={!webSearchAvailable || !prompt.trim()}  // ← Validación dinámica
  contextBuilder={contextBuilder}
  onEnriched={...}
/>
```

---

## 📊 Estado de Componentes

| Componente | Archivo | Estado | Problema |
|-----------|---------|---------|----------|
| Backend Controller | `server/controllers/webSearch.controller.js` | ✅ Funcional | Ninguno |
| Backend Routes | `server/routes/webSearch.routes.js` | ✅ Registradas | Ninguno |
| Backend API Key | `server/.env` | ✅ Configurada | Ninguno |
| Frontend Service | `src/services/webSearchService.js` | ❌ Inútil | Intenta APIs externas |
| Frontend Hook | `src/hooks/useWebSearchTutor.js` | ⚠️ Problemático | Usa servicio incorrecto |
| UI Button | `src/components/chat/WebEnrichmentButton.js` | ⚠️ Deshabilitado | Prop `disabled` siempre true |
| Env Variable | `.env` (frontend) | ❌ Vacía | No flag de disponibilidad |
| Proxy Config | `setupProxy.js` / `package.json` | ❓ Revisar | Puede faltar |

---

## 🎯 Plan de Acción Inmediato

### Fase 1: Corrección Mínima (15 min)

1. **Configurar variable de entorno**:
   ```bash
   # En .env (raíz)
   REACT_APP_TAVILY_API_KEY=configured
   ```

2. **Reiniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

3. **Verificar backend**:
   ```bash
   curl http://localhost:3001/api/web-search/test
   ```

### Fase 2: Corrección Estructural (1 hora)

1. ✅ Refactorizar `webSearchService.js` para usar `/api/web-search`
2. ✅ Eliminar métodos de llamadas directas a APIs externas
3. ✅ Configurar proxy si es necesario
4. ✅ Implementar validación dinámica de disponibilidad

### Fase 3: Testing (30 min)

1. Cargar texto
2. Escribir pregunta en PromptBar
3. Verificar que botón "🌐 Con Web" esté **habilitado**
4. Click en botón
5. Verificar que:
   - Se ejecuta búsqueda
   - Se reciben resultados
   - Se enriquece el prompt
   - Se envía al tutor

---

## 🐛 Bugs Secundarios Detectados

### 1. Formato de Resultados Inconsistente

**Backend** retorna:
```javascript
{ titulo, resumen, url, fuente }
```

**Frontend** espera:
```javascript
{ title, snippet, url, source }
```

**Solución**: Normalizar en `webSearchService.js` al parsear respuesta.

### 2. Timeout Muy Corto

**Problema**: `fetchWithTimeout` usa 45s, pero búsqueda web puede tardar más.

**Solución**: Aumentar timeout específico para búsquedas:
```javascript
const response = await fetchWithTimeout('/api/web-search', options, 60000); // 60s
```

### 3. Error Handling Inadecuado

**Problema**: No hay UI feedback cuando falla la búsqueda.

**Solución**: Agregar toast/notification en `WebEnrichmentButton`:
```javascript
catch (e) {
  console.warn('[WebEnrichmentButton] Error', e);
  // ✅ Mostrar notificación al usuario
  alert('⚠️ No se pudo completar la búsqueda web. Intenta de nuevo.');
}
```

---

## 📝 Recomendaciones Arquitectónicas

### 1. Separar Preocupaciones

```
Frontend (React)
  ↓
  📡 API Call a /api/web-search
  ↓
Backend (Express)
  ↓
  🌐 Llamada a Tavily/Serper/DuckDuckGo
  ↓
  📊 Respuesta formateada
```

**Nunca**: Frontend → API Externa directamente ❌

### 2. Feature Flags

Implementar sistema de feature flags en `AppContext.js`:
```javascript
const [features, setFeatures] = useState({
  webSearch: false,
  ocr: false,
  tts: false
});

useEffect(() => {
  fetch('/api/features').then(r => r.json()).then(setFeatures);
}, []);
```

### 3. Modo Offline/Fallback

Cuando no hay API keys configuradas, mostrar mensaje útil:
```javascript
if (!webSearchAvailable) {
  return (
    <Btn disabled title="Búsqueda web no disponible. Contacta al administrador para configurar API keys.">
      🌐 Con Web (No disponible)
    </Btn>
  );
}
```

---

## ✅ Checklist de Validación

- [ ] `.env` tiene `REACT_APP_TAVILY_API_KEY=configured`
- [ ] `server/.env` tiene `TAVILY_API_KEY` válida
- [ ] Backend responde en `GET /api/web-search/test`
- [ ] `webSearchService.js` llama a `/api/web-search` en lugar de APIs externas
- [ ] Proxy configurado (si necesario)
- [ ] Botón "Con Web" se habilita cuando hay texto en input
- [ ] Click en botón ejecuta búsqueda
- [ ] Resultados se reciben del backend
- [ ] Prompt se enriquece correctamente
- [ ] Evento `tutor-external-prompt` se dispara
- [ ] TutorDock recibe el prompt enriquecido

---

## 🔧 Scripts de Diagnóstico

### Test Manual Backend
```bash
curl -X POST http://localhost:3001/api/web-search \
  -H "Content-Type: application/json" \
  -d '{"query":"inteligencia artificial educación","maxResults":3}'
```

### Test Manual Frontend (Consola del Navegador)
```javascript
fetch('/api/web-search/test')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Test Integración Completa
```javascript
// En consola del navegador con la app abierta
const testWebSearch = async () => {
  const response = await fetch('/api/web-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'cambio climático ecuador',
      maxResults: 3
    })
  });
  const data = await response.json();
  console.log('✅ Resultados:', data);
};
testWebSearch();
```

---

## 📚 Documentación Relacionada

- **Arquitectura**: `ARQUITECTURA.md` - Sección "Enriquecimiento Web"
- **Backend**: `server/controllers/webSearch.controller.js` - Implementación
- **Hooks**: `src/hooks/useWebSearchTutor.js` - Hook de integración
- **UI**: `src/components/chat/WebEnrichmentButton.js` - Componente botón

---

**Próximos Pasos**: Implementar correcciones en el orden sugerido y validar funcionalidad end-to-end.
