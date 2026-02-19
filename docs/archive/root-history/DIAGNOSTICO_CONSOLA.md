# Scripts de Diagnóstico - Acceso directo a Firestore

## ⚠️ IMPORTANTE: Estos scripts acceden directamente a Firestore

Los datos de cursos están en **Firestore**, NO en localStorage. Estos scripts verifican la base de datos real.

---

## 📊 Script 1: Verificar datos FIRESTORE - Cuenta ESTUDIANTE

### Instrucciones:
1. Abre la aplicación con la cuenta del **ESTUDIANTE**
2. **Ve a la pestaña "Evaluación"** (debe estar cargada)
3. Abre DevTools (F12) > Pestaña **Console**
4. Copia y pega este código:

```javascript
// ========================================
// DIAGNÓSTICO FIRESTORE: Estudiante
// ========================================

(async function diagnosticoFirestoreEstudiante() {
  console.log('🔍 INICIANDO DIAGNÓSTICO FIRESTORE - ESTUDIANTE\n');
  
  // Importar Firestore desde el módulo
  const { db } = await import('/src/firebase/config.js');
  const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
  
  // 1. Obtener usuario actual desde Auth
  const { auth } = await import('/src/firebase/config.js');
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.error('❌ No hay usuario autenticado');
    return;
  }
  
  console.log('✅ Usuario autenticado:', currentUser.email);
  const uid = currentUser.uid;
  
  // 2. Buscar cursos en los que está inscrito
  console.log('\n📚 BUSCANDO CURSOS DEL ESTUDIANTE...');
  const coursesRef = collection(db, 'courses');
  const allCourses = await getDocs(coursesRef);
  
  const cursosInscritos = [];
  for (const courseDoc of allCourses.docs) {
    const studentRef = doc(db, 'courses', courseDoc.id, 'students', uid);
    const studentSnap = await getDoc(studentRef);
    
    if (studentSnap.exists()) {
      const courseData = courseDoc.data();
      cursosInscritos.push({
        courseId: courseDoc.id,
        nombreCurso: courseData.nombre,
        codigo: courseData.codigoJoin,
        estadoEstudiante: studentSnap.data().estado,
        lecturasAsignadas: studentSnap.data().lecturasAsignadas
      });
    }
  }
  
  if (cursosInscritos.length === 0) {
    console.error('❌ NO ESTÁS INSCRITO EN NINGÚN CURSO');
    console.log('💡 Debes unirte a un curso con el código que te dio tu docente');
    return;
  }
  
  console.log(`✅ INSCRITO EN ${cursosInscritos.length} CURSO(S):`, cursosInscritos);
  
  // 3. Buscar progreso del estudiante
  console.log('\n📊 BUSCANDO PROGRESO EN FIRESTORE...');
  const progressRef = collection(db, 'students', uid, 'progress');
  const progressSnap = await getDocs(progressRef);
  
  if (progressSnap.empty) {
    console.error('❌ NO HAY PROGRESO GUARDADO EN FIRESTORE');
    console.log('⚠️ Esto significa que las rúbricas completadas NO se sincronizaron');
  } else {
    console.log(`✅ PROGRESO ENCONTRADO: ${progressSnap.size} documento(s)`);
    progressSnap.forEach(docSnap => {
      const data = docSnap.data();
      console.log(`\n📄 Texto: ${docSnap.id}`, {
        porcentaje: data.porcentaje || 0,
        score: data.score || 0,
        estado: data.estado,
        rubricasCompletadas: data.rubricasCompletadas?.length || 0,
        sourceCourseId: data.sourceCourseId || '❌ FALTANTE'
      });
    });
  }
  
  console.log('\n✅ DIAGNÓSTICO COMPLETADO');
})();
```

---

## 👨‍🏫 Script 2: Verificar datos FIRESTORE - Cuenta DOCENTE

### Instrucciones:
1. Abre la aplicación con la cuenta del **DOCENTE**
2. **Ve a la pestaña "Dashboard Docente"** (debe estar cargada)
3. Abre DevTools (F12) > Pestaña **Console**
4. Copia y pega este código:

```javascript
// ========================================
// DIAGNÓSTICO FIRESTORE: Docente
// ========================================

(async function diagnosticoFirestoreDocente() {
  console.log('🔍 INICIANDO DIAGNÓSTICO FIRESTORE - DOCENTE\n');
  
  // Importar Firestore
  const { db } = await import('/src/firebase/config.js');
  const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
  
  // 1. Obtener usuario actual
  const { auth } = await import('/src/firebase/config.js');
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.error('❌ No hay usuario autenticado');
    return;
  }
  
  console.log('✅ Usuario autenticado:', currentUser.email);
  const uid = currentUser.uid;
  
  // 2. Buscar cursos del docente
  console.log('\n📚 BUSCANDO CURSOS EN FIRESTORE...');
  const coursesQuery = query(
    collection(db, 'courses'),
    where('docenteUid', '==', uid)
  );
  
  const coursesSnap = await getDocs(coursesQuery);
  
  if (coursesSnap.empty) {
    console.error('❌ NO TIENES CURSOS CREADOS');
    console.log('💡 Crea un curso desde el Dashboard Docente');
    return;
  }
  
  console.log(`✅ TIENES ${coursesSnap.size} CURSO(S) CREADO(S)\n`);
  
  // 3. Detalles de cada curso
  for (const courseDoc of coursesSnap.docs) {
    const courseData = courseDoc.data();
    console.log(`📖 CURSO: "${courseData.nombre}"`);
    console.log({
      id: courseDoc.id,
      codigo: courseData.codigoJoin,
      periodo: courseData.periodo,
      lecturasAsignadas: courseData.lecturasAsignadas?.length || 0
    });
    
    // 4. Buscar estudiantes del curso
    const studentsRef = collection(db, 'courses', courseDoc.id, 'students');
    const studentsSnap = await getDocs(studentsRef);
    
    if (studentsSnap.empty) {
      console.log('   ⚠️ Sin estudiantes inscritos');
    } else {
      console.log(`   ✅ ${studentsSnap.size} estudiante(s) inscrito(s):`);
      
      // 5. Buscar progreso de cada estudiante
      for (const studentDoc of studentsSnap.docs) {
        const studentData = studentDoc.data();
        const studentUid = studentDoc.id;
        
        console.log(`\n   👤 Estudiante: ${studentUid}`);
        console.log({
          estado: studentData.estado,
          lecturasAsignadas: studentData.lecturasAsignadas?.length || 0,
          stats: studentData.stats
        });
        
        // Buscar progreso del estudiante en /students/{uid}/progress
        const progressRef = collection(db, 'students', studentUid, 'progress');
        const progressSnap = await getDocs(progressRef);
        
        if (progressSnap.empty) {
          console.log('      ❌ Sin progreso registrado en Firestore');
        } else {
          console.log(`      ✅ ${progressSnap.size} documento(s) de progreso:`);
          progressSnap.forEach(progDoc => {
            const progData = progDoc.data();
            console.log(`         📄 Texto: ${progDoc.id}`, {
              porcentaje: progData.porcentaje || 0,
              score: progData.score || 0,
              estado: progData.estado,
              sourceCourseId: progData.sourceCourseId || '❌ FALTANTE',
              matchCurso: progData.sourceCourseId === courseDoc.id ? '✅ CORRECTO' : '❌ NO COINCIDE'
            });
          });
        }
      }
    }
    
    console.log('\n' + '─'.repeat(60) + '\n');
  }
  
  console.log('✅ DIAGNÓSTICO COMPLETADO');
})();
```

---

## 🔧 Script 3: RESINCRONIZAR datos (Ejecutar desde ESTUDIANTE)

Si el Script 1 muestra que NO hay progreso en Firestore, usa este script para forzar la sincronización:

### Instrucciones:
1. Ejecuta desde la cuenta del **ESTUDIANTE**
2. Asegúrate de estar en la pestaña de **Evaluación**
3. Abre DevTools (F12) > Console
4. Copia y pega:

```javascript
// ========================================
// RESINCRONIZAR: Forzar guardado a Firestore
// ========================================

(async function resincronizarFirestore() {
  console.log('🔄 INICIANDO RESINCRONIZACIÓN...\n');
  
  // Importar funciones necesarias
  const { auth, db } = await import('/src/firebase/config.js');
  const { saveStudentProgress } = await import('/src/firebase/firestore.js');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('❌ No hay usuario autenticado');
    return;
  }
  
  // 1. Obtener rúbricas de localStorage
  const rubricasStr = localStorage.getItem('evaluacionRubricas');
  if (!rubricasStr) {
    console.error('❌ No hay rúbricas en localStorage');
    console.log('💡 Completa al menos una rúbrica primero');
    return;
  }
  
  const rubricas = JSON.parse(rubricasStr);
  const rubricasCompletadas = rubricas.filter(r => r.estado === 'completada');
  
  if (rubricasCompletadas.length === 0) {
    console.error('❌ No hay rúbricas completadas');
    return;
  }
  
  console.log(`✅ Encontradas ${rubricasCompletadas.length} rúbrica(s) completada(s)`);
  
  // 2. Obtener sesión activa
  const sessionStr = localStorage.getItem('session');
  if (!sessionStr) {
    console.error('❌ No hay sesión activa');
    console.log('💡 Abre un texto para crear una sesión');
    return;
  }
  
  const session = JSON.parse(sessionStr);
  const textoId = session.text?.metadata?.id;
  const sourceCourseId = session.sourceCourseId;
  
  if (!textoId) {
    console.error('❌ No hay textoId en la sesión');
    return;
  }
  
  console.log('📝 Sesión encontrada:', {
    textoId,
    sourceCourseId: sourceCourseId || '⚠️ NO CONFIGURADO'
  });
  
  // 3. Calcular progreso
  const porcentaje = Math.round((rubricasCompletadas.length / 5) * 100);
  const score = rubricasCompletadas.reduce((acc, r) => acc + (r.puntuacionTotal || 0), 0) / rubricasCompletadas.length;
  
  const progressData = {
    textoId,
    porcentaje,
    score,
    estado: porcentaje === 100 ? 'completed' : 'in-progress',
    rubricasCompletadas: rubricasCompletadas.map(r => ({
      rubricaId: r.id,
      nombre: r.nombre,
      puntuacion: r.puntuacionTotal,
      completadoEn: new Date().toISOString()
    })),
    sourceCourseId: sourceCourseId || null,
    ultimaActualizacion: new Date().toISOString()
  };
  
  console.log('\n📤 Guardando en Firestore:', progressData);
  
  try {
    await saveStudentProgress(currentUser.uid, textoId, progressData);
    console.log('✅ ¡SINCRONIZACIÓN EXITOSA!');
    console.log('💡 Ahora verifica el Dashboard del docente');
  } catch (error) {
    console.error('❌ Error al guardar:', error);
  }
})();
```

---

## 📋 Qué hacer después

### Paso 1: Ejecuta Script 1 (Estudiante)
- Si muestra rúbricas en localStorage ✅ → Firebase está recibiendo datos
- Si NO muestra rúbricas ❌ → El problema es anterior (evaluación no se completó)

### Paso 2: Ejecuta Script 2 (Docente)
- Verifica que el curso tenga el mismo ID que espera la query
- Compara el ID del curso con los datos del estudiante

### Paso 3: Comparte los resultados
- Copia TODA la salida de ambos scripts
- Compartela para identificar dónde está la desconexión

---

## 🚨 Errores comunes a buscar

1. **"sourceCourseId" undefined en Script 1** → El estudiante no se unió correctamente al curso
2. **"codigo: null" en Script 2** → El curso no se creó correctamente
3. **IDs diferentes entre estudiante y docente** → Problema de sincronización
4. **Rúbricas en localStorage pero no en Firebase** → Problema de permisos o cuota Firestore
