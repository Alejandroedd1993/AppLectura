# 🧪 Guía de Validación - Fixes Flujo Estudiante-Docente

## Fecha: 8 de Diciembre 2025

Esta guía te ayudará a validar los 3 fixes implementados para el flujo estudiante-docente.

---

## ✅ PRE-REQUISITOS

1. **Servidor corriendo:** `npm run dev` (ya ejecutado ✅)
2. **Dos cuentas:**
   - Una cuenta de **Docente** (para crear curso y ver dashboard)
   - Una cuenta de **Estudiante** (para unirse al curso y hacer actividades)
3. **Navegador con DevTools abierto** (F12) en pestaña Console

---

## 🧪 TEST 1: Validar que el Progreso se Guarda Correctamente

### Objetivo
Verificar que cuando un estudiante completa una rúbrica, se guardan los campos correctos en Firestore.

### Pasos:

#### 1. Como Docente:
1. Inicia sesión como docente
2. Crea un curso nuevo (ej: "Curso Test - Validación")
3. Sube o asigna una lectura al curso
4. Anota el **código del curso** que aparece

#### 2. Como Estudiante:
1. Abre una **ventana de incógnito** o perfil diferente
2. Inicia sesión como estudiante
3. Ve a "Mis Cursos" → "Unirse a un nuevo curso"
4. Ingresa el código del curso del docente
5. Haz clic en "Iniciar" en la lectura asignada
6. **ESPERA 1-2 MINUTOS** para que el análisis IA se complete
7. Una vez cargado, ve a la pestaña "Actividades"
8. Completa la "Preparación" (MCQ + Síntesis)
9. Ve a "Resumen Académico" (Rúbrica 1)
10. Escribe un resumen breve y haz clic en "Evaluar"

#### 3. Verificación en Consola (Estudiante):
Pega este código en la consola del navegador del estudiante:

```javascript
// VALIDACIÓN TEST 1: Verificar estructura de datos guardados
(async function validateTest1() {
  const uid = firebase.auth().currentUser?.uid;
  const textoId = window.__appContext?.currentTextoId;
  
  if (!uid) {
    console.error('❌ No hay usuario autenticado');
    return;
  }
  
  if (!textoId) {
    console.error('❌ No hay textoId activo. Asegúrate de estar en una lectura de un curso.');
    return;
  }
  
  console.log('🔍 Verificando progreso guardado...');
  console.log('📎 UID:', uid);
  console.log('📎 textoId:', textoId);
  
  const doc = await firebase.firestore()
    .collection('students').doc(uid)
    .collection('progress').doc(textoId)
    .get();
  
  if (!doc.exists) {
    console.error('❌ TEST 1 FALLIDO: No se encontró documento de progreso');
    return;
  }
  
  const data = doc.data();
  console.log('\n📊 Datos guardados:', data);
  
  // Validaciones
  const checks = {
    'sourceCourseId existe': !!data.sourceCourseId,
    'rubricProgress existe': !!data.rubricProgress,
    'porcentaje calculado': typeof data.porcentaje === 'number',
    'score existe': typeof data.score === 'number',
    'estado calculado': ['pending', 'in-progress', 'completed'].includes(data.estado),
    'promedio_global calculado': typeof data.promedio_global === 'number'
  };
  
  console.log('\n✅ RESULTADOS TEST 1:');
  Object.entries(checks).forEach(([check, pass]) => {
    console.log(pass ? `✅ ${check}` : `❌ ${check}`);
  });
  
  if (Object.values(checks).every(v => v)) {
    console.log('\n🎉 TEST 1 PASADO: Todos los campos se guardan correctamente');
  } else {
    console.error('\n❌ TEST 1 FALLIDO: Algunos campos faltan');
  }
  
  return data;
})();
```

**Resultado esperado:**
```
✅ sourceCourseId existe
✅ rubricProgress existe
✅ porcentaje calculado
✅ score existe
✅ estado calculado
✅ promedio_global calculado

🎉 TEST 1 PASADO
```

---

## 🧪 TEST 2: Validar que el Docente Puede Ver el Progreso

### Objetivo
Verificar que el dashboard del docente muestra correctamente el progreso del estudiante.

### Pasos:

#### 1. Como Docente:
1. En la ventana del docente, ve al "Dashboard del Curso"
2. Selecciona el curso que creaste
3. Haz clic en "Actualizar Métricas" (botón de refresh)

#### 2. Verificación Visual:
Deberías ver:
- ✅ El estudiante aparece en la lista
- ✅ Progreso muestra un porcentaje > 0% (ej: 20% si completó 1/5 rúbricas)
- ✅ Estado muestra "En Progreso" (in-progress)
- ✅ Puntuación muestra un número (ej: 8.5)

#### 3. Verificación en Consola (Docente):
Pega este código en la consola del navegador del docente:

```javascript
// VALIDACIÓN TEST 2: Verificar getCourseMetrics
(async function validateTest2() {
  // Reemplaza con el ID de tu curso (lo ves en la URL o en el objeto del curso)
  const courseId = prompt('Ingresa el ID del curso (lo ves en la consola o URL):');
  
  if (!courseId) {
    console.error('❌ Necesitas ingresar el ID del curso');
    return;
  }
  
  console.log('🔍 Obteniendo métricas del curso:', courseId);
  
  // Importar la función
  const { getCourseMetrics } = await import('./firebase/firestore.js');
  
  const metrics = await getCourseMetrics(courseId);
  
  console.log('\n📊 MÉTRICAS DEL CURSO:');
  console.log('Total estudiantes:', metrics.resumen.totalEstudiantes);
  console.log('Estudiantes activos:', metrics.resumen.activos);
  console.log('Promedio avance:', metrics.resumen.promedioAvance + '%');
  console.log('Promedio score:', metrics.resumen.promedioScore);
  
  console.log('\n👥 ESTUDIANTES:');
  metrics.estudiantes.forEach(est => {
    console.log(`\n📌 ${est.nombre || 'Estudiante'}`);
    console.log('  - Progreso:', est.stats.avancePorcentaje + '%');
    console.log('  - Score:', est.stats.promedioScore);
    console.log('  - Lecturas completadas:', est.stats.lecturasCompletadas);
  });
  
  if (metrics.estudiantes.length > 0 && metrics.estudiantes[0].stats.avancePorcentaje > 0) {
    console.log('\n🎉 TEST 2 PASADO: El docente SÍ puede ver el progreso');
  } else {
    console.error('\n❌ TEST 2 FALLIDO: No se encontró progreso de estudiantes');
  }
  
  return metrics;
})();
```

**Resultado esperado:**
```
📊 MÉTRICAS DEL CURSO:
Total estudiantes: 1
Estudiantes activos: 1
Promedio avance: 20%
Promedio score: 8.5

👥 ESTUDIANTES:
📌 Marco Alencastro
  - Progreso: 20%
  - Score: 8.5
  - Lecturas completadas: 0

🎉 TEST 2 PASADO
```

---

## 🧪 TEST 3: Validar Smart Resume (Caché del Análisis)

### Objetivo
Verificar que al volver a una lectura, el análisis NO se vuelve a ejecutar (se recupera de la sesión guardada).

### Pasos:

#### 1. Como Estudiante (continuando del TEST 1):
1. Después de haber completado una rúbrica, haz clic en "← Mis Cursos" (arriba a la izquierda)
2. Deberías volver a la vista de cursos

#### 2. Verificación en Consola (antes de continuar):
Pega este código para verificar que hay sesiones guardadas:

```javascript
// VALIDACIÓN TEST 3a: Verificar sesiones guardadas
(async function validateTest3a() {
  const { getAllSessionsMerged } = await import('./services/sessionManager.js');
  
  const sessions = await getAllSessionsMerged();
  
  console.log('💾 SESIONES GUARDADAS:', sessions.length);
  
  sessions.forEach((s, i) => {
    const textoId = s.text?.metadata?.id || s.text?.textoId || s.currentTextoId;
    const titulo = s.text?.fileName || s.name;
    const hasAnalysis = !!s.completeAnalysis;
    
    console.log(`\n${i + 1}. Sesión: ${s.id}`);
    console.log('   Texto ID:', textoId);
    console.log('   Título:', titulo);
    console.log('   Tiene análisis:', hasAnalysis ? '✅' : '❌');
    console.log('   Última modificación:', new Date(s.lastModified).toLocaleString());
  });
  
  if (sessions.length > 0 && sessions.some(s => s.completeAnalysis)) {
    console.log('\n🎉 TEST 3a PASADO: Hay sesiones con análisis guardado');
  } else {
    console.error('\n❌ TEST 3a FALLIDO: No hay sesiones o no tienen análisis');
  }
  
  return sessions;
})();
```

**Resultado esperado:**
```
💾 SESIONES GUARDADAS: 1

1. Sesión: session_1733680000000_abc123
   Texto ID: texto_xyz789
   Título: Artículo de Prueba
   Tiene análisis: ✅
   Última modificación: 8/12/2025, 10:30:00

🎉 TEST 3a PASADO
```

#### 3. Ahora haz clic en "▶ Continuar" en la lectura:

Observa atentamente:
- ✅ **DEBERÍA**: Cargar instantáneamente (< 2 segundos)
- ✅ **DEBERÍA**: Mostrar el texto y pestañas inmediatamente
- ❌ **NO DEBERÍA**: Mostrar "Cargando..." por 1-2 minutos

#### 4. Verificación en Consola (después de continuar):
Pega este código para confirmar que se restauró la sesión:

```javascript
// VALIDACIÓN TEST 3b: Verificar que se usó Smart Resume
(async function validateTest3b() {
  const analysis = window.__appContext?.completeAnalysis;
  const textoId = window.__appContext?.currentTextoId;
  
  console.log('🔍 Verificando Smart Resume...');
  console.log('Análisis cargado:', !!analysis);
  console.log('textoId actual:', textoId);
  
  if (analysis && analysis.metadata) {
    console.log('\n📊 Metadata del análisis:');
    console.log('  - document_id:', analysis.metadata.document_id);
    console.log('  - timestamp:', analysis.metadata.analysis_timestamp);
    console.log('  - provider:', analysis.metadata.provider);
    
    // Verificar que el timestamp es antiguo (se recuperó, no se generó ahora)
    const timestamp = new Date(analysis.metadata.analysis_timestamp);
    const now = new Date();
    const diffMinutes = (now - timestamp) / 1000 / 60;
    
    console.log('  - Antigüedad:', Math.round(diffMinutes), 'minutos');
    
    if (diffMinutes > 1) {
      console.log('\n🎉 TEST 3b PASADO: Se usó Smart Resume (análisis antiguo recuperado)');
    } else {
      console.warn('\n⚠️ TEST 3b DUDOSO: El análisis parece muy reciente, puede haberse regenerado');
    }
  } else {
    console.error('\n❌ TEST 3b FALLIDO: No hay análisis cargado');
  }
})();
```

**Resultado esperado:**
```
🔍 Verificando Smart Resume...
Análisis cargado: true
textoId actual: texto_xyz789

📊 Metadata del análisis:
  - document_id: texto_xyz789
  - timestamp: 2025-12-08T10:30:00.000Z
  - provider: backend
  - Antigüedad: 5 minutos

🎉 TEST 3b PASADO: Se usó Smart Resume
```

---

## 📊 Resumen de Validación

Al completar los 3 tests, deberías tener:

| Test | Objetivo | Estado |
|------|----------|--------|
| TEST 1 | Campos guardados correctamente | ⏳ Pendiente |
| TEST 2 | Docente ve progreso | ⏳ Pendiente |
| TEST 3 | Smart Resume funciona | ⏳ Pendiente |

### ✅ Si todos los tests pasan:
Los 3 fixes están funcionando correctamente y el flujo estudiante-docente está operativo.

### ❌ Si algún test falla:
Anota cuál falló y copia el output de la consola para debuggear.

---

## 🐛 Troubleshooting

### Problema: "No hay usuario autenticado"
**Solución:** Asegúrate de estar logueado. Verifica en consola:
```javascript
firebase.auth().currentUser
```

### Problema: "No hay textoId activo"
**Solución:** Asegúrate de estar dentro de una lectura de un curso (no análisis libre).

### Problema: "sourceCourseId no existe"
**Solución:** El estudiante debe haberse unido al curso ANTES de hacer la lectura. Si ya estaba dentro, puede que haya datos legacy. Crea un nuevo curso y prueba con un estudiante nuevo.

### Problema: "El análisis se regenera"
**Solución:** Verifica que el `textoId` sea el mismo al volver. Ejecuta:
```javascript
window.__appContext?.currentTextoId
```
antes y después de volver a "Mis Cursos".

---

## 📝 Notas

- Los tests usan la consola del navegador porque es la forma más directa de verificar el estado de Firestore y las sesiones.
- Asegúrate de tener las DevTools abiertas (F12) en Chrome/Edge.
- Si ves errores de CORS o Firebase, verifica que las reglas de Firestore permitan lectura/escritura.

---

**¿Listo para empezar?** Sigue los pasos en orden y reporta los resultados de cada test. 🚀
