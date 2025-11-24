# AppLectura

Una herramienta educativa avanzada diseñada para mejorar las habilidades de lectura y pensamiento crítico de los estudiantes mediante la integración de Inteligencia Artificial.

Nota de diseño y roadmap: consulta el documento "Itinerario de lectura, distribución docente y evaluación final" para la organización pedagógica actual, fases y endpoints planificados: [DISEÑO_ITINERARIO_Y_EVALUACION.md](./DISEÑO_ITINERARIO_Y_EVALUACION.md).

## 🎯 Características Principales

### Itinerario de lectura – Modo Tutor
- Progresión Crítica por dimensiones (navegación guiada; sin calificar)
- Asistencia contextual: clic en párrafo o fragmento para ayuda específica
- Follow-ups adaptados al contexto (fragmento o texto completo)
- **Historial persistente por texto**: Cada documento mantiene su propia conversación
  - Rehidratación automática al volver al mismo texto
  - Hash multi-factor para identificar textos sin colisiones
- Modo Focus: resalta el párrafo seleccionado y atenúa el resto
- Ambiente seguro: explicaciones sin juicio, no califica

### 📚 Lectura guiada (visores y herramientas)
- Visor principal con tamaño de fuente, búsqueda, notas y reset
- Virtualización para textos largos y rendimiento estable
- Atajos de navegación y diseño responsive

### 📝✔ Sistema de Evaluación - Modo Evaluador
- **Evaluación formal**: Preguntas estructuradas con calificación
- **Tres niveles de comprensión**: Literal, Inferencial, Crítico-Valorativo
- **Puntuación automática**: Cada respuesta recibe una calificación del 1-10
- **Retroalimentación constructiva**: Comentarios específicos para mejorar
- **Seguimiento de progreso**: Promedio de calificaciones y estadísticas
- **Progresión pedagógica**: Las preguntas avanzan en complejidad

### 📊 Análisis de Texto Inteligente
- **Múltiples proveedores de IA**: OpenAI GPT, Google Gemini, o análisis básico
- **Métricas completas**: Palabras, párrafos, tiempo de lectura estimado
- **Análisis de complejidad**: Nivel de dificultad y estructura del texto
- **Identificación de temas**: Conceptos clave y vocabulario importante

### 📝 Sistema de Notas Avanzado
- **Generación automática**: Notas inteligentes basadas en el contenido
- **Cronograma de repaso**: Sistema de repetición espaciada
- **Exportación múltiple**: PDF, Word, texto plano
- **Configuración personalizable**: Adapta el estilo a tus necesidades

### 💬 Chat con IA Especializado
- **Dos modos diferenciados**:
  - **🧑‍🏫 Tutor**: Ayuda y guía sin evaluar (Itinerario de lectura)
  - **📝 Evaluador**: Califica y proporciona retroalimentación formal (Sistema de Evaluación)
- **Conversaciones contextuales**: Basadas en el texto cargado
- **Historial persistente por texto**: Cada documento mantiene su propia conversación
  - Rehidratación automática: Al volver a un texto, recupera el historial completo
  - Claves únicas: Usa hash multi-factor para identificar textos sin colisiones
  - Límite inteligente: Máximo 40 mensajes por conversación
- **Guardado manual de conversaciones**: Exporta y carga conversaciones específicas

### 🔄 Sincronización Cross-Device (Firebase)
- **Sesiones persistentes**: Guarda todo tu progreso en la nube
- **Sincronización automática**: Trabaja en cualquier dispositivo sin perder datos
- **Datos sincronizados**:
  - Texto completo y análisis
  - Progreso de rúbricas y actividades
  - Borradores de artefactos pedagógicos
  - Citas guardadas y anotaciones
  - Puntos, racha y achievements (gamificación)
  - Preferencias y configuración
- **Almacenamiento inteligente**: Textos >1MB se guardan en Firebase Storage automáticamente

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18.2.0**: Biblioteca principal con hooks modernos
- **Styled-components 6.1.17**: Estilos dinámicos y theming
- **Framer Motion 12.23.3**: Animaciones fluidas y transiciones
- **React Virtuoso**: Renderizado eficiente de listas largas
- **PDF.js**: Procesamiento de documentos PDF
- **Firebase SDK**: Autenticación, Firestore, Storage

### Backend
- **Express.js**: Servidor API RESTful
- **OpenAI/DeepSeek**: Procesamiento vía backend (sin claves en frontend)
- **Google Gemini**: Soporte para múltiples modelos de IA
- **Multer**: Manejo de archivos multimedia
- **Firebase Admin**: Gestión de usuarios y datos del lado del servidor

### Desarrollo y Testing
- **Jest + Testing Library**: Suite completa de testing
- **ESLint + Prettier**: Calidad y consistencia de código
- **React App Rewired**: Configuración personalizada
- **Concurrently**: Desarrollo simultáneo frontend/backend

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 16+ y npm
- Cuenta de Firebase (para sincronización cross-device)
- Claves API de OpenAI y/o Google Gemini (opcional)

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/AlejandroCordova1993/AppLectura.git
cd AppLectura

# Instalar dependencias
npm install

# Instalar dependencias del backend
cd server
npm install
cd ..

# Configurar variables de entorno
cp .env.example .env
```

### Variables de Entorno
```env
# APIs de IA (opcional)
OPENAI_API_KEY=tu_clave_openai
GEMINI_API_KEY=tu_clave_gemini
DEEPSEEK_API_KEY=tu_clave_deepseek

# Firebase (requerido para sincronización)
REACT_APP_FIREBASE_API_KEY=tu_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=tu_proyecto_id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123

# Puerto del backend
BACKEND_PORT=3001
```

## 📖 Cómo Usar

### 1. Itinerario de Lectura (Modo Tutor 🧑‍🏫)
1. **Carga tu texto** (copiar/pegar, subir archivo, o PDF)
2. **Ejecuta el análisis** para obtener contexto automático
3. **Haz clic en cualquier párrafo** para seleccionarlo y recibir ayuda
4. **Pregunta libremente** - el tutor virtual te ayudará sin juzgar
5. **Usa el botón 💬** en cada párrafo para asistencia rápida
6. **Tu conversación se guarda automáticamente** por texto

### 2. Sistema de Evaluación (Modo Evaluador 📝✔)
1. **Carga tu contenido** y ve a la pestaña "Evaluación"
2. **Responde las preguntas** generadas automáticamente
3. **Recibe calificación** del 1-10 por cada respuesta
4. **Lee la retroalimentación** constructiva personalizada
5. **Avanza por los tres niveles**: Literal → Inferencial → Crítico-Valorativo
6. **Monitorea tu progreso** con el promedio de calificaciones

### 3. Análisis de Texto
1. Carga tu contenido
2. Selecciona el proveedor de IA (OpenAI, Gemini, o Básico)
3. Haz clic en "🎯 Analizar Texto"
4. Revisa las métricas, temas y recomendaciones

### 4. Sistema de Notas
1. Genera notas automáticas desde el análisis
2. Personaliza el contenido según tus necesidades
3. Usa el cronograma de repaso integrado
4. Exporta en tu formato preferido (PDF, Word, texto)

### 5. Sincronización Cross-Device
1. **Inicia sesión** con tu cuenta de Google/Firebase
2. **Trabaja normalmente** - todo se guarda automáticamente
3. **Cambia de dispositivo** - abre la misma cuenta
4. **Continúa donde quedaste** - todo tu progreso estará ahí

## 🎓 Enfoque Pedagógico

**🧑‍🏫 Modo Tutor (Itinerario de Lectura)**
- Función: Apoyo y guía durante el aprendizaje
- Características: No evalúa, no califica, solo ayuda
- Objetivo: Crear un ambiente seguro para preguntar y aprender

**📝 Modo Evaluador (Sistema de Evaluación)**
- Función: Evaluación formal del aprendizaje
- Características: Califica, retroalimenta, mide progreso
- Objetivo: Certificar comprensión y habilidades adquiridas

Esta arquitectura simula el entorno educativo real donde existe diferencia entre el apoyo tutorial y la evaluación formal.

## 💻 Scripts de Desarrollo

```bash
npm start          # Inicia solo el frontend (puerto 3000)
npm run server     # Inicia solo el backend (puerto 3001)
npm run dev        # Inicia ambos simultáneamente (recomendado)
npm test           # Ejecuta los tests
npm run build      # Construye para producción
npm run lint       # Verifica calidad del código
```

## 🗂️ Arquitectura del Proyecto

```
src/
 components/           # Componentes React reutilizables
    layout/          # Header, navegación, layouts
    ui/              # Elementos de interfaz básicos
    analisis/        # Componentes de análisis de texto
    notas/           # Sistema de notas de estudio
    tutor/           # TutorCore, TutorDock
    Evaluacion/      # Artefactos pedagógicos
    error/           # Manejo de errores
 context/             # Estado global de la aplicación
    AppContext.js    # Estado principal y sesiones
    AuthContext.js   # Autenticación Firebase
    PedagogyContext.js # Lógica pedagógica
 hooks/               # Hooks personalizados
    useTutorPersistence.js  # Historial por texto
    useActivityPersistence.js
    useFirestorePersistence.js
 services/            # Servicios de API y datos
    sessionManager.js # Gestión de sesiones
    annotations.service.js
 firebase/            # Integración Firebase
    firestore.js     # CRUD de sesiones en la nube
 utils/               # Utilidades y helpers
    cache.js         # Generación de hash para textos
    sessionValidator.js
 styles/              # Temas y estilos globales

server/
 controllers/         # Lógica de negocio del API
    chat.completion.controller.js
    analisis.controller.js
    assessment.controller.js
 routes/              # Definición de rutas
 services/            # Servicios del backend
 config/              # Configuración del servidor
```

## ✅ Estado del Proyecto

### ✔ Completado
- [x] Lectura interactiva con chat integrado
- [x] Análisis de texto con múltiples proveedores
- [x] Sistema de notas avanzado
- [x] Interfaz responsive y accesible
- [x] Modo oscuro/claro
- [x] Testing comprensivo
- [x] **Historial persistente por texto** (nuevo)
- [x] **Sincronización Firebase cross-device** (nuevo)
- [x] **Sistema de sesiones robusto** (nuevo)

### 🔄 En Desarrollo
- [ ] Soporte para más formatos de archivo
- [ ] Integración con sistemas de gestión de aprendizaje (LMS)
- [ ] Análisis de progreso y estadísticas avanzadas
- [ ] Colaboración en tiempo real

### 🎯 Roadmap
- [ ] Aplicación móvil nativa
- [ ] Extensión para navegadores
- [ ] API pública para integraciones
- [ ] Marketplace de plugins educativos

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am ''Añade nueva funcionalidad''`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- OpenAI por su API de GPT
- Google por Gemini
- DeepSeek por su modelo de lenguaje
- Firebase por la infraestructura de backend
- La comunidad open-source por las bibliotecas utilizadas

---

**Versión**: 2.0  
**Última actualización**: Noviembre 2025  
**Mantenido por**: [AlejandroCordova1993](https://github.com/AlejandroCordova1993)