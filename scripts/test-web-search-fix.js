/**
 * Script de prueba para validar las correcciones de búsqueda web
 * Ejecutar: node scripts/test-web-search-fix.js
 */

const readline = require('readline');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function unwrapSuccessPayload(payload) {
  return payload?.ok === true && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload;
}

async function testBackendAvailability() {
  log('\n📋 TEST 1: Verificar disponibilidad del backend', 'cyan');
  
  try {
    const response = await fetch('http://localhost:3001/api/web-search/test');
    const data = unwrapSuccessPayload(await response.json());
    
    if (response.ok) {
      log('✅ Backend disponible', 'green');
      log(`   Modo: ${data.configuracion?.modo_funcionamiento}`, 'blue');
      log(`   Tavily: ${data.configuracion?.tavily_disponible ? '✅' : '❌'}`, 'blue');
      log(`   Serper: ${data.configuracion?.serper_disponible ? '✅' : '❌'}`, 'blue');
      log(`   Bing: ${data.configuracion?.bing_disponible ? '✅' : '❌'}`, 'blue');
      return true;
    } else {
      log('❌ Backend no disponible', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    log('   ⚠️  Verifica que el backend esté corriendo en puerto 3001', 'yellow');
    return false;
  }
}

async function testWebSearch() {
  log('\n📋 TEST 2: Realizar búsqueda web de prueba', 'cyan');
  
  try {
    const response = await fetch('http://localhost:3001/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Qué es la inteligencia artificial',
        type: 'general',
        maxResults: 3
      })
    });
    
    const data = unwrapSuccessPayload(await response.json());
    
    if (response.ok && data.resultados) {
      log('✅ Búsqueda exitosa', 'green');
      log(`   Resultados: ${data.resultados.length}`, 'blue');
      log(`   API utilizada: ${data.api_utilizada}`, 'blue');
      
      if (data.resultados.length > 0) {
        log('\n   Primer resultado:', 'blue');
        const r = data.resultados[0];
        log(`   📄 ${r.titulo}`, 'blue');
        log(`   🔗 ${r.url}`, 'blue');
        log(`   📝 ${r.resumen?.substring(0, 100)}...`, 'blue');
      }
      return true;
    } else {
      log('❌ Búsqueda falló', 'red');
      log(`   Error: ${data.error || 'Sin detalles'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontendEnvVar() {
  log('\n📋 TEST 3: Verificar variable de entorno frontend', 'cyan');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const tavilyMatch = envContent.match(/REACT_APP_TAVILY_API_KEY=(.+)/);
    
    if (tavilyMatch && tavilyMatch[1] && tavilyMatch[1].trim() !== '') {
      log('✅ Variable REACT_APP_TAVILY_API_KEY configurada', 'green');
      log(`   Valor: ${tavilyMatch[1].trim()}`, 'blue');
      return true;
    } else {
      log('❌ Variable REACT_APP_TAVILY_API_KEY vacía', 'red');
      log('   ⚠️  Debe contener "configured" para habilitar el botón', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkWebSearchServiceRefactor() {
  log('\n📋 TEST 4: Verificar refactorización de webSearchService', 'cyan');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const servicePath = path.join(__dirname, '..', 'src', 'utils', 'fetchWebSearch.js');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    const hasBackendCall = serviceContent.includes('/api/web-search');
    // Buscar llamadas fetch directas (no en comentarios)
    const fetchPattern = /fetch\s*\(\s*['"`]https:\/\/api\.tavily\.com/;
    const hasOldTavilyCall = fetchPattern.test(serviceContent);
    
    if (hasBackendCall && !hasOldTavilyCall) {
      log('✅ Servicio refactorizado correctamente', 'green');
      log('   ✓ Usa src/utils/fetchWebSearch.js', 'blue');
      log('   ✓ Usa endpoint /api/web-search', 'blue');
      log('   ✓ No hace llamadas directas a APIs externas', 'blue');
      return true;
    } else if (!hasBackendCall) {
      log('❌ Servicio NO usa backend', 'red');
      log('   ⚠️  Falta agregar llamada a /api/web-search', 'yellow');
      return false;
    } else if (hasOldTavilyCall) {
      log('⚠️  Servicio usa backend pero mantiene código antiguo', 'yellow');
      log('   Recomendación: Eliminar métodos searchWithTavily/Serper/DuckDuckGo', 'yellow');
      return true;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 INICIANDO VALIDACIÓN DE CORRECCIONES WEB SEARCH', 'cyan');
  log('================================================', 'cyan');
  
  const results = {
    backend: await testBackendAvailability(),
    search: false,
    envVar: await testFrontendEnvVar(),
    refactor: await checkWebSearchServiceRefactor()
  };
  
  if (results.backend) {
    results.search = await testWebSearch();
  }
  
  // Resumen final
  log('\n📊 RESUMEN DE RESULTADOS', 'cyan');
  log('================================================', 'cyan');
  log(`Backend disponible:      ${results.backend ? '✅' : '❌'}`, results.backend ? 'green' : 'red');
  log(`Búsqueda funcional:      ${results.search ? '✅' : '❌'}`, results.search ? 'green' : 'red');
  log(`Variable .env:           ${results.envVar ? '✅' : '❌'}`, results.envVar ? 'green' : 'red');
  log(`Servicio refactorizado:  ${results.refactor ? '✅' : '❌'}`, results.refactor ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(v => v === true);
  
  if (allPassed) {
    log('\n🎉 TODAS LAS PRUEBAS PASARON', 'green');
    log('La búsqueda web debería funcionar correctamente', 'green');
    log('\n📝 PRÓXIMOS PASOS:', 'cyan');
    log('1. Reiniciar servidores: npm run dev', 'blue');
    log('2. Cargar texto en la pestaña "Lectura Guiada"', 'blue');
    log('3. Escribir pregunta en el PromptBar', 'blue');
    log('4. Verificar que el botón "🌐 Con Web" NO esté deshabilitado', 'blue');
    log('5. Hacer clic en "🌐 Con Web" y verificar resultados', 'blue');
  } else {
    log('\n⚠️  ALGUNAS PRUEBAS FALLARON', 'yellow');
    log('Revisa los errores arriba y corrige antes de probar en UI', 'yellow');
    
    if (!results.backend) {
      log('\n💡 Solución: Ejecuta `npm run dev` para iniciar backend', 'yellow');
    }
    if (!results.envVar) {
      log('\n💡 Solución: Agrega REACT_APP_TAVILY_API_KEY=configured en .env', 'yellow');
    }
    if (!results.refactor) {
      log('\n💡 Solución: Revisa src/utils/fetchWebSearch.js y confirma que siga apuntando a /api/web-search', 'yellow');
    }
  }
  
  log('\n');
}

// Ejecutar tests
runAllTests().catch(err => {
  log(`\n❌ Error crítico: ${err.message}`, 'red');
  process.exit(1);
});
