const fs = require('fs');
const path = require('path');

console.log('🔧 Analizando configuración del asistente de IA...\n');

// Verificar variables de entorno
const envPath = path.join(__dirname, '..', 'server', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📋 Variables de entorno encontradas:');
  
  const requiredVars = ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'BACKEND_PORT'];
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✅ ${varName}: Configurada`);
    } else {
      console.log(`❌ ${varName}: No encontrada`);
    }
  });
} else {
  console.log('❌ Archivo .env no encontrado en server/');
}

console.log('\n🎯 Recomendaciones para optimizar rendimiento:');
console.log('1. Usar streaming para respuestas largas');
console.log('2. Configurar timeouts apropiados (30s backend, 25s frontend)');
console.log('3. Implementar retry logic para fallos de red');
console.log('4. Usar modelos más rápidos para respuestas inmediatas');
console.log('5. Agregar compresión HTTP en el backend');

// Sugerir configuración optimizada
const optimizedConfig = {
  chat: {
    timeout: 30000,
    maxTokens: 1000,
    stream: true,
    retries: 2
  },
  models: {
    fast: 'gpt-3.5-turbo',
    detailed: 'gpt-4',
    fallback: 'deepseek-chat'
  }
};

console.log('\n⚙️  Configuración recomendada:');
console.log(JSON.stringify(optimizedConfig, null, 2));
