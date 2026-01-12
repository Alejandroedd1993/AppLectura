# 🔍 Scripts de Diagnóstico Simplificados - Sin imports

## ⚠️ PROBLEMA IDENTIFICADO

Tu aplicación **NO tiene rúbricas guardadas en localStorage** porque:
1. El estudiante NO se unió correctamente a un curso
2. La evaluación NO se completó (localStorage vacío)
3. Por eso no hay datos para sincronizar

## 🎯 SOLUCIÓN DIRECTA - Sin scripts de diagnóstico

Vamos a arreglar el flujo completo en este orden:

---

## 📋 PASO 1: Verificar que el DOCENTE tiene un curso creado

### Acciones desde la cuenta DOCENTE:
1. Abre la aplicación con tu cuenta de **docente**
2. Ve a la pestaña **"Dashboard Docente"**
3. ¿Ves el curso "Alejandro 2025" con código **WRBQ2T**?
   - ✅ **SÍ** → Anota el código y pasa al PASO 2
   - ❌ **NO** → Crea un nuevo curso:
     - Nombre: "Curso Test"
     - Período: "2025"
     - Asigna al menos 1 lectura
     - Guarda el **código de 6 letras** que aparece

---

## 📋 PASO 2: ESTUDIANTE se une al curso

### Acciones desde la cuenta ESTUDIANTE:
1. **Cierra sesión** del docente
2. Inicia sesión con la cuenta de **estudiante**
3. Ve a la pestaña **"Seleccionar Texto"**
4. Busca el campo **"Unirse a un curso"**
5. Ingresa el código **WRBQ2T** (o el que anotaste)
6. Presiona **"Unirse"**

### ✅ Verificación:
- Deberías ver un mensaje: "Te has unido al curso exitosamente"
- Las lecturas del curso aparecen en la lista

---

## 📋 PASO 3: ESTUDIANTE selecciona un texto y completa rúbrica

### Acciones:
1. En "Seleccionar Texto", elige una de las lecturas del curso
2. Lee al menos 2 párrafos
3. Ve a la pestaña **"Evaluación"**
4. Completa **AL MENOS UNA RÚBRICA** completamente (todos los criterios)
5. Presiona **"Guardar Evaluación"**

### ✅ Verificación en consola (F12):
```javascript
// Ejecuta esto en la consola para verificar
const rubricas = JSON.parse(localStorage.getItem('evaluacionRubricas') || '[]');
console.log('Rúbricas completadas:', rubricas.filter(r => r.estado === 'completada').length);
```

**Resultado esperado:** Debe mostrar al menos `1` rúbrica completada

---

## 📋 PASO 4: Verificar que los datos se guardaron en Firestore

### Script de verificación SIMPLE (Ejecutar desde ESTUDIANTE):

```javascript
// Este script NO usa imports, solo lee localStorage
(function verificarDatos() {
  console.log('🔍 VERIFICANDO DATOS LOCALES\n');
  
  // 1. Rúbricas
  const rubricas = JSON.parse(localStorage.getItem('evaluacionRubricas') || '[]');
  const completadas = rubricas.filter(r => r.estado === 'completada');
  console.log(`✅ Rúbricas completadas: ${completadas.length}`);
  
  if (completadas.length > 0) {
    console.log('📄 Detalles:', completadas.map(r => ({
      nombre: r.nombre,
      puntuacion: r.puntuacionTotal
    })));
  } else {
    console.error('❌ NO HAY RÚBRICAS COMPLETADAS - Completa una rúbrica primero');
    return;
  }
  
  // 2. Sesión
  const session = JSON.parse(localStorage.getItem('session') || '{}');
  console.log('\n📝 Sesión:', {
    textoId: session.text?.metadata?.id || '❌ FALTANTE',
    sourceCourseId: session.sourceCourseId || '❌ FALTANTE - NO TE UNISTE AL CURSO'
  });
  
  if (!session.sourceCourseId) {
    console.error('\n❌ PROBLEMA: No hay sourceCourseId');
    console.log('💡 SOLUCIÓN: Únete a un curso con el código del docente (PASO 2)');
  } else {
    console.log('\n✅ TODO CORRECTO - Los datos deberían sincronizarse');
  }
})();
```

---

## 📋 PASO 5: DOCENTE verifica el dashboard

### Acciones:
1. Cierra sesión del estudiante
2. Inicia sesión con la cuenta de **docente**
3. Ve a **"Dashboard Docente"**
4. Selecciona el curso "Alejandro 2025"
5. Busca la sección **"Estudiantes Activos"**
6. ¿Aparece el estudiante con su progreso?

---

## 🚨 Si después de seguir TODOS los pasos anteriores el progreso NO aparece:

### Script de FORZAR sincronización (Solo ESTUDIANTE):

```javascript
(function forzarSincronizacion() {
  console.log('🔄 FORZANDO SINCRONIZACIÓN\n');
  
  const rubricas = JSON.parse(localStorage.getItem('evaluacionRubricas') || '[]');
  const completada = rubricas.find(r => r.estado === 'completada');
  
  if (!completada) {
    console.error('❌ No hay rúbricas completadas');
    return;
  }
  
  console.log('📤 Disparando evento de sincronización...');
  
  window.dispatchEvent(new CustomEvent('artifact-evaluated', {
    detail: {
      artifactType: 'rubrica',
      rubricaId: completada.id,
      nombre: completada.nombre,
      puntuacionTotal: completada.puntuacionTotal,
      estado: 'completada',
      criterios: completada.criterios
    }
  }));
  
  console.log('✅ Evento disparado');
  console.log('⏳ Espera 3 segundos y revisa la consola por errores');
  
  // Verificar después de 3 segundos
  setTimeout(() => {
    console.log('\n🔍 Verificando si se guardó...');
    console.log('Revisa la consola de red (Network) para ver llamadas a Firestore');
  }, 3000);
})();
```

---

## 📊 RESUMEN DE PASOS:

1. ✅ Docente crea curso → Obtiene código (ej: WRBQ2T)
2. ✅ Estudiante se une con el código
3. ✅ Estudiante selecciona texto del curso
4. ✅ Estudiante completa rúbrica y guarda
5. ✅ Ejecuta script de verificación (debe mostrar sourceCourseId)
6. ✅ Docente ve el progreso en dashboard

**Si falta `sourceCourseId` en el PASO 4 → El estudiante NO se unió correctamente al curso (vuelve al PASO 2)**
