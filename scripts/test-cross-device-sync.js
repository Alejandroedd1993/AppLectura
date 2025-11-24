/**
 * TEST DE SINCRONIZACIÓN CROSS-DEVICE
 * 
 * Este script valida que TODOS los datos se sincronicen correctamente
 * entre dispositivos/navegadores usando Firebase.
 * 
 * Ejecutar en consola del navegador:
 * ```
 * fetch('/scripts/test-cross-device-sync.js').then(r => r.text()).then(eval);
 * ```
 */

(async function testCrossDeviceSync() {
  console.log('🧪 ========================================');
  console.log('🧪 TEST DE SINCRONIZACIÓN CROSS-DEVICE');
  console.log('🧪 ========================================\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Helper para verificar
  function check(name, condition, details = '') {
    if (condition) {
      results.passed.push(name);
      console.log(`✅ ${name}${details ? `: ${details}` : ''}`);
    } else {
      results.failed.push(name);
      console.error(`❌ ${name}${details ? `: ${details}` : ''}`);
    }
  }

  function warn(name, details = '') {
    results.warnings.push(name);
    console.warn(`⚠️  ${name}${details ? `: ${details}` : ''}`);
  }

  // 1. VERIFICAR SESIÓN ACTIVA
  console.log('\n📋 1. VERIFICANDO SESIÓN ACTIVA...');
  const currentSessionId = localStorage.getItem('currentSessionId');
  check('Hay sesión activa', !!currentSessionId, currentSessionId);

  if (!currentSessionId) {
    console.error('❌ No hay sesión activa. Crea una sesión primero.');
    return;
  }

  // 2. CARGAR SESIÓN DESDE LOCALSTORAGE
  console.log('\n📋 2. CARGANDO SESIÓN DESDE LOCALSTORAGE...');
  const sessionsData = localStorage.getItem('sessions');
  check('Datos de sesiones existen', !!sessionsData);

  if (!sessionsData) {
    console.error('❌ No hay datos de sesiones en localStorage');
    return;
  }

  const sessions = JSON.parse(sessionsData);
  const currentSession = sessions[currentSessionId];
  check('Sesión actual existe', !!currentSession);

  if (!currentSession) {
    console.error('❌ La sesión actual no existe en localStorage');
    return;
  }

  // 3. VALIDAR ESTRUCTURA DE LA SESIÓN
  console.log('\n📋 3. VALIDANDO ESTRUCTURA DE LA SESIÓN...');
  console.log('Estructura actual:', Object.keys(currentSession));

  const requiredFields = [
    'id',
    'title',
    'createdAt',
    'lastModified',
    'text',
    'completeAnalysis',
    'rubricProgress',
    'savedCitations',
    'activitiesProgress',
    'artifactsDrafts',
    'rewardsState',
    'settings'
  ];

  requiredFields.forEach(field => {
    const exists = field in currentSession;
    check(`Campo '${field}' presente`, exists);
  });

  // 4. VALIDAR CONTENIDO DE TEXTO
  console.log('\n📋 4. VALIDANDO TEXTO...');
  if (currentSession.text) {
    check('Texto tiene contenido', !!currentSession.text.content, 
      `${currentSession.text.content?.length || 0} caracteres`);
    check('Texto tiene fileName', !!currentSession.text.fileName, 
      currentSession.text.fileName);
    check('Texto tiene metadata', !!currentSession.text.metadata);
  } else {
    warn('No hay texto en la sesión');
  }

  // 5. VALIDAR ANÁLISIS
  console.log('\n📋 5. VALIDANDO ANÁLISIS...');
  if (currentSession.completeAnalysis) {
    const analysis = currentSession.completeAnalysis;
    check('Análisis tiene estructura', typeof analysis === 'object');
    
    const analysisFields = ['title', 'author', 'genre', 'summary', 'mainTopics'];
    analysisFields.forEach(field => {
      if (field in analysis) {
        check(`Análisis.${field}`, !!analysis[field]);
      }
    });
  } else {
    warn('No hay análisis completo en la sesión');
  }

  // 6. VALIDAR PROGRESO DE RÚBRICAS
  console.log('\n📋 6. VALIDANDO PROGRESO DE RÚBRICAS...');
  if (currentSession.rubricProgress && Object.keys(currentSession.rubricProgress).length > 0) {
    const rubricCount = Object.keys(currentSession.rubricProgress).length;
    check('Tiene progreso de rúbricas', true, `${rubricCount} rúbricas`);
    
    Object.entries(currentSession.rubricProgress).forEach(([rubricId, data]) => {
      check(`Rúbrica ${rubricId}`, !!data, 
        `${data.scores?.length || 0} evaluaciones`);
    });
  } else {
    warn('No hay progreso de rúbricas');
  }

  // 7. VALIDAR ACTIVIDADES
  console.log('\n📋 7. VALIDANDO PROGRESO DE ACTIVIDADES...');
  if (currentSession.activitiesProgress && Object.keys(currentSession.activitiesProgress).length > 0) {
    const activityCount = Object.keys(currentSession.activitiesProgress).length;
    check('Tiene progreso de actividades', true, `${activityCount} actividades`);
    
    Object.entries(currentSession.activitiesProgress).forEach(([activityId, data]) => {
      check(`Actividad ${activityId}`, !!data, 
        `Estado: ${data.estado || 'desconocido'}`);
    });
  } else {
    warn('No hay progreso de actividades');
  }

  // 8. VALIDAR ARTEFACTOS
  console.log('\n📋 8. VALIDANDO BORRADORES DE ARTEFACTOS...');
  if (currentSession.artifactsDrafts) {
    const artifacts = currentSession.artifactsDrafts;
    
    ['resumenAcademico', 'tablaACD', 'mapaActores', 'respuestaArgumentativa'].forEach(type => {
      if (artifacts[type]) {
        const hasData = JSON.stringify(artifacts[type]).length > 50; // Al menos algo de contenido
        check(`Artefacto ${type}`, hasData, 
          hasData ? 'Tiene contenido' : 'Vacío');
      }
    });
  } else {
    warn('No hay borradores de artefactos');
  }

  // 9. VALIDAR CITAS
  console.log('\n📋 9. VALIDANDO CITAS GUARDADAS...');
  if (currentSession.savedCitations && Object.keys(currentSession.savedCitations).length > 0) {
    const citationCount = Object.keys(currentSession.savedCitations).length;
    check('Tiene citas guardadas', true, `${citationCount} citas`);
  } else {
    warn('No hay citas guardadas');
  }

  // 10. VALIDAR GAMIFICACIÓN
  console.log('\n📋 10. VALIDANDO ESTADO DE GAMIFICACIÓN...');
  if (currentSession.rewardsState) {
    const rewards = currentSession.rewardsState;
    check('Tiene estado de recompensas', true);
    check('Tiene puntos', 'points' in rewards, rewards.points || 0);
    check('Tiene racha', 'streak' in rewards, rewards.streak || 0);
    check('Tiene nivel', 'level' in rewards, rewards.level || 1);
    
    if (rewards.achievements && Array.isArray(rewards.achievements)) {
      check('Tiene logros', rewards.achievements.length > 0, 
        `${rewards.achievements.length} logros`);
    }
  } else {
    warn('No hay estado de gamificación');
  }

  // 11. VERIFICAR USUARIO DE FIREBASE
  console.log('\n📋 11. VERIFICANDO AUTENTICACIÓN FIREBASE...');
  const currentUserId = localStorage.getItem('currentUserId');
  check('Usuario Firebase configurado', !!currentUserId, currentUserId);

  // 12. VERIFICAR SESSIONMANAGER
  console.log('\n📋 12. VERIFICANDO SESSIONMANAGER...');
  const sessionManagerUser = localStorage.getItem('sessionManagerUserId');
  check('SessionManager tiene userId', !!sessionManagerUser, sessionManagerUser);
  check('SessionManager y Firebase coinciden', 
    sessionManagerUser === currentUserId, 
    sessionManagerUser === currentUserId ? 'Match' : 'Mismatch');

  // 13. CAPTURAR ESTADO ACTUAL vs SESIÓN GUARDADA
  console.log('\n📋 13. COMPARANDO ESTADO ACTUAL vs SESIÓN GUARDADA...');
  
  // Obtener texto actual del contexto (desde AppContext)
  const currentText = window.__appContext?.texto || '';
  const savedText = currentSession.text?.content || '';
  
  if (currentText && savedText) {
    const textMatch = currentText === savedText;
    check('Texto actual coincide con sesión', textMatch, 
      textMatch ? 'Match' : `Actual: ${currentText.length}ch vs Guardado: ${savedText.length}ch`);
  }

  // 14. VERIFICAR CAPTURA DE ARTEFACTOS DESDE SESSIONSTORAGE
  console.log('\n📋 14. VERIFICANDO CAPTURA DE ARTEFACTOS...');
  const artifactKeys = [
    'resumenAcademico_draft',
    'tablaACD_marcoIdeologico',
    'tablaACD_estrategiasRetoricas',
    'tablaACD_vocesPresentes',
    'tablaACD_vocesSilenciadas',
    'mapaActores_actores',
    'mapaActores_contextoHistorico',
    'mapaActores_conexiones',
    'mapaActores_consecuencias',
    'respuestaArgumentativa_tesis',
    'respuestaArgumentativa_evidencias',
    'respuestaArgumentativa_contraargumento',
    'respuestaArgumentativa_refutacion'
  ];

  artifactKeys.forEach(key => {
    const value = sessionStorage.getItem(key);
    if (value && value.length > 10) {
      check(`SessionStorage: ${key}`, true, `${value.length} chars`);
    }
  });

  // RESUMEN FINAL
  console.log('\n');
  console.log('🧪 ========================================');
  console.log('🧪 RESUMEN DE RESULTADOS');
  console.log('🧪 ========================================');
  console.log(`✅ Pasadas: ${results.passed.length}`);
  console.log(`❌ Fallidas: ${results.failed.length}`);
  console.log(`⚠️  Advertencias: ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ PRUEBAS FALLIDAS:');
    results.failed.forEach(test => console.log(`  - ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    results.warnings.forEach(test => console.log(`  - ${test}`));
  }

  console.log('\n📊 ESTADO GENERAL:', 
    results.failed.length === 0 ? '✅ APROBADO' : '❌ REPROBADO');

  // INSTRUCCIONES PARA PRUEBA CROSS-DEVICE
  console.log('\n');
  console.log('🔄 ========================================');
  console.log('🔄 INSTRUCCIONES PRUEBA CROSS-DEVICE');
  console.log('🔄 ========================================');
  console.log('1. Abre esta sesión en otro navegador/dispositivo');
  console.log('2. Ejecuta este mismo script');
  console.log('3. Compara los resultados - DEBEN SER IDÉNTICOS');
  console.log('4. ID de sesión a abrir:', currentSessionId);
  console.log('\nURL del script:');
  console.log('fetch("/scripts/test-cross-device-sync.js").then(r => r.text()).then(eval);');

  return {
    sessionId: currentSessionId,
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    success: results.failed.length === 0,
    details: results
  };
})();
