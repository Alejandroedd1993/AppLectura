"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[933],{8933:(e,a,t)=>{t.r(a),t.d(a,{default:()=>fe});var n=t(9950),i=t(4752),r=t(1132),o=t(3291),s=t(387),l=t(7424),c=t(6735),d=t(8864);const u="deepseek-chat",m="gpt-4o-mini",g="argumentacion";function p(e){let a=e.trim();a=a.replace(/```json\s*/g,""),a=a.replace(/```\s*/g,"");const t=a.match(/\{[\s\S]*\}/);return t&&(a=t[0]),a}async function h(e,a,t,n,i,r){const o=function(e,a,t,n,i,r){return`Eres un evaluador experto en argumentaci\xf3n cr\xedtica y pensamiento dial\xf3gico.\n\nTEXTO ORIGINAL:\n"""\n${e.slice(0,3e3)}\n"""\n\nRESPUESTA ARGUMENTATIVA DEL ESTUDIANTE:\n\nTesis: ${a}\nEvidencias: ${t}\nContraargumento: ${n}\nRefutaci\xf3n: ${i}\n\nEVALUACI\xd3N ESTRUCTURAL PREVIA (DeepSeek):\n${JSON.stringify(r,null,2)}\n\n---\n\nTAREA: Eval\xfaa la PROFUNDIDAD DIAL\xd3GICA del argumento. No repitas la evaluaci\xf3n estructural.\n\nEnf\xf3cate en:\n\n1. **Originalidad y Complejidad**: \xbfLa tesis demuestra pensamiento cr\xedtico original o solo repite lo obvio?\n2. **Integraci\xf3n de Perspectivas**: \xbfIntegra perspectivas alternativas de forma sofisticada o solo las descarta?\n3. **Manejo de la Complejidad**: \xbfReconoce matices y limitaciones o simplifica excesivamente?\n\nEjemplos de argumentaci\xf3n B\xc1SICA vs AVANZADA:\n\nB\xc1SICO: \n- Tesis: "El texto est\xe1 sesgado."\n- Evidencia: "Dice cosas negativas."\n- Contraargumento: "Algunos dir\xedan que es objetivo."\n- Refutaci\xf3n: "Pero no lo es."\n\nAVANZADO:\n- Tesis: "El texto naturaliza la competencia econ\xf3mica como \xfanico modelo leg\xedtimo, excluyendo alternativas cooperativas."\n- Evidencia: "Al afirmar que 'la competencia es ley natural' (p\xe1rrafo 3), omite deliberadamente modelos exitosos de econom\xeda solidaria documentados en..."\n- Contraargumento: "Se podr\xeda objetar que la competencia ha demostrado hist\xf3ricamente generar innovaci\xf3n."\n- Refutaci\xf3n: "Si bien es cierto que puede generar innovaci\xf3n, esta l\xf3gica ignora los costos sociales (precarizaci\xf3n, desigualdad) y excluye del an\xe1lisis modelos donde la cooperaci\xf3n tambi\xe9n innov\xf3 (ej: software libre, econom\xeda social)."\n\nIMPORTANTE: Responde SOLO con JSON v\xe1lido.\n\nFormato de respuesta JSON:\n{\n  "profundidad_dialogica": {\n    "solidez_tesis": {\n      "demuestra_pensamiento_original": true/false,\n      "es_matizada": true/false,\n      "comentario": "Breve an\xe1lisis"\n    },\n    "uso_evidencia": {\n      "integra_evidencia_estrategicamente": true/false,\n      "explica_conexiones_profundas": true/false,\n      "comentario": "Breve an\xe1lisis"\n    },\n    "manejo_contraargumento": {\n      "reconoce_validez_parcial": true/false,\n      "refuta_sin_simplificar": true/false,\n      "comentario": "Breve an\xe1lisis"\n    }\n  },\n  "fortalezas_dialogicas": ["insight 1", "insight 2"],\n  "oportunidades_profundizacion": ["sugerencia 1", "sugerencia 2"],\n  "nivel_pensamiento_critico": 1-4\n}`}(e,a,t,n,i,r);try{const e=await(0,c.x8)({provider:"openai",model:m,messages:[{role:"user",content:o}],temperature:.3,max_tokens:1800,response_format:{type:"json_object"},timeoutMs:45e3}),a=(0,c.HQ)(e);console.log("\ud83d\udd0d [OpenAI RespuestaArgumentativa] Respuesta cruda:",a.slice(0,200));const t=p(a);console.log("\u2705 [OpenAI RespuestaArgumentativa] Respuesta limpia:",t.slice(0,200));const n=JSON.parse(t);if(!n.profundidad_dialogica||!n.nivel_pensamiento_critico)throw new Error("Respuesta sin profundidad_dialogica");return n}catch(s){return console.error("\u274c Error en evaluaci\xf3n OpenAI (RespuestaArgumentativa):",s),{profundidad_dialogica:{solidez_tesis:{demuestra_pensamiento_original:!0,es_matizada:!0,comentario:"An\xe1lisis b\xe1sico"},uso_evidencia:{integra_evidencia_estrategicamente:!0,explica_implicaciones:!0,comentario:"An\xe1lisis b\xe1sico"},manejo_contraargumento:{reconoce_validez_parcial:!0,refutacion_matizada:!0,comentario:"An\xe1lisis b\xe1sico"}},fortalezas_profundidad:["An\xe1lisis en proceso"],oportunidades_profundizacion:["Error en evaluaci\xf3n autom\xe1tica"],nivel_pensamiento_critico:3,_error:s.message}}}function v(e){const a=e.toLowerCase();return a.includes("tesis")||a.includes("postura")?"solidez_tesis":a.includes("evidencia")||a.includes("sustento")||a.includes("cita")?"uso_evidencia":a.includes("contraargumento")||a.includes("objeci\xf3n")||a.includes("refut")?"manejo_contraargumento":null}async function f(e){let{text:a,tesis:t,evidencias:n,contraargumento:i,refutacion:r}=e;console.log("\ud83d\udcad [RespuestaArgumentativa] Iniciando evaluaci\xf3n dual...");const o=Date.now();try{console.log("\ud83d\udcca Evaluando estructura argumentativa (DeepSeek)...");const e=await async function(e,a,t,n,i){const r=function(e,a,t,n,i){return`Eres un evaluador experto en argumentaci\xf3n acad\xe9mica.\n\nTEXTO ORIGINAL:\n"""\n${e.slice(0,3e3)}\n"""\n\nRESPUESTA ARGUMENTATIVA DEL ESTUDIANTE:\n\n1. Tesis:\n${a}\n\n2. Evidencias que sustentan la tesis:\n${t}\n\n3. Contraargumento (objeci\xf3n v\xe1lida):\n${n}\n\n4. Refutaci\xf3n del contraargumento:\n${i}\n\n---\n\nTAREA: Eval\xfaa la ESTRUCTURA ARGUMENTATIVA seg\xfan estos 3 criterios:\n\n**Criterio 1: Solidez de la Tesis (solidez_tesis)**\n- \xbfLa tesis es clara y espec\xedfica?\n- \xbfEs defendible (no es una obviedad ni algo imposible de sostener)?\n- Nivel (1-4): 1=Sin tesis/mera opini\xf3n, 2=Vaga/ambigua, 3=Clara y defendible, 4=Original y matizada\n\n**Criterio 2: Uso de Evidencia (uso_evidencia)**\n- \xbfLas evidencias est\xe1n ancladas en el texto?\n- \xbfSon pertinentes para la tesis?\n- \xbfExplica c\xf3mo sustentan la tesis?\n- Nivel (1-4): 1=Sin sustento, 2=Superficial sin an\xe1lisis, 3=Pertinente con explicaci\xf3n, 4=Integrada estrat\xe9gicamente\n\n**Criterio 3: Manejo del Contraargumento (manejo_contraargumento)**\n- \xbfEl contraargumento es relevante (no un hombre de paja)?\n- \xbfLa refutaci\xf3n es s\xf3lida?\n- Nivel (1-4): 1=Ignora opuestos, 2=Superficial/caricatura, 3=Presenta y refuta relevante, 4=Refuta el contraargumento m\xe1s fuerte\n\nIMPORTANTE: Responde SOLO con JSON v\xe1lido, sin explicaciones adicionales.\n\nFormato de respuesta JSON:\n{\n  "criterios_evaluados": {\n    "solidez_tesis": {\n      "nivel": 1-4,\n      "es_clara": true/false,\n      "es_especifica": true/false,\n      "es_defendible": true/false\n    },\n    "uso_evidencia": {\n      "nivel": 1-4,\n      "evidencias_ancladas": ["evidencia 1 del texto", "evidencia 2"],\n      "evidencias_vagas": ["evidencia X sin anclaje"],\n      "explica_como_sustentan": true/false\n    },\n    "manejo_contraargumento": {\n      "nivel": 1-4,\n      "contraargumento_relevante": true/false,\n      "es_hombre_de_paja": true/false,\n      "refutacion_solida": true/false\n    }\n  },\n  "fortalezas_estructurales": ["fortaleza 1", "fortaleza 2"],\n  "mejoras_estructura": ["mejora 1", "mejora 2"]\n}`}(e,a,t,n,i);try{const e=await(0,c.x8)({provider:"deepseek",model:u,messages:[{role:"user",content:r}],temperature:.2,max_tokens:1500,response_format:{type:"json_object"},timeoutMs:3e4}),a=(0,c.HQ)(e);console.log("\ud83d\udd0d [DeepSeek RespuestaArgumentativa] Respuesta cruda:",a.slice(0,200));const t=p(a);console.log("\u2705 [DeepSeek RespuestaArgumentativa] Respuesta limpia:",t.slice(0,200));const n=JSON.parse(t);if(!n.criterios_evaluados)throw new Error("Respuesta sin criterios_evaluados");return n}catch(o){return console.error("\u274c Error en evaluaci\xf3n DeepSeek (RespuestaArgumentativa):",o),{criterios_evaluados:{solidez_tesis:{nivel:3,tesis_clara:!0,defendible:!0},uso_evidencia:{nivel:3,evidencias_textuales:[],explicacion_nexo:!0},manejo_contraargumento:{nivel:3,contraargumento_valido:!0,refutacion_solida:!0}},fortalezas_estructurales:["An\xe1lisis en proceso"],mejoras_argumentativas:["Error en evaluaci\xf3n autom\xe1tica"],_error:o.message}}}(a,t,n,i,r);console.log("\ud83e\udde0 Evaluando profundidad dial\xf3gica (OpenAI)...");const s=await h(a,t,n,i,r,e);console.log("\ud83d\udd27 Combinando feedback dual...");const l=function(e,a){const t={solidez_tesis:{nivel:e.criterios_evaluados.solidez_tesis.nivel,fortalezas:[],mejoras:[]},uso_evidencia:{nivel:e.criterios_evaluados.uso_evidencia.nivel,fortalezas:[],mejoras:[]},manejo_contraargumento:{nivel:e.criterios_evaluados.manejo_contraargumento.nivel,fortalezas:[],mejoras:[]}};a.profundidad_dialogica.solidez_tesis.demuestra_pensamiento_original?t.solidez_tesis.fortalezas.push("Demuestra pensamiento cr\xedtico original"):t.solidez_tesis.mejoras.push("Intenta formular una tesis m\xe1s original que vaya m\xe1s all\xe1 de lo obvio"),a.profundidad_dialogica.solidez_tesis.es_matizada?t.solidez_tesis.fortalezas.push("Tesis matizada que reconoce complejidad"):t.solidez_tesis.mejoras.push("Matiza tu tesis reconociendo limitaciones o casos excepcionales"),a.profundidad_dialogica.uso_evidencia.integra_evidencia_estrategicamente?t.uso_evidencia.fortalezas.push("Integra evidencia de forma estrat\xe9gica"):t.uso_evidencia.mejoras.push("Usa la evidencia estrat\xe9gicamente: selecciona las m\xe1s fuertes y explica por qu\xe9 son cruciales"),a.profundidad_dialogica.manejo_contraargumento.reconoce_validez_parcial?t.manejo_contraargumento.fortalezas.push("Reconoce validez parcial del contraargumento antes de refutarlo"):t.manejo_contraargumento.mejoras.push("Reconoce qu\xe9 hay de v\xe1lido en el contraargumento antes de refutarlo (esto fortalece tu refutaci\xf3n)"),a.profundidad_dialogica.manejo_contraargumento.refuta_sin_simplificar?t.manejo_contraargumento.fortalezas.push("Refuta sin simplificar excesivamente la postura opuesta"):t.manejo_contraargumento.mejoras.push("Evita caricaturizar la postura opuesta: presenta su versi\xf3n m\xe1s fuerte antes de refutarla"),e.fortalezas_estructurales.forEach((e=>{const a=v(e);a&&t[a]&&t[a].fortalezas.push(e)})),e.mejoras_estructura.forEach((e=>{const a=v(e);a&&t[a]&&t[a].mejoras.push(e)})),a.fortalezas_dialogicas.forEach((e=>t.solidez_tesis.fortalezas.push(e))),a.oportunidades_profundizacion.forEach((e=>t.solidez_tesis.mejoras.push(e)));const n=(t.solidez_tesis.nivel+t.uso_evidencia.nivel+t.manejo_contraargumento.nivel)/3,i=Math.min(4,Math.round(n+.3*(a.nivel_pensamiento_critico-n)));return{dimension:g,nivel_global:i,criterios:t,evidencias_deepseek:e.criterios_evaluados,profundidad_openai:a.profundidad_dialogica,fuentes:["DeepSeek (estructura argumentativa)","OpenAI (profundidad dial\xf3gica)"]}}(e,s),m=(0,d.getDimension)(g),f=(0,d.scoreToLevelDescriptor)(g,l.nivel_global),x={...l,dimension_label:(null===m||void 0===m?void 0:m.nombre)||"Argumentaci\xf3n y Contraargumento",dimension_description:(null===m||void 0===m?void 0:m.descripcion)||"",nivel_descriptor:f.descriptor,duracion_ms:Date.now()-o};return console.log(`\u2705 Evaluaci\xf3n completada en ${x.duracion_ms}ms`),console.log(`\ud83d\udcca Nivel global: ${l.nivel_global}/4`),x}catch(s){throw console.error("\u274c Error en evaluaci\xf3n dual de RespuestaArgumentativa:",s),s}}var x=t(5361),b=t(7525),_=t(539),j=t(4414);const y=i.Ay.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
`,A=i.Ay.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: 12px;
  color: white;
`,E=i.Ay.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`,$=i.Ay.p`
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.5;
`,z=(0,i.Ay)(r.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,S=i.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`,w=i.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
`,R=i.Ay.span`
  transition: transform 0.3s ease;
  transform: ${e=>e.$expanded?"rotate(180deg)":"rotate(0deg)"};
`,k=(0,i.Ay)(r.P.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
`,C=i.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,T=i.Ay.li`
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.5;

  &::before {
    content: '💡';
    position: absolute;
    left: 0;
  }
`,I=i.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,N=i.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,O=i.Ay.label`
  display: block;
  color: ${e=>e.theme.text};
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`,D=i.Ay.textarea`
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 1px solid ${e=>e.theme.border};
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  color: ${e=>e.theme.text};
  background: ${e=>e.theme.background};
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }

  &::placeholder {
    color: ${e=>e.theme.textMuted};
    opacity: 0.6;
  }
`,M=i.Ay.p`
  margin: 0.5rem 0 0 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
`,P=(0,i.Ay)(r.P.div)`
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  background: ${e=>e.$valid?"#dcfce7":"#fee2e2"};
  border: 1px solid ${e=>e.$valid?"#86efac":"#fca5a5"};
  color: ${e=>e.$valid?"#166534":"#991b1b"};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,L=i.Ay.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
`,U=i.Ay.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,G=(0,i.Ay)(U)`
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }
`,q=((0,i.Ay)(U)`
  background: ${e=>e.theme.surface};
  color: ${e=>e.theme.text};
  border: 1px solid ${e=>e.theme.border};

  &:hover:not(:disabled) {
    background: ${e=>e.theme.border};
  }
`,(0,i.Ay)(r.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`),F=i.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`,V=i.Ay.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${e=>{switch(e.$nivel){case 1:return"#fee2e2";case 2:return"#fed7aa";case 3:return"#dcfce7";case 4:return"#e9d5ff";default:return"#f3f4f6"}}};
  color: ${e=>{switch(e.$nivel){case 1:return"#991b1b";case 2:return"#c2410c";case 3:return"#166534";case 4:return"#6b21a8";default:return"#374151"}}};
  font-weight: 700;
  font-size: 1rem;
`,B=i.Ay.p`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`,H=i.Ay.div`
  display: grid;
  gap: 1.5rem;
`,J=i.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
`,X=i.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`,K=i.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  font-size: 0.95rem;
`,Y=i.Ay.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${e=>{switch(e.$nivel){case 1:return"#fee2e2";case 2:return"#fed7aa";case 3:return"#dcfce7";case 4:return"#e9d5ff";default:return"#f3f4f6"}}};
  color: ${e=>{switch(e.$nivel){case 1:return"#991b1b";case 2:return"#c2410c";case 3:return"#166534";case 4:return"#6b21a8";default:return"#374151"}}};
`,Q=i.Ay.div`
  margin-top: 0.75rem;
`,Z=i.Ay.p`
  margin: 0 0 0.5rem 0;
  color: ${e=>e.theme.text};
  font-weight: 600;
  font-size: 0.85rem;
`,W=i.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,ee=i.Ay.li`
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  padding-left: 1.25rem;
  position: relative;
  line-height: 1.4;

  &::before {
    content: '${e=>e.$icon||"\u2022"}';
    position: absolute;
    left: 0;
  }
`,ae=(0,i.Ay)(r.P.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
`,te=(0,i.Ay)(r.P.div)`
  font-size: 3rem;
`,ne=i.Ay.p`
  color: ${e=>e.theme.textMuted};
  font-size: 0.95rem;
  margin: 0;
`,ie=i.Ay.button`
  padding: 0.75rem 1.25rem;
  background: ${e=>e.$active?e.theme.warning:e.theme.cardBg};
  color: ${e=>e.$active?"#fff":e.theme.textPrimary};
  border: 2px solid ${e=>e.$active?e.theme.warning:e.theme.border};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  flex-shrink: 0;
  
  ${e=>e.$hasNotification&&!e.$active&&`\n    &:after {\n      content: '';\n      position: absolute;\n      top: -6px;\n      right: -6px;\n      width: 12px;\n      height: 12px;\n      background: ${e.theme.success};\n      border: 2px solid ${e.theme.cardBg};\n      border-radius: 50%;\n      animation: pulse 2s ease-in-out infinite;\n    }\n    \n    @keyframes pulse {\n      0%, 100% {\n        transform: scale(1);\n        opacity: 1;\n      }\n      50% {\n        transform: scale(1.1);\n        opacity: 0.8;\n      }\n    }\n  `}
  
  &:hover {
    background: ${e=>e.$active?e.theme.warningHover:e.theme.hoverBg};
    border-color: ${e=>e.theme.warning};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,re=i.Ay.div`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  max-width: 90vw;
  background: ${e=>e.theme.surface};
  border-left: 2px solid ${e=>e.theme.border};
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`,oe=i.Ay.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    font-size: 1.2rem;
    margin: 0;
  }
`,se=i.Ay.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${e=>e.theme.surface};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${e=>e.theme.border};
    border-radius: 4px;
  }
`,le=i.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`,ce=i.Ay.p`
  margin: 0 0 0.75rem 0;
  color: ${e=>e.theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
  font-style: italic;
  padding: 0.5rem;
  background: ${e=>e.theme.surface};
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
`,de=i.Ay.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`,ue=i.Ay.span`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
  margin-right: auto;
`,me=i.Ay.button`
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  }
  
  &:active {
    transform: scale(0.98);
  }
`,ge=i.Ay.button`
  background: ${e=>e.theme.error};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  }
  
  &:active {
    transform: scale(0.95);
  }
`,pe=i.Ay.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${e=>e.theme.textMuted};
  line-height: 1.6;
  
  p {
    margin: 0.5rem 0;
  }
  
  ol {
    margin: 1rem auto;
    padding-left: 1.5rem;
    max-width: 250px;
  }
`,he=(0,i.Ay)(r.P.div)`
  background: ${e=>e.theme.error}15;
  border: 2px solid ${e=>e.theme.error};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin: 0.75rem 0;
  color: ${e=>e.theme.error};
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: shake 0.5s ease;
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`,ve=(0,i.Ay)(r.P.div)`
  background: ${e=>e.theme.success}15;
  border: 1px solid ${e=>e.theme.success};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  color: ${e=>e.theme.success};
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;function fe(e){var a,t,i,c,u,m,g,p;let{theme:h}=e;const{texto:v,completeAnalysis:U,setError:fe,updateRubricScore:xe,getCitations:be,deleteCitation:_e}=(0,n.useContext)(s.BR),je=(0,l.useRewards)(),[ye,Ae]=(0,n.useState)((()=>sessionStorage.getItem("respuestaArgumentativa_tesis")||"")),[Ee,$e]=(0,n.useState)((()=>sessionStorage.getItem("respuestaArgumentativa_evidencias")||"")),[ze,Se]=(0,n.useState)((()=>sessionStorage.getItem("respuestaArgumentativa_contraargumento")||"")),[we,Re]=(0,n.useState)((()=>sessionStorage.getItem("respuestaArgumentativa_refutacion")||"")),[ke,Ce]=(0,n.useState)(null),[Te,Ie]=(0,n.useState)(!1),[Ne,Oe]=(0,n.useState)(null),[De,Me]=(0,n.useState)(!0),[Pe,Le]=(0,n.useState)(!1),[Ue,Ge]=(0,n.useState)(null),qe=n.useRef(null),Fe=n.useRef(null),Ve=n.useRef(null),Be=n.useRef(null),[He,Je]=n.useState({tesis:0,evidencias:0,contraargumento:0,refutacion:0}),Xe=(0,n.useMemo)((()=>ye.trim().length>=20&&Ee.trim().length>=30&&ze.trim().length>=20&&we.trim().length>=30),[ye,Ee,ze,we]),Ke=(0,n.useMemo)((()=>ye.trim()?ye.trim().length<20?"\u26a0\ufe0f Desarrolla tu tesis con m\xe1s claridad (m\xedn. 20 caracteres)":Ee.trim()?Ee.trim().length<30?"\u26a0\ufe0f Desarrolla las evidencias (m\xedn. 30 caracteres)":ze.trim()?ze.trim().length<20?"\u26a0\ufe0f Desarrolla el contraargumento (m\xedn. 20 caracteres)":we.trim()?we.trim().length<30?"\u26a0\ufe0f Desarrolla la refutaci\xf3n (m\xedn. 30 caracteres)":"\u2705 Argumento completo. Solicita evaluaci\xf3n criterial.":"\u26a0\ufe0f Refuta el contraargumento defendiendo tu postura":"\u26a0\ufe0f Presenta una objeci\xf3n v\xe1lida a tu tesis":"\u26a0\ufe0f Presenta evidencias del texto que sustenten tu tesis":"\u26a0\ufe0f Formula tu tesis (postura clara sobre el texto)"),[ye,Ee,ze,we]);(0,n.useEffect)((()=>{ye&&sessionStorage.setItem("respuestaArgumentativa_tesis",ye)}),[ye]),(0,n.useEffect)((()=>{Ee&&sessionStorage.setItem("respuestaArgumentativa_evidencias",Ee)}),[Ee]),(0,n.useEffect)((()=>{ze&&sessionStorage.setItem("respuestaArgumentativa_contraargumento",ze)}),[ze]),(0,n.useEffect)((()=>{we&&sessionStorage.setItem("respuestaArgumentativa_refutacion",we)}),[we]),(0,n.useEffect)((()=>{const e=()=>{const e=sessionStorage.getItem("respuestaArgumentativa_tesis")||"",a=sessionStorage.getItem("respuestaArgumentativa_evidencias")||"",t=sessionStorage.getItem("respuestaArgumentativa_contraargumento")||"",n=sessionStorage.getItem("respuestaArgumentativa_refutacion")||"";e!==ye&&Ae(e),a!==Ee&&$e(a),t!==ze&&Se(t),n!==we&&Re(n),(e||a||t||n)&&console.log("\ud83d\udd04 [RespuestaArgumentativa] Borradores restaurados desde sesi\xf3n")};return window.addEventListener("session-restored",e),()=>window.removeEventListener("session-restored",e)}),[ye,Ee,ze,we]);const Ye=(null===U||void 0===U||null===(a=U.metadata)||void 0===a?void 0:a.document_id)||null,Qe=`respuesta_argumentativa_${Ye}`;(0,x.Ay)(Qe,{enabled:null!==Ye,studentAnswers:{tesis:ye,evidencias:Ee,contraargumento:ze,refutacion:we},aiFeedbacks:{respuesta_argumentativa:ke},onRehydrate:e=>{var a,t,n,i,r;null!==(a=e.student_answers)&&void 0!==a&&a.tesis&&Ae(e.student_answers.tesis),null!==(t=e.student_answers)&&void 0!==t&&t.evidencias&&$e(e.student_answers.evidencias),null!==(n=e.student_answers)&&void 0!==n&&n.contraargumento&&Se(e.student_answers.contraargumento),null!==(i=e.student_answers)&&void 0!==i&&i.refutacion&&Re(e.student_answers.refutacion),null!==(r=e.ai_feedbacks)&&void 0!==r&&r.respuesta_argumentativa&&Ce(e.ai_feedbacks.respuesta_argumentativa)}});const Ze=(0,n.useMemo)((()=>(0,d.getDimension)("argumentacion")),[]),We=(0,n.useMemo)((()=>Ye?be(Ye):[]),[Ye,be]),ea=(0,n.useCallback)(((e,a)=>{const t=`"${e}" `,n={tesis:qe,evidencias:Fe,contraargumento:Ve,refutacion:Be}[a],i={tesis:Ae,evidencias:$e,contraargumento:Se,refutacion:Re}[a];if(n&&n.current&&i){const e=n.current,r=e.selectionStart||He[a]||0,o=e.selectionEnd||He[a]||0;i((a=>{const n=a.substring(0,r),i=a.substring(o),s=n+t+i;return setTimeout((()=>{if(e){const a=r+t.length;e.focus(),e.setSelectionRange(a,a)}}),0),s}))}Le(!1)}),[He]),aa=(0,n.useCallback)(((e,a)=>{const t=a.target.selectionStart;Je((a=>({...a,[e]:t})))}),[]),ta=(0,n.useCallback)((e=>{Ye&&_e(Ye,e)}),[Ye,_e]),na=(0,n.useCallback)((e=>{e.preventDefault();const a=e.clipboardData.getData("text"),t=a.trim().split(/\s+/).filter((e=>e.length>0)).length;t<=40?document.execCommand("insertText",!1,a):(Ge(`\u26a0\ufe0f Solo puedes pegar hasta 40 palabras (intentaste pegar ${t}). Escribe con tus propias palabras o usa citas guardadas.`),setTimeout((()=>Ge(null)),5e3))}),[]),ia=(0,n.useCallback)((async()=>{if(!Xe||!v)return;Ie(!0),fe(null),Oe({label:"Iniciando an\xe1lisis argumentativo...",icon:"\ud83d\udd0d",duration:2});const e=[setTimeout((()=>Oe({label:"Analizando estructura de la tesis...",icon:"\ud83d\udca1",duration:5})),1e3),setTimeout((()=>Oe({label:"Evaluando con DeepSeek...",icon:"\ud83e\udd16",duration:12})),3500),setTimeout((()=>Oe({label:"Evaluando con OpenAI...",icon:"\ud83e\udde0",duration:12})),15500),setTimeout((()=>Oe({label:"Combinando feedback...",icon:"\ud83d\udd27",duration:4})),27500)];try{const a=await f({text:v,tesis:ye,evidencias:Ee,contraargumento:ze,refutacion:we});e.forEach(clearTimeout),Ce(a),xe("rubrica4",{score:2.5*a.nivel_global,nivel:a.nivel_global,artefacto:"RespuestaArgumentativa",criterios:a.criterios}),je&&(je.recordEvent("EVALUATION_SUBMITTED",{artefacto:"RespuestaArgumentativa",rubricId:"rubrica4"}),je.recordEvent(`EVALUATION_LEVEL_${a.nivel_global}`,{score:2.5*a.nivel_global,nivel:a.nivel_global,artefacto:"RespuestaArgumentativa"}),ye.length>100&&je.recordEvent("CRITICAL_THESIS_DEVELOPED",{length:ye.length,artefacto:"RespuestaArgumentativa"}),ze.length>80&&je.recordEvent("COUNTERARGUMENT_ANTICIPATED",{length:ze.length,artefacto:"RespuestaArgumentativa"}),we.length>80&&je.recordEvent("REFUTATION_ELABORATED",{length:we.length,artefacto:"RespuestaArgumentativa"}),4===a.nivel_global&&je.recordEvent("PERFECT_SCORE",{score:10,artefacto:"RespuestaArgumentativa"}),console.log("\ud83c\udfae [RespuestaArgumentativa] Recompensas registradas"))}catch(a){console.error("Error evaluando Respuesta Argumentativa:",a),fe(a.message||"Error al evaluar el argumento"),e.forEach(clearTimeout)}finally{Ie(!1),Oe(null)}}),[Xe,v,ye,Ee,ze,we,fe]);return v?(0,j.jsxs)(y,{children:[(0,j.jsxs)(A,{children:[(0,j.jsx)(E,{children:"\ud83d\udcad Respuesta Argumentativa"}),(0,j.jsx)($,{children:"Construye una postura fundamentada sobre el texto, presenta evidencias, anticipa objeciones y ref\xfatalas. Recibir\xe1s evaluaci\xf3n criterial basada en la R\xfabrica 4 de Literacidad Cr\xedtica."})]}),(0,j.jsx)(o.N,{children:Pe&&(0,j.jsxs)(re,{as:r.P.div,initial:{opacity:0,x:300},animate:{opacity:1,x:0},exit:{opacity:0,x:300},transition:{type:"spring",damping:25},theme:h,children:[(0,j.jsxs)(oe,{theme:h,children:[(0,j.jsx)("h3",{style:{margin:0},children:"\ud83d\udccb Mis Citas Guardadas"}),(0,j.jsx)("p",{style:{fontSize:"0.85rem",margin:"0.5rem 0 0 0",opacity:.8},children:0===We.length?'Selecciona texto en "Lectura Guiada" y guarda citas':"Selecciona el campo y haz clic en el bot\xf3n correspondiente"})]}),(0,j.jsx)(se,{children:0===We.length?(0,j.jsxs)(pe,{theme:h,children:[(0,j.jsx)("div",{style:{fontSize:"3rem",marginBottom:"1rem"},children:"\ud83d\udca1"}),(0,j.jsx)("p",{children:(0,j.jsx)("strong",{children:"\xbfC\xf3mo guardar citas?"})}),(0,j.jsxs)("ol",{style:{textAlign:"left",lineHeight:1.6},children:[(0,j.jsx)("li",{children:'Ve a "Lectura Guiada"'}),(0,j.jsx)("li",{children:"Selecciona texto importante"}),(0,j.jsx)("li",{children:'Clic en "\ud83d\udcbe Guardar Cita"'}),(0,j.jsx)("li",{children:"Regresa aqu\xed para usar"})]})]}):We.map((e=>(0,j.jsxs)(le,{theme:h,children:[(0,j.jsx)(ce,{theme:h,children:e.texto}),(0,j.jsxs)(de,{children:[(0,j.jsx)(ue,{theme:h,children:new Date(e.timestamp).toLocaleDateString("es-ES",{month:"short",day:"numeric"})}),(0,j.jsxs)("div",{style:{display:"flex",gap:"0.5rem",flexWrap:"wrap"},children:[(0,j.jsx)(me,{onClick:()=>ea(e.texto,"tesis"),theme:h,children:"Tesis"}),(0,j.jsx)(me,{onClick:()=>ea(e.texto,"evidencias"),theme:h,children:"Evidencias"}),(0,j.jsx)(me,{onClick:()=>ea(e.texto,"contraargumento"),theme:h,children:"Contra"}),(0,j.jsx)(me,{onClick:()=>ea(e.texto,"refutacion"),theme:h,children:"Refutaci\xf3n"}),(0,j.jsx)(ge,{onClick:()=>ta(e.id),theme:h,children:"\ud83d\uddd1\ufe0f"})]})]})]},e.id)))})]})}),(0,j.jsxs)(z,{theme:h,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},children:[(0,j.jsxs)(S,{onClick:()=>Me(!De),children:[(0,j.jsx)(w,{theme:h,children:"\ud83d\udca1 Preguntas Gu\xeda"}),(0,j.jsx)(R,{$expanded:De,children:"\u25bc"})]}),(0,j.jsx)(o.N,{children:De&&(0,j.jsx)(k,{theme:h,initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},children:(0,j.jsx)(C,{children:null===Ze||void 0===Ze||null===(t=Ze.preguntasGuia)||void 0===t?void 0:t.map(((e,a)=>(0,j.jsx)(T,{theme:h,children:e},a)))})})})]}),!ke&&(0,j.jsxs)(j.Fragment,{children:[(ye||Ee||ze||we)&&(0,j.jsx)(ve,{theme:h,children:"\ud83d\udcbe Tu trabajo se guarda autom\xe1ticamente. No perder\xe1s nada al cambiar de pesta\xf1a."}),(0,j.jsxs)(I,{theme:h,children:[(0,j.jsx)(N,{theme:h,children:"1\ufe0f\u20e3 Tu Tesis (Postura Fundamentada)"}),(0,j.jsx)(O,{theme:h,children:"\xbfCu\xe1l es tu postura sobre el texto?"}),(0,j.jsx)(D,{ref:qe,theme:h,value:ye,onChange:e=>Ae(e.target.value),onClick:e=>aa("tesis",e),onKeyUp:e=>aa("tesis",e),onPaste:na,placeholder:"Ej: Sostengo que el texto naturaliza la l\xf3gica neoliberal al presentar la competencia como \xfanica forma leg\xedtima de organizaci\xf3n social, excluyendo alternativas cooperativas del debate p\xfablico.",disabled:Te}),Ue&&(0,j.jsx)(he,{theme:h,children:Ue}),(0,j.jsx)(M,{theme:h,children:"Formula una tesis clara, espec\xedfica y defendible (no una obviedad ni algo imposible de sostener)"})]}),(0,j.jsxs)(I,{theme:h,children:[(0,j.jsx)(N,{theme:h,children:"2\ufe0f\u20e3 Evidencias del Texto"}),(0,j.jsx)(O,{theme:h,children:"\xbfQu\xe9 evidencias del texto sustentan tu tesis?"}),(0,j.jsx)(D,{ref:Fe,theme:h,value:Ee,onChange:e=>$e(e.target.value),onClick:e=>aa("evidencias",e),onKeyUp:e=>aa("evidencias",e),onPaste:na,placeholder:'Ej: En el p\xe1rrafo 3, el autor afirma que "la competencia es ley natural", naturalizando as\xed un modelo econ\xf3mico hist\xf3rico como inevitable. Adem\xe1s, al usar met\xe1foras deportivas ("ganar/perder") en el p\xe1rrafo 5, refuerza una visi\xf3n individualista donde solo hay ganadores y perdedores, omitiendo modelos de econom\xeda solidaria documentados en...',disabled:Te,style:{minHeight:"150px"}}),(0,j.jsx)(M,{theme:h,children:"Ancla tus evidencias en citas textuales y explica C\xd3MO sustentan tu tesis"})]}),(0,j.jsxs)(I,{children:[(0,j.jsx)(O,{theme:h,children:"3\ufe0f\u20e3 Contraargumento (al menos 20 caracteres)"}),(0,j.jsx)(D,{ref:Ve,theme:h,value:ze,onChange:e=>Se(e.target.value),onClick:e=>aa("contraargumento",e),onKeyUp:e=>aa("contraargumento",e),onPaste:na,placeholder:"Ej: Se podr\xeda objetar que la competencia ha demostrado hist\xf3ricamente generar innovaci\xf3n tecnol\xf3gica y mejora de productos, como evidencia el desarrollo industrial de los \xfaltimos dos siglos.",disabled:Te,style:{minHeight:"120px"}}),(0,j.jsx)(M,{theme:h,children:"Presenta el contraargumento M\xc1S FUERTE, no una versi\xf3n d\xe9bil o caricaturizada"})]}),(0,j.jsxs)(I,{children:[(0,j.jsx)(O,{theme:h,children:"4\ufe0f\u20e3 Refutaci\xf3n (al menos 30 caracteres)"}),(0,j.jsx)(D,{ref:Be,theme:h,value:we,onChange:e=>Re(e.target.value),onClick:e=>aa("refutacion",e),onKeyUp:e=>aa("refutacion",e),onPaste:na,placeholder:"Ej: Si bien es cierto que la competencia puede generar innovaci\xf3n, esta l\xf3gica ignora los costos sociales (precarizaci\xf3n laboral, desigualdad extrema) y excluye del an\xe1lisis modelos donde la cooperaci\xf3n tambi\xe9n produjo innovaci\xf3n significativa, como el software libre, las cooperativas de Mondrag\xf3n, o la econom\xeda social y solidaria en Am\xe9rica Latina.",disabled:Te,style:{minHeight:"150px"}}),(0,j.jsx)(M,{theme:h,children:"Reconoce lo v\xe1lido del contraargumento, pero muestra sus limitaciones o aspectos que ignora"})]}),(0,j.jsx)(P,{$valid:Xe,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},children:Ke}),(0,j.jsxs)(L,{children:[(0,j.jsx)(ie,{onClick:()=>Le(!Pe),theme:h,$active:Pe,title:"Ver mis citas guardadas del texto",$hasNotification:We.length>0,children:Pe?"\u2715 Cerrar Citas":`\ud83d\udccb Mis Citas (${We.length})`}),(0,j.jsx)(G,{onClick:ia,disabled:!Xe||Te,children:Te?"\u23f3 Evaluando...":"\ud83d\udcad Solicitar Evaluaci\xf3n Criterial"})]})]}),Te&&(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(_.A,{theme:h,isEvaluating:Te,currentStep:Ne}),(0,j.jsxs)(ae,{children:[(0,j.jsx)(te,{animate:{rotate:360},transition:{duration:2,repeat:1/0,ease:"linear"},children:"\ud83d\udd04"}),(0,j.jsx)(ne,{theme:h,children:"Evaluando con estrategia dual (DeepSeek + OpenAI)..."})]})]}),(0,j.jsx)(o.N,{children:ke&&!Te&&(0,j.jsxs)(q,{theme:h,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},children:[(0,j.jsx)(F,{children:(0,j.jsxs)("div",{children:[(0,j.jsx)("h3",{style:{margin:"0 0 0.5rem 0",color:h.text},children:"\ud83d\udcca Evaluaci\xf3n Criterial"}),(0,j.jsxs)(V,{$nivel:ke.nivel_global,children:["Nivel ",ke.nivel_global,"/4"]})]})}),(0,j.jsxs)(B,{theme:h,children:[(0,j.jsxs)("strong",{children:[ke.dimension_label,":"]})," ",ke.dimension_description]}),(0,j.jsxs)(H,{children:[(0,j.jsxs)(J,{theme:h,children:[(0,j.jsxs)(X,{children:[(0,j.jsx)(K,{theme:h,children:"Solidez de la Tesis"}),(0,j.jsxs)(Y,{$nivel:ke.criterios.solidez_tesis.nivel,children:["Nivel ",ke.criterios.solidez_tesis.nivel,"/4"]})]}),(null===(i=ke.criterios.solidez_tesis.fortalezas)||void 0===i?void 0:i.length)>0&&(0,j.jsxs)(Q,{children:[(0,j.jsx)(Z,{theme:h,children:"\u2705 Fortalezas:"}),(0,j.jsx)(W,{children:ke.criterios.solidez_tesis.fortalezas.map(((e,a)=>(0,j.jsx)(ee,{theme:h,$icon:"\u2713",children:(0,b.Gc)(e)},a)))})]}),(null===(c=ke.criterios.solidez_tesis.mejoras)||void 0===c?void 0:c.length)>0&&(0,j.jsxs)(Q,{children:[(0,j.jsx)(Z,{theme:h,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,j.jsx)(W,{children:ke.criterios.solidez_tesis.mejoras.map(((e,a)=>(0,j.jsx)(ee,{theme:h,$icon:"\u2192",children:(0,b.Gc)(e)},a)))})]})]}),(0,j.jsxs)(J,{theme:h,children:[(0,j.jsxs)(X,{children:[(0,j.jsx)(K,{theme:h,children:"Uso de Evidencia"}),(0,j.jsxs)(Y,{$nivel:ke.criterios.uso_evidencia.nivel,children:["Nivel ",ke.criterios.uso_evidencia.nivel,"/4"]})]}),(null===(u=ke.criterios.uso_evidencia.fortalezas)||void 0===u?void 0:u.length)>0&&(0,j.jsxs)(Q,{children:[(0,j.jsx)(Z,{theme:h,children:"\u2705 Fortalezas:"}),(0,j.jsx)(W,{children:ke.criterios.uso_evidencia.fortalezas.map(((e,a)=>(0,j.jsx)(ee,{theme:h,$icon:"\u2713",children:(0,b.Gc)(e)},a)))})]}),(null===(m=ke.criterios.uso_evidencia.mejoras)||void 0===m?void 0:m.length)>0&&(0,j.jsxs)(Q,{children:[(0,j.jsx)(Z,{theme:h,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,j.jsx)(W,{children:ke.criterios.uso_evidencia.mejoras.map(((e,a)=>(0,j.jsx)(ee,{theme:h,$icon:"\u2192",children:(0,b.Gc)(e)},a)))})]})]}),(0,j.jsxs)(J,{theme:h,children:[(0,j.jsxs)(X,{children:[(0,j.jsx)(K,{theme:h,children:"Manejo del Contraargumento"}),(0,j.jsxs)(Y,{$nivel:ke.criterios.manejo_contraargumento.nivel,children:["Nivel ",ke.criterios.manejo_contraargumento.nivel,"/4"]})]}),(null===(g=ke.criterios.manejo_contraargumento.fortalezas)||void 0===g?void 0:g.length)>0&&(0,j.jsxs)(Q,{children:[(0,j.jsx)(Z,{theme:h,children:"\u2705 Fortalezas:"}),(0,j.jsx)(W,{children:ke.criterios.manejo_contraargumento.fortalezas.map(((e,a)=>(0,j.jsx)(ee,{theme:h,$icon:"\u2713",children:(0,b.Gc)(e)},a)))})]}),(null===(p=ke.criterios.manejo_contraargumento.mejoras)||void 0===p?void 0:p.length)>0&&(0,j.jsxs)(Q,{children:[(0,j.jsx)(Z,{theme:h,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,j.jsx)(W,{children:ke.criterios.manejo_contraargumento.mejoras.map(((e,a)=>(0,j.jsx)(ee,{theme:h,$icon:"\u2192",children:(0,b.Gc)(e)},a)))})]})]})]})]})})]}):(0,j.jsx)(y,{children:(0,j.jsxs)(A,{children:[(0,j.jsx)(E,{children:"\ud83d\udcad Respuesta Argumentativa"}),(0,j.jsx)($,{children:"Carga un texto para comenzar"})]})})}}}]);