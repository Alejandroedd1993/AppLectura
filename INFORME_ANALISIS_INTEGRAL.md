# Informe Integral de Análisis - AppLectura

**Fecha del Análisis:** 6 de marzo de 2026
**Objetivo:** Análisis profundo de la arquitectura, código, y relaciones entre archivos en todo el proyecto.

## 1. Visión General de la Arquitectura

La aplicación está diseñada como un sistema cliente-servidor clásico moderno:
- **Frontend:** React 18, React Router v7, manejador de estado global mediante Context API, diseño modular (Componentes + Hooks + Servicios).
- **Backend:** Node.js / Express actuando principalmente como **BFF (Backend for Frontend)** y API Gateway para servicios de Inteligencia Artificial (OpenAI, DeepSeek, Gemini) y procesamiento pesado (PDF, OCR).
- **Capa de Datos Móvil:** Altísima dependencia de `localStorage`, `sessionStorage` y sincronización con Firebase Firestore.

La arquitectura descrita en el archivo `ARQUITECTURA.md` tiene **desfases con la realidad del código fuente**. Por ejemplo, el documento describe un sistema centralizado en `useApiConfig`, pero este archivo no existe. La delegación recae sobre `unifiedAiService.js` interactuando directamente con el servidor.

---

## 2. Análisis del Directorio y Estructura (Directorio a Directorio)

### Raíz del Proyecto
Contiene un enjambre de archivos markdown relacionados con el diseño (`ARQUITECTURA.md`, `CONFIGURACION_APIS.md`, `PROMPTS_*.md`), configuraciones de despliegue (`render.yaml`, `vercel.json`, `firebase.json`), y wrappers de inicio. 
✅ **Lo bueno:** Está todo muy bien documentado, con reportes históricos de auditorías.
❌ **Lo malo:** Hay mucho "ruido" en la raíz. Los archivos `diff-*.txt` o backups (`PROMPTS_...backup`) deberían estar ignorados o en carpetas de documentación/historial, ya que ensucian la raíz.

### `server/` (Backend Express)
✅ **Lo bueno:** Está modularizado correctamente. `index.js` define configuraciones y pasa la responsabilidad a archivos dentro de `controllers/` y `routes/`. Existen servicios específicos en `services/` (ej. `ocr.service.js`, `analisis.service.js`). Las validaciones de entorno para API Keys están bien implementadas al arrancar el servidor.
❌ **Lo malo:** En el `index.js` del backend se hardcodea el mock de `OpenAI` para `deepseek-chat` y `gpt-4o-mini`. Sería más limpio encapsular la instanciación de los clientes IA en un módulo tipo `apiClients.js` o `llmFactory.js` (como dice la documentación, pero que no está tan abstracto en `index.js`).

### `src/components/`, `src/hooks/`, `src/services/`
✅ **Lo bueno:** Altísima modularidad por dominio de negocio (p.ej.: `pedagogy/`, `evaluacion/`, `auth/`, `analytics/`). Los Customs Hooks son extensos y separan lógicas muy específicas (`useTutorPersistence`, `useFollowUpQuestion`).
❌ **Lo malo:** Fragmentación excesiva en algunos puntos. Existen componentes duplicados o con nombres asincrónicos (ej.: `App.js` en lugar de `App_nueva_interfaz.js` como dicta `ARQUITECTURA.md`).

---

## 3. Calidad del Código y Deuda Técnica

### El problema del "God Object": `AppContext.js`
El caso más crítico de la aplicación es `src/context/AppContext.js`.
- **Tamaño:** ~5,900 líneas de código.
- **Responsabilidades (Baja Cohesión):** Maneja caché, control de timeouts de lectura, estado de archivos cargados, persistencia híbrida (localStorage/Firestore), feature flags de seguridad, limpieza de borradores, control de historial... TODO pasa por este archivo.
- **Acoplamiento Alto:** Cualquier componente que importe `AppContext` queda suscrito a miles de recreaciones de `useCallback` y `useMemo`. Aunque React maneja esto internamente, los re-renders desperdiciados son un cuello de botella.
- **Solución Propuesta:** Fracturar este Contexto en 3 o 4 contextos especializados: 
  1. `Session&SyncContext` (Firebase + LocalStorage).
  2. `ReadingContext` (Texto actual, PDFs cargados, analítica temporal).
  3. `UIPreferencesContext` (Modo oscuro, focus mode, toolbars).

### Patrones de Sincronización (Race Conditions)
Se nota un esfuerzo extremo en el código por evitar *race conditions* entre `localStorage` y Firebase (comentarios como `// 🛡️ Anti-loop: cuando el progreso se actualiza`). Esto sugiere que la arquitectura de sincronización inicial fue defectuosa e intentaron poner "curitas".
- **Recomendación:** Implementar una librería robusta de manejo de estado en caché asíncrono como **React Query** o **SWR**, en lugar de intentar sincronizar manualmente memorias locales con Firebase a través de docenas de variables estáticas `useRef()`.

### Limpieza de Código (Dead Code)
Existen backups y versiones anteriores que ya no se usan (ej. se menciona en la documentación, pero hay rastros en `package.json` en los test exclusions como `!src/**/*_backup.js`). El código de producción no debería convivir con archivos marcados como backups o duplicados directamente en el control de versiones local de esa manera.

---

## 4. Problemas Inter-Archivos y Dependencias
- Existen cruces de responsabilidades donde el `AppContext.js` importa métodos directamente de `sessionManager.js` pero al mismo tiempo implementa lógicas de respaldo que colisionan conceptualmente. 
- La arquitectura delegó demasiada lógica de negocio a la capa de vista superior (`App.js` y `AppContext.js`). `App.js` ocupa más de 800 líneas porque controla manualmente la visualización de los Tabs con *switch-cases* y la limpieza del *storage* según las condiciones de renderizado. 

---

## 5. Prácticas Recomendables Identificadas ✅
A pesar de la deuda técnica masiva en el estado global, el proyecto brilla en:
1. **Atención a la Pedagogía:** El módulo `pedagogy/` y los controladores de evaluación denotan una programación alineada fuertemente con la lógica de negocio real (evaluación criterial, taxonomía de Bloom, seguimiento de heurísticas de debate). Esto es ingeniería de muy alto nivel.
2. **Observabilidad:** Muy buen uso del módulo `logger.js` (enmascaramiento en logs usando envoltorios en lugar de `console.log` puros) y mediciones de performance en el backend.
3. **Resiliencia API:** El módulo `unifiedAiService.js` tiene timeouts centralizados formales (`fetchWithTimeout`), truncamiento defensivo de tokens para no colapsar la app y manejo explícito de errores HTTP.

---

## RESUMEN Y PLAN DE ACCIÓN RECOMENDADO

1. **Corto Plazo (Refactorización de Documentación y Basura):** Eliminar todos los archivos detectados en la raíz que terminan en `.backup` o `diff*.txt`. Modificar `ARQUITECTURA.md` para que refleje que la centralización pasa por el Backend (vía `unifiedAiService.js`) y no por un hook de cliente imaginario (`useApiConfig`).
2. **Mediano Plazo (React Query / Zustand):** Extraer partes del gigantesco `AppContext.js`. Empezar moviendo todas las funciones puras de Firebase/Sync a Custom Hooks que manejen estado local y solo comuniquen triggers al exterior. Reemplazar la monstruosa sincronización local con el storage por una cola de mensajes en background.
3. **Alto Plazo (Desacoplar Vista de Lógica):** `App.js` debe utilizar las capacidades nativas de enrutado de `react-router-dom` para manejar los tabs y vistas (`/lectura`, `/análisis`), en lugar de cambiar estados booleanos locales que ocultan o demuestran Vistas en memoria, consumiendo la memoria del DOM para componentes que no se están viendo actualmente.
