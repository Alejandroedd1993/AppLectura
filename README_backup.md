# AppLectura

Una herramienta educativa avanzada diseÃ±ada para mejorar las habilidades de lectura y pensamiento crÃ­tico de los estudiantes mediante la integraciÃ³n de Inteligencia Artificial.

Nota de diseÃ±o y roadmap: consulta el documento âItinerario de lectura, distribuciÃ³n docente y evaluaciÃ³n finalâ para la organizaciÃ³n pedagÃ³gica actual, fases y endpoints planificados: [DISEÃO_ITINERARIO_Y_EVALUACION.md](./DISEÃO_ITINERARIO_Y_EVALUACION.md).

## ð CaracterÃ­sticas Principales

### Itinerario de lectura â Modo Tutor
- ProgresiÃ³n CrÃ­tica por dimensiones (navegaciÃ³n guiada; sin calificar)
- Asistencia contextual: clic en pÃ¡rrafo o fragmento para ayuda especÃ­fica
- Follow-ups adaptados al contexto (fragmento o texto completo)
- Historial por texto: el chat se reinicia con nuevo texto y se rehidrata si vuelves al mismo
- Modo Focus: resalta el pÃ¡rrafo seleccionado y atenÃºa el resto
- Ambiente seguro: explicaciones sin juicio, no califica

### ð Lectura guiada (visores y herramientas)
- Visor principal con tamaÃ±o de fuente, bÃºsqueda, notas y reset
- VirtualizaciÃ³n para textos largos y rendimiento estable
- Atajos de navegaciÃ³n y diseÃ±o responsive

### ðâ Sistema de EvaluaciÃ³n - Modo Evaluador
- **EvaluaciÃ³n formal**: Preguntas estructuradas con calificaciÃ³n
- **Tres niveles de comprensiÃ³n**: Literal, Inferencial, CrÃ­tico-Valorativo
- **PuntuaciÃ³n automÃ¡tica**: Cada respuesta recibe una calificaciÃ³n del 1-10
- **RetroalimentaciÃ³n constructiva**: Comentarios especÃ­ficos para mejorar
- **Seguimiento de progreso**: Promedio de calificaciones y estadÃ­sticas
- **ProgresiÃ³n pedagÃ³gica**: Las preguntas avanzan en complejidad

### ð AnÃ¡lisis de Texto Inteligente
- **MÃºltiples proveedores de IA**: OpenAI GPT, Google Gemini, o anÃ¡lisis bÃ¡sico
- **MÃ©tricas completas**: Palabras, pÃ¡rrafos, tiempo de lectura estimado
- **AnÃ¡lisis de complejidad**: Nivel de dificultad y estructura del texto
- **IdentificaciÃ³n de temas**: Conceptos clave y vocabulario importante

### ð Sistema de Notas Avanzado
- **GeneraciÃ³n automÃ¡tica**: Notas inteligentes basadas en el contenido
- **Cronograma de repaso**: Sistema de repeticiÃ³n espaciada
- **ExportaciÃ³n mÃºltiple**: PDF, Word, texto plano
- **ConfiguraciÃ³n personalizable**: Adapta el estilo a tus necesidades

### ð¬ Chat con IA Especializado
- **Dos modos diferenciados**:
  - **ð§âð« Tutor**: Ayuda y guÃ­a sin evaluar (Itinerario de lectura)
  - **ð Evaluador**: Califica y proporciona retroalimentaciÃ³n formal (Sistema de EvaluaciÃ³n)
- **Conversaciones contextuales**: Basadas en el texto cargado
- **Historial persistente**: Guarda sesiones para revisiÃ³n posterior

## ð ï¸ TecnologÃ­as Utilizadas

### Frontend
- **React 18.2.0**: Biblioteca principal con hooks modernos
- **Styled-components 6.1.17**: Estilos dinÃ¡micos y theming
- **Framer Motion 12.23.3**: Animaciones fluidas y transiciones
- **React Virtuoso**: Renderizado eficiente de listas largas
- **PDF.js**: Procesamiento de documentos PDF

### Backend
- Express.js: Servidor API RESTful
- OpenAI/DeepSeek vÃ­a backend Express (sin claves en el frontend)
- Google Gemini: Soporte para mÃºltiples modelos de IA
- Multer: Manejo de archivos multimedia

### Desarrollo y Testing
- **Jest + Testing Library**: Suite completa de testing
- **ESLint + Prettier**: Calidad y consistencia de cÃ³digo
- **React App Rewired**: ConfiguraciÃ³n personalizada
- **Concurrently**: Desarrollo simultÃ¡neo frontend/backend

## ð InstalaciÃ³n y ConfiguraciÃ³n

### Prerrequisitos
- Node.js 16+ y npm
- Claves API de OpenAI y/o Google Gemini (opcional)

### InstalaciÃ³n
```bash
# Clonar el repositorio
git clone https://github.com/usuario/AppLectura.git
cd AppLectura

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
### Variables de Entorno
```env

## ð¯ CÃ³mo Usar
3. **Haz clic en cualquier pÃ¡rrafo** para seleccionarlo y recibir ayuda
4. **Pregunta libremente** - el tutor virtual te ayudarÃ¡ sin juzgar
5. **Usa el botÃ³n ð¬** en cada pÃ¡rrafo para asistencia rÃ¡pida

### 2. Sistema de EvaluaciÃ³n (Modo Evaluador ðâ)
1. **Carga tu contenido** y ve a la pestaÃ±a "EvaluaciÃ³n"
2. **Responde las preguntas** generadas automÃ¡ticamente
3. **Recibe calificaciÃ³n** del 1-10 por cada respuesta
4. **Lee la retroalimentaciÃ³n** constructiva personalizada
5. **Avanza por los tres niveles**: Literal â Inferencial â CrÃ­tico-Valorativo
6. **Monitorea tu progreso** con el promedio de calificaciones

### 3. AnÃ¡lisis de Texto
1. Carga tu contenido
2. Selecciona el proveedor de IA (OpenAI, Gemini, o BÃ¡sico)
3. Haz clic en "ð Analizar Texto"
4. Revisa las mÃ©tricas, temas y recomendaciones
3. Usa el cronograma de repaso integrado
4. Exporta en tu formato preferido

## ð Enfoque PedagÃ³gico

- FunciÃ³n: Apoyo y guÃ­a durante el aprendizaje
- CaracterÃ­sticas: No evalÃºa, no califica, solo ayuda
- Objetivo: Crear un ambiente seguro para preguntar y aprender
**ð Modo Evaluador (Sistema de EvaluaciÃ³n)**
- FunciÃ³n: EvaluaciÃ³n formal del aprendizaje
Esta arquitectura simula el entorno educativo real donde existe diferencia entre el apoyo tutorial y la evaluaciÃ³n formal.

```bash
npm start          # Inicia solo el frontend
npm run server     # Inicia solo el backend  
npm run dev        # Inicia ambos simultÃ¡neamente
npm test           # Ejecuta los tests
npm run build      # Construye para producciÃ³n
npm run lint       # Verifica calidad del cÃ³digo
```

## ðï¸ Arquitectura del Proyecto

```
src/
âââ components/           # Componentes React reutilizables
â   âââ layout/          # Header, navegaciÃ³n, layouts
â   âââ ui/              # Elementos de interfaz bÃ¡sicos
â   âââ analisis/        # Componentes de anÃ¡lisis de texto
â   âââ notas/           # Sistema de notas de estudio
â   âââ error/           # Manejo de errores
âââ context/             # Estado global de la aplicaciÃ³n
âââ hooks/               # Hooks personalizados
âââ services/            # Servicios de API y datos
âââ utils/               # Utilidades y helpers
âââ styles/              # Temas y estilos globales

server/
âââ controllers/         # LÃ³gica de negocio del API
âââ routes/              # DefiniciÃ³n de rutas
âââ services/            # Servicios del backend
âââ config/              # ConfiguraciÃ³n del servidor
```

## ð¦ Estado del Proyecto

### â Completado
- [x] Lectura interactiva con chat integrado
- [x] AnÃ¡lisis de texto con mÃºltiples proveedores
- [x] Sistema de notas avanzado
- [x] Interfaz responsive y accesible
- [x] Modo oscuro/claro
- [x] Testing comprensivo

### ð En Desarrollo
- [ ] Soporte para mÃ¡s formatos de archivo
- [ ] IntegraciÃ³n con sistemas de gestiÃ³n de aprendizaje
- [ ] AnÃ¡lisis de progreso y estadÃ­sticas
- [ ] ColaboraciÃ³n en tiempo real

### ð¯ Roadmap
- [ ] AplicaciÃ³n mÃ³vil nativa
- [ ] ExtensiÃ³n para navegadores
- [ ] API pÃºblica para integraciones
- [ ] Marketplace de plugins

## ð¤ Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'AÃ±ade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## ð Licencia

Este proyecto estÃ¡ bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para mÃ¡s detalles.

## ð Agradecimientos

- OpenAI por su API de GPT
- Google por Gemini
- La comunidad de React por las herramientas increÃ­bles
- Todos los contribuidores y testers

## ð Soporte

Si tienes preguntas o problemas:
- ð [Reportar bugs](https://github.com/usuario/AppLectura/issues)
- ð¡ [Solicitar features](https://github.com/usuario/AppLectura/issues)
- ð§ Contacto: tu-email@example.com

---

**AppLectura** - Transformando la manera en que aprendemos y comprendemos los textos ðâ¨

