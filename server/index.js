import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import OpenAI from 'openai';
// import pdf from 'pdf-parse';
import chatCompletionRoutes from './routes/chat.completion.routes.js';
import analisisRoutes from './routes/analisis.routes.js';
import notesRoutes from './routes/notes.routes.js';
import webSearchRoutes from './routes/webSearch.routes.js';
import pdfRoutes from './routes/pdf.routes.js';
import ocrRoutes from './routes/ocr.routes.js';

// CORRECCIÓN: Agregar ruta de assessment
import assessmentRoutes from './routes/assessment.route.js';

import performanceMiddleware from './middleware/performance.js';

// Configuración básica
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const upload = multer();

// ============================================================================
// CONFIGURAR AI CLIENT PARA EVALUACIÓN CRITERIAL
// ============================================================================
const aiClient = {
  async complete({ provider = 'deepseek', prompt, response_format }) {
    // Configurar cliente según provider
    const config = {
      deepseek: {
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY || 'sk-0632e6fd405b41f3bd4db539bb60b3e8',
        model: 'deepseek-chat'
      },
      openai: {
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini'
      }
    };

    const selectedConfig = config[provider] || config.deepseek;
    
    const client = new OpenAI({
      baseURL: selectedConfig.baseURL,
      apiKey: selectedConfig.apiKey,
    });

    try {
      console.log(`🤖 [aiClient] Usando ${provider} con modelo ${selectedConfig.model}`);
      
      const completion = await client.chat.completions.create({
        model: selectedConfig.model,
        messages: [
          { role: 'system', content: 'Eres un evaluador experto en literacidad crítica. Siempre respondes en español.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2500,
        response_format: response_format?.type === 'json_object' ? { type: 'json_object' } : undefined
      });

      const content = completion.choices[0].message.content;
      console.log(`✅ [aiClient] Respuesta recibida: ${content.length} caracteres`);
      
      return content;
    } catch (error) {
      console.error(`❌ [aiClient] Error con ${provider}:`, error.message);
      throw error;
    }
  }
};

// Inyectar AI client en la app para uso de controllers
app.set('aiClient', aiClient);
console.log('🤖 AI Client configurado con soporte para DeepSeek y OpenAI');

// CORS dinámico: desarrollo + producción
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://applectura-cb058.web.app',
  'https://applectura-cb058.firebaseapp.com',
  'https://applectura-frontend.onrender.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como apps móviles o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqueado para origen: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '4mb' }));
performanceMiddleware(app);

// Middleware para manejar errores de JSON inválido
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  next();
});

// Ruta de salud para Render (en raíz)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'applectura-backend'
  });
});

// Ruta de salud detallada
app.get('/api/health', (req, res) => {
  const apiStatus = {
    openai: process.env.OPENAI_API_KEY ? "configurada" : "no configurada",
    gemini: process.env.GEMINI_API_KEY ? "configurada" : "no configurada"
  };
  
  res.json({ 
    status: 'ok', 
    apis: apiStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas reales para procesar PDFs (usa pdf-parse en el servicio)
// Montamos en /api para conservar el endpoint /api/process-pdf usado por el frontend
app.use('/api', pdfRoutes);

// Rutas de chat (completions)
app.use('/api/chat', chatCompletionRoutes);
// Rutas de análisis de texto
app.use('/api/analysis', analisisRoutes);
// Rutas de notas de estudio
app.use('/api/notes', notesRoutes);
// Rutas de búsqueda web contextual
app.use('/api/web-search', webSearchRoutes);
// OCR de imagen (para regiones/miniaturas)
app.use('/api', ocrRoutes);

// CORRECCIÓN: Montar ruta de assessment criterial
app.use('/api/assessment', assessmentRoutes);

// Habilita pre-flight para todas las rutas
app.options('*', cors());

// Puerto flexible: Render usa PORT, desarrollo usa BACKEND_PORT
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Iniciar servidor y conservar referencia para depuración
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 AppLectura Backend Server`);
  console.log('='.repeat(60));
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
  console.log(`✅ Routes:`);
  console.log(`   - GET  /health`);
  console.log(`   - GET  /api/health`);
  console.log(`   - POST /api/process-pdf`);
  console.log(`   - POST /api/chat/completion`);
  console.log(`   - POST /api/analysis/text`);
  console.log(`   - POST /api/notes/generate`);
  console.log(`   - POST /api/web-search`);
  console.log(`   - POST /api/ocr-image`);
  console.log(`   - POST /api/assessment/evaluate`);
  console.log(`   - POST /api/assessment/bulk-evaluate`);
  console.log('='.repeat(60) + '\n');
});

// Mejorar estabilidad de conexiones (útil para stream)
server.keepAliveTimeout = 70000;
server.headersTimeout = 75000;

// Listeners de diagnóstico para detectar salida inesperada
server.on('error', (err) => {
  console.error('🛑 Error del servidor HTTP:', err);
});

process.on('uncaughtException', (err) => {
  console.error('💥 uncaughtException:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  unhandledRejection:', reason);
});

process.on('exit', (code) => {
  console.log(`👋 Proceso saliendo con código ${code}`);
});

['SIGINT','SIGTERM','SIGUSR1','SIGUSR2'].forEach(sig => {
  process.on(sig, () => {
    console.log(`📴 Señal recibida: ${sig}. Cerrando servidor...`);
    try {
      server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
      // Forzar salida si no cierra en 5s
      setTimeout(() => {
        console.warn('⏱️ Cierre forzado tras timeout');
        process.exit(1);
      }, 5000).unref();
    } catch (e) {
      console.error('Error al cerrar servidor tras señal:', e);
      process.exit(1);
    }
  });
});

// Intervalo inerte para asegurarnos de que haya un handle activo mientras depuramos
setInterval(() => { /* noop keep-alive for debug */ }, 60000).unref();
