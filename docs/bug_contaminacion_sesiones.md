# Bug: Contaminación de Análisis entre Lecturas

## Resumen

Cuando un usuario cambia de una lectura a otra, el análisis de la **lectura anterior aparece en la nueva lectura**, causando confusión y datos incorrectos.

---

## Síntomas Observados

1. Usuario abre **Lectura A** → Se genera análisis correcto para A
2. Usuario abre **Lectura B** → Se genera análisis correcto para B
3. Usuario abre **Lectura A** → Aparece el análisis de A (correcto hasta aquí)
4. Usuario **regresa a Lectura B** → ❌ Aparece el análisis de A en lugar de B
5. Las secciones presentan información correspondiente a otra lectura

---

## Causa Raíz

### El Problema: Una Sola Sesión Compartida

El sistema usaba **UNA sola sesión global** (`session_1765802251591_jerynrpyc`) para **todas las lecturas**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANTES (Bug)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Lectura A  ──┬──► session_xxx ◄──┬── Lectura B                │
│                │                    │                            │
│                └── SOBRESCRIBE ────┘                             │
│                                                                  │
│   Resultado: Solo se conserva la ÚLTIMA lectura                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo del Bug

```
1. Usuario abre Lectura A (textoId: abc123)
   → currentSessionId = "session_xxx"
   → Sesión guardada con análisis de A

2. Usuario abre Lectura B (textoId: xyz789)  
   → currentSessionId = "session_xxx" (¡MISMO ID!)
   → Sesión SOBRESCRITA con análisis de B
   → ¡Análisis de A se pierde!

3. Usuario regresa a Lectura A
   → Smart Resume busca "courseId_abc123"
   → Encuentra session_xxx (pero ahora tiene datos de B)
   → ❌ Muestra análisis de B en Lectura A
```

---

## Solución Implementada

### Arquitectura: Sesiones por Lectura

Cada lectura ahora tiene su **propia sesión única**, con un ID que incluye el `textoId`:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DESPUÉS (Corregido)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Lectura A  ──► session_xxx_abc12345 (análisis de A)           │
│                                                                  │
│   Lectura B  ──► session_yyy_xyz78901 (análisis de B)           │
│                                                                  │
│   ¡Sesiones aisladas! No se sobrescriben.                       │
└─────────────────────────────────────────────────────────────────┘
```

### Cambio en `switchLecture`

```javascript
const switchLecture = useCallback((lectureData) => {
  // BUSCAR sesión existente para este textoId
  const existingSession = allSessions.find(s => 
    s.currentTextoId === lectureData.id
  );
  
  if (existingSession) {
    // Reutilizar la sesión de esta lectura
    setCurrentSessionId(existingSession.id);
  } else {
    // Crear NUEVA sesión con ID único
    const newSessionId = `session_${Date.now()}_${lectureData.id.substring(0,8)}`;
    setCurrentSessionId(newSessionId);
  }
  
  // ... resto del código
}, []);
```

---

## Flujo Corregido

```
1. Usuario abre Lectura A (textoId: abc123)
   → currentSessionId = "session_xxx_abc12345" (NUEVO)
   → Sesión guardada con análisis de A

2. Usuario abre Lectura B (textoId: xyz789)  
   → currentSessionId = "session_yyy_xyz78901" (NUEVO, ID DIFERENTE)
   → Sesión guardada con análisis de B
   → ✅ Análisis de A permanece intacto

3. Usuario regresa a Lectura A
   → Smart Resume busca "courseId_abc123"
   → Encuentra session_xxx_abc12345 (con datos de A)
   → ✅ Muestra análisis correcto de A
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `AppContext.js` | `switchLecture` ahora busca/crea sesión por textoId |
| `AppContext.js` | Validación anti-contaminación en `updateCurrentSessionFromState` |
| `AppContext.js` | Estado capturado al inicio de `analyzeDocument` |

---

## Cómo Verificar la Corrección

1. **Limpiar localStorage** (DevTools → Application → Clear site data)
2. Recargar la aplicación
3. Abrir **Lectura A** → Ver en consola: `🆕 Nueva sesión creada: session_xxx_abc...`
4. Abrir **Lectura B** → Ver en consola: `🆕 Nueva sesión creada: session_yyy_xyz...`
5. Regresar a **Lectura A** → Ver en consola: `♻️ Reutilizando sesión: session_xxx_abc...`
6. **El análisis de A debe conservarse** correctamente
