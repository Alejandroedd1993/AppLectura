/**
 * @file Script de Testing Simple para Evaluación Criterial
 * @description Prueba directa con fetch, sin importar módulos del backend
 * @version 1.0.0
 */

const BACKEND_URL = 'http://localhost:3001';

function unwrapSuccessPayload(payload) {
  return payload?.ok === true && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload;
}

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

const textoOriginal = `La inteligencia artificial (IA) está transformando radicalmente el panorama educativo mundial. 
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
La pregunta ya no es si debemos usarla, sino cómo hacerlo de manera ética y efectiva.`;

const respuestaBuena = `El texto presenta una tesis central clara: "La inteligencia artificial (IA) está transformando 
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
Esta premisa ideológica podría limitar la consideración de alternativas pedagógicas no tecnológicas.`;

// ============================================================================
// TEST ÚNICO
// ============================================================================

async function testBackend() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST DE EVALUACIÓN CRITERIAL CON DEEPSEEK');
  console.log('='.repeat(80) + '\n');
  
  console.log('📤 Enviando evaluación...');
  console.log(`   Texto: ${textoOriginal.substring(0, 100)}...`);
  console.log(`   Respuesta: ${respuestaBuena.substring(0, 100)}...`);
  console.log(`   Dimensión: comprensionAnalitica`);
  console.log(`   Provider: deepseek\n`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/assessment/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texto: textoOriginal,
        respuesta: respuestaBuena,
        dimension: 'comprensionAnalitica',
        provider: 'deepseek',
      }),
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Tiempo de respuesta: ${duration}ms (${(duration/1000).toFixed(1)}s)\n`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error HTTP', response.status);
      console.error('Error:', JSON.stringify(errorData, null, 2));
      return;
    }
    
    const data = unwrapSuccessPayload(await response.json());
    
    console.log('✅ ¡Evaluación recibida exitosamente!\n');
    console.log('='.repeat(80));
    console.log('📊 RESULTADOS DE LA EVALUACIÓN');
    console.log('='.repeat(80) + '\n');
    
    console.log(`📖 Dimensión: ${data.dimension}`);
    console.log(`⭐ Puntuación Global: ${data.scoreGlobal}/10`);
    console.log(`🎯 Nivel: ${data.nivel}/4`);
    console.log(`📋 Criterios Evaluados: ${data.criteriosEvaluados?.length || 0}\n`);
    
    console.log('─'.repeat(80));
    console.log('📝 CRITERIOS POR NIVEL');
    console.log('─'.repeat(80) + '\n');
    
    if (data.criteriosEvaluados) {
      data.criteriosEvaluados.forEach((crit, idx) => {
        const nivelIcon = ['🔴', '🟠', '🟢', '🔵'][crit.nivel - 1] || '⚪';
        console.log(`${nivelIcon} Criterio ${idx + 1}: ${crit.criterio}`);
        console.log(`   Nivel: ${crit.nivel}/4`);
        console.log(`   📌 Evidencias: ${crit.evidencia?.length || 0}`);
        console.log(`   ✅ Fortalezas: ${crit.fortalezas?.length || 0}`);
        console.log(`   🎯 Mejoras: ${crit.mejoras?.length || 0}`);
        
        if (crit.evidencia && crit.evidencia.length > 0) {
          console.log(`\n   📌 Evidencias:`);
          crit.evidencia.slice(0, 2).forEach((ev, i) => {
            console.log(`      ${i + 1}. "${ev.substring(0, 80)}..."`);
          });
        }
        
        if (crit.fortalezas && crit.fortalezas.length > 0) {
          console.log(`\n   ✅ Fortalezas:`);
          crit.fortalezas.slice(0, 2).forEach((f, i) => {
            console.log(`      ${i + 1}. ${f.substring(0, 80)}...`);
          });
        }
        
        if (crit.mejoras && crit.mejoras.length > 0) {
          console.log(`\n   🎯 Mejoras:`);
          crit.mejoras.slice(0, 2).forEach((m, i) => {
            console.log(`      ${i + 1}. ${m.substring(0, 80)}...`);
          });
        }
        
        console.log('');
      });
    }
    
    console.log('─'.repeat(80));
    console.log('💬 RESUMEN');
    console.log('─'.repeat(80) + '\n');
    
    if (data.resumenDimension) {
      console.log(data.resumenDimension);
      console.log('');
    }
    
    if (data.siguientesPasos && data.siguientesPasos.length > 0) {
      console.log('─'.repeat(80));
      console.log('🚀 SIGUIENTES PASOS RECOMENDADOS');
      console.log('─'.repeat(80) + '\n');
      
      data.siguientesPasos.forEach((paso, idx) => {
        console.log(`${idx + 1}. ${paso}`);
      });
      console.log('');
    }
    
    // Validaciones
    console.log('─'.repeat(80));
    console.log('✓ VALIDACIONES DE ESTRUCTURA');
    console.log('─'.repeat(80) + '\n');
    
    const checks = [
      ['✅ Campo valid', data.valid === true],
      ['✅ Campo dimension', !!data.dimension],
      ['✅ Campo scoreGlobal', typeof data.scoreGlobal === 'number'],
      ['✅ Campo nivel (1-4)', data.nivel >= 1 && data.nivel <= 4],
      ['✅ Campo criteriosEvaluados', Array.isArray(data.criteriosEvaluados)],
      ['✅ Al menos 1 criterio', (data.criteriosEvaluados?.length || 0) > 0],
      ['✅ Campo resumenDimension', !!data.resumenDimension],
      ['✅ Campo siguientesPasos', Array.isArray(data.siguientesPasos)],
      ['✅ Timestamp', !!data.timestamp],
    ];
    
    checks.forEach(([name, passed]) => {
      const icon = passed ? '✅' : '❌';
      console.log(`${icon} ${name}`);
    });
    
    const allPassed = checks.every(([, passed]) => passed);
    
    console.log('\n' + '='.repeat(80));
    if (allPassed) {
      console.log('🎉 ¡TODAS LAS VALIDACIONES PASARON!');
    } else {
      console.log('⚠️  Algunas validaciones fallaron');
    }
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar
testBackend()
  .then(() => {
    console.log('✅ Test completado\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
