# Tests - AppLectura

Suite completa de tests unitarios, de integración y snapshots para garantizar estabilidad del código.

## 🚀 Ejecución Rápida

```bash
# Ejecutar todos los tests
npm test

# Ejecutar con watch mode (desarrollo)
npm run test:watch

# Ejecutar con coverage
npm run test:coverage

# Ejecutar en CI/CD
npm run test:ci
```

## 📊 Cobertura Actual

### Estado Global (Marzo 2026)
- **Test Suites**: 67/67 passing (100%)
- **Tests**: 351 passing
- **Coverage threshold**: 30% (plan target: 45%)

### Componentes Nuevos (Mejoras Nov 2025)

| Componente | Tipo | Tests Creados | Estado |
|------------|------|---------------|--------|
| `useKeyboardShortcuts` | Hook | 18 tests | ⚠️ 56% passing (10/18) |
| `useRateLimit` | Hook | 18 tests | ⚠️ 56% passing (10/18) |
| `EvaluationProgressBar` | UI | 20 tests | ⚠️ En progreso |
| `ErrorBoundary` | Component | 18 tests | ✅ 83% passing (15/18) |
| `ResumenAcademico` | Integration | 22 tests | ⚠️ Mock issues |
| `legacyFlag` | Integration | 2 tests | ✅ 100% passing (2/2) |
| `Snapshots` | Visual | 7 tests | ⚠️ Setup needed |

**Total**: **~105 nuevos tests** implementados para features Nov 2025
**Passing**: **37+ tests** funcionando correctamente

### ⚠️ Issues Conocidos

1. **react-pdf Mock**: Tests de PDF fallan por configuración de worker
2. **KeyboardEvent Target**: Necesita `Object.defineProperty` para event.target
3. **Emoji Encoding**: ErrorBoundary usa emojis que se rompen en tests
4. **practiceService**: Requiere validación null para rubricProgress
5. **Módulos Legacy**: AnalisisTexto y LecturaInteractiva necesitan implementación real

### ✅ Tests Estables

Los siguientes tests pasan consistentemente:
- Pedagogy core (100%)
- RubricProgressPanel integration (100%)
- Hooks: useFileCache, useTextAnalysis, useNotesWorkspaceAdapter
- Services: annotations, studyItems, segmentText
- Utils: backendUtils, contextBuilders, enrichmentConstants
- Integration: feedbackPipeline, evaluationToStudyItems

## 🧪 Estructura de Tests

```
tests/
├── unit/
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.test.js    # 55 tests
│   │   └── useRateLimit.test.js            # 47 tests
│   ├── components/
│   │   ├── EvaluationProgressBar.test.js   # 38 tests
│   │   └── ErrorBoundary.test.js           # 28 tests
│   └── snapshots.test.js                   # 7 snapshots
└── integration/
    └── ResumenAcademico.integration.test.js # 22 tests
```

## 📝 Detalles por Componente

### 1. useKeyboardShortcuts Hook (55 tests)

**Cobertura:**
- ✅ Normalización de teclas (Ctrl+S, Ctrl+Enter, Escape, Shift+Ctrl+A)
- ✅ Prevención de acciones por defecto
- ✅ Exclusión de inputs (textarea, input, contenteditable)
- ✅ Estado enabled/disabled
- ✅ Prevención de múltiples ejecuciones (key repeat)
- ✅ Trigger manual
- ✅ getRegisteredShortcuts()
- ✅ Múltiples shortcuts simultáneos
- ✅ Limpieza de event listeners

**Ejemplo de uso en test:**
```javascript
const { result } = renderHook(() =>
  useKeyboardShortcuts({ 'ctrl+s': mockHandler })
);

act(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 's',
    ctrlKey: true
  }));
});

expect(mockHandler).toHaveBeenCalledTimes(1);
```

### 2. useRateLimit Hook (47 tests)

**Cobertura:**
- ✅ Cooldown (5000ms por defecto)
- ✅ Límite horario (10 operaciones/hora)
- ✅ Persistencia en localStorage
- ✅ Recuperación de estado
- ✅ Limpieza de operaciones antiguas (>1 hora)
- ✅ resetCooldown() y resetAll()
- ✅ Mensajes de error específicos
- ✅ Casos edge (cooldownMs=0, maxPerHour=Infinity)

**Ejemplo de uso en test:**
```javascript
const { result } = renderHook(() =>
  useRateLimit('test-key', { cooldownMs: 5000, maxPerHour: 10 })
);

act(() => {
  const attempt = result.current.attemptOperation();
  expect(attempt.allowed).toBe(true);
});

// Segundo intento inmediato - bloqueado
act(() => {
  const attempt2 = result.current.attemptOperation();
  expect(attempt2.allowed).toBe(false);
  expect(attempt2.reason).toBe('cooldown');
});
```

### 3. EvaluationProgressBar Component (38 tests)

**Cobertura:**
- ✅ Renderizado condicional (isEvaluating)
- ✅ Progreso temporal (0% → 95% máximo)
- ✅ Tiempo restante decreciente
- ✅ Cambio automático de pasos
- ✅ Paso personalizado (currentStep prop)
- ✅ Reinicio de estado
- ✅ Actualización en tiempo real (cada 200ms)
- ✅ Theming
- ✅ Casos edge (estimatedSeconds=0, tiempo excedido)

**Ejemplo de uso en test:**
```javascript
render(
  <ThemeProvider theme={lightTheme}>
    <EvaluationProgressBar
      isEvaluating={true}
      estimatedSeconds={30}
      theme={lightTheme}
    />
  </ThemeProvider>
);

expect(screen.getByText(/30s restantes/i)).toBeInTheDocument();

// Avanzar tiempo
jest.advanceTimersByTime(5000);

await waitFor(() => {
  expect(screen.getByText(/25s restantes/i)).toBeInTheDocument();
});
```

### 4. ErrorBoundary Component (28 tests)

**Cobertura:**
- ✅ Renderizado normal (sin error)
- ✅ Captura de error + fallback UI
- ✅ Callback onError
- ✅ Botón retry + callback onReset
- ✅ Fallback personalizado (JSX o función)
- ✅ Stack trace en desarrollo (oculto en producción)
- ✅ ComponentName prop
- ✅ Theming
- ✅ Múltiples errores secuenciales

**Ejemplo de uso en test:**
```javascript
class ThrowError extends React.Component {
  render() {
    if (this.props.shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Contenido normal</div>;
  }
}

render(
  <ErrorBoundary theme={lightTheme} componentName="TestComponent">
    <ThrowError shouldThrow={true} />
  </ErrorBoundary>
);

expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument();
expect(screen.getByText('TestComponent')).toBeInTheDocument();

// Retry
fireEvent.click(screen.getByText(/Intentar de nuevo/i));
```

### 5. ResumenAcademico Integration (22 tests)

**Cobertura:**
- ✅ Renderizado con/sin texto
- ✅ Validación en tiempo real (palabras, citas)
- ✅ Sistema de citas guardadas (insertar, eliminar)
- ✅ Anti-plagio (límite 40 palabras)
- ✅ Evaluación con IA (servicio mock)
- ✅ Barra de progreso durante evaluación
- ✅ Rate limiting UI
- ✅ Keyboard shortcuts (Ctrl+S)
- ✅ Persistencia en sessionStorage
- ✅ Nuevo intento (limpieza)

**Ejemplo de uso en test:**
```javascript
const mockContext = {
  texto: 'Texto de prueba...',
  completeAnalysis: { metadata: { document_id: 'test-123' } },
  getCitations: jest.fn(() => [
    { id: '1', texto: 'Cita 1', timestamp: Date.now() }
  ])
};

render(
  <AppContext.Provider value={mockContext}>
    <ResumenAcademico theme={lightTheme} />
  </AppContext.Provider>
);

const textarea = screen.getByPlaceholderText(/Ejemplo:/i);
fireEvent.change(textarea, { target: { value: 'Resumen válido...' } });

expect(sessionStorage.getItem('resumenAcademico_draft')).toBe('Resumen válido...');
```

### 6. Snapshot Tests (7 snapshots)

**Cobertura:**
- ✅ EstimatedTimeBadge (normal, compact, sin datos)
- ✅ KeyboardShortcutsBar (estándar, vacío, complejo)

**Propósito:**
- Detectar cambios visuales no intencionales
- Prevenir regresiones en estructura DOM
- Documentar estructura esperada

**Uso:**
```bash
# Actualizar snapshots después de cambios intencionales
npm test -- -u
```

## 🔍 Verificación de Cobertura

```bash
# Generar reporte HTML
npm run test:coverage

# Abrir reporte
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

### Umbrales de Cobertura

| Métrica | Umbral Mínimo | Actual (Mar 2026) |
|---------|--------------|-------------------|
| Statements | 30% | ~20% |
| Branches | 30% | ~14% |
| Functions | 30% | ~19% |
| Lines | 30% | ~21% |

> **Nota:** la cobertura global es baja porque muchos componentes UI grandes aún no tienen tests. El plan prevé alcanzar 45% añadiendo tests de backend, middleware y flujos críticos.

## 🚨 Tests Críticos para CI/CD

```bash
# Ejecutar en pipeline
npm run test:ci

# Configuración recomendada .github/workflows/test.yml:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

## 🐛 Debugging Tests

```bash
# Ejecutar un test específico
npm test -- useKeyboardShortcuts.test.js

# Ejecutar con verbose output
npm test -- --verbose

# Ejecutar solo tests que cambiaron
npm test -- --onlyChanged

# Debugging en Chrome DevTools
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📚 Best Practices

### 1. Nombrado de Tests
```javascript
describe('ComponentName', () => {
  describe('Feature específica', () => {
    it('debe comportarse de manera esperada', () => {
      // Test
    });
  });
});
```

### 2. Setup/Teardown
```javascript
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
```

### 3. Testing con Timers
```javascript
beforeEach(() => {
  jest.useFakeTimers();
});

// En test:
act(() => {
  jest.advanceTimersByTime(5000);
});
```

### 4. Async Testing
```javascript
await waitFor(() => {
  expect(screen.getByText(/texto esperado/i)).toBeInTheDocument();
});
```

## 🔧 Configuración Jest

Ver `package.json` para configuración completa:

```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/src/setupTests.js"],
    "moduleNameMapper": {
      "\\.(css|less|scss|sass)$": "identity-obj-proxy"
    },
    "transform": {
      "^.+\\.(js|jsx)$": "babel-jest"
    },
    "collectCoverageFrom": [
      "src/**/*.{js,jsx}",
      "!src/index.js",
      "!src/reportWebVitals.js"
    ]
  }
}
```

## 📈 Roadmap de Tests Futuros

### Prioridad Alta
- [ ] TablaACD integration tests
- [ ] MapaActores integration tests
- [ ] RespuestaArgumentativa integration tests
- [ ] BitacoraEticaIA integration tests

### Prioridad Media
- [ ] E2E tests con Playwright
- [ ] Performance tests (React DevTools Profiler)
- [ ] Accessibility tests (jest-axe)

### Prioridad Baja
- [ ] Visual regression tests (Percy, Chromatic)
- [ ] Load tests para API endpoints
- [ ] Security tests (OWASP)

## 🆘 Troubleshooting

### Error: "Cannot find module"
```bash
npm install
npm test
```

### Error: "Timeout exceeded"
```javascript
jest.setTimeout(10000); // En el test
```

### Error: "Invalid hook call"
```javascript
// Asegurar que react y react-dom tienen misma versión
npm ls react react-dom
```

### Tests fallan en CI pero pasan local
```bash
# Ejecutar con mismas condiciones que CI
npm run test:ci
```

## 📞 Contacto

Para reportar bugs en tests o sugerir mejoras:
- GitHub Issues: [AppLectura/issues](https://github.com/AlejandroCordova1993/AppLectura/issues)
- Etiqueta: `testing`
