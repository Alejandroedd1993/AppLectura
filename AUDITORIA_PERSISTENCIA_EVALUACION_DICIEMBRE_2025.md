# 🐛 AUDITORÍA: Persistencia de Resultados de Evaluación Entre Lecturas

**Fecha:** 12 de diciembre de 2025  
**Prioridad:** 🔴 CRÍTICA  
**Estado:** ✅ **CORREGIDO** (13 diciembre 2025)

---

## ✅ SOLUCIÓN IMPLEMENTADA

Se agregó un `useEffect` en `AppContext.js` que carga `rubricProgress` desde Firestore cuando `currentTextoId` cambia.

**Líneas modificadas:** 121-131, 134-140, 185-225
1. Carga un curso y avanza en una lectura
2. Completa actividades de evaluación (rúbricas)
3. Navega a otra lectura del mismo curso

**El problema:** Los resultados de evaluación de la lectura anterior siguen apareciendo en la nueva lectura.

---

## 🔍 ANÁLISIS DE CAUSA RAÍZ

### Problema Principal: Estado Global sin Contexto de Texto

El `rubricProgress` (progreso de evaluaciones) se almacena **globalmente por usuario**, sin asociarlo al texto/lectura específica.

### Evidencia del Código

**1. Almacenamiento Global (AppContext.js:145-178)**
```javascript
// Clave de almacenamiento: SOLO por usuario
const key = `rubricProgress_${currentUser.uid}`;
localStorage.setItem(key, JSON.stringify(rubricProgress));
```

**2. Funciones existentes de reset (AppContext.js:381-401)**
```javascript
const clearRubricProgress = useCallback((rubricId) => {...});
const resetAllProgress = useCallback(() => {...});
```
⚠️ **Estas funciones existen pero NUNCA se llaman al cambiar de lectura.**

**3. Cambio de Texto (App.js ~130)**
```javascript
// Al seleccionar nueva lectura:
setCurrentTextoId(targetId);
setSourceCourseId(courseId);
clearArtifactDrafts(); // ✅ Limpia borradores

// ❌ FALTA: No hay limpieza de rubricProgress
// ❌ FALTA: No hay carga de rubricProgress del nuevo texto
```

**4. Sincronización Firestore (AppContext.js:550-587)**
```javascript
// Guarda rubricProgress con currentTextoId pero...
await saveGlobalProgress(currentUser.uid, currentTextoId, {
  rubricProgress: rubricId ? {...} : rubricProgress,
  ...
});
```
⚠️ Se guarda CON textoId pero NO se carga desde Firestore al cambiar de texto.

---

## 📊 FLUJO ACTUAL vs ESPERADO

### ❌ Flujo Actual (Defectuoso)
```
Usuario selecciona Lectura A
    ↓
rubricProgress = { rubrica1: {score: 8}, ... }
    ↓
Usuario selecciona Lectura B
    ↓
setCurrentTextoId('lecturaB')  // ✅
setSourceCourseId('curso1')    // ✅
clearArtifactDrafts()          // ✅
// rubricProgress = SIN CAMBIOS ❌
    ↓
UI muestra evaluaciones de Lectura A ❌
```

### ✅ Flujo Esperado (Corregido)
```
Usuario selecciona Lectura A
    ↓
rubricProgress['lecturaA'] = { rubrica1: {score: 8}, ... }
    ↓
Usuario selecciona Lectura B
    ↓
setCurrentTextoId('lecturaB')  // ✅
setSourceCourseId('curso1')    // ✅
clearArtifactDrafts()          // ✅
rubricProgress = loadFromFirestore('lecturaB') || {} ✅
    ↓
UI muestra evaluaciones de Lectura B (vacías si es nueva) ✅
```

---

## 🛠️ SOLUCIONES PROPUESTAS

### Opción A: Reset al Cambiar de Texto (Simple)
**Impacto:** Bajo | **Esfuerzo:** 1h | **Recomendado:** ⚠️ Temporal

```javascript
// En App.js handleSelectText
const handleSelectText = (newText, textoData) => {
  // ... código existente ...
  
  // 🆕 Resetear rubricProgress al cambiar de texto
  if (textoData.textoId !== currentTextoId) {
    resetLocalRubricProgress(); // Función nueva en AppContext
  }
};
```

**Pros:** Rápido de implementar  
**Contras:** Pierde progreso al cambiar de lectura (incluso si vuelve)

---

### Opción B: Almacenamiento por Texto (Recomendado)
**Impacto:** Alto | **Esfuerzo:** 3-4h | **Recomendado:** ✅

Cambiar estructura de datos:
```javascript
// ANTES (global por usuario)
rubricProgress = { rubrica1: {...}, rubrica2: {...} }

// DESPUÉS (por texto)
rubricProgress = {
  'textoId_123': { rubrica1: {...}, rubrica2: {...} },
  'textoId_456': { rubrica1: {...}, rubrica2: {...} }
}
```

**Archivos a modificar:**
1. `AppContext.js` — Estructura de estado y getters
2. `DashboardRubricas.js` — Lectura de progreso
3. `ProgressStats.js` — Lectura de progreso
4. `firestore.js` — Sincronización

---

### Opción C: Carga desde Firestore al Cambiar (Ideal)
**Impacto:** Alto | **Esfuerzo:** 2-3h | **Recomendado:** ✅✅

```javascript
// Al cambiar de texto, cargar progreso desde Firestore
useEffect(() => {
  if (currentTextoId && currentUser) {
    loadProgressForText(currentUser.uid, currentTextoId);
  }
}, [currentTextoId, currentUser]);

const loadProgressForText = async (uid, textoId) => {
  const progress = await getStudentProgress(uid, textoId);
  if (progress?.rubricProgress) {
    setRubricProgress(progress.rubricProgress);
  } else {
    setRubricProgress(emptyProgress); // Reset limpio
  }
};
```

---

## 📋 MATRIZ DE DECISIÓN

| Solución | Preserva Progreso | Esfuerzo | Riesgo | Recomendación |
|----------|-------------------|----------|--------|---------------|
| **A: Reset simple** | ❌ No | Bajo | Bajo | ⚠️ Temporal |
| **B: Por texto local** | ✅ Sí | Alto | Medio | ✅ Buena |
| **C: Desde Firestore** | ✅ Sí | Medio | Bajo | ✅✅ Ideal |

---

## 🎯 RECOMENDACIÓN

**Implementar Opción C** (Carga desde Firestore) por:
1. Ya existe `getStudentProgress()` que soporta textoId
2. Mínimos cambios en estructura de datos
3. Consistencia con otros dispositivos
4. Menor riesgo de regresión

---

## 📝 PRÓXIMOS PASOS

1. [ ] Aprobar enfoque de solución
2. [ ] Implementar carga de rubricProgress al cambiar de texto
3. [ ] Agregar reset de estado local si no hay datos en Firestore
4. [ ] Probar con múltiples lecturas en un curso
5. [ ] Verificar sincronización bidireccional
