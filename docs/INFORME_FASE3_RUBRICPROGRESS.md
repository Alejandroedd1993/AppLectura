# Informe Fase 3: Fix rubricProgress Legacy

## Estado: ✅ Completado (Build: Exit 0)

## Problema Identificado

`checkUnsaveDrafts.js` intentaba leer `localStorage.getItem('rubricProgress')` para verificar si un artefacto había sido evaluado recientemente. Sin embargo:

- **El problema**: La clave `rubricProgress` **nunca se escribía** en localStorage
- **Ubicación real**: `rubricProgress` es estado de React en `AppContext.js` (línea ~622)
- **Persistencia real**:
  - Principal: sincronización en Firestore (progreso del alumno)
  - Fallback: `localStorage` con clave namespaced por usuario (`rubricProgress_<uid>`) y migración opcional desde la clave legacy
  - Nota: la clave legacy `rubricProgress` no debe usarse como fuente (solo se conserva para migración/compatibilidad)
- **Consecuencia**: `hasRecentEvaluation()` siempre retornaba `false`, generando warnings incorrectos

## Solución Implementada

### Antes (Roto)
```javascript
// checkUnsaveDrafts.js - Línea 24
const saved = localStorage.getItem('rubricProgress');
// SIEMPRE era null porque nunca se escribía allí
```

### Ahora (Correcto)
```javascript
// checkUnsaveDrafts.js
export function checkUnsaveDrafts(textoId = null, rubricProgress = {}) {
  // rubricProgress ahora viene como parámetro desde React context
  const hasRecentEvaluation = (rubricId) => {
    const rubrica = rubricProgress?.[rubricId];
    // ... verificación correcta ...
  };
}

export function getWarningMessage(textoId = null, rubricProgress = {}) {
  const { hasDrafts, details } = checkUnsaveDrafts(textoId, rubricProgress);
  // ...
}
```

## Call-sites actualizados (✅ completado)

Se actualizaron los lugares donde se llamaba al validador sin pasar `rubricProgress`.

- [src/components/CargaTexto_responsive.js](src/components/CargaTexto_responsive.js)
- [src/components/common/SessionsHistory.js](src/components/common/SessionsHistory.js)
- [src/components/common/DraftWarning.js](src/components/common/DraftWarning.js)

## Mejora de refresco (eventos)

Para que el warning se actualice inmediatamente tras evaluar (sin esperar al intervalo), `DraftWarning` escucha:

- `artifact-evaluated` (emitido desde `AppContext.updateRubricScore`)
- `evaluation-complete` (compatibilidad legacy)

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `checkUnsaveDrafts.js` | ✅ Acepta `rubricProgress` como parámetro |
| `checkUnsaveDrafts.js` | ✅ `getWarningMessage(textoId, rubricProgress)` actualizado |
| `CargaTexto_responsive.js` | ✅ Pasa `rubricProgress` a las utilidades |
| `SessionsHistory.js` | ✅ Pasa `rubricProgress` a las utilidades |
| `DraftWarning.js` | ✅ Pasa `rubricProgress` y refresca por evento |

## Impacto

- ✅ Warnings de borradores ahora consideran evaluaciones reales
- ✅ No más falsos positivos ("tienes borrador sin evaluar" cuando sí fue evaluado)
- ✅ Compatible hacia atrás (parámetro opcional con default `{}`)

## Pendiente para Call-Sites

✅ No quedan pendientes conocidos en `src/`.

> **Nota de compatibilidad**: si algún call-site externo no pasa `rubricProgress`, la función asume `{}` y se comporta de forma conservadora (considera “sin evaluar” hasta tener datos reales).
