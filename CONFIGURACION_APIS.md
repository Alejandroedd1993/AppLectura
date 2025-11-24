# Configuración de APIs - AppLectura

**Fecha:** 29 de octubre de 2025  
**Estado:** ✅ DeepSeek preconfigurada y funcionando

---

## 🎯 Resumen Ejecutivo

**La aplicación funciona SIN configuración adicional** usando DeepSeek como API predeterminada. OpenAI y Gemini son opcionales para mayor calidad.

---

## 📊 Estado Actual de las APIs

### ✅ DeepSeek (PREDETERMINADA - YA CONFIGURADA)

**Estado:** Activa y funcionando  
**API Key:** `sk-0632e6fd405b41f3bd4db539bb60b3e8`  
**Ubicación:** Hardcoded en `server/index.js` línea 40  
**Requiere configuración del usuario:** ❌ NO

```javascript
// server/index.js línea 38-42
deepseek: {
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || 'sk-0632e6fd405b41f3bd4db539bb60b3e8',
  model: 'deepseek-chat'
}
```

**Características:**
- ✅ Gratuita con límite diario (50 requests)
- ✅ Funciona para chat, análisis, evaluación
- ✅ No requiere API key del usuario
- ✅ Configurada automáticamente

---

### ⭕ OpenAI (OPCIONAL)

**Estado:** Disponible si el usuario configura  
**Ubicación:** `process.env.OPENAI_API_KEY`  
**Requiere configuración del usuario:** ✅ SÍ

**Cómo obtener API key:**
1. Ir a https://platform.openai.com/api-keys
2. Crear cuenta/iniciar sesión
3. Crear nueva API key
4. Añadir a archivo `.env`:
   ```
   OPENAI_API_KEY=tu-api-key-aqui
   ```

**Características:**
- 💰 De pago (requiere billing en OpenAI)
- ✅ Alta calidad de respuestas
- ✅ Modelo usado: `gpt-4o-mini`
- ✅ Usado en estrategia dual para análisis profundos

---

### ⭕ Gemini (OPCIONAL)

**Estado:** Disponible si el usuario configura  
**Ubicación:** `process.env.GEMINI_API_KEY`  
**Requiere configuración del usuario:** ✅ SÍ

**Cómo obtener API key:**
1. Ir a https://makersuite.google.com/app/apikey
2. Crear cuenta/iniciar sesión
3. Crear nueva API key
4. Añadir a archivo `.env`:
   ```
   GEMINI_API_KEY=tu-api-key-aqui
   ```

---

## 🔧 Arquitectura de Configuración

### 1. Backend (`server/index.js`)

```javascript
const aiClient = {
  async complete({ provider = 'deepseek', prompt, response_format }) {
    const config = {
      deepseek: {
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY || 'sk-0632e6fd405b41f3bd4db539bb60b3e8', // ← FALLBACK HARDCODED
        model: 'deepseek-chat'
      },
      openai: {
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY, // ← Del archivo .env
        model: 'gpt-4o-mini'
      }
    };
    
    const selectedConfig = config[provider] || config.deepseek;
    const client = new OpenAI({
      baseURL: selectedConfig.baseURL,
      apiKey: selectedConfig.apiKey,
    });
    
    // ... llamada a la API
  }
};
```

**Flujo:**
1. Si `process.env.DEEPSEEK_API_KEY` existe → usa esa
2. Si NO existe → usa la hardcoded `sk-0632e6fd405b41f3bd4db539bb60b3e8`
3. **Resultado:** DeepSeek SIEMPRE funciona

---

### 2. Frontend (`src/config/aiProviders.js`)

```javascript
export const AI_PROVIDERS = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    free: true,
    dailyLimit: 50,
    apiKeyRequired: false, // ← NO requiere key del usuario
    status: 'active'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    free: false,
    apiKeyRequired: true, // ← SÍ requiere key del usuario
    status: 'active'
  }
};

export const DEFAULT_PROVIDER = 'deepseek';
```

---

### 3. Hook de Configuración (`src/hooks/useApiConfig.js`)

```javascript
// Línea 75-76: DeepSeek siempre disponible
if (providerId === 'deepseek') return true;

// Línea 78-79: Otros requieren API key del usuario
if (provider.apiKeyRequired && !apiKeys[providerId]) return false;

// Línea 196-208: Verificar si está configurado
if (currentProvider === 'deepseek') {
  isConfigured = true; // ← SIEMPRE configurado
} else if (activeProvider?.apiKeyRequired) {
  isConfigured = !!activeProvider.apiKey; // ← Verificar key del usuario
}
```

---

## 🐛 Problema Resuelto: "Configura tu API de IA"

### ❌ Error Original

En `TablaACD.js` línea 491:
```javascript
if (!activeProvider?.configured) {
  return <div>Configura tu API de IA para usar esta función</div>;
}
```

**Problema:** La propiedad `.configured` NO existe en `activeProvider`.

### ✅ Solución Aplicada

Se eliminó la verificación innecesaria:
```javascript
// Verificación eliminada - el backend siempre tiene DeepSeek configurada
if (!texto) {
  return <div>Carga un texto para comenzar</div>;
}
```

**Justificación:**
1. DeepSeek está hardcoded en el backend
2. `ResumenAcademico.js` tampoco verifica configuración
3. La evaluación funcionará siempre con DeepSeek por defecto

---

## 📋 Verificación de Estado

### Verificar que DeepSeek funciona:

1. **Backend (`server/index.js`):**
   - ✅ Línea 40: API key hardcoded como fallback
   - ✅ Línea 34-80: `aiClient` configurado

2. **Frontend (`src/config/aiProviders.js`):**
   - ✅ Línea 7-24: DeepSeek definido
   - ✅ Línea 16: `apiKeyRequired: false`

3. **Hook (`src/hooks/useApiConfig.js`):**
   - ✅ Línea 75-76: DeepSeek siempre disponible
   - ✅ Línea 199-201: DeepSeek siempre configurado

---

## 🚀 Estrategia Dual AI

La aplicación usa **dos IAs simultáneas** para evaluaciones:

### TablaACD (Rúbrica 2):
```javascript
// Fase 1: DeepSeek (precisión estructural)
const deepseekResult = await chatCompletion({
  provider: 'deepseek',
  messages: [{ role: 'user', content: promptDeepSeek }],
  temperature: 0.2,
  max_tokens: 1500
});

// Fase 2: OpenAI (profundidad crítica)
const openaiResult = await chatCompletion({
  provider: 'openai',
  messages: [{ role: 'user', content: promptOpenAI }],
  temperature: 0.3,
  max_tokens: 1800
});

// Fase 3: Combinar feedback
const merged = mergeFeedback(deepseekResult, openaiResult);
```

**¿Qué pasa si no hay OpenAI configurada?**
- ✅ El servicio `unifiedAiService.js` tiene fallback a DeepSeek
- ✅ Usará DeepSeek para ambas fases
- ✅ La evaluación funcionará, pero sin la profundidad de OpenAI

---

## 🔒 Seguridad y Buenas Prácticas

### ⚠️ ADVERTENCIA: API Key Hardcoded

**Ubicación:** `server/index.js` línea 40  
**API Key expuesta:** `sk-0632e6fd405b41f3bd4db539bb60b3e8`  
**Riesgo:** 🔴 CRÍTICO

**Esta API key está expuesta en el código fuente**, lo que significa:
1. ❌ Cualquiera con acceso al código puede usarla
2. ❌ Si se sube a GitHub, es pública
3. ❌ Puede ser revocada por DeepSeek por abuso

### ✅ Solución Recomendada

**Opción A: Usar archivo .env (RECOMENDADO)**

1. Crear archivo `.env` en la raíz del proyecto:
   ```
   DEEPSEEK_API_KEY=sk-0632e6fd405b41f3bd4db539bb60b3e8
   PORT=5000
   NODE_ENV=development
   ```

2. Añadir `.env` a `.gitignore`:
   ```
   # .gitignore
   .env
   .env.local
   ```

3. El código en `server/index.js` línea 40 **YA está preparado** para leer de `.env`:
   ```javascript
   apiKey: process.env.DEEPSEEK_API_KEY || 'sk-0632e6fd405b41f3bd4db539bb60b3e8'
   ```

**Opción B: Eliminar fallback hardcoded**

Si quieres forzar el uso de `.env`:
```javascript
// Cambiar línea 40 de:
apiKey: process.env.DEEPSEEK_API_KEY || 'sk-0632e6fd405b41f3bd4db539bb60b3e8'

// A:
apiKey: process.env.DEEPSEEK_API_KEY
```

Y validar al inicio del servidor:
```javascript
if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ ERROR: DEEPSEEK_API_KEY no configurada en .env');
  process.exit(1);
}
```

---

## 📝 Instrucciones de Setup (Para Usuarios)

### Setup Mínimo (Solo DeepSeek - Ya funciona)

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar backend
npm run server

# 3. Iniciar frontend
npm start

# ✅ La app funcionará con DeepSeek sin configuración adicional
```

### Setup Completo (DeepSeek + OpenAI + Gemini)

```bash
# 1. Crear archivo .env en la raíz
touch .env

# 2. Editar .env y añadir:
DEEPSEEK_API_KEY=sk-0632e6fd405b41f3bd4db539bb60b3e8
OPENAI_API_KEY=tu-key-de-openai
GEMINI_API_KEY=tu-key-de-gemini
PORT=5000

# 3. Reiniciar backend
npm run server

# ✅ La app usará OpenAI para análisis duales
```

---

## 🧪 Verificar Configuración

### Test de DeepSeek:

```bash
# En el navegador, abre DevTools (F12) y ejecuta:
console.log('Verificando DeepSeek...');

# Luego ve a Actividades > Análisis del Discurso
# Si NO pide configurar API, DeepSeek funciona ✅
```

### Test de Evaluación Dual:

```bash
# En DevTools, verifica los logs del backend al evaluar:
# Deberías ver:
🤖 [aiClient] Usando deepseek con modelo deepseek-chat
✅ [aiClient] Respuesta recibida: 1234 caracteres

🤖 [aiClient] Usando openai con modelo gpt-4o-mini
✅ [aiClient] Respuesta recibida: 1567 caracteres
```

---

## 📊 Resumen de Estado

| API | Estado | Configuración Usuario | Fallback |
|-----|--------|----------------------|----------|
| **DeepSeek** | ✅ Activa | ❌ No requiere | Hardcoded |
| **OpenAI** | ⭕ Opcional | ✅ Requiere `.env` | DeepSeek |
| **Gemini** | ⭕ Opcional | ✅ Requiere `.env` | DeepSeek |

---

## ✅ Correcciones Aplicadas

1. ✅ Eliminada verificación `activeProvider?.configured` en `TablaACD.js`
2. ✅ Eliminado import innecesario de `useApiConfig` en `TablaACD.js`
3. ✅ Exportadas funciones `getDimension` y `scoreToLevelDescriptor` en `criticalLiteracyRubric.js`
4. ✅ Documentada arquitectura de APIs
5. ✅ Identificado riesgo de seguridad (API key hardcoded)

---

**Estado final:** ✅ La aplicación funciona correctamente con DeepSeek sin necesidad de configuración adicional del usuario.




