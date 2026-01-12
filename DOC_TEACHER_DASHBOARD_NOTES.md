# Teacher Dashboard Notes

## Nuevos flujos
- Vista "Perfil docente" activable desde el header para cuentas con rol `docente`. Se guarda la preferencia en `localStorage` (`appMode`).
- Panel principal `TeacherDashboard` (src/components/teacher/TeacherDashboard.js) muestra:
  - Listado de cursos existentes y formulario para crear nuevos (nombre, periodo, autoaprueba, lecturas iniciales).
  - Código de curso copiable y métricas agregadas (estudiantes totales, activos, pendientes, avance promedio, score promedio, tiempo total).
  - Selector de lecturas disponibles para asignarlas al curso en lote.
  - Tabla de estudiantes con estado, avance, tiempo y lecturas completadas, más aprobación rápida de pendientes.
  - Exportación de métricas a CSV o JSON.

## Checklist de pruebas manuales sugeridas
1. Ingresar con usuario `docente` y verificar que el toggle "Perfil docente / Vista estudiante" aparece en el header y que la vista docente se activa por defecto la primera vez.
2. Crear un curso nuevo con y sin lecturas iniciales, confirmar aparición inmediata en la columna izquierda y código generado/copiar.
3. Asignar/actualizar lecturas a un curso existente y revisar que la tabla refleje el nuevo total tras recargar métricas.
4. Generar inscripciones de estudiantes (con y sin autoaprueba) para comprobar la sección de pendientes y el botón "Aprobar".
5. Descargar CSV y JSON y validar el contenido (cabeceras, datos por estudiante, info del curso).
6. Cambiar de nuevo a "Vista estudiante" y confirmar que la aplicación vuelve al flujo de lectura sin conservar modo foco.

## Notas técnicas
- Los helpers usados provienen de `src/firebase/firestore.js` (createCourse, assignLecturasToCourse, getCourseMetrics, etc.).
- El dashboard utiliza un spinner propio para evitar bloquear toda la UI mientras se buscan cursos/métricas.
- Los listados actualizan el estado local tras cada operación para mantener sincronía sin recargar la página.
