# Informe Fase 5: Notas de Estudio por Lectura

## Estado: ✅ Implementado

## Meta

Asegurar que **notas, flags y repaso espaciado** queden **aislados por lectura (`textoId`)** y no se deriven del contenido (evitar colisiones A/B).

> Nota de producto: la app **mantiene sesión única por usuario** (no se soporta multi-dispositivo).

## Problema Detectado (antes)

- El flag `notas_disponibles_*` se guardaba con una clave basada en `texto.substring(...)`, lo que podía colisionar entre textos.
- El storage de notas generaba un `idTexto` con `timestamp`, por lo que **cargar/guardar nunca coincidía** de forma estable y dependía de un fallback por hash.
- Los `studyItems` (repaso espaciado) se persistían por hash del texto, no por `textoId`.

## Cambios Implementados

### 1) Flag de notas disponible aislado por lectura

- El flag persistente pasa a `notas_disponibles_${currentTextoId}`.
- El estado en contexto pasa de boolean global a un registro por lectura y se expone como boolean derivado para el `currentTextoId`.

Archivos:
- [src/context/AppContext.js](../src/context/AppContext.js)

### 2) Notas: persistencia por `textoId`

- `StorageService.guardarProgresoNotas(texto, progreso, textoId)` y `cargarProgresoNotas(texto, textoId)` ahora usan `textoId` como clave primaria.
- `generarIdTexto(texto)` deja de incluir `timestamp` (queda como fallback legacy estable).
- Si se encuentra una entrada legacy por hash y existe `textoId`, se migra automáticamente a la clave por `textoId`.

Archivos:
- [src/services/notes/StorageService.js](../src/services/notes/StorageService.js)
- [src/hooks/notes/useNotasEstudioHook.js](../src/hooks/notes/useNotasEstudioHook.js)
- [src/components/notas/NotasEstudioRefactorizado.js](../src/components/notas/NotasEstudioRefactorizado.js)

### 3) Repaso espaciado: persistencia por `textoId`

- `useStudyItems(texto, textoId)` usa `studyitems:${textoId}:v1` cuando hay `textoId`.
- Migración ligera: si existe key legacy por hash y falta la nueva, se copia en localStorage.

Archivos:
- [src/hooks/useStudyItems.js](../src/hooks/useStudyItems.js)
- [src/components/PanelStudyItems.js](../src/components/PanelStudyItems.js)
- [src/components/notas/NotasEstudioRefactorizado.js](../src/components/notas/NotasEstudioRefactorizado.js)

## Validación Manual Requerida

1. Abrir Lectura A y completar análisis.
2. Ver que aparece disponibilidad de notas; generar notas.
3. Cambiar a Lectura B y completar análisis.
4. Confirmar que B **no hereda** notas/flags/repasos de A.
5. Volver a A y confirmar que se recuperan **solo** sus notas y su repaso.

## Criterio de salida

- Notas y flags asociados quedan aislados por lectura.
- A→B→A no produce contaminación entre lecturas.
