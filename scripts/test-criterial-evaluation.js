/**
 * @file Script de Testing para Evaluación Criterial
 * @description Prueba el endpoint POST /api/assessment/evaluate con datos reales
 * @version 1.0.0
 */

const fetch = require('node-fetch');

// Configuración
const BACKEND_URL = 'http://localhost:3001';
const ENDPOINT = '/api/assessment/evaluate';

// Colores para output en consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function unwrapSuccessPayload(payload) {
  return payload?.ok === true && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload;
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

const textoOriginal = `
La inteligencia artificial (IA) está transformando radicalmente el panorama educativo mundial. 
Según estudios recientes, más del 60% de las instituciones educativas ya han integrado alguna 
forma de IA en sus procesos pedagógicos. Sin embargo, esta revolución tecnológica no está 
exenta de controversias.

Los defensores de la IA en educación argumentan que estas herramientas pueden personalizar 
el aprendizaje, identificar brechas de conocimiento y proporcionar retroalimentación inmediata. 
"La IA permite que cada estudiante aprenda a su propio ritmo", señala la Dra. María González, 
investigadora en tecnología educativa de la Universidad de Stanford.

Por otro lado, críticos como el profesor James Thompson advierten sobre los riesgos: 
"Existe el peligro de que los estudiantes desarrollen una dependencia excesiva de estas 
herramientas, perdiendo capacidades críticas como el pensamiento analítico independiente". 
Además, se plantean preocupaciones sobre la privacidad de datos y la posible perpetuación 
de sesgos algorítmicos.

El debate continúa, pero lo cierto es que la IA en educación llegó para quedarse. 
La pregunta ya no es si debemos usarla, sino cómo hacerlo de manera ética y efectiva.
`.trim();

const respuestaBuena = `
El texto presenta una tesis central clara: "La inteligencia artificial (IA) está transformando 
radicalmente el panorama educativo mundial". Esta afirmación se sustenta con datos específicos, 
como que "más del 60% de las instituciones educativas ya han integrado alguna forma de IA".

El autor estructura su argumento de manera equilibrada, presentando tanto la posición favorable 
como la crítica. Por un lado, cita a la Dra. María González quien afirma que "La IA permite que 
cada estudiante aprenda a su propio ritmo", evidenciando los beneficios de personalización. 
Por otro lado, incorpora la perspectiva del profesor James Thompson, quien advierte sobre 
"el peligro de que los estudiantes desarrollen una dependencia excesiva".

Esta estructura dialéctica (argumento-contraargumento) es característica del texto expositivo-argumentativo. 
El autor distingue claramente entre hechos verificables (el 60% de adopción) y opiniones de expertos 
(las citas de González y Thompson). La conclusión sintetiza que "la pregunta ya no es si debemos 
usarla, sino cómo hacerlo", trasladando el debate de la adopción a la implementación ética.

En términos de análisis crítico, identifico que el texto asume una postura moderada pero 
implícitamente favorable a la IA, dado que la caracteriza como inevitable ("llegó para quedarse"). 
Esta premisa ideológica podría limitar la consideración de alternativas pedagógicas no tecnológicas.
`.trim();

const respuestaRegular = `
El texto habla sobre la inteligencia artificial en educación. Dice que muchas escuelas la usan.

Hay gente a favor y gente en contra. Los que están a favor dicen que es buena porque personaliza 
el aprendizaje. Los que están en contra dicen que puede ser peligrosa.

Al final dice que la IA llegó para quedarse y que hay que usarla bien.
`.trim();

const respuestaPobre = `
La inteligencia artificial es importante en la educación moderna. Tiene ventajas y desventajas.
Hay que usarla correctamente.
`.trim();

// ============================================================================
// FUNCIONES DE TESTING
// ============================================================================

async function testEvaluacion(payload, nombreTest) {
  logSection(`🧪 Test: ${nombreTest}`);
  
  const startTime = Date.now();
  
  try {
    log('📤 Enviando request...', 'cyan');
    console.log('Payload:', JSON.stringify({
      ...payload,
      texto: payload.texto.substring(0, 100) + '...',
      respuesta: payload.respuesta.substring(0, 100) + '...',
    }, null, 2));
    
    const response = await fetch(`${BACKEND_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`⏱️  Tiempo de respuesta: ${duration}ms`, 'yellow');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log(`❌ Error HTTP ${response.status}`, 'red');
      console.error('Error Data:', errorData);
      return { success: false, error: errorData, duration };
    }
    
    const data = unwrapSuccessPayload(await response.json());
    
    log('✅ Respuesta recibida exitosamente', 'green');
    
    // Validar estructura
    const validaciones = {
      'Tiene campo valid': data.valid !== undefined,
      'Tiene campo dimension': !!data.dimension,
      'Tiene campo scoreGlobal': typeof data.scoreGlobal === 'number',
      'Tiene campo nivel': typeof data.nivel === 'number',
      'Tiene criteriosEvaluados': Array.isArray(data.criteriosEvaluados),
      'Tiene al menos 1 criterio': (data.criteriosEvaluados?.length || 0) > 0,
      'Tiene resumenDimension': !!data.resumenDimension,
      'Tiene siguientesPasos': Array.isArray(data.siguientesPasos),
      'Tiene timestamp': !!data.timestamp,
    };
    
    console.log('\n📊 Validaciones de Estructura:');
    Object.entries(validaciones).forEach(([nombre, resultado]) => {
      const icon = resultado ? '✅' : '❌';
      const color = resultado ? 'green' : 'red';
      log(`  ${icon} ${nombre}`, color);
    });
    
    const todasValidas = Object.values(validaciones).every(v => v);
    
    if (todasValidas) {
      log('\n🎉 Estructura válida!', 'green');
      
      // Mostrar resumen de la evaluación
      console.log('\n📋 Resumen de la Evaluación:');
      console.log(`  Dimensión: ${data.dimension}`);
      console.log(`  Puntuación Global: ${data.scoreGlobal}/10`);
      console.log(`  Nivel: ${data.nivel}/4`);
      console.log(`  Criterios Evaluados: ${data.criteriosEvaluados.length}`);
      
      console.log('\n📝 Criterios por Nivel:');
      data.criteriosEvaluados.forEach((crit, idx) => {
        const nivelIcon = ['🔴', '🟠', '🟢', '🔵'][crit.nivel - 1] || '⚪';
        console.log(`  ${nivelIcon} Criterio ${idx + 1}: ${crit.criterio}`);
        console.log(`     Nivel: ${crit.nivel}/4`);
        console.log(`     Evidencias: ${crit.evidencia?.length || 0}`);
        console.log(`     Fortalezas: ${crit.fortalezas?.length || 0}`);
        console.log(`     Mejoras: ${crit.mejoras?.length || 0}`);
      });
      
      console.log(`\n💬 Resumen: ${data.resumenDimension.substring(0, 150)}...`);
      console.log(`\n🚀 Siguientes Pasos (${data.siguientesPasos.length}):`);
      data.siguientesPasos.forEach((paso, idx) => {
        console.log(`  ${idx + 1}. ${paso.substring(0, 100)}...`);
      });
    } else {
      log('\n⚠️  Estructura incompleta', 'yellow');
    }
    
    return { success: true, data, duration, validaciones };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`❌ Error en el test: ${error.message}`, 'red');
    console.error('Stack:', error.stack);
    return { success: false, error: error.message, duration };
  }
}

// ============================================================================
// SUITE DE TESTS
// ============================================================================

async function runTestSuite() {
  logSection('🚀 INICIANDO SUITE DE TESTS - EVALUACIÓN CRITERIAL');
  
  log('Configuración:', 'cyan');
  console.log(`  Backend URL: ${BACKEND_URL}`);
  console.log(`  Endpoint: ${ENDPOINT}`);
  console.log(`  Fecha: ${new Date().toLocaleString('es-ES')}`);
  
  const results = [];
  
  // Test 1: Respuesta Buena (esperado: nivel 3-4)
  const result1 = await testEvaluacion({
    texto: textoOriginal,
    respuesta: respuestaBuena,
    dimension: 'comprensionAnalitica',
    provider: 'deepseek', // ✅ Usando DeepSeek (más económico)
  }, 'Respuesta Buena - Comprensión Analítica');
  results.push({ nombre: 'Respuesta Buena', ...result1 });
  
  await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa 3s (DeepSeek rate limit)
  
  // Test 2: Respuesta Regular (esperado: nivel 2)
  const result2 = await testEvaluacion({
    texto: textoOriginal,
    respuesta: respuestaRegular,
    dimension: 'comprensionAnalitica',
    provider: 'deepseek', // ✅ Usando DeepSeek (más económico)
  }, 'Respuesta Regular - Comprensión Analítica');
  results.push({ nombre: 'Respuesta Regular', ...result2 });
  
  await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa 3s (DeepSeek rate limit)
  
  // Test 3: Respuesta Pobre (esperado: nivel 1)
  const result3 = await testEvaluacion({
    texto: textoOriginal,
    respuesta: respuestaPobre,
    dimension: 'comprensionAnalitica',
    provider: 'deepseek', // ✅ Usando DeepSeek (más económico)
  }, 'Respuesta Pobre - Comprensión Analítica');
  results.push({ nombre: 'Respuesta Pobre', ...result3 });
  
  // Resumen Final
  logSection('📊 RESUMEN FINAL DE TESTS');
  
  const exitosos = results.filter(r => r.success).length;
  const fallidos = results.filter(r => !r.success).length;
  const duracionPromedio = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log(`Total de tests: ${results.length}`);
  log(`Exitosos: ${exitosos}`, exitosos === results.length ? 'green' : 'yellow');
  log(`Fallidos: ${fallidos}`, fallidos > 0 ? 'red' : 'green');
  console.log(`Duración promedio: ${Math.round(duracionPromedio)}ms`);
  
  console.log('\n📋 Detalle por Test:');
  results.forEach((result, idx) => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`  ${icon} Test ${idx + 1}: ${result.nombre} (${result.duration}ms)`, color);
    
    if (result.success && result.data) {
      console.log(`     Score: ${result.data.scoreGlobal}/10 | Nivel: ${result.data.nivel}/4`);
    } else if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  if (exitosos === results.length) {
    log('\n🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!', 'green');
  } else {
    log('\n⚠️  Algunos tests fallaron. Revisar logs arriba.', 'yellow');
  }
  
  logSection('FIN DE LA SUITE DE TESTS');
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

if (require.main === module) {
  runTestSuite()
    .then(() => {
      log('\n✅ Suite de tests completada', 'green');
      process.exit(0);
    })
    .catch(error => {
      log(`\n❌ Error fatal: ${error.message}`, 'red');
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { testEvaluacion, runTestSuite };
