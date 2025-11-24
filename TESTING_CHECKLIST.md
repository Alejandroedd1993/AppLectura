# ✅ Plan de Testing Pre-Lanzamiento - AppLectura v1.0

**Fecha**: 21 de noviembre de 2025  
**Objetivo**: Verificar que la aplicación está lista para usuarios reales  
**Responsable**: Equipo de desarrollo

---

## 🎯 Criterios de Aceptación para Lanzamiento

La aplicación debe:
- ✅ Compilar sin errores
- ✅ Funcionar sin errores de JavaScript en consola
- ✅ Cargar en menos de 3 segundos
- ✅ Ser responsive (móvil, tablet, desktop)
- ✅ Persistir datos correctamente (localStorage + Firebase)
- ✅ Manejar errores de red gracefully

---

## 📋 Testing Checklist

### 1️⃣ **Autenticación y Seguridad**

**Login**
- [ ] Registro de nuevo usuario con email/password
- [ ] Login con credenciales correctas
- [ ] Error visible con credenciales incorrectas
- [ ] Recuperación de contraseña (reset password)
- [ ] Persistencia de sesión (refresh no cierra sesión)
- [ ] Logout funciona correctamente

**Seguridad**
- [ ] Firestore rules bloquean acceso no autorizado
- [ ] Solo el usuario puede ver sus propias sesiones
- [ ] API keys en variables de entorno (no expuestas)

**Test manual**: 
1. Crear cuenta nueva
2. Cerrar sesión
3. Intentar login con password incorrecta → debe mostrar error
4. Login correcto → debe redirigir a app
5. Refresh página → debe mantener sesión

---

### 2️⃣ **Gestión de Sesiones**

**Crear sesión**
- [ ] Cargar texto → automáticamente crea sesión
- [ ] Sesión tiene ID único
- [ ] Sesión se guarda en localStorage inmediatamente
- [ ] Sesión se sincroniza con Firestore (async)

**Restaurar sesión**
- [ ] Click en tarjeta de sesión restaura correctamente
- [ ] Texto se carga en visor
- [ ] Análisis previo se restaura
- [ ] Progreso de rúbricas se restaura
- [ ] Citas guardadas se restauran

**Límite de sesiones**
- [ ] Al guardar sesión #6, elimina automáticamente la #1
- [ ] Banner muestra "X de 5 sesiones"
- [ ] Barra de progreso funciona
- [ ] Warning aparece al 90% (4.5/5 sesiones)

**Test manual**:
1. Cargar 6 textos diferentes
2. Verificar que solo quedan 5 sesiones
3. Verificar que la más antigua fue eliminada
4. Click en sesión → debe restaurar todo el estado

---

### 3️⃣ **Sistema de Evaluación**

**Generar preguntas**
- [ ] Pregunta se genera según dimensión seleccionada
- [ ] Pregunta tiene contexto del texto
- [ ] Botón "Siguiente pregunta" funciona
- [ ] Cambio de dimensión genera nueva pregunta

**Evaluar respuestas**
- [ ] Evaluación retorna puntuación 1-10
- [ ] Feedback es constructivo
- [ ] Score se guarda en rubricProgress
- [ ] Progreso se actualiza visualmente

**Reintentos**
- [ ] Permite múltiples intentos en misma pregunta
- [ ] Guarda historial de scores
- [ ] Calcula promedio correctamente

**Test manual**:
1. Seleccionar dimensión (ej: Comprensión Literal)
2. Generar pregunta
3. Responder → debe evaluar y dar feedback
4. Intentar de nuevo → debe permitir reintento
5. Cambiar dimensión → nueva pregunta

---

### 4️⃣ **Analíticas y Métricas**

**Tab "Sesión Actual"**
- [ ] ProgressChart muestra evolución temporal
- [ ] RadarComparisonChart muestra spider chart
- [ ] DistributionChart muestra barras con insights
- [ ] Métricas numéricas son correctas
- [ ] Fortalezas y debilidades identificadas
- [ ] Recomendaciones personalizadas

**Tab "Comparar Sesiones"**
- [ ] Bloqueado si hay <2 sesiones con progreso
- [ ] Gráfico de tendencia funciona
- [ ] Tabla comparativa muestra todas las sesiones
- [ ] Métricas agregadas correctas
- [ ] Insights automáticos relevantes

**Tab "Dashboard Interactivo"**
- [ ] Filtros temporales funcionan (semana/mes/trimestre/todo)
- [ ] Filtros por rúbrica funcionan
- [ ] KPIs se actualizan según filtros
- [ ] Gráficos se adaptan a filtros
- [ ] Distribución de resultados correcta
- [ ] Progreso por competencia visible

**Test manual**:
1. Completar evaluaciones en múltiples sesiones
2. Ir a "Analíticas y Métricas"
3. Probar los 3 tabs
4. Filtrar por diferentes períodos
5. Verificar que gráficos se actualizan

---

### 5️⃣ **Sincronización Firebase**

**localStorage → Firestore**
- [ ] Sesión nueva se sube automáticamente
- [ ] Actualización de sesión se sincroniza
- [ ] Eliminación de sesión se refleja en Firestore
- [ ] Offline: cambios se guardan en localStorage
- [ ] Online: cambios pendientes se sincronizan

**Firestore → localStorage**
- [ ] Al login, se cargan sesiones desde Firestore
- [ ] Merge inteligente entre local y cloud
- [ ] Conflictos se resuelven (más reciente gana)

**Test manual**:
1. Crear sesión con internet
2. Verificar en Firebase Console que existe
3. Cerrar sesión y volver a loguear
4. Verificar que sesión sigue ahí
5. Desconectar internet → crear sesión → debe guardar local
6. Reconectar → debe sincronizar automáticamente

---

### 6️⃣ **Rendimiento**

**Tiempos de carga**
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3.5s
- [ ] Lighthouse Performance Score > 70

**Uso de memoria**
- [ ] No hay memory leaks (usar DevTools Memory)
- [ ] Componentes no renderizados se limpian

**Bundle size**
- [ ] Bundle principal < 500KB (gzipped)
- [ ] Lazy loading funciona (chunks separados)

**Test manual**:
1. Abrir DevTools → Network
2. Recargar página → medir tiempo de carga
3. Abrir DevTools → Lighthouse
4. Ejecutar audit → verificar scores

---

### 7️⃣ **Responsive Design**

**Móvil (320px - 768px)**
- [ ] Layout se adapta correctamente
- [ ] Texto legible sin zoom
- [ ] Botones accesibles (tamaño mínimo 44px)
- [ ] Gráficos se redimensionan

**Tablet (768px - 1024px)**
- [ ] Grid se ajusta a 2 columnas
- [ ] Sidebar colapsable funciona

**Desktop (>1024px)**
- [ ] Layout completo visible
- [ ] Uso eficiente de espacio

**Test manual**:
1. DevTools → Toggle device toolbar
2. Probar en iPhone SE (375px)
3. Probar en iPad (768px)
4. Probar en Desktop (1920px)

---

### 8️⃣ **Manejo de Errores**

**Errores de red**
- [ ] Mensaje amigable si falla API
- [ ] Opción de reintentar
- [ ] No rompe la aplicación

**Errores de Firebase**
- [ ] Maneja timeout de Firestore
- [ ] Muestra mensaje si usuario sin permisos
- [ ] Fallback a localStorage si Firestore falla

**Errores de usuario**
- [ ] Validación de formularios
- [ ] Mensajes de error claros
- [ ] No permite acciones inválidas

**Test manual**:
1. Desconectar internet → intentar acción que requiere red
2. Verificar mensaje de error amigable
3. Reconectar → verificar que funciona

---

### 9️⃣ **Accesibilidad Básica**

**Navegación por teclado**
- [ ] Tab navega entre elementos
- [ ] Enter activa botones
- [ ] Escape cierra modales

**Contraste**
- [ ] Texto tiene contraste suficiente (WCAG AA)
- [ ] Modo oscuro también cumple

**Semántica HTML**
- [ ] Headings en orden (h1, h2, h3)
- [ ] Botones son `<button>`, no `<div>`
- [ ] Inputs tienen `<label>`

**Test manual**:
1. Intentar navegar solo con teclado
2. Verificar que todos los elementos son alcanzables
3. Usar extension de contraste (ej: WAVE)

---

### 🔟 **Casos Edge**

**Textos extremos**
- [ ] Texto muy corto (50 palabras)
- [ ] Texto muy largo (10,000 palabras)
- [ ] Texto con caracteres especiales (emojis, acentos)
- [ ] Texto en otro idioma (inglés, francés)

**Sesiones extremas**
- [ ] Usuario con 0 sesiones guardadas
- [ ] Usuario con 5 sesiones (límite)
- [ ] Usuario con sesiones solo en localStorage (sin internet)
- [ ] Usuario con sesiones solo en Firestore (nuevo dispositivo)

**Progreso extremo**
- [ ] Usuario sin ninguna evaluación
- [ ] Usuario con 100+ evaluaciones
- [ ] Usuario con score perfecto (10/10 en todo)
- [ ] Usuario con score bajo (1/10 en todo)

---

## 🐛 Registro de Bugs Encontrados

| # | Fecha | Descripción | Severidad | Estado | Solución |
|---|-------|-------------|-----------|--------|----------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

**Severidades**:
- 🔴 **Crítico**: Bloquea funcionalidad principal
- 🟠 **Alto**: Funcionalidad importante afectada
- 🟡 **Medio**: Problema menor, workaround existe
- 🟢 **Bajo**: Cosmético, no afecta funcionalidad

---

## ✅ Aprobación de Lanzamiento

**Testing completado por**: _________________  
**Fecha**: _________________  
**Bugs críticos resueltos**: ☐ Sí ☐ No  
**Bugs altos resueltos**: ☐ Sí ☐ No  

**Decisión de lanzamiento**:
- ☐ ✅ **Aprobado** - Listo para beta con estudiantes
- ☐ ⏳ **Pendiente** - Requiere correcciones (detallar abajo)
- ☐ ❌ **Rechazado** - Problemas críticos sin resolver

**Notas adicionales**:
_______________________________________________________
_______________________________________________________

---

## 📊 Métricas de Éxito para Beta

Monitorear durante primeras 2 semanas:

- **Adopción**: ≥80% de beta testers crean al menos 1 sesión
- **Engagement**: ≥50% regresan al día siguiente
- **Errores**: <5 errores críticos reportados
- **Satisfacción**: ≥4/5 estrellas en encuesta post-uso
- **Rendimiento**: <3s tiempo de carga promedio

---

**Última actualización**: 21 de noviembre de 2025  
**Próxima revisión**: Después de ejecutar todos los tests
