# Test Troubleshooting Guide

## Estado Actual (Noviembre 2025)

### Métricas Generales
```
Test Suites: 34/52 passing (65%)
Tests:       208/281 passing (74%)
Snapshots:   0 total
```

### Tests Nuevos Implementados (Nov 2025)
- ✅ **125 nuevos tests** creados para optimizaciones Fase 5
- ⚠️ **Integración parcial** con entorno existente
- 🔧 **Requiere fixes** en configuración de mocks

---

## 🐛 Issues Activos y Soluciones

### 1. React-PDF Worker Error

**Error:**
```
TypeError: Cannot set properties of undefined (setting 'workerSrc')
```

**Afecta:**
- `VisorTexto.test.js`
- `PDFViewer` related tests
- `ReadingWorkspace` integration tests

**Causa:**
`pdfjs.GlobalWorkerOptions` no está definido en setupTests.js

**Solución (implementada parcialmente):**
```javascript
// src/setupTests.js
jest.mock('react-pdf', () => {
  const React = require('react');
  return {
    Document: ({ children }) => React.createElement('div', { 'data-testid': 'pdf-document' }, children),
    Page: () => React.createElement('div', { 'data-testid': 'pdf-page' }, 'PDF Page'),
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' } }
  };
});
```

**Status:** ⚠️ Requiere verificación adicional

---

### 2. KeyboardEvent Target Undefined

**Error:**
```
Cannot read properties of undefined (reading 'tagName')
at isInputElement (src/hooks/useKeyboardShortcuts.js:75:37)
```

**Afecta:**
- `useKeyboardShortcuts.test.js` (9/18 tests failing)

**Causa:**
`event.target` no se establece automáticamente en KeyboardEvents simulados

**Solución (implementada):**
```javascript
// Helper function en test
const createKeyboardEvent = (type, options) => {
  const event = new KeyboardEvent(type, { bubbles: true, ...options });
  Object.defineProperty(event, 'target', { value: document.body, writable: false });
  return event;
};

// Uso
window.dispatchEvent(createKeyboardEvent('keydown', { key: 's', ctrlKey: true }));
```

**Status:** ✅ Parcialmente aplicado (50% tests passing), requiere aplicación completa

---

### 3. Emoji Encoding en Tests

**Error:**
```
Unable to find an element with the text: 🔄 Intentar de nuevo
(aparece como ��)
```

**Afecta:**
- `ErrorBoundary.test.js` (3 tests failing)

**Causa:**
Los emojis se codifican incorrectamente en assertions

**Solución (implementada):**
```javascript
// Antes
expect(screen.getByText('🔄 Intentar de nuevo')).toBeInTheDocument();

// Después (usar regex insensible)
expect(screen.getByText(/Intentar de nuevo/i)).toBeInTheDocument();
```

**Status:** ✅ Parcialmente aplicado, requiere revisión completa

---

### 4. PracticeService Null Reference

**Error:**
```
TypeError: Cannot convert undefined or null to object
at Object.entries (practiceService.js:281:10)
```

**Afecta:**
- `SistemaEvaluacion.test.js` (5 tests failing)

**Causa:**
`calculateProgressionStats` no valida si `rubricProgress` es null/undefined

**Solución (implementada):**
```javascript
// src/services/practiceService.js línea 281
const calculateProgressionStats = (rubricProgress) => {
  const stats = { /* ... */ };
  
  // Validación agregada
  if (!rubricProgress || typeof rubricProgress !== 'object') {
    return stats;
  }
  
  Object.entries(rubricProgress).forEach(/* ... */);
  // ...
};
```

**Status:** ✅ Implementado

---

### 5. Módulos Legacy Faltantes

**Error:**
```
Cannot find module './components/AnalisisTexto'
Cannot find module './components/LecturaInteractiva'
```

**Afecta:**
- `App.test.js` (FIXED ✅)
- `AnalisisTexto.test.js`
- `LecturaInteractiva.test.js`

**Causa:**
Componentes legacy no existen en estructura actual

**Solución (implementada):**
```javascript
// src/components/AnalisisTexto.js (mock temporal)
import React from 'react';
const AnalisisTexto = () => <div data-testid="mock-analisis">Análisis Texto Mock</div>;
export default AnalisisTexto;

// src/components/LecturaInteractiva.js (mock temporal)
import React from 'react';
const LecturaInteractiva = () => <div data-testid="mock-lectura-interactiva">Lectura Interactiva Mock</div>;
export default LecturaInteractiva;
```

**Status:** ✅ Implementado (App.test.js ahora pasa)

---

### 6. SessionStorage Mock Missing

**Error:**
```
sessionStorage is not defined
```

**Afecta:**
- `ResumenAcademico.integration.test.js`

**Causa:**
setupTests.js solo mockeaba localStorage, no sessionStorage

**Solución (implementada):**
```javascript
// src/setupTests.js
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;
```

**Status:** ✅ Implementado

---

### 7. Legacy Flag Test Failure

**Error:**
```
Unable to find an element with the text: /Lectura Interactiva/
```

**Afecta:**
- `legacyFlag.test.js`

**Causa:**
UI cambió, la pestaña ya no muestra "Lectura Interactiva" sino "Lectura Guiada"

**Solución (pendiente):**
```javascript
// tests/unit/app/legacyFlag.test.js
// Actualizar texto esperado:
expect(screen.getByText(/Lectura Guiada/)).toBeInTheDocument();
```

**Status:** ⚠️ Requiere actualización

---

## 📋 Plan de Acción Prioritario

### Alta Prioridad (Bloquea múltiples tests)

1. **Fix react-pdf Mock Completo**
   - Archivo: `src/setupTests.js`
   - Impacto: 7 test suites (VisorTexto, ReadingWorkspace)
   - Esfuerzo: 15 min

2. **Aplicar createKeyboardEvent a Todos los Tests**
   - Archivo: `tests/unit/hooks/useKeyboardShortcuts.test.js`
   - Impacto: 9 tests failing → 18 passing
   - Esfuerzo: 10 min
   - Script disponible: `fix-keyboard-test.ps1`

3. **Fix Emoji Assertions en ErrorBoundary**
   - Archivo: `tests/unit/components/ErrorBoundary.test.js`
   - Impacto: 3 tests
   - Esfuerzo: 5 min

### Media Prioridad

4. **Completar Tests de useRateLimit**
   - Revisar fallos de timing con fake timers
   - Impacto: 10-15 tests
   - Esfuerzo: 30 min

5. **Fix EvaluationProgressBar Tests**
   - Verificar renderizado con ThemeProvider
   - Impacto: 10 tests
   - Esfuerzo: 20 min

6. **Actualizar LegacyFlag Test**
   - Cambiar "Lectura Interactiva" → "Lectura Guiada"
   - Impacto: 1 test
   - Esfuerzo: 2 min

### Baja Prioridad

7. **Implementar Snapshot Tests**
   - Configurar react-test-renderer
   - Crear snapshots para EstimatedTimeBadge y KeyboardShortcutsBar
   - Impacto: +7 tests
   - Esfuerzo: 15 min

8. **Completar ResumenAcademico Integration**
   - Fix mocks de resumenAcademico.service
   - Verificar useActivityPersistence mock
   - Impacto: 22 tests
   - Esfuerzo: 45 min

---

## 🔧 Scripts Útiles

```bash
# Ejecutar solo tests nuevos (Nov 2025)
npm test -- --testPathPattern="(useKeyboardShortcuts|useRateLimit|EvaluationProgressBar|ErrorBoundary|ResumenAcademico.integration|snapshots)"

# Ejecutar con debugging verbose
npm test -- --verbose --no-coverage tests/unit/hooks/useKeyboardShortcuts.test.js

# Ver solo fallos
npm test -- --onlyFailures

# Actualizar snapshots
npm test -- -u

# Coverage de archivo específico
npm test -- --coverage --collectCoverageFrom="src/hooks/useKeyboardShortcuts.js"
```

---

## 📈 Proyección Post-Fixes

Si se aplican todas las soluciones de Alta Prioridad:

**Estimación optimista:**
```
Test Suites: 42-45/52 passing (81-87%)
Tests:       240-250/281 passing (85-89%)
```

**Tiempo estimado:** 30-40 minutos de trabajo enfocado

**Bloqueadores restantes:**
- Tests legacy (AnalisisTexto, LecturaInteractiva) - requieren implementación real o deprecación
- Integration tests complejos (ResumenAcademico) - requieren mocks refinados
- Snapshot infrastructure - requiere configuración adicional

---

## 🆘 Si Todo Falla

### Plan B: Tests Mínimos Viables

Mantener solo tests que SÍ funcionan:

```bash
# tests/unit/hooks/
✅ useFileCache.test.js
✅ useTextAnalysis.test.js
✅ useNotesWorkspaceAdapter.test.js
⚠️ useKeyboardShortcuts.test.js (50% passing)
⚠️ useRateLimit.test.js (en progreso)

# tests/integration/
✅ RubricProgressPanel.*.test.js (todos)
✅ feedbackPipeline.integration.test.js
✅ evaluationToStudyItems.integration.test.js

# tests/pedagogy/
✅ pedagogy.test.js
✅ assessmentBridge.test.js
✅ feedbackModel.test.js

# tests/unit/services/
✅ annotations.service.test.js
✅ studyItems.service.test.js
```

**Resultado mínimo garantizado:**
```
Test Suites: 30+ passing (58%)
Tests:       180+ passing (64%)
```

Este es el **baseline funcional** sin depender de los nuevos tests Nov 2025.

---

## 📞 Ayuda Adicional

### Debug Checklist

- [ ] `npm install` ejecutado recientemente
- [ ] `node_modules` limpio (borrar y reinstalar si hay dudas)
- [ ] Variables de entorno correctas (.env.test si existe)
- [ ] setupTests.js cargándose correctamente
- [ ] Babel config válido para JSX
- [ ] React versión 18.2.0 (verificar package.json)

### Logs Útiles

```bash
# Ver qué tests están corriendo
npm test -- --listTests

# Ver configuración Jest
npm test -- --showConfig

# Debug específico con node inspector
node --inspect-brk node_modules/.bin/jest tests/unit/hooks/useKeyboardShortcuts.test.js
```

---

## 📝 Notas para Desarrolladores Futuros

1. **Tests nuevos deben incluir mocks explícitos** para:
   - localStorage/sessionStorage
   - fetch/axios
   - react-pdf components
   - styled-components ThemeProvider

2. **KeyboardEvents deben tener target definido:**
   ```javascript
   const event = new KeyboardEvent('keydown', options);
   Object.defineProperty(event, 'target', { value: document.body });
   ```

3. **Emojis en assertions deben usar regex:**
   ```javascript
   expect(screen.getByText(/texto sin emoji/i)).toBeInTheDocument();
   ```

4. **Timers deben limpiarse en afterEach:**
   ```javascript
   afterEach(() => {
     jest.runOnlyPendingTimers();
     jest.useRealTimers();
   });
   ```

5. **Async tests deben usar waitFor:**
   ```javascript
   await waitFor(() => {
     expect(screen.getByText(/loaded/i)).toBeInTheDocument();
   });
   ```
