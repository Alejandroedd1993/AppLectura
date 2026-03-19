# PLAN P3 - Refactorizacion Segura de Modulos Monoliticos

Fecha: 19/02/2026
Estado: En progreso (base iniciada en commit `a616ea74`)

## 1. Objetivo

Reducir riesgo tecnico y mejorar mantenibilidad extrayendo dominios logicos de modulos monoliticos, sin cambiar comportamiento funcional ni romper compatibilidad en produccion.

## 2. Alcance y baseline

Monolitos priorizados:

- `src/context/AppContext.js` (~5.3k lineas)
- `src/components/teacher/TeacherDashboard.js` (~4.4k lineas)
- `src/firebase/firestore.js` (~3.4k lineas)

Principios de ejecucion:

- Extraer primero dominios de bajo acoplamiento y riesgo minimo.
- Mantener API publica estable durante toda la migracion.
- Validar por lote y por fase, con evidencia trazable.

## 3. Invariantes de seguridad

1. Cada paso se publica en commit atomico y reversible.
2. No se cambia el shape publico de `AppContext` durante la migracion.
3. `src/firebase/firestore.js` conserva re-exports de compatibilidad durante transicion.
4. No se mezcla refactor con cambios funcionales.
5. No se permite deuda encadenada: si falla un lote, se corrige o se revierte ese lote.
6. Los nuevos modulos en `src/firebase/modules/` no deben importar `src/firebase/firestore.js` (evitar ciclos).
7. `firestore.js` opera como facade/entrypoint de compatibilidad, no como nuevo punto de logica creciente.
8. Todo cambio pasa `npm run quality:check`.

## 4. Estrategia por fases

## Fase 3.0 - Baseline y contratos (obligatoria)

Objetivo: fijar linea base tecnica y de contratos antes de extraer.

Entregables:

1. Snapshot de API publica de `AppContext` (claves de `contextValue` y contratos visibles).
2. Inventario de exports de `src/firebase/firestore.js` + mapa de consumidores.
3. Smoke tests minimos para `TeacherDashboard` en flujos criticos (carga, artefactos, export/reset).
4. Registro de metrica inicial de lineas por monolito.

Criterio de salida Fase 3.0:

- Contratos y baseline documentados en repo.
- Smokes minimos de dashboard disponibles y en verde.

## Fase 3.1 - Extracciones de riesgo cero

Objetivo: bajar tamano y complejidad sin tocar reglas de negocio.

Extracciones objetivo:

1. `src/components/teacher/TeacherDashboard.styles.js`
   - Extraer styled-components desde `TeacherDashboard.js`.
2. `src/components/teacher/utils/artifactFormatters.js`
   - Extraer utilidades puras (parse/render de contenido de artefactos).
3. `src/context/hooks/useFeatureFlags.js`
   - Extraer lectura de flags/env/localStorage de `AppContext.js`.
4. `src/context/hooks/useFirestoreBackup.js`
   - Extraer logica de backup TTL (airbag local).
5. `src/context/hooks/useUIPreferences.js`
   - Extraer tema/focusMode/API key local.

Criterio de salida Fase 3.1:

- Sin cambios funcionales.
- Lotes con pruebas focalizadas en verde.
- Reduccion real de lineas en archivos origen.

## Fase 3.2 - Modularizacion de `firestore.js` por dominios

Objetivo: separar infraestructura de operaciones de dominio manteniendo API estable.

Extracciones objetivo:

1. `src/firebase/modules/textUpload.js`
2. `src/firebase/modules/sessions.js`
3. `src/firebase/modules/courses.js`
4. `src/firebase/modules/courseAdmin.js`
5. `src/firebase/modules/artifactReset.js`
6. `src/firebase/modules/courseMetrics.js`

Reglas criticas:

- `src/firebase/firestore.js` re-exporta funciones durante transicion.
- Ningun modulo nuevo importa `../firestore` para evitar dependencias circulares.

Criterio de salida Fase 3.2:

- Ningun import roto en consumidores actuales.
- `firestore.js` reducido a core + re-exports.
- Contrato de exports estable respecto al baseline de Fase 3.0.

## Fase 3.3 - Descomposicion de `TeacherDashboard.js`

Objetivo: separar datos, handlers y presentacion sin alterar UX.

Extracciones objetivo:

1. `src/components/teacher/hooks/useTeacherSubscriptions.js`
2. `src/components/teacher/hooks/useCourseExport.js`
3. `src/components/teacher/components/ArtifactViewer.js`
4. `src/components/teacher/components/CoursePanel.js`
5. `src/components/teacher/components/StudentList.js`

Criterio de salida Fase 3.3:

- Dashboard con misma UX y mismos flujos.
- Sin regresion en metricas, comentarios, resets y export.
- Smokes de dashboard en verde (no solo mocks).

## Fase 3.4 - Descomposicion de `AppContext.js` (fase critica)

Objetivo: convertir `AppContext` en orquestador delgado y predecible.

Extracciones objetivo:

1. `src/context/hooks/useCitations.js`
2. `src/context/hooks/useActivitiesProgress.js`
3. `src/context/hooks/useDocumentAnalysis.js`
4. `src/context/hooks/useSessionManagement.js`
5. `src/context/hooks/useRubricLogic.js`
6. `src/context/hooks/useFirestoreSync.js`
7. `src/context/hooks/useFirebaseListeners.js`

Regla critica:

- Mantener `contextValue` estable (nombres, contratos y efectos visibles).

Criterio de salida Fase 3.4:

- `AppContext.js` reducido de forma sustancial.
- Sin cambios en consumidores de `useAppContext`.
- Contrato de contexto consistente con baseline de Fase 3.0.

## 5. Metas metricas

Linea base (referencial):

- `AppContext.js`: ~5315 lineas
- `TeacherDashboard.js`: ~4403 lineas
- `firestore.js`: ~3432 lineas

Objetivos al cierre de P3:

- `AppContext.js` <= 3500 lineas
- `TeacherDashboard.js` <= 2800 lineas
- `firestore.js` <= 900 lineas (facade + re-exports)
- Reducir la cantidad de archivos > 2000 lineas en la capa `src/`.

## 6. Orden de ejecucion recomendado

Semana 1:

- Fase 3.0 completa.
- Inicio de Fase 3.1.

Semana 2:

- Cierre Fase 3.1.
- Fase 3.2 completa (`firestore` modular).

Semana 3:

- Fase 3.3 completa (`TeacherDashboard`).

Semana 4+:

- Fase 3.4 por lotes pequenos (`AppContext`).

## 7. Plan de validacion por lote

Checklist obligatorio antes de merge:

- `npm run quality:check` ✅
- Pruebas focalizadas del lote (unit/integration afectadas) ✅
- Revision de imports rotos (busqueda global) ✅
- Verificacion manual de flujos criticos del lote ✅
- Diff acotado al objetivo del lote (sin cambios colaterales) ✅

Checklist obligatorio por cierre de fase:

- `npm test --silent` ✅
- `npm run build` ✅
- Validacion de contratos contra baseline (Fase 3.0) ✅

Flujos criticos a verificar:

- Lectura + analisis + persistencia
- Sincronizacion de sesiones
- Dashboard docente (cursos, alumnos, artefactos, export)
- Reset de artefactos

## 8. Matriz de riesgos y mitigacion

Riesgos principales:

1. Acoplamiento oculto en `AppContext`.
   - Mitigacion: extraccion progresiva + contratos estables.
2. Ruptura de imports al modularizar `firestore.js`.
   - Mitigacion: re-exports transicionales + regla anti-ciclos + validacion global.
3. Regresion visual/funcional en dashboard docente.
   - Mitigacion: separar estilos primero + smoke tests reales de dashboard.
4. Mezcla de refactor con funcionalidad nueva.
   - Mitigacion: PR/commit por lote, alcance fijo y trazable.
5. Cobertura insuficiente en zonas criticas.
   - Mitigacion: Fase 3.0 agrega smoke minimo antes de tocar modulos.

## 9. Entregables

- Modulos extraidos por fase.
- Commits trazables por lote (`refactor(p3.x.y): ...`).
- Registro de validacion por lote (tests + checklist).
- Registro de cumplimiento de contratos (contexto/firestore).
- Reduccion medible de tamano en los tres monolitos.

## 10. Definicion de "P3 completado"

P3 se considera completado cuando:

- Los tres monolitos estan descompuestos en modulos cohesivos.
- La API publica de contexto y capa Firebase sigue estable.
- No hay regresiones funcionales detectadas.
- La suite completa permanece en verde de forma consistente.
- Se cumplen las metas metricas definidas en este plan.
