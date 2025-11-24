# AppLectura - AI Coding Agent Instructions

## Project Architecture Overview

**AppLectura** is an AI-powered educational reading assistant with React frontend + Express backend architecture. The app provides two distinct AI interaction modes: `🧑‍🏫 Tutor` (non-evaluative support) and `📝 Evaluador` (formal assessment).

### Core Components Structure

- **Frontend**: React 18.2 with styled-components, framer-motion, virtualization for large texts
- **Backend**: Express.js with modular routes (`/api/chat/completion`, `/api/analysis/text`, `/api/notes/generate`)
- **State Management**: Context API with optimized providers in `src/context/AppContext.js`
- **Theme System**: Dynamic light/dark themes in `src/styles/theme.js` with localStorage persistence

## Key Development Patterns

### 1. Dual AI Interaction Architecture
```js
// LecturaInteractiva.js - Tutor mode (non-evaluative)
const sendTutorMessage = async (message) => {
  // No scoring, just contextual help
  const prompt = `Como tutor amigable, ayuda sin evaluar: ${message}`;
};

// SistemaEvaluacion.js - Evaluator mode (formal assessment)  
const evaluateResponse = async (answer) => {
  // Formal scoring 1-10 with structured feedback
  const prompt = `Evalúa esta respuesta y asigna puntuación: ${answer}`;
};
```

### 2. Performance-Optimized Context Pattern
```js
// AppContext.js - Separate stable vs dynamic values
const stableValues = useMemo(() => ({
  setTexto: setTextoWithDebug,
  toggleModoOscuro,
}), [setTextoWithDebug, toggleModoOscuro]);

const dynamicValues = useMemo(() => ({
  texto, modoOscuro, loading
}), [texto, modoOscuro, loading]);
```

### 3. Text Virtualization for Performance
```js
// VisorTexto_responsive.js - Virtualize large texts
{paragraphs.length > VIRTUALIZATION_THRESHOLD ? (
  <Virtuoso data={paragraphs} itemContent={renderParagraph} />
) : (
  paragraphs.map(renderParagraph)
)}
```

## Essential Development Commands

```bash
# Development (runs both frontend:3000 and backend:3001)
npm run dev

# Platform-specific scripts
npm run dev:unix      # Linux/Mac
npm run start:windows # Windows frontend only  
npm run server:windows # Windows backend only

# Testing with comprehensive coverage
npm run test:coverage
npm run test:watch

# Component lazy loading pattern
const LecturaInteractiva = lazy(() => 
  import('./components/LecturaInteractiva').then(module => ({
    default: React.memo(module.default)
  }))
);
```

## Critical Integration Points

### Backend API Structure
- **Chat Completions**: `POST /api/chat/completion` with provider support (OpenAI, DeepSeek)
- **Text Analysis**: `POST /api/analysis/text` with multiple AI providers
- **Notes Generation**: `POST /api/notes/generate` with spaced repetition

### AI Provider Configuration
```js
// server/controllers/chat.completion.controller.js
const PROVIDERS = {
  openai: { baseURL: process.env.OPENAI_BASE_URL, defaultModel: 'gpt-3.5-turbo' },
  deepseek: { baseURL: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' }
};
```

### State Persistence Patterns
```js
// localStorage integration with system preference fallback
const [modoOscuro, setModoOscuro] = useState(() => {
  const guardado = localStorage.getItem('modoOscuro');
  return guardado ? JSON.parse(guardado) : 
         window.matchMedia('(prefers-color-scheme: dark)').matches;
});
```

## Key File Locations

- **Main App**: `src/App.js` - Tab navigation, lazy loading, focus mode
- **Text Viewer**: `src/VisorTexto_responsive.js` - Virtualized reading with interactive features  
- **AI Chat**: `src/components/LecturaInteractiva.js` - Tutor mode with web search integration
- **Assessment**: `src/components/SistemaEvaluacion.js` - Formal evaluation with scoring
- **Global State**: `src/context/AppContext.js` - Optimized context with localStorage persistence
- **Backend Routes**: `server/routes/` - Modular API structure
- **Themes**: `src/styles/theme.js` - Comprehensive light/dark theme system

## Common Debugging Patterns

1. **Performance Issues**: Check `VIRTUALIZATION_THRESHOLD` and `React.memo` usage
2. **State Updates**: Use context debug logs (`setTextoWithDebug`) 
3. **API Errors**: Verify provider configuration in `server/controllers/`
4. **Theme Issues**: Check `styled-components` theme prop propagation
5. **Mobile Layout**: Test responsive breakpoints in styled components

When working on this codebase, prioritize performance (virtualization, memoization), maintain the dual AI mode separation, and ensure theme consistency across all components.
