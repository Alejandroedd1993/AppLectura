# 🔍 Auditoría de Consumo de API DeepSeek

> **Fecha**: 2025-12-26
> **Contexto**: Usuario reporta consumo anormal de saldo ($3.21 en ~3 días de pruebas)

---

## 📊 Datos del Dashboard DeepSeek

| Fecha | deepseek-chat | deepseek-reasoner | Requests (chat) | Requests (reasoner) |
|-------|---------------|-------------------|-----------------|---------------------|
| 2025-12-22 | <$0.01 | $0.95 | ~50 | ~600 |
| 2025-12-23 | $0.53 | $0.83 | 436 | ~1,100 |
| **TOTAL** | **~$0.53** | **~$1.78** | **793** | **1,738** |

### 🚨 Hallazgo Principal

**El modelo `deepseek-reasoner` representa el 77% del costo total** (~$1.78 de $2.31), pero **AppLectura NO usa `deepseek-reasoner`**.

---

## 🔬 Análisis del Código de AppLectura

### Archivos que llaman a DeepSeek API

| Archivo | Modelo usado | Propósito |
|---------|--------------|-----------|
| `server/controllers/preLectura.controller.js:852` | `deepseek-chat` | Análisis de pre-lectura |
| `server/services/deepseek.service.js:26` | `deepseek-chat` | Análisis de texto general |
| `server/services/notes.service.js:97` | `deepseek-chat` | Generación de notas |
| `server/controllers/glossary.controller.js:357` | `deepseek-chat` | Generación de glosario |

### ✅ Verificación de código

```bash
# Búsqueda de "deepseek-reasoner" en todo el proyecto
Get-ChildItem -Recurse -Include "*.js" | Select-String "reasoner"
# RESULTADO: Solo en node_modules (no en código de la app)
```

**Conclusión**: El código de AppLectura **SOLO** usa el modelo `deepseek-chat`. No hay ninguna referencia a `deepseek-reasoner` en el código de la aplicación.

---

## 🧩 Posibles Causas del Consumo de `deepseek-reasoner`

### 1. 🔴 **CAUSA MÁS PROBABLE: Uso de la misma API key en otro servicio**

Si tu `DEEPSEEK_API_KEY` está configurada en:
- **Cursor** (integración de AI)
- **VS Code + Copilot/extensión DeepSeek**
- **Otro proyecto/aplicación**
- **Herramientas CLI como `aider`, `continue.dev`, etc.**

Estos servicios podrían estar usando el modelo `deepseek-reasoner` (más caro pero más potente) automáticamente.

**Verificación sugerida**:
1. Buscar en tu `.bashrc`, `.zshrc` o variables de entorno del sistema:
   ```bash
   echo $DEEPSEEK_API_KEY
   ```
2. Revisar configuración de Cursor: Settings → AI → Model
3. Revisar extensiones de VS Code que usen DeepSeek

### 2. 🟠 **Posible: Loops de análisis en el frontend**

Aunque menos probable, podrían existir:
- `useEffect` sin dependencias correctas que disparen análisis repetidamente
- Errores de red que causan reintentos automáticos

**Estado actual**: No se encontró evidencia de loops en el código.

### 3. 🟡 **Posible: Herramienta de desarrollo usando la key**

Si estás usando herramientas como:
- **Antigravity/Gemini Code** (este asistente)
- Extensiones de IDE con modelos de DeepSeek
- Scripts de automatización

---

## 📋 Recomendaciones Inmediatas

### PRIORIDAD ALTA

1. **Rotar la API key de DeepSeek**
   - Generar nueva key en dashboard de DeepSeek
   - Actualizar `.env` de AppLectura con la nueva key
   - NO compartir con otros proyectos/herramientas

2. **Verificar herramientas de desarrollo**
   - Cursor: Settings → Features → AI → check modelo
   - VS Code: buscar extensiones que usen DeepSeek
   - Revisar otros proyectos locales con `.env` que tengan `DEEPSEEK_API_KEY`

3. **Agregar Rate Limiting en AppLectura** (pendiente H-012)
   - Limitar requests por usuario/IP
   - Implementar en endpoints `/api/analysis/*`

### PRIORIDAD MEDIA

4. **Implementar logging de requests de IA**
   ```javascript
   // En preLectura.controller.js
   console.log(`[AI_REQUEST] ${new Date().toISOString()} model=deepseek-chat prompt_length=${prompt.length}`);
   ```

5. **Verificar caché funciona correctamente**
   - Cache de localStorage en frontend (TTL 24h)
   - Cache in-memory de web search (TTL 5 min)

---

## 🔍 Análisis de Puntos de Entrada a APIs

### Cuántas llamadas por análisis

Por cada texto analizado en AppLectura, se realizan:
1. **1 llamada a DeepSeek** (`callDeepSeekAnalysis`) - ~3000-8000 tokens
2. **1 llamada a OpenAI** (`detectAndExtractFigurasRetoricas`) - ~500 tokens
3. **0-3 llamadas a web search** (si `ENABLE_WEB_SEARCH=true`, actualmente deshabilitado)

**Estimación de costo por análisis**: ~$0.002-$0.005 usando `deepseek-chat`

### Protecciones existentes

- ✅ Cache de localStorage (24h TTL)
- ✅ Guard contra análisis durante restauración de sesión
- ✅ Validación de texto mínimo (100 caracteres)
- ⚠️ Sin rate limiting (H-012 pendiente)

---

## 📝 Conclusión

El consumo anormal de `deepseek-reasoner` **NO proviene de AppLectura**. La aplicación solo usa `deepseek-chat`.

La causa más probable es que la misma API key está siendo usada por otra herramienta (IDE, asistente de código, otro proyecto).

**Acción inmediata recomendada**: Rotar la API key y verificar qué herramientas la tienen configurada.
