# ✅ CHECKLIST DE VALIDACIÓN - SINCRONIZACIÓN COMPLETA

## 📋 ANTES DE EMPEZAR

- [ ] Backend corriendo en http://localhost:3001
- [ ] Frontend corriendo en http://localhost:3000
- [ ] Usuario autenticado en Firebase
- [ ] Dos navegadores/dispositivos disponibles para pruebas

---

## 🧪 TEST 1: ANÁLISIS NO SE CUELGA

### Objetivo
Verificar que el análisis de documento se complete correctamente sin quedarse "pensando".

### Pasos
1. [ ] Abrir http://localhost:3000
2. [ ] Cargar un texto de prueba (copiar/pegar o subir archivo)
3. [ ] Hacer clic en "Análisis Completo" o botón similar
4. [ ] **VERIFICAR**: El análisis se completa en <2 minutos
5. [ ] **VERIFICAR**: Aparecen resultados (título, autor, género, resumen, etc.)
6. [ ] **VERIFICAR**: No hay errores en consola del navegador (F12)

### ✅ Resultado Esperado
- Análisis completado sin colgarse
- Todos los campos poblados
- No errors en consola

### ❌ Si Falla
```javascript
// Revisar logs en consola
// Buscar error relacionado con "analyzeDocument" o "texto"
```

---

## 🧪 TEST 2: GUARDADO MANUAL DE SESIÓN

### Objetivo
Verificar que el botón "Guardar Sesión" funciona correctamente.

### Pasos
1. [ ] Con el texto y análisis cargados (del Test 1)
2. [ ] Buscar botón verde "💾 Guardar Sesión" (esquina inferior derecha)
3. [ ] Hacer clic en el botón
4. [ ] **VERIFICAR**: Aparece confirmación visual (toast, mensaje, etc.)
5. [ ] Abrir consola (F12) y ejecutar:
   ```javascript
   const currentId = localStorage.getItem('currentSessionId');
   const sessions = JSON.parse(localStorage.getItem('sessions'));
   console.log('Sesión guardada:', sessions[currentId]);
   ```
6. [ ] **VERIFICAR**: La sesión tiene todos los campos

### ✅ Resultado Esperado
```javascript
{
  id: "session_XXXXX",
  title: "...",
  text: { content: "...", ... },
  completeAnalysis: { ... },
  rubricProgress: {},
  activitiesProgress: {}, // ← DEBE EXISTIR
  artifactsDrafts: {}, // ← DEBE EXISTIR
  savedCitations: {},
  rewardsState: { points: X, ... }, // ← DEBE EXISTIR
  settings: { modoOscuro: false }
}
```

### ❌ Si Falla
- Verificar que `updateCurrentSessionFromState()` esté definido
- Revisar logs en consola con "updateCurrentSession"

---

## 🧪 TEST 3: PROGRESO DE ACTIVIDADES

### Objetivo
Verificar que el progreso de actividades se guarda correctamente.

### Pasos
1. [ ] Ir a pestaña "Actividades" o "Preparación"
2. [ ] Completar la actividad "Preparación de Preguntas"
3. [ ] **VERIFICAR**: Actividad se marca como completada visualmente
4. [ ] Guardar sesión (botón verde "💾")
5. [ ] Ejecutar en consola:
   ```javascript
   const sessions = JSON.parse(localStorage.getItem('sessions'));
   const currentId = localStorage.getItem('currentSessionId');
   console.log('Actividades:', sessions[currentId].activitiesProgress);
   ```
6. [ ] **VERIFICAR**: Aparece la actividad completada

### ✅ Resultado Esperado
```javascript
{
  "preparacion-preguntas": {
    estado: "completada",
    intentos: 1,
    lastAttempt: 1234567890
  }
}
```

### ❌ Si Falla
- Verificar que `updateActivitiesProgress()` esté llamándose
- Revisar que `captureCurrentState()` incluya `activitiesProgress`

---

## 🧪 TEST 4: BORRADORES DE ARTEFACTOS

### Objetivo
Verificar que los borradores parciales se guardan correctamente.

### Pasos
1. [ ] Ir a pestaña "Evaluación" → "Resumen Académico"
2. [ ] Escribir algo en el editor (NO completar, solo borrador)
   - Ejemplo: "Este es un resumen parcial..."
3. [ ] **NO hacer clic en "Evaluar"** (queremos borrador sin evaluar)
4. [ ] Guardar sesión (botón verde "💾")
5. [ ] Ejecutar en consola:
   ```javascript
   const sessions = JSON.parse(localStorage.getItem('sessions'));
   const currentId = localStorage.getItem('currentSessionId');
   console.log('Artefactos:', sessions[currentId].artifactsDrafts);
   ```
6. [ ] **VERIFICAR**: El borrador aparece guardado

### ✅ Resultado Esperado
```javascript
{
  resumenAcademico: {
    draft: "Este es un resumen parcial..."
  },
  tablaACD: { ... },
  mapaActores: { ... },
  respuestaArgumentativa: { ... }
}
```

### ❌ Si Falla
- Verificar que `captureArtifactsDrafts()` esté siendo llamado
- Revisar sessionStorage manualmente: `sessionStorage.getItem('resumenAcademico_draft')`

---

## 🧪 TEST 5: PUNTOS Y GAMIFICACIÓN

### Objetivo
Verificar que los puntos, racha y achievements se guardan.

### Pasos
1. [ ] Completar alguna acción que dé puntos (actividad, artefacto evaluado, etc.)
2. [ ] Verificar visualmente que los puntos aumentaron (UI de gamificación)
3. [ ] Guardar sesión (botón verde "💾")
4. [ ] Ejecutar en consola:
   ```javascript
   const sessions = JSON.parse(localStorage.getItem('sessions'));
   const currentId = localStorage.getItem('currentSessionId');
   console.log('Recompensas:', sessions[currentId].rewardsState);
   ```
5. [ ] **VERIFICAR**: Puntos, racha y achievements presentes

### ✅ Resultado Esperado
```javascript
{
  points: 150,
  streak: 3,
  level: 2,
  achievements: [
    { id: "first_artifact", unlocked: true, ... }
  ],
  history: [...]
}
```

### ❌ Si Falla
- Verificar que `window.__rewardsEngine` existe
- Ejecutar: `window.__rewardsEngine.exportState()`

---

## 🧪 TEST 6: SINCRONIZACIÓN FIRESTORE

### Objetivo
Verificar que la sesión se sube correctamente a Firestore.

### Pasos
1. [ ] Asegurarse de estar autenticado (usuario de Firebase)
2. [ ] Con sesión guardada localmente (Test 2-5 completados)
3. [ ] Esperar 5 segundos para auto-sync
4. [ ] Abrir Firebase Console: https://console.firebase.google.com
5. [ ] Ir a: Firestore Database → users → {userId} → sessions
6. [ ] Buscar la sesión por `localSessionId`
7. [ ] **VERIFICAR**: Campos presentes:
   - [ ] textContent (o textStorageURL si texto >1MB)
   - [ ] completeAnalysis
   - [ ] rubricProgress
   - [ ] **activitiesProgress** ← CRÍTICO
   - [ ] **artifactsDrafts** ← CRÍTICO
   - [ ] savedCitations
   - [ ] **rewardsState** ← CRÍTICO
   - [ ] settings

### ✅ Resultado Esperado
Todos los campos presentes en Firestore Document.

### ❌ Si Falla
- Revisar logs en consola buscando "saveSessionToFirestore"
- Verificar que usuario esté autenticado: `localStorage.getItem('currentUserId')`

---

## 🧪 TEST 7: CARGA EN SEGUNDO DISPOSITIVO

### Objetivo
**PRUEBA DEFINITIVA** - Verificar que TODO se sincroniza entre dispositivos.

### Pasos

#### DISPOSITIVO A (donde trabajaste):
1. [ ] Completar Tests 1-6
2. [ ] Asegurar que sesión está guardada y sincronizada
3. [ ] Copiar el sessionId:
   ```javascript
   console.log('SessionID:', localStorage.getItem('currentSessionId'));
   ```
4. [ ] **Anotar el sessionId** (lo necesitarás en Dispositivo B)

#### DISPOSITIVO B (nuevo navegador/dispositivo):
5. [ ] Abrir http://localhost:3000 (o URL de producción)
6. [ ] Iniciar sesión con **LA MISMA CUENTA** de Firebase
7. [ ] Ir a "Historial de Sesiones"
8. [ ] Buscar la sesión creada en Dispositivo A
9. [ ] Hacer clic para abrir/restaurar sesión
10. [ ] **VERIFICAR** que aparezcan TODOS los datos:

#### Checklist de Datos Sincronizados:
- [ ] **Texto**: Mismo contenido exacto
- [ ] **Análisis**: Título, autor, género, resumen presentes
- [ ] **Actividades**: Actividades completadas marcadas
- [ ] **Artefactos**: Borradores parciales aparecen en editores
- [ ] **Puntos**: Puntuación coincide con Dispositivo A
- [ ] **Racha**: Streak coincide
- [ ] **Achievements**: Mismos logros desbloqueados
- [ ] **Settings**: Modo oscuro/claro igual
- [ ] **Citas**: Si guardaste citas, deben aparecer

### ✅ Resultado Esperado
**100% de los datos son idénticos entre dispositivos.**

### ❌ Si Falla
1. Ejecutar script de diagnóstico en AMBOS dispositivos:
   ```javascript
   fetch('/scripts/test-cross-device-sync.js').then(r => r.text()).then(eval);
   ```
2. Comparar resultados - identificar qué campos difieren
3. Revisar logs de Firestore en consola

---

## 🤖 TEST AUTOMATIZADO

### Script de Diagnóstico Completo

Ejecutar en **AMBOS DISPOSITIVOS** y comparar:

```javascript
fetch('/scripts/test-cross-device-sync.js').then(r => r.text()).then(eval);
```

### ✅ Resultado Esperado
- Passed: ~20-30 tests
- Failed: 0
- Warnings: algunas (OK si no hay contenido aún)
- **IMPORTANTE**: Los números deben ser IDÉNTICOS entre dispositivos

### ❌ Si Hay Diferencias
Anotar cuáles tests difieren y reportar.

---

## 📊 REPORTE FINAL

### Después de completar todos los tests:

```markdown
## Resultados de Testing

**Fecha**: ________
**Dispositivos**: ________ y ________

| Test | Resultado | Notas |
|------|-----------|-------|
| 1. Análisis no se cuelga | ✅ / ❌ | |
| 2. Guardado manual | ✅ / ❌ | |
| 3. Actividades | ✅ / ❌ | |
| 4. Artefactos | ✅ / ❌ | |
| 5. Gamificación | ✅ / ❌ | |
| 6. Firestore sync | ✅ / ❌ | |
| 7. Cross-device | ✅ / ❌ | |

**Estado General**: ✅ APROBADO / ❌ FALLÓ

**Problemas Encontrados**:
- [Lista aquí cualquier problema]

**Próximos Pasos**:
- [Lista acciones necesarias]
```

---

## 🆘 TROUBLESHOOTING

### Error: "handleSaveCurrentSession is not defined"
**Solución**: Ya fue corregido. Reiniciar servidor.

### Error: "Cannot read property 'content' of undefined"
**Causa**: `texto` es undefined en `analyzeDocument`
**Solución**: Ya fue corregido (agregado a dependencies). Reiniciar.

### activitiesProgress no aparece en Firestore
**Causa**: Campo faltaba en save/load
**Solución**: Ya fue agregado. Re-guardar sesión.

### artifactsDrafts vacío después de guardar
**Causa**: No se capturaban desde sessionStorage
**Solución**: Ya fue corregido. Volver a escribir borrador y guardar.

### Puntos no sincronizan
**Verificar**: `window.__rewardsEngine.exportState()` retorna datos
**Solución**: Si es null, reiniciar app para inicializar engine.

---

**Última Actualización**: 2025-01-XX  
**Responsable**: GitHub Copilot AI Agent  
**Estado**: ✅ LISTO PARA VALIDACIÓN
