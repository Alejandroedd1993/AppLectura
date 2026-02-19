
# Informe de Auditoría Técnica y Funcional - Mi Aplicación de Lectura

## 1. Resumen Ejecutivo

La aplicación "Mi Aplicación de Lectura" tiene una base sólida en React con mejoras recientes de rendimiento y una migración importante de la integración de IA al backend. El proyecto cumple buena parte de los requisitos funcionales y cuenta con una arquitectura más segura tras centralizar los llamados a la IA. Persisten pendientes de seguridad (endurecimiento de API), pruebas automatizadas y resiliencia de red.

## 2. Hallazgos Críticos y Vulnerabilidades

### 2.1. Exposición de la Clave de API de OpenAI (Solucionado)

*   Riesgo: Crítico.
*   Descripción: La clave se usaba en el frontend, quedando expuesta a usuarios.
*   Estado: Solucionado. Ahora el frontend llama a un endpoint del backend y las claves residen en `server/.env`.

### 2.2. Ausencia de Pruebas Automatizadas

*   Riesgo: Crítico.
*   Descripción: Falta de suite de pruebas unitarias/integración/E2E que garantice no-regresiones.
*   Recomendación: Incorporar Jest + React Testing Library (unidad e integración) y MSW para mocks de red. E2E opcional con Playwright.

### 2.3. Envío opcional de apiKey desde el frontend (pendiente de eliminar)

*   Riesgo: Alto en producción; Moderado durante la fase de creación.
*   Descripción: Aunque el backend ya gestiona las claves, persiste la posibilidad de enviar `apiKey` en el cuerpo de la petición desde el frontend en algunos flujos históricos.
*   Recomendación: Eliminar el envío de `apiKey` desde el frontend, depender exclusivamente de `server/.env` y rotar cualquier clave que se haya compartido antes. Asegurar `server/.env` en `.gitignore` (verificado) y revisar commits previos.
*   Estado: En curso. Se planifica su retirada antes de una beta pública o cualquier despliegue externo.

### 2.4. Endurecimiento de API: timeouts, reintentos, rate limiting y CORS

*   Riesgo: Alto.
*   Descripción: Los llamados a proveedores IA y al backend no aplican timeouts/reintentos consistentes; CORS es laxo; no hay rate limiting.
*   Recomendación: Añadir timeouts y 1 reintento exponencial para 5xx/timeouts (FE/BE), configurar CORS restrictivo por entorno y habilitar rate limiting básico en el backend.

### 2.5. Dependencia PDF no compatible (mitigada)

*   Riesgo: Medio.
*   Descripción: `pdf-parse` fallaba con Node 22. La ruta de PDF está actualmente simulada.
*   Recomendación: Reemplazar por alternativa compatible o isolar en un microservicio/worker; mantener fallback seguro.

## 3. Estado Arquitectónico y Proveedores de IA

*   Backend unificado: `/api/chat/completion` usando SDK oficial de OpenAI y `baseURL` conmutado para DeepSeek/OpenAI.
*   Configuración en `server/.env` (claves, modelo por defecto, `BACKEND_PORT`).
*   UI de selección de proveedor (OpenAI/Gemini/DeepSeek) con DeepSeek como opción "gratis" por defecto.
*   Scripts y tareas para Windows ajustados (PowerShell y `.bat`).

## 4. Mejoras de Rendimiento

### 4.1. Virtualización del Visor de Texto (Implementado)

*   Riesgo: Alto.
*   Descripción: Para documentos grandes, se activa virtualización con `react-virtuoso`.
*   Estado: Implementado.

### 4.2. Carga Perezosa y Memoización (Implementado)

*   Lazy loading de vistas pesadas con `React.lazy/Suspense`.
*   `useMemo`/`useCallback` y memo de componentes para evitar renders innecesarios.

### 4.3. Monitor y Dashboard de Performance (Implementado)

*   Módulo de medición y panel de diagnóstico activables en desarrollo para seguimiento de latencias y renders.

## 5. Recomendaciones Adicionales

### 5.1. Refactorización de Componentes Complejos

*   Dividir `LecturaInteractiva` en subcomponentes (Visor, ChatPanel, ListaMensajes, InputBar) y extraer un hook `useChatTutor`.

### 5.2. Respuestas de IA en JSON

*   Instruir al modelo para responder en JSON y parsear de forma segura; evitar regex frágiles.

### 5.3. Accesibilidad (a11y)

*   Asegurar navegación por teclado, `aria-label`/`role` apropiados y contraste; revisar tooltips y controles flotantes.

### 5.4. Separar dependencias FE/BE

*   Mantener `package.json` separados (ya existen en `server/` y raíz); alinear scripts de dev/producción.

## 6. Plan de Acción Priorizado

1) Seguridad (alto):
	- Eliminar por completo `apiKey` del body del frontend y rotar claves.
	- CORS por entorno y rate limiting en backend.
2) Resiliencia (alto):
	- Timeouts y 1 reintento en FE/BE; manejo de errores con mensajes claros.
3) Mantenibilidad (medio):
	- Refactor de `LecturaInteractiva` a subcomponentes + hook.
	- Reducir logs y proteger detrás de `DEBUG`.
4) Pruebas (alto):
	- Unitarias: preparación de contexto y utilidades de texto.
	- Integración (RTL + MSW): flujo de chat feliz, 400 falta de clave, timeout.
5) PDF (medio):
	- Evaluar alternativa a `pdf-parse` en Node 22 o servicio externo.

## 7. Conclusión

La app progresa en seguridad y rendimiento al mover la IA al backend y optimizar el render. Completar el endurecimiento de API, la suite de pruebas y la refactorización incremental consolidará la estabilidad a largo plazo.

---

## 7.1 Alineación con diseño pedagógico (oct 2025)

- Modo Tutor no evaluativo se ubica en “Itinerario de lectura”; el visor sin IA se denomina “Lectura guiada”.
- La evaluación formal (quiz + ensayo rubricado) vive en la pestaña “Evaluación”.
- Se prevé integrar Firebase (Auth/Storage/Firestore) para identidades, asignación de lecturas a clases y métricas docentes. Ver [DISEÑO_ITINERARIO_Y_EVALUACION.md](./DISEÑO_ITINERARIO_Y_EVALUACION.md).

---

## Anexo A. Auditoría de la vista “Solo Lectura”

Archivo principal: `src/VisorTexto_responsive.js` (usado cuando la pestaña activa en `App.js` es `lectura`).

Resumen funcional:
* Entrada: `texto: string` desde `AppContext`.
* Salida: visor optimizado con controles de tipografía, modo enfoque, barra de progreso, estadísticas y tooltips de selección.
* Render: párrafos normalizados; virtualización con `react-virtuoso` cuando `paragraphs.length > 1000`.

Puntos positivos:
* Virtualización lista para textos muy grandes; estilos y layout responsivo.
* Cálculo memoizado de párrafos y métricas; control de tamaño/altura de línea.
* Barra de progreso fija y botones flotantes (inicio/fin/alternar progreso).
* Tooltip contextual para selección (analizar, crear nota, copiar) desacoplado de IA.

Riesgos y oportunidades de mejora:
1. Umbral de virtualización fijo (1000): puede ser tardío según dispositivos/textos. Sugerido: activar por tamaño de DOM o por caracteres totales (> ~150k) y desactivar animaciones cuando se virtualiza.
2. Animaciones en lista larga: `framer-motion` por párrafo puede impactar en textos medianos. Deshabilitar animaciones cuando `paragraphs.length > 200`.
3. Progreso por event listener de scroll: aplicar `throttle` (p. ej. `requestAnimationFrame`) o `IntersectionObserver` para precisión y menor costo.
4. Tooltip y a11y: añadir `aria-label` a botones, navegación con teclado y cierre con `Escape`. Considerar portal para evitar clipping y mejorar lectura por screen readers.
5. Selección de texto: usar evento `selectionchange` y un `debounce` corto para evitar cálculos reiterados; ocultar tooltip en móviles cuando no sea usable.
6. Estadísticas: el conteo de palabras sobre `texto.split(/\s+/)` es O(n). Es aceptable, pero conviene cachear por hash del texto si se recalcula con frecuencia.
7. Seguridad: React escapa contenido por defecto, bajo riesgo de XSS si el texto se inserta como children (no se usa `dangerouslySetInnerHTML`). Mantener así.

Pruebas mínimas sugeridas (vista Solo Lectura):
* Render con texto vacío → muestra `EmptyState`.
* Render con > 1000 párrafos simulados → `Virtuoso` se activa y no se bloquea la UI.
* Ajuste de tipografía (A-/A+) actualiza `fontSize`/`lineHeight`.
* Barra de progreso avanza al hacer scroll (con mock de `scroll*`).
* Tooltip aparece con selección > 5 caracteres y ejecuta acciones básicas (copiado mockeado).

Checklist rápido de a11y:
* Botones con `title` ya presentes; añadir `aria-label` y `role="button"` donde aplique.
* Enfocables con teclado y estilos `:focus-visible`.
* Contraste suficiente en temas claro/oscuro.

Estado: La vista "Solo Lectura" es estable y eficiente para la mayoría de casos. Con los ajustes propuestos (virtualización más temprana, throttle/observer, mejoras a11y y limitación de animaciones) puede cubrir escenarios de textos muy extensos y dispositivos modestos con mejor UX.

---

## Actualización Septiembre 2025

Contexto de fase: El proyecto se encuentra en etapa de creación/desarrollo. Los riesgos de seguridad señalados (por ejemplo, envío opcional de `apiKey`) no impactan entornos públicos aún; no obstante, deben resolverse antes de la beta pública.

Acciones priorizadas (delta):
1) Seguridad y resiliencia (prioridad media ahora; alta previo a publicación):
	- Eliminar `apiKey` del body del frontend y rotar claves usadas previamente.
	- Timeouts (20–30s) y 1 reintento exponencial para 5xx/timeouts en FE/BE.
	- CORS restrictivo por entorno y rate limiting básico (p. ej. 60 rpm/IP) en backend.
2) Solo Lectura – quick wins:
	- Virtualización basada en caracteres totales (>150k) o >500–600 párrafos.
	- Desactivar animaciones por párrafo si hay >200 párrafos o cuando se virtualiza.
	- `requestAnimationFrame`/throttle para progreso de scroll; opción `IntersectionObserver`.
	- A11y del visor: `aria-label`, `aria-pressed`, foco visible y cierre del tooltip con Escape; ocultarlo en dispositivos táctiles.
3) Pruebas mínimas: unitarias de normalización/estadísticas, integración de `/api/chat/completion` (200/4xx/5xx), y casos de Solo Lectura (empty, virtualizado, tooltip/copiado).

---

## Anexo B. Auditoría del Sistema de Evaluación

Archivo principal: `src/components/SistemaEvaluacion.js` (pestaña “Evaluación” en `App.js`).

Resumen funcional:
* Genera preguntas de comprensión (literal/inferencial/crítico) y evalúa respuestas del usuario con puntuación y comentario.
* Usa `useApiConfig` para obtener un cliente IA en frontend; limita el contexto del texto para prompts.

Hallazgos clave:
1. Métodos faltantes en `GeneradorPreguntasInteligente` (bloqueo en runtime): se invocan `obtenerPreguntasAnteriores`, `registrarPregunta`, `limpiarHistorial` que no existen.
2. Cliente IA en frontend (diverge del enfoque unificado en backend): riesgo de inconsistencias y bloqueo si `isConfigured` es falso aunque el backend esté listo.
3. Prompt y parsing frágiles: `EvaluadorRespuestasInteligente.generarPromptEvaluacion()` es un placeholder; el parsing espera líneas “PUNTUACIÓN:”/“RETROALIMENTACIÓN:” sin contrato firme.
4. Abort/timeout y reintentos: uso del `signal` no acorde con la API del SDK; no hay timeout ni reintento definidos.
5. Modelo hardcodeado y gating: fallback `'gpt-3.5-turbo'`; bloqueo por `isConfigured` aunque backend podría resolver.
6. UX/a11y: faltan `aria-label`/`aria-pressed` y live region para feedback; estados de carga sin anuncio accesible.
7. Pruebas: faltan tests de contrato (JSON), de errores (429/timeout) y de accesibilidad básica.

Recomendaciones:
* Unificar en backend (antes de beta):
	- POST `/api/evaluation/generate` → { pregunta, tipo }.
	- POST `/api/evaluation/grade` → { puntuacion, comentario, rubrica? }.
	- Backend decide proveedor/modelo según `.env` y configuración.
* Contrato JSON estricto en salidas; validar y hacer fallback seguro.
* Implementar (o retirar temporalmente) los métodos del generador usados por el componente.
* Timeouts 20–30s y 1 reintento para 5xx/timeout en FE/BE; mensajes claros para 429/cupo.
* No bloquear por `isConfigured` si backend responde; mostrar aviso pero permitir uso.
* Alinear modelo/proveedor con el backend; remover hardcodes en FE.
* A11y: `aria-label`/`aria-pressed`, live region (`role="status"`) para estados, soporte “prefers-reduced-motion”.

Quick wins (bajo riesgo):
* Agregar `obtenerPreguntasAnteriores/registrarPregunta/limpiarHistorial` mínimos o eliminar su uso temporalmente.
* Parsing a JSON con fallback; mejorar mensajes de error.
* `aria-*` básicos y live region; un timeout simple en FE y reintento único.

Pruebas sugeridas:
* Generación: JSON válido; fallback cuando la IA no devuelve JSON.
* Evaluación: rango 0–10 y comentario; manejo de 429 y timeout con reintento.
* UX: `role="status"` anuncia “Generando/ Evaluando”; botones deshabilitados en carga.
* Edge: texto grande → contexto limitado sin error.

Criterios de aceptación:
* Generar y evaluar vía backend con contratos JSON.
* Sin errores en consola por métodos faltantes del generador.
* No bloqueo por `isConfigured` si backend operativo.
* Tests de integración de evaluación en verde (200 y 429/timeout).

---

## Anexo C. Auditoría del Módulo “Análisis de Texto”

Archivos principales:
* `src/components/AnalisisTexto.js`
* `src/hooks/useTextAnalysis.js`
* `src/components/analisis/AnalysisControls.js`, `AnalysisConfiguration.js`, `AnalysisResults.js`
* Utilidades: `src/utils/crypto.js`, `src/utils/cache.js`, `src/utils/exportUtils.js`

Resumen funcional:
* Permite analizar un texto mediante tres modos: `openai`, `gemini` o `basico` (local).
* Usa `useTextAnalysis` que llama directamente a endpoints de OpenAI/Gemini desde el navegador con `fetch` y la apiKey almacenada en localStorage (encriptada de forma ligera). El modo `basico` calcula estadísticas locales y un resumen simple.
* Incluye caché en localStorage (24h, 20 entradas) por hash de texto y tipo de API.

Hallazgos clave:
1) Desalineación con arquitectura backend-first: llamadas directas a OpenAI/Gemini desde el frontend, exponiendo el patrón de uso y dependiendo de apiKeys del usuario. Contradice la migración aplicada en otras vistas (chat) hacia backend.
2) Seguridad de claves insuficiente en FE: claves ofuscadas con XOR + base64 (`utils/crypto.js`). Adecuado sólo para “disuasión leve”, no para producción.
3) Cancelación no efectiva: `cancelarAnalisis()` sólo cambia estado; no cancela `fetch`. Falta `AbortController` con señal conectada al request.
4) Sin timeouts ni reintentos: las llamadas a proveedores carecen de timeout y política de reintentos (429/5xx/timeout). UX queda indefinida en redes lentas.
5) Parsing JSON frágil: el prompt pide JSON pero no se retiran fences (“```json … ```”) ni se valida esquema; si falla, se hace fallback genérico. Falta extracción robusta de JSON.
6) Gestión de textos largos: hay truncado por caracteres y muestra representativa; no hay particionado/streaming ni indicación de pérdida de precisión. Podría sesgar resultados.
7) Inconsistencia de modelos/config: usa `gpt-3.5-turbo` hardcodeado; no alinea con modelos actuales o ajustes centralizados en backend.
8) A11y/UX: botones sin `aria-label` consistente, estados de carga sin live region; `LoadingOverlay` se muestra, pero no anuncia cambios para lectores de pantalla.
9) Estado sin uso: `usarBackend` en `AnalisisTexto.js` no se usa; indica transición incompleta hacia backend.

Riesgos:
* Exposición del patrón de consumo de IA desde el cliente; uso de claves del usuario con protección débil.
* Bloqueos y mala UX en redes adversas por falta de timeout/reintentos/cancelación real.
* Resultados inconsistentes si la IA devuelve texto no-JSON.

Recomendaciones prioritarias:
1) Unificar en backend: crear endpoint `POST /api/analysis/text` que reciba `{ texto }` (y parámetros opcionales) y devuelva un contrato JSON estable:
	`{ resumen, ideasPrincipales, analisisEstilistico, preguntasReflexion, vocabulario, complejidad, temas, estadisticas }`.
	- Backend elegirá proveedor/modelo desde `.env` y aplicará límites, timeouts y reintentos.
2) Eliminar claves en FE: retirar almacenamiento/uso de apiKeys en el cliente para este flujo. Reutilizar `SettingsPanel` sólo para toggles no sensibles o apuntarlo a configuración de backend.
3) Cancelación real y timeouts: implementar `AbortController` en FE y respetarlo en backend; timeout 20–30s con 1 reintento exponencial para 5xx/timeout.
4) Parser robusto de JSON: backend debe normalizar/validar salida del modelo (p. ej., extraer JSON entre fences, validar esquema, rellenar defaults). FE no debe parsear respuestas del proveedor.
5) Cache coordinada: mantener caché por hash en FE; opcionalmente cache en backend con TTL configurable.
6) A11y/UX: añadir `aria-label` a controles, `role="status" aria-live="polite"` para estados, soporte "prefers-reduced-motion" para animaciones.
7) Modelos/Configuración: centralizar modelos y parámetros en backend; exponer sólo banderas de UX en FE.

Quick wins (bajo riesgo):
* QW1: Extraer JSON entre fences si existen antes de `JSON.parse`; si falla, fallback controlado.
* QW2: Añadir timeout con `Promise.race` + `AbortController` en `useTextAnalysis` y mostrar mensaje claro de expiración.
* QW3: Implementar cancelación real conectando `AbortController` a `cancelarAnalisis()`.
* QW4: Añadir `aria-label` en botón “Analizar Texto” y live region para `LoadingOverlay`.
* QW5: Eliminar o usar `usarBackend`; preferible activarlo y enrutar al backend si está disponible.

Pruebas sugeridas:
* Unidad: parser de JSON con y sin fences; hashing/caché; cálculo de estadísticas locales.
* Integración (MSW): 200 OK con JSON válido; respuesta no-JSON → fallback; 400/429/5xx; timeout con reintento único; cancelación por el usuario.
* UX/a11y: `role="status"` anuncia cambios; botón deshabilita durante carga; accesos por teclado.
* Largos: textos > 8k chars → muestra representativa sin error; validar nota de truncado.

Criterios de aceptación:
* `AnalisisTexto` consume `POST /api/analysis/text` (no usa apiKeys en FE).
* Timeouts (20–30s), un reintento y cancelación real funcionando y visibles en la UI.
* Parser/validación de contrato en backend; FE muestra datos normalizados sin errores de parseo.
* Caché eficaz (hit) para mismo texto y modo; controles con a11y básico.

---

## Anexo D. Auditoría del Módulo “Notas de Estudio”

Archivos principales:
* `src/components/NotasEstudio.js`
* `src/hooks/notes/useNotasEstudio.js`
* Variantes: `src/components/NotasEstudioNuevo.js`, `src/components/notas/NotasEstudioRefactorizado.js`

Resumen funcional:
* Genera “notas de estudio” con distintos esquemas según el tipo de texto (narrativo, poético, filosófico, ensayo) y crea un cronograma de repaso (aprendizaje espaciado).
* Usa `useApiConfig().aiClient` desde el frontend para detectar tipo y generar notas con prompts; persiste progreso en `localStorage` (clave `progresoNotas`) por hash del texto.
* Panel de configuración permite ajustar tipo (o auto), duración y opcionalmente guardar una “clave API” en `localStorage` (sin cifrado robusto) para OpenAI.

Hallazgos clave:
1) Desalineación con backend-first: el módulo invoca IA desde el frontend vía `aiClient.generateResponse`. Debería unificarse con la estrategia de backend usada en chat/evaluación.
2) Clave API en `localStorage` sin cifrado: `NotasEstudio` guarda `user_openai_api_key` en texto claro. Riesgo de exposición (XSS/inspección). Debe eliminarse en favor de claves en `server/.env`.
3) Sin timeout, reintento, ni cancelación real: `useNotasEstudio` no usa `AbortController`. Fallas de red pueden bloquear la UI; no hay backoff para 429/5xx/timeout.
4) Parsing frágil: se hace `JSON.parse(response.content)` suponiendo JSON puro. Si el modelo retorna fences o texto adicional, falla y cae a un fallback genérico.
5) Riesgo por textos largos: detección usa 1k chars (bien), pero la generación usa el texto completo sin muestreo/truncado; puede exceder límites de tokens.
6) UX/a11y mejorable: el spinner no anuncia estado (`aria-live`); el botón de “Regenerar” carece de `aria-*` descriptivos; feedback de errores correcto pero sin live region.
7) Persistencia sin versión: `progresoNotas` no tiene `schemaVersion`; cambios futuros podrían romper compatibilidad.
8) Cronograma fijo: intervalos 0/1/3/6/13/(29 si ≥30 días). La duración elegida no modifica escalamiento intermedio; podría adaptarse para planes >30/60/90 días.

Recomendaciones prioritarias:
1) Backend unificado: crear `POST /api/notes/generate` que reciba `{ texto, tipoTexto?: "auto|narrativo|poetico|filosofico|ensayo", duracion?: number }` y devuelva:
	`{ notas: {...}, cronograma: Array<{numero, dias, fechaISO, descripcion}>, metadata }` con validación de esquema.
	- El backend elegirá proveedor/modelo desde `.env`, aplicará límites, timeouts (20–30s) y un reintento para 5xx/timeout.
2) Eliminar apiKeys en FE: retirar el campo y almacenamiento de `user_openai_api_key`. La configuración sensible vive en backend.
3) Resiliencia: incorporar `AbortController` en FE para cancelación; timeout visible al usuario y un reintento único para errores transitorios.
4) Parsing/normalización robusta en BE: extraer JSON entre fences, validar, rellenar defaults y devolver contrato limpio. El FE no debe parsear salidas del modelo.
5) Textos largos: muestreo representativo (inicio/medio/fin) o truncado por caracteres/tokens con aviso en `metadata`.
6) Caché coordinada: clave por hash de texto + tipo + duración; opcional cache en BE con TTL.
7) A11y/UX: `aria-live="polite"` para estados, `aria-label` en botones, manejo de foco al mostrar errores.
8) Versionado: incluir `schemaVersion` en `progresoNotas` y en la respuesta del backend.

Quick wins (bajo riesgo):
* QW1: Extraer JSON entre fences antes de `JSON.parse` y capturar errores con fallback legible.
* QW2: Limitación de texto a ~8–10k chars (muestra inicio/medio/fin) en FE mientras se migra al backend.
* QW3: Añadir `AbortController` + timeout simple a las llamadas de generación/detección; botón “Cancelar”.
* QW4: Remover el guardado de `user_openai_api_key` del panel o, temporalmente, ocultarlo.
* QW5: `aria-live` en el spinner y mensajes; `aria-label` descriptivos en “Regenerar” y botones de cronograma.

Pruebas sugeridas:
* Unidad: hashing de texto, generación de cronograma, extracción de JSON con/ sin fences, migración de `progresoNotas` con `schemaVersion`.
* Integración (MSW): 200 con JSON válido; respuesta no-JSON → BE normaliza; 400/429/5xx; timeout + reintento; cancelación por usuario.
* UX/a11y: `aria-live` anuncia “Generando notas…”, botones deshabilitados y accesibles por teclado; persistencia de “Completado”.
* Largos: textos grandes → muestra representativa sin error; metadatos indican truncado.

Criterios de aceptación:
* `NotasEstudio` consume sólo `/api/notes/generate`; no gestiona apiKeys en FE.
* Timeout (20–30s), un reintento y cancelación real operativos y visibles.
* BE entrega contrato JSON validado; el FE no hace `JSON.parse` de salidas del modelo.
* Cronograma y progreso persisten con `schemaVersion`; a11y básico implementado.
