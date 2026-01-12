# Informe de Duplicación y Redundancia de Código

Tras el análisis de la base de código, se han identificado varios niveles de duplicación y deuda técnica:

## 1. Duplicación de Componentes "Responsive"
Existe un patrón donde los componentes originales han sido reemplazados por versiones con el sufijo `_responsive`, manteniendo los originales como wrappers o archivos vacíos.

| Componente Original | Componente Responsive | Estado |
|---------------------|-----------------------|--------|
| `CargaTexto.js` | `CargaTexto_responsive.js` | **CargaTexto.js está vacío.** Toda la lógica está en el responsive. |
| `VisorTexto.js` | `VisorTexto_responsive.js` | **VisorTexto.js es un wrapper.** Solo delega al responsive. |
| `TabNavigation.js` | `TabNavigation_responsive.js` | El original está vacío o es un wrapper mínimo. |

> [!WARNING]  
> Mantener dos versiones de estos componentes aumenta la confusión y dificulta el mantenimiento. Se recomienda unificar bajo el nombre original y eliminar los sufijos `_responsive`.

## 2. Redundancia en Servicios de Análisis
Se han encontrado servicios solapados que realizan tareas de orquestación de IA similares.

- **`textAnalysisOrchestrator.js`**: Es el nuevo estándar unificado (v3.0).
- **`intelligentAnalysisService.js`**: Marcado como **@deprecated**. Reemplazado en un 70% por el orquestador.
- **`deepAnalysisService.js`**: Marcado como **@deprecated**. Reemplazado en un 70% por el orquestador.
- **`basicAnalysisService.js`**: Contiene heurísticas locales que podrían estar integradas como fallback dentro del orquestador en lugar de ser un servicio aparte.

## 3. Monolito de Estado: AppContext
`AppContext.js` tiene un tamaño de **142KB**.  
Contiene lógica mezclada de:
- Autenticación y Sesión.
- Procesamiento de archivos (PDF/OCR).
- Gamificación y Recompensas (Rewards).
- Gestión del Texto y Análisis.
- Persistencia en Firebase.

> [!TIP]  
> Se recomienda fragmentar `AppContext` en contextos especializados (e.g., `AnalysisContext`, `RewardsContext`, `FileProcessingContext`) o extraer la lógica a Hooks personalizados.

## 4. Lógica de Prompts Dispersa
La lógica para construir prompts de IA está repartida entre:
- `src/services/criticalPromptService.js` (Frontend)
- `src/services/textAnalysisOrchestrator.js` (Frontend)
- `server/index.js` (Backend)
- `server/controllers/` (Backend)

Esto dificulta el ajuste fino del comportamiento de la IA de manera consistente.
