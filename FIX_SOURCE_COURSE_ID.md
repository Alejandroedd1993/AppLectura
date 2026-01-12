# 🔧 FIX IMPLEMENTADO - sourceCourseId en sesiones

## 🎯 PROBLEMA IDENTIFICADO:

Cuando un estudiante se une a un curso y completa rúbricas, el progreso **NO aparece en el dashboard del docente** porque falta el campo `sourceCourseId` en la sesión.

### Causa raíz:
1. ✅ El estudiante se une al curso correctamente (Firestore: `/courses/{courseId}/students/{uid}`)
2. ✅ Las rúbricas se completan (localStorage)
3. ❌ **Pero la sesión NO incluye `sourceCourseId`**
4. ❌ Por eso `saveStudentProgress` guarda en Firestore **SIN** `sourceCourseId`
5. ❌ El query del docente `where('sourceCourseId', '==', courseId)` **NO encuentra** los documentos

---

## ✅ SOLUCIÓN IMPLEMENTADA:

### **1. Capturar `sourceCourseId` al unirse al curso**
**Archivo:** `src/components/estudiante/TextoSelector.js`

```javascript
const handleJoinCourse = async (e) => {
  e.preventDefault();
  if (!joinCode.trim()) return;
  try {
    const result = await joinCourseWithCode(joinCode, currentUser.uid);
    
    // 🆕 CRÍTICO: Actualizar sesión activa con sourceCourseId
    if (result?.courseId) {
      const { updateCurrentSession } = await import('../../services/sessionManager');
      updateCurrentSession({ sourceCourseId: result.courseId });
      console.log('✅ [JoinCourse] sourceCourseId actualizado:', result.courseId);
    }
    
    loadDashboard();
  } catch (err) {
    alert(err.message);
  }
};
```

---

### **2. Propagar `sourceCourseId` al abrir un texto del curso**
**Archivo:** `src/components/estudiante/TextoSelector.js`

```javascript
// Modificar firma para aceptar courseId
const handleSelectText = async (textoLite, sourceCourseId = null) => {
  // ... código de Smart Resume ...
  
  // Propagar sourceCourseId a App.js
  onSelectText(contenido, { 
    textoId: textoLite.textoId,
    sourceCourseId, // 🆕
    ...docData
  });
};

// Pasar courseId al hacer clic
<button onClick={() => handleSelectText(reading, course.id)}>
  Iniciar
</button>
```

---

### **3. Guardar `sourceCourseId` en el contexto global**
**Archivo:** `src/context/AppContext.js`

```javascript
// Agregar estado
const [sourceCourseId, setSourceCourseId] = useState(null);

// Exportar en valores
setSourceCourseId, // stable
sourceCourseId,    // dynamic
```

---

### **4. Establecer `sourceCourseId` al seleccionar texto**
**Archivo:** `src/App.js`

```javascript
const handleSelectText = useCallback((content, textoData) => {
  setTexto(content || '');
  
  const targetId = textoData?.textoId;
  const courseId = textoData?.sourceCourseId;
  
  if (targetId) setCurrentTextoId(targetId);
  
  // 🆕 CRÍTICO: Guardar sourceCourseId
  if (courseId) {
    console.log('✅ sourceCourseId establecido:', courseId);
    setSourceCourseId(courseId);
  }
  
  cambiarVista('lectura-guiada');
}, [setTexto, setCurrentTextoId, setSourceCourseId]);
```

---

### **5. Incluir `sourceCourseId` en sesiones**
**Archivo:** `src/services/sessionManager.js`

```javascript
export function createSessionFromState(state) {
  const session = {
    id: sessionId,
    title,
    text: { ... },
    // 🆕 CRÍTICO
    sourceCourseId: state.sourceCourseId || null,
    completeAnalysis: { ... },
    // ...
  };
  
  return saveSession(session);
}
```

---

## 🧪 CÓMO VALIDAR:

### Paso 1: Reiniciar el servidor
```bash
npm run dev
```

### Paso 2: Flujo completo desde cero

1. **DOCENTE:**
   - Crear curso "Test Final"
   - Asignar 1 lectura
   - Copiar código (ej: `ABC123`)

2. **ESTUDIANTE:**
   - Unirse con código `ABC123`
   - Abrir la lectura del curso
   - **Abrir consola** (F12) y verificar:
     ```
     ✅ [JoinCourse] sourceCourseId actualizado: {courseId}
     ✅ [App] Estableciendo sourceCourseId en contexto: {courseId}
     ```

3. **Completar rúbrica:**
   - Ir a pestaña "Evaluación"
   - Completar al menos 1 rúbrica
   - Guardar evaluación

4. **Verificar con script:**
   ```javascript
   const session = JSON.parse(localStorage.getItem('session'));
   console.log('sourceCourseId:', session.sourceCourseId);
   ```
   **Resultado esperado:** Debe mostrar el ID del curso

5. **DOCENTE:**
   - Ir a Dashboard
   - Seleccionar curso "Test Final"
   - **Ver progreso del estudiante** (debe aparecer con %, score, rúbricas)

---

## 📊 RESULTADO ESPERADO:

✅ Dashboard del docente muestra:
- Estudiante: `{nombre}`
- Avance: `20%` (1/5 rúbricas)
- Score: `8.8`
- Lecturas completadas: `0` → `1`

---

## 🚨 SI AÚN NO FUNCIONA:

### Script de diagnóstico (estudiante):
```javascript
const session = JSON.parse(localStorage.getItem('session') || '{}');
console.log({
  textoId: session.text?.metadata?.id,
  sourceCourseId: session.sourceCourseId || '❌ FALTANTE',
  resultado: session.sourceCourseId ? '✅ CORRECTO' : '❌ PROBLEMA'
});
```

### Si falta `sourceCourseId`:
1. Verifica que el fix se aplicó correctamente (reinicia `npm run dev`)
2. Borra localStorage: `localStorage.clear()`
3. Repite el flujo completo desde el inicio
