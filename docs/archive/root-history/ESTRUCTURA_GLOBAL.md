# Estructura Global de la Aplicación (AppLectura)

Esta aplicación es una plataforma de apoyo a la lectura y comprensión mediada por IA, con un enfoque en literacidad crítica y pedagogía académica.

## 🏗️ Arquitectura General

La aplicación sigue un modelo Cliente-Servidor optimizado para la nube (Firebase/Render).

### 1. Frontend (React)
Ubicado en `/src`. Utiliza una arquitectura basada en contextos para el estado global y componentes modulares.

#### 📂 Subvistemas Principales (Vistas)
- **Lectura Guiada (`ReadingWorkspace`)**: Espacio central de lectura con un Tutor IA integrado para diálogo socrático.
- **Análisis del Texto (`PreLectura`)**: Sistema de análisis automático estructurado (Contexto, Estructura, Conceptos clave).
- **Actividades y Artefactos**: Generación de productos pedagógicos y seguimiento:
    - **Preparación**: Evaluación previa (MCQ + Síntesis) para validar comprensión antes de crear artefactos.
    - **Resumen Académico**: Primer artefacto formal de síntesis estructurada.
    - **Tabla ACD**: Análisis Crítico del Discurso (marcos ideológicos, voces).
    - **Mapa de Actores**: Análisis de relaciones, contextos y consecuencias.
    - **Respuesta Argumentativa**: Producción textual basada en tesis y evidencia.
    - **Bitácora Ética IA**: Reflexión sobre el uso de la IA (Rúbrica 5).
    - **Mi Progreso**: Dashboard detallado con estadísticas, progresión de rúbricas y exportación de datos (CSV/JSON).
- **Notas de Estudio**: Sistema de persistencia de ideas clave y subrayados.
- **Evaluación**: Sistema de validación de aprendizajes con retroalimentación inmediata.
- **Panel Docente (`TeacherDashboard`)**: Gestión de textos, seguimiento de estudiantes y analíticas.

#### 🧠 Gestión de Estado (`/src/context`)
- **AppContext**: El "cerebro" central (142KB). Maneja el texto actual, estados de análisis, sincronización y UI global.
- **AuthContext**: Integración con Firebase Auth (Roles: Estudiante/Docente).
- **PedagogyContext**: Centraliza la lógica pedagógica y reglas de literacidad.

#### 🛠️ Servicios (`/src/services`)
- **AI Services**: Orquestación de llamadas a OpenAI/DeepSeek (UnifiedAiService, TextAnalysisOrchestrator).
- **Análisis**: IntelligentAnalysis, DeepAnalysis, CriticalLiteracy.
- **Persistencia**: SessionManager (Firebase Sync + LocalStorage fallback).
- **Utilidades**: WebSearch, PDF processing, Excel Export.

---

### 2. Backend (Node.js/Express)
Ubicado en `/server`. Actúa como un proxy inteligente y procesador de datos pesados.

#### 📡 Endpoints Clave
- `/api/chat/completion`: Proxy para LLMs con gestión de prompts.
- `/api/analysis`: Procesamiento de textos largos y segmentación.
- `/api/process-pdf`: Extracción de texto y OCR de documentos.
- `/api/assessment`: Evaluación criterial automática de los artefactos del estudiante.
- `/api/web-search`: Integración con motores de búsqueda externa.

---

### 3. Persistencia y Datos
- **Firebase Firestore**: Base de datos principal para actividades, textos y progreso.
- **Firebase Storage**: Almacenamiento de documentos (PDFs).
- **LocalStorage/SessionStorage**: Caché local y manejo de borradores ("Cloud-First, Local-Second").

---

## 🔍 Observaciones Iniciales de Duplicación/Complejidad
- **Contexto Gigante**: `AppContext.js` (142KB) indica una alta concentración de responsabilidades que podrían delegarse a hooks especializados.
- **Servicios de Análisis**: Existen múltiples archivos con nombres similares (`intelligentAnalysisService`, `deepAnalysisService`, `basicAnalysisService`) que podrían tener lógica repetida.
- **Componentes _responsive**: Existen versiones duplicadas de componentes clave (e.g., `VisorTexto_responsive.js` vs `VisorTexto.js`) lo que sugiere deuda técnica o falta de unificación en el diseño responsivo.
- **Gestión de Prompts**: La lógica de construcción de prompts parece estar repartida entre servicios de frontend y controladores de backend.
