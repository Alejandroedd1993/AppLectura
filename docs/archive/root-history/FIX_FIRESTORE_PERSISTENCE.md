# Fix: Persistencia de SourceCourseId en Firestore

## Problema Identificado
A pesar de las correcciones en el estado local (`AppContext`) y almacenamiento local (`sessionManager`), la sincronización con la nube (`firestore.js`) tenía dos brechas críticas:
1. **Sesiones Huérfanas**: `saveSessionToFirestore` no guardaba el `sourceCourseId`, por lo que al restaurar una sesión desde otro dispositivo, se perdía el vínculo con el curso.
2. **Notas Invisibles**: `saveStudentProgress` no actualizaba ni garantizaba el `sourceCourseId` si el documento de progreso se creaba o actualizaba sin él, haciendo que las notas fueran invisibles para el docente (que filtra por este ID).

## Solución Implementada

### 1. Actualización de `src/context/AppContext.js`
Se modificaron los efectos de sincronización para inyectar siempre el `sourceCourseId` actual en los payloads de guardado:
- **Sincronización de Rúbricas**: Ahora incluye `sourceCourseId` en `progressData`.
- **Sincronización de Actividades**: Ahora incluye `sourceCourseId`.
- **Sincronización de Gamificación (Rewards)**: Ahora incluye `sourceCourseId`.
- **Dependencias**: Se agregó `sourceCourseId` a los arrays de dependencias de los `useEffect` correspondientes.

### 2. Actualización de `src/firebase/firestore.js`

#### `saveStudentProgress`
Se modificó la lógica de merge para priorizar el `sourceCourseId` entrante:
```javascript
// ANTES
...(existingData.sourceCourseId && { sourceCourseId: existingData.sourceCourseId }),

// AHORA
sourceCourseId: progressData.sourceCourseId || existingData.sourceCourseId || null,
```
Esto asegura que si el ID del curso se perdió o no existía, se repare automáticamente con la próxima sincronización.

#### `saveSessionToFirestore`
Se agregó explícitamente el campo al objeto que se sube a la nube:
```javascript
const firestoreData = {
  // ...
  activitiesProgress: sessionData.activitiesProgress || {},
  
  // 🆕 CRÍTICO: ID del curso para sincronización
  sourceCourseId: sessionData.sourceCourseId || null,
  // ...
};
```

## Impacto
- **Docente**: Ahora verá las notas y el progreso de los estudiantes consistentemente, ya que todos los documentos de progreso tendrán el `sourceCourseId` correcto.
- **Estudiante**: Podrá cambiar de dispositivo o limpiar caché sin perder la conexión de sus sesiones con el curso. El botón "Continuar" (Smart Resume) funcionará correctamente incluso tras restaurar desde la nube.
