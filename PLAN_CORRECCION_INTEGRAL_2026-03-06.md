# Plan Integral de Correccion (React Doctor)

Fecha base: 2026-03-06  
Fuente de hallazgos: `reports/react-doctor-report-2026-03-06.md`  
Baseline actual: score `98/100`, `263 warnings` (`194 exports`, `57 files`, `12 duplicates`)

## 1. Objetivo general

Reducir deuda tecnica de codigo muerto, estandarizar arquitectura de exports/imports y dejar una base limpia para evolucion funcional sin regresiones.

## 2. Metas medibles (Definition of Success)

- Reducir warnings totales de `263` a `<= 40`.
- Bajar warnings de `src` de `204` a `<= 25`.
- Resolver `100%` de warnings de `duplicates` (12/12).
- Resolver `100%` del flujo huerfano de Web Search (activar o retirar).
- Dejar pipeline de verificacion automatica con `react-doctor` en CI.

## 3. Alcance

Incluye:
- Frontend `src/*` (prioridad alta).
- Ajustes de configuracion para evitar falsos positivos de backend/scripts.
- Limpieza de exports sin uso y convencion unica de exportacion.

No incluye:
- Reescritura funcional completa de modulos de negocio.
- Cambios de arquitectura backend fuera de lo necesario para alineacion de analisis estatico.

## 4. Plan por fases

## Fase 0 - Preparacion y control (0.5 dia)

Entregables:
- Rama de trabajo dedicada: `chore/react-doctor-integral-cleanup`.
- Snapshot del baseline en el PR (score y conteos por regla).
- Lista de ownership por modulo (`src/services`, `src/hooks`, `src/utils`, `src/components`).

Criterio de salida:
- Baseline reproducible localmente con comando unico:
  - `npx -y react-doctor@latest . --verbose --diff`

## Fase 1 - Reducir ruido del analisis (1 dia)

Problema:
- El analisis actual mezcla frontend + backend + scripts y reporta falsos positivos.

Acciones:
- Ajustar alcance para que el reporte operativo principal sea de frontend (`src`).
- Marcar en documentacion los archivos de entrada no importados por diseno:
  - `src/setupTests.js`
  - `src/setupProxy.js`
  - `public/pdf.worker.min.js` (asset referenciado por `setupPdfWorker`)
  - entrypoints backend por npm scripts.
- Definir lista de exclusiones razonadas para auditoria de codigo muerto.

Criterio de salida:
- Reporte de trabajo sin ruido estructural (server/scripts/root no bloquean avance de frontend).

## Fase 2 - Decision y ejecucion del flujo Web Search (1-2 dias)

Hallazgo critico:
- Flujo potencialmente huerfano:
  - `src/components/chat/WebEnrichmentButton.js`
  - `src/hooks/useWebSearchTutor.js`
  - `src/hooks/useWebSearchAvailability.js`
  - `src/services/webSearchService.js`

Decision gate (obligatorio):
- Opcion A: Reactivar feature y conectarla al flujo real del tutor.
- Opcion B: Retirar feature por completo (codigo + tests + referencias documentales).

Criterio de salida:
- No quedan archivos huerfanos del flujo Web Search.
- Existe trazabilidad de la decision (ADR corta o seccion en PR).

## Fase 3 - Limpieza masiva de exports sin uso en `src` (3-5 dias)

Problema:
- `184` warnings de `Unused export` en frontend.

Estrategia:
- Limpiar por lotes pequenos para reducir riesgo:
  - Lote A: utilidades (`src/utils/*`, `src/styles/*`).
  - Lote B: hooks (`src/hooks/*`).
  - Lote C: services (`src/services/*`).
  - Lote D: componentes/index barrels (`src/components/*`).
- Regla de oro:
  - Si el export no tiene consumidor real, eliminar.
  - Si debe existir para API publica interna, documentar y cubrir con prueba.

Archivos de alta concentracion (prioridad inicial):
- `src/styles/designTokens.js`
- `src/utils/accessibility.js`
- `src/utils/logger.js`
- `src/services/sessionManager.js`
- `src/hooks/useMediaQuery.js`
- `src/services/practiceService.js`
- `src/services/glossaryService.js`

Criterio de salida:
- Reduccion sostenida de warnings por lote.
- Sin regresiones de test ni errores de build.

## Fase 4 - Normalizacion de exports duplicados (1 dia)

Problema:
- `12` casos `Duplicate export: X|default`.

Acciones:
- Definir convencion unica por capa:
  - Hooks/services/componentes: preferir `default` o `named` (una sola convencion por tipo).
- Aplicar migracion de imports de forma mecanica.
- Evitar coexistencia `export const X` + `export default X` salvo excepciones justificadas.

Criterio de salida:
- `0` warnings de `duplicates`.
- Guia corta de convenciones actualizada.

## Fase 5 - Endurecimiento de calidad (1 dia)

Acciones:
- Agregar chequeo de `react-doctor` al pipeline de CI (modo no interactivo).
- Definir umbral de fallo:
  - Fallar PR si `duplicates > 0`.
  - Fallar PR si `files` o `exports` aumentan contra baseline acordado.
- Publicar playbook de correccion rapida para nuevos warnings.

Criterio de salida:
- PRs futuros no reintroducen deuda de codigo muerto.

## 5. Backlog priorizado (P0/P1/P2)

P0 (inmediato):
- [ ] Resolver decision gate Web Search (activar o retirar).
- [ ] Cerrar `duplicates` a 0.
- [ ] Aislar reporte operativo frontend sin ruido estructural.

P1 (corto plazo):
- [ ] Reducir `Unused export` en top 10 archivos con mayor concentracion.
- [ ] Limpiar barrels `index.js` con exports no consumidos.
- [ ] Completar pruebas de regresion de modulos tocados.

P2 (continuo):
- [ ] Completar limpieza del resto de exports no usados.
- [ ] Consolidar convenciones de arquitectura en documento de equipo.
- [ ] Monitorear tendencia semanal de warnings.

## 6. Riesgos y mitigaciones

- Riesgo: eliminar export usado indirectamente.
  - Mitigacion: busqueda global + tests unitarios/integracion + rollout por lotes.
- Riesgo: falsos positivos por tooling.
  - Mitigacion: scope/ignore documentados y estables.
- Riesgo: cambios grandes en un solo PR.
  - Mitigacion: PRs pequenos por lote funcional.

## 7. Cronograma sugerido

- Semana 1: Fase 0, 1, 2, 4.
- Semana 2: Fase 3 (Lotes A y B).
- Semana 3: Fase 3 (Lotes C y D) + Fase 5.

## 8. Criterio de cierre del plan

El plan se considera cerrado cuando:
- Warnings totales `<= 40`.
- `duplicates = 0`.
- No hay modulos huerfanos de Web Search.
- CI bloquea regresiones de deuda detectada por `react-doctor`.
