"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[465],{6465:(e,o,n)=>{n.r(o),n.d(o,{default:()=>fe});var i=n(9950),t=n(4752),s=n(1132),a=n(3291),r=n(387),c=n(7424),l=n(6735),d=n(8864);const m="deepseek-chat",u="gpt-4o-mini",p="contextualizacion";function h(e){let o=e.trim();o=o.replace(/```json\s*/g,""),o=o.replace(/```\s*/g,"");const n=o.match(/\{[\s\S]*\}/);return n&&(o=n[0]),o}async function x(e,o,n,i,t,s){const a=function(e,o,n,i,t,s){return`Eres un evaluador experto en an\xe1lisis socio-hist\xf3rico cr\xedtico.\n\nTEXTO ORIGINAL:\n"""\n${e.slice(0,3e3)}\n"""\n\nAN\xc1LISIS DEL ESTUDIANTE:\n\nActores: ${o}\nContexto: ${t}\nConexiones: ${n}\nConsecuencias: ${i}\n\nEVALUACI\xd3N CONTEXTUAL PREVIA (DeepSeek):\n${JSON.stringify(s,null,2)}\n\n---\n\nTAREA: Eval\xfaa la PROFUNDIDAD SOCIO-HIST\xd3RICA del an\xe1lisis. No repitas la evaluaci\xf3n contextual.\n\nEnf\xf3cate en:\n\n1. **Complejidad del An\xe1lisis**: \xbfConecta con procesos sociales amplios (globalizaci\xf3n, neoliberalismo, colonialismo, etc.)?\n2. **Din\xe1micas de Poder**: \xbfAnaliza relaciones de dominaci\xf3n, resistencia, hegemon\xeda?\n3. **Tensiones Hist\xf3rico-Culturales**: \xbfIdentifica conflictos estructurales, no solo eventos aislados?\n\nEjemplos de an\xe1lisis SUPERFICIAL vs PROFUNDO:\n\nSUPERFICIAL: "Los actores son empresas y trabajadores."\nPROFUNDO: "Empresas transnacionales ejercen poder estructural sobre trabajadores precarizados, en contexto de desregulaci\xf3n neoliberal post-1990."\n\nSUPERFICIAL: "Consecuencia: m\xe1s desempleo."\nPROFUNDO: "Consecuencia: fragmentaci\xf3n de identidades colectivas obreras, debilitando resistencia sindical y naturalizando individualismo competitivo."\n\nIMPORTANTE: Responde SOLO con JSON v\xe1lido.\n\nFormato de respuesta JSON:\n{\n  "profundidad_sociopolitica": {\n    "actores_contexto": {\n      "conecta_procesos_amplios": true/false,\n      "analiza_estructuras": true/false,\n      "comentario": "Breve an\xe1lisis"\n    },\n    "conexiones_intereses": {\n      "analiza_dinamicas_poder": true/false,\n      "identifica_hegemonias": true/false,\n      "comentario": "Breve an\xe1lisis"\n    },\n    "impacto_consecuencias": {\n      "distingue_corto_largo_plazo": true/false,\n      "analiza_dinamicas_sociales": true/false,\n      "comentario": "Breve an\xe1lisis"\n    }\n  },\n  "fortalezas_profundidad": ["insight 1", "insight 2"],\n  "oportunidades_profundizacion": ["sugerencia 1", "sugerencia 2"],\n  "nivel_pensamiento_sociopolitico": 1-4\n}`}(e,o,n,i,t,s);try{const e=await(0,l.x8)({provider:"openai",model:u,messages:[{role:"user",content:a}],temperature:.3,max_tokens:1800,response_format:{type:"json_object"},timeoutMs:45e3}),o=(0,l.HQ)(e);console.log("\ud83d\udd0d [OpenAI MapaActores] Respuesta cruda:",o.slice(0,200));const n=h(o);console.log("\u2705 [OpenAI MapaActores] Respuesta limpia:",n.slice(0,200));const i=JSON.parse(n);if(!i.profundidad_sociopolitica||!i.nivel_pensamiento_sociopolitico)throw new Error("Respuesta sin profundidad_sociopolitica o nivel_pensamiento_sociopolitico");return i}catch(r){return console.error("\u274c Error en evaluaci\xf3n OpenAI (MapaActores):",r),console.error("\ud83d\udcc4 Contenido completo:",(0,l.HQ)(response)),{profundidad_sociopolitica:{actores_contexto:{conecta_procesos_amplios:!0,analiza_estructuras:!0,comentario:"An\xe1lisis b\xe1sico"},conexiones_intereses:{analiza_dinamicas_poder:!0,identifica_hegemonias:!0,comentario:"An\xe1lisis b\xe1sico"},impacto_consecuencias:{distingue_corto_largo_plazo:!0,analiza_dinamicas_sociales:!0,comentario:"An\xe1lisis b\xe1sico"}},fortalezas_profundidad:["An\xe1lisis en proceso"],oportunidades_profundizacion:["Error en evaluaci\xf3n autom\xe1tica"],nivel_pensamiento_sociopolitico:3,_error:r.message}}}function g(e){const o=e.toLowerCase();return o.includes("actor")||o.includes("contexto")?"actores_contexto":o.includes("conexi")||o.includes("inter\xe9s")||o.includes("poder")?"conexiones_intereses":o.includes("consecuencia")||o.includes("impacto")?"impacto_consecuencias":null}async function f(e){let{text:o,actores:n,contextoHistorico:i,conexiones:t,consecuencias:s}=e;console.log("\ud83d\uddfa\ufe0f [MapaActores] Iniciando evaluaci\xf3n dual...");const a=Date.now();try{console.log("\ud83d\udcca Evaluando precisi\xf3n contextual (DeepSeek)...");const e=await async function(e,o,n,i,t){const s=function(e,o,n,i,t){return`Eres un evaluador experto en an\xe1lisis socio-hist\xf3rico de textos.\n\nTEXTO ORIGINAL:\n"""\n${e.slice(0,3e3)}\n"""\n\nAN\xc1LISIS DEL ESTUDIANTE:\n\n1. Actores identificados:\n${o}\n\n2. Contexto hist\xf3rico/social:\n${t}\n\n3. Conexiones e intereses entre actores:\n${n}\n\n4. Consecuencias (impacto real o potencial):\n${i}\n\n---\n\nTAREA: Eval\xfaa la PRECISI\xd3N CONTEXTUAL del an\xe1lisis seg\xfan estos 3 criterios:\n\n**Criterio 1: Actores y Contexto (actores_contexto)**\n- \xbfLos actores identificados son relevantes para el texto?\n- \xbfEl contexto hist\xf3rico/social es preciso?\n- Nivel (1-4): 1=Solo obvios, 2=Principales expl\xedcitos, 3=Principales+secundarios, 4=Red compleja detallada\n\n**Criterio 2: Conexiones e Intereses (conexiones_intereses)**\n- \xbfLas conexiones entre actores son coherentes?\n- \xbfIdentifica intereses subyacentes?\n- Nivel (1-4): 1=Inexistentes/simplistas, 2=Lineales sin intereses, 3=Explica intereses, 4=Analiza poder e influencia\n\n**Criterio 3: Impacto y Consecuencias (impacto_consecuencias)**\n- \xbfLas consecuencias mencionadas son reales o plausibles?\n- \xbfDistingue entre corto y largo plazo?\n- Nivel (1-4): 1=No menciona/especulativo, 2=Generales vagas, 3=Con ejemplos, 4=Corto+largo plazo con din\xe1micas\n\nIMPORTANTE: Responde SOLO con JSON v\xe1lido, sin explicaciones adicionales.\n\nFormato de respuesta JSON:\n{\n  "criterios_evaluados": {\n    "actores_contexto": {\n      "nivel": 1-4,\n      "actores_relevantes": ["actor 1", "actor 2"],\n      "actores_omitidos_criticos": ["actor X"],\n      "contexto_preciso": true/false\n    },\n    "conexiones_intereses": {\n      "nivel": 1-4,\n      "conexiones_correctas": ["conexi\xf3n 1", "conexi\xf3n 2"],\n      "intereses_identificados": ["inter\xe9s A", "inter\xe9s B"]\n    },\n    "impacto_consecuencias": {\n      "nivel": 1-4,\n      "consecuencias_documentadas": ["consecuencia 1"],\n      "consecuencias_especulativas": ["consecuencia X"]\n    }\n  },\n  "fortalezas_contextuales": ["fortaleza 1", "fortaleza 2"],\n  "mejoras_precision": ["mejora 1", "mejora 2"]\n}`}(e,o,n,i,t);try{const e=await(0,l.x8)({provider:"deepseek",model:m,messages:[{role:"user",content:s}],temperature:.2,max_tokens:1500,response_format:{type:"json_object"},timeoutMs:3e4}),o=(0,l.HQ)(e);console.log("\ud83d\udd0d [DeepSeek MapaActores] Respuesta cruda:",o.slice(0,200));const n=h(o);console.log("\u2705 [DeepSeek MapaActores] Respuesta limpia:",n.slice(0,200));const i=JSON.parse(n);if(!i.criterios_evaluados)throw new Error("Respuesta sin criterios_evaluados");return i}catch(a){return console.error("\u274c Error en evaluaci\xf3n DeepSeek (MapaActores):",a),console.error("\ud83d\udcc4 Contenido completo:",(0,l.HQ)(response)),{criterios_evaluados:{actores_contexto:{nivel:3,actores_relevantes:[],actores_omitidos_criticos:[],contexto_preciso:!0},conexiones_intereses:{nivel:3,conexiones_correctas:[],intereses_identificados:[]},impacto_consecuencias:{nivel:3,consecuencias_documentadas:[],consecuencias_especulativas:[]}},fortalezas_contextuales:["An\xe1lisis en proceso"],mejoras_precision:["Error en evaluaci\xf3n autom\xe1tica"],_error:a.message}}}(o,n,t,s,i);console.log("\ud83e\udde0 Evaluando profundidad socio-hist\xf3rica (OpenAI)...");const r=await x(o,n,t,s,i,e);console.log("\ud83d\udd27 Combinando feedback dual...");const c=function(e,o){const n={actores_contexto:{nivel:e.criterios_evaluados.actores_contexto.nivel,fortalezas:[],mejoras:[]},conexiones_intereses:{nivel:e.criterios_evaluados.conexiones_intereses.nivel,fortalezas:[],mejoras:[]},impacto_consecuencias:{nivel:e.criterios_evaluados.impacto_consecuencias.nivel,fortalezas:[],mejoras:[]}};o.profundidad_sociopolitica.actores_contexto.conecta_procesos_amplios?n.actores_contexto.fortalezas.push("Conecta actores con procesos sociales amplios"):n.actores_contexto.mejoras.push("Intenta conectar los actores con procesos hist\xf3ricos m\xe1s amplios (ej. globalizaci\xf3n, neoliberalismo)"),o.profundidad_sociopolitica.conexiones_intereses.analiza_dinamicas_poder?n.conexiones_intereses.fortalezas.push("Analiza din\xe1micas de poder entre actores"):n.conexiones_intereses.mejoras.push("Profundiza en las relaciones de poder: \xbfqui\xe9n domina, qui\xe9n resiste, qui\xe9n legitima?"),o.profundidad_sociopolitica.impacto_consecuencias.distingue_corto_largo_plazo?n.impacto_consecuencias.fortalezas.push("Distingue consecuencias a corto y largo plazo"):n.impacto_consecuencias.mejoras.push("Diferencia entre consecuencias inmediatas y efectos estructurales a largo plazo"),e.fortalezas_contextuales.forEach((e=>{const o=g(e);o&&n[o]&&n[o].fortalezas.push(e)})),e.mejoras_precision.forEach((e=>{const o=g(e);o&&n[o]&&n[o].mejoras.push(e)})),o.fortalezas_profundidad.forEach((e=>n.actores_contexto.fortalezas.push(e))),o.oportunidades_profundizacion.forEach((e=>n.actores_contexto.mejoras.push(e)));const i=(n.actores_contexto.nivel+n.conexiones_intereses.nivel+n.impacto_consecuencias.nivel)/3,t=Math.min(4,Math.round(i+.3*(o.nivel_pensamiento_sociopolitico-i)));return{dimension:p,nivel_global:t,criterios:n,evidencias_deepseek:e.criterios_evaluados,profundidad_openai:o.profundidad_sociopolitica,fuentes:["DeepSeek (precisi\xf3n contextual)","OpenAI (profundidad socio-hist\xf3rica)"]}}(e,r),u=(0,d.getDimension)(p),f=(0,d.scoreToLevelDescriptor)(p,c.nivel_global),b={...c,dimension_label:(null===u||void 0===u?void 0:u.nombre)||"Contextualizaci\xf3n Socio-Hist\xf3rica",dimension_description:(null===u||void 0===u?void 0:u.descripcion)||"",nivel_descriptor:f.descriptor,duracion_ms:Date.now()-a};return console.log(`\u2705 Evaluaci\xf3n completada en ${b.duracion_ms}ms`),console.log(`\ud83d\udcca Nivel global: ${c.nivel_global}/4`),b}catch(r){throw console.error("\u274c Error en evaluaci\xf3n dual de MapaActores:",r),r}}var b=n(5361),v=n(7525),_=n(539),j=n(4414);const y=t.Ay.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
`,A=t.Ay.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  color: white;
`,$=t.Ay.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`,z=t.Ay.p`
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.5;
`,C=(0,t.Ay)(s.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,E=t.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`,S=t.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
`,w=t.Ay.span`
  transition: transform 0.3s ease;
  transform: ${e=>e.$expanded?"rotate(180deg)":"rotate(0deg)"};
`,k=(0,t.Ay)(s.P.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
`,I=t.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,O=t.Ay.li`
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
`,N=t.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,M=t.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,R=t.Ay.label`
  display: block;
  color: ${e=>e.theme.text};
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`,T=t.Ay.textarea`
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
    border-color: #10b981;
  }

  &::placeholder {
    color: ${e=>e.theme.textMuted};
    opacity: 0.6;
  }
`,D=t.Ay.p`
  margin: 0.5rem 0 0 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
`,L=(0,t.Ay)(s.P.div)`
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
`,P=t.Ay.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
`,U=t.Ay.button`
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
`,H=(0,t.Ay)(U)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
`,F=((0,t.Ay)(U)`
  background: ${e=>e.theme.surface};
  color: ${e=>e.theme.text};
  border: 1px solid ${e=>e.theme.border};

  &:hover:not(:disabled) {
    background: ${e=>e.theme.border};
  }
`,(0,t.Ay)(s.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`),G=t.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`,B=t.Ay.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${e=>{switch(e.$nivel){case 1:return"#fee2e2";case 2:return"#fed7aa";case 3:return"#dcfce7";case 4:return"#e9d5ff";default:return"#f3f4f6"}}};
  color: ${e=>{switch(e.$nivel){case 1:return"#991b1b";case 2:return"#c2410c";case 3:return"#166534";case 4:return"#6b21a8";default:return"#374151"}}};
  font-weight: 700;
  font-size: 1rem;
`,X=t.Ay.p`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`,V=t.Ay.div`
  display: grid;
  gap: 1.5rem;
`,J=t.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
`,Q=t.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`,q=t.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  font-size: 0.95rem;
`,K=t.Ay.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${e=>{switch(e.$nivel){case 1:return"#fee2e2";case 2:return"#fed7aa";case 3:return"#dcfce7";case 4:return"#e9d5ff";default:return"#f3f4f6"}}};
  color: ${e=>{switch(e.$nivel){case 1:return"#991b1b";case 2:return"#c2410c";case 3:return"#166534";case 4:return"#6b21a8";default:return"#374151"}}};
`,Y=t.Ay.div`
  margin-top: 0.75rem;
`,W=t.Ay.p`
  margin: 0 0 0.5rem 0;
  color: ${e=>e.theme.text};
  font-weight: 600;
  font-size: 0.85rem;
`,Z=t.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,ee=t.Ay.li`
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
`,oe=(0,t.Ay)(s.P.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
`,ne=(0,t.Ay)(s.P.div)`
  font-size: 3rem;
`,ie=t.Ay.p`
  color: ${e=>e.theme.textMuted};
  font-size: 0.95rem;
  margin: 0;
`,te=t.Ay.button`
  padding: 0.75rem 1.25rem;
  background: ${e=>e.$active?e.theme.warning||"#f59e0b":e.theme.cardBg||"#fff"};
  color: ${e=>e.$active?"#fff":e.theme.textPrimary};
  border: 2px solid ${e=>e.$active?e.theme.warning||"#f59e0b":e.theme.border};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  flex-shrink: 0;
  
  /* Indicador de notificación cuando hay citas guardadas */
  ${e=>e.$hasNotification&&!e.$active&&`\n    &:after {\n      content: '';\n      position: absolute;\n      top: -6px;\n      right: -6px;\n      width: 12px;\n      height: 12px;\n      background: ${e.theme.success||"#4CAF50"};\n      border: 2px solid ${e.theme.cardBg||"#fff"};\n      border-radius: 50%;\n      animation: pulse 2s ease-in-out infinite;\n    }\n    \n    @keyframes pulse {\n      0%, 100% { transform: scale(1); opacity: 1; }\n      50% { transform: scale(1.2); opacity: 0.8; }\n    }\n  `}
  
  &:hover {
    background: ${e=>e.$active?e.theme.warningHover||"#f59e0b":e.theme.hoverBg||"#f5f5f5"};
    border-color: ${e=>e.theme.warning||"#f59e0b"};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
`,se=t.Ay.div`
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
`,ae=t.Ay.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    font-size: 1.2rem;
    margin: 0;
  }
`,re=t.Ay.div`
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
`,ce=t.Ay.div`
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
`,le=t.Ay.p`
  margin: 0 0 0.75rem 0;
  color: ${e=>e.theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
  font-style: italic;
  padding: 0.5rem;
  background: ${e=>e.theme.surface};
  border-left: 3px solid #10b981;
  border-radius: 4px;
`,de=t.Ay.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`,me=t.Ay.span`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
  margin-right: auto;
`,ue=t.Ay.button`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  }
  
  &:active {
    transform: scale(0.98);
  }
`,pe=t.Ay.button`
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
`,he=t.Ay.div`
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
`,xe=(0,t.Ay)(s.P.div)`
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
`,ge=(0,t.Ay)(s.P.div)`
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
`;function fe(e){var o,n,t,l,m,u,p,h;let{theme:x}=e;const{texto:g,completeAnalysis:U,setError:fe,updateRubricScore:be,getCitations:ve,deleteCitation:_e}=(0,i.useContext)(r.BR),je=(0,c.useRewards)(),[ye,Ae]=(0,i.useState)((()=>sessionStorage.getItem("mapaActores_actores")||"")),[$e,ze]=(0,i.useState)((()=>sessionStorage.getItem("mapaActores_contextoHistorico")||"")),[Ce,Ee]=(0,i.useState)((()=>sessionStorage.getItem("mapaActores_conexiones")||"")),[Se,we]=(0,i.useState)((()=>sessionStorage.getItem("mapaActores_consecuencias")||"")),[ke,Ie]=(0,i.useState)(null),[Oe,Ne]=(0,i.useState)(!1),[Me,Re]=(0,i.useState)(null),[Te,De]=(0,i.useState)(!0),[Le,Pe]=(0,i.useState)(!1),[Ue,He]=(0,i.useState)(null),Fe=i.useRef(null),Ge=i.useRef(null),Be=i.useRef(null),Xe=i.useRef(null),[Ve,Je]=i.useState({actores:0,contexto:0,conexiones:0,consecuencias:0}),Qe=(0,i.useMemo)((()=>ye.trim().length>=20&&$e.trim().length>=15&&Ce.trim().length>=20&&Se.trim().length>=20),[ye,$e,Ce,Se]),qe=(0,i.useMemo)((()=>ye.trim()?ye.trim().length<20?"\u26a0\ufe0f Describe los actores con m\xe1s detalle (m\xedn. 20 caracteres)":$e.trim()?$e.trim().length<15?"\u26a0\ufe0f Desarrolla el contexto hist\xf3rico (m\xedn. 15 caracteres)":Ce.trim()?Ce.trim().length<20?"\u26a0\ufe0f Profundiza en las conexiones (m\xedn. 20 caracteres)":Se.trim()?Se.trim().length<20?"\u26a0\ufe0f Desarrolla las consecuencias (m\xedn. 20 caracteres)":"\u2705 An\xe1lisis completo. Solicita evaluaci\xf3n criterial.":"\u26a0\ufe0f Eval\xfaa las consecuencias o impacto del texto":"\u26a0\ufe0f Analiza las conexiones e intereses entre actores":"\u26a0\ufe0f Sit\xfaa el texto en su contexto hist\xf3rico/social":"\u26a0\ufe0f Identifica los actores sociales y pol\xedticos relevantes"),[ye,$e,Ce,Se]);(0,i.useEffect)((()=>{ye&&sessionStorage.setItem("mapaActores_actores",ye)}),[ye]),(0,i.useEffect)((()=>{$e&&sessionStorage.setItem("mapaActores_contextoHistorico",$e)}),[$e]),(0,i.useEffect)((()=>{Ce&&sessionStorage.setItem("mapaActores_conexiones",Ce)}),[Ce]),(0,i.useEffect)((()=>{Se&&sessionStorage.setItem("mapaActores_consecuencias",Se)}),[Se]),(0,i.useEffect)((()=>{const e=()=>{const e=sessionStorage.getItem("mapaActores_actores")||"",o=sessionStorage.getItem("mapaActores_contextoHistorico")||"",n=sessionStorage.getItem("mapaActores_conexiones")||"",i=sessionStorage.getItem("mapaActores_consecuencias")||"";e!==ye&&Ae(e),o!==$e&&ze(o),n!==Ce&&Ee(n),i!==Se&&we(i),(e||o||n||i)&&console.log("\ud83d\udd04 [MapaActores] Borradores restaurados desde sesi\xf3n")};return window.addEventListener("session-restored",e),()=>window.removeEventListener("session-restored",e)}),[ye,$e,Ce,Se]);const Ke=(null===U||void 0===U||null===(o=U.metadata)||void 0===o?void 0:o.document_id)||null,Ye=`mapa_actores_${Ke}`;(0,b.Ay)(Ye,{enabled:null!==Ke,studentAnswers:{actores:ye,contexto_historico:$e,conexiones:Ce,consecuencias:Se},aiFeedbacks:{mapa_actores:ke},onRehydrate:e=>{var o,n,i,t,s;null!==(o=e.student_answers)&&void 0!==o&&o.actores&&Ae(e.student_answers.actores),null!==(n=e.student_answers)&&void 0!==n&&n.contexto_historico&&ze(e.student_answers.contexto_historico),null!==(i=e.student_answers)&&void 0!==i&&i.conexiones&&Ee(e.student_answers.conexiones),null!==(t=e.student_answers)&&void 0!==t&&t.consecuencias&&we(e.student_answers.consecuencias),null!==(s=e.ai_feedbacks)&&void 0!==s&&s.mapa_actores&&Ie(e.ai_feedbacks.mapa_actores)}});const We=(0,i.useMemo)((()=>Ke?ve(Ke):[]),[Ke,ve]),Ze=(0,i.useCallback)(((e,o)=>{const n=`"${e}" `,i={actores:Fe,contexto:Ge,conexiones:Be,consecuencias:Xe}[o],t={actores:Ae,contexto:ze,conexiones:Ee,consecuencias:we}[o];if(i&&i.current&&t){const e=i.current,s=e.selectionStart||Ve[o]||0,a=e.selectionEnd||Ve[o]||0;t((o=>{const i=o.substring(0,s),t=o.substring(a),r=i+n+t;return setTimeout((()=>{if(e){const o=s+n.length;e.focus(),e.setSelectionRange(o,o)}}),0),r}))}Pe(!1)}),[Ve]),eo=(0,i.useCallback)(((e,o)=>{const n=o.target.selectionStart;Je((o=>({...o,[e]:n})))}),[]),oo=(0,i.useCallback)((e=>{Ke&&_e(Ke,e)}),[Ke,_e]),no=(0,i.useCallback)((e=>{e.preventDefault();const o=e.clipboardData.getData("text"),n=o.trim().split(/\s+/).filter((e=>e.length>0)).length;n<=40?document.execCommand("insertText",!1,o):(He(`\u26a0\ufe0f Solo puedes pegar hasta 40 palabras (intentaste pegar ${n}). Escribe con tus propias palabras o usa citas guardadas.`),setTimeout((()=>He(null)),5e3))}),[]),io=(0,i.useMemo)((()=>(0,d.getDimension)("contextualizacion")),[]),to=(0,i.useCallback)((async()=>{if(!Qe||!g)return;Ne(!0),fe(null),Re({label:"Iniciando an\xe1lisis socio-hist\xf3rico...",icon:"\ud83d\udd0d",duration:2});const e=[setTimeout((()=>Re({label:"Analizando actores y contexto...",icon:"\ud83d\udc65",duration:5})),1e3),setTimeout((()=>Re({label:"Evaluando con DeepSeek...",icon:"\ud83e\udd16",duration:12})),3500),setTimeout((()=>Re({label:"Evaluando con OpenAI...",icon:"\ud83e\udde0",duration:12})),15500),setTimeout((()=>Re({label:"Combinando feedback...",icon:"\ud83d\udd27",duration:4})),27500)];try{const o=await f({text:g,actores:ye,contextoHistorico:$e,conexiones:Ce,consecuencias:Se});e.forEach(clearTimeout),Ie(o),be("rubrica3",{score:2.5*o.nivel_global,nivel:o.nivel_global,artefacto:"MapaActores",criterios:o.criterios}),je&&(je.recordEvent("EVALUATION_SUBMITTED",{artefacto:"MapaActores",rubricId:"rubrica3"}),je.recordEvent(`EVALUATION_LEVEL_${o.nivel_global}`,{score:2.5*o.nivel_global,nivel:o.nivel_global,artefacto:"MapaActores"}),$e.length>150&&je.recordEvent("CONTEXTUALIZATION_HISTORICAL",{length:$e.length,artefacto:"MapaActores"}),Ce.length>100&&je.recordEvent("SOCIAL_CONNECTIONS_MAPPED",{length:Ce.length,artefacto:"MapaActores"}),4===o.nivel_global&&je.recordEvent("PERFECT_SCORE",{score:10,artefacto:"MapaActores"}),console.log("\ud83c\udfae [MapaActores] Recompensas registradas"))}catch(o){console.error("Error evaluando Mapa de Actores:",o),fe(o.message||"Error al evaluar el an\xe1lisis"),e.forEach(clearTimeout)}finally{Ne(!1),Re(null)}}),[Qe,g,ye,$e,Ce,Se,fe]);return g?(0,j.jsxs)(y,{children:[(0,j.jsxs)(A,{children:[(0,j.jsx)($,{children:"\ud83d\uddfa\ufe0f Mapa de Actores y Consecuencias"}),(0,j.jsx)(z,{children:"Sit\xfaa el texto en su contexto socio-hist\xf3rico, identifica actores, analiza conexiones y eval\xfaa consecuencias. Recibir\xe1s evaluaci\xf3n criterial basada en la R\xfabrica 3 de Literacidad Cr\xedtica."})]}),(0,j.jsx)(a.N,{children:Le&&(0,j.jsxs)(se,{as:s.P.div,initial:{opacity:0,x:300},animate:{opacity:1,x:0},exit:{opacity:0,x:300},transition:{type:"spring",damping:25},theme:x,children:[(0,j.jsxs)(ae,{theme:x,children:[(0,j.jsx)("h3",{style:{margin:0},children:"\ud83d\udccb Mis Citas Guardadas"}),(0,j.jsx)("p",{style:{fontSize:"0.85rem",margin:"0.5rem 0 0 0",opacity:.8},children:0===We.length?'Selecciona texto en "Lectura Guiada" y guarda citas':"Selecciona el campo y haz clic en el bot\xf3n correspondiente"})]}),(0,j.jsx)(re,{children:0===We.length?(0,j.jsxs)(he,{theme:x,children:[(0,j.jsx)("div",{style:{fontSize:"3rem",marginBottom:"1rem"},children:"\ud83d\udca1"}),(0,j.jsx)("p",{children:(0,j.jsx)("strong",{children:"\xbfC\xf3mo guardar citas?"})}),(0,j.jsxs)("ol",{style:{textAlign:"left",lineHeight:1.6},children:[(0,j.jsx)("li",{children:'Ve a "Lectura Guiada"'}),(0,j.jsx)("li",{children:"Selecciona texto importante"}),(0,j.jsx)("li",{children:'Clic en "\ud83d\udcbe Guardar Cita"'}),(0,j.jsx)("li",{children:"Regresa aqu\xed para usar"})]})]}):We.map((e=>(0,j.jsxs)(ce,{theme:x,children:[(0,j.jsx)(le,{theme:x,children:e.texto}),(0,j.jsxs)(de,{children:[(0,j.jsx)(me,{theme:x,children:new Date(e.timestamp).toLocaleDateString("es-ES",{month:"short",day:"numeric"})}),(0,j.jsxs)("div",{style:{display:"flex",gap:"0.5rem",flexWrap:"wrap"},children:[(0,j.jsx)(ue,{onClick:()=>Ze(e.texto,"actores"),theme:x,children:"Actores"}),(0,j.jsx)(ue,{onClick:()=>Ze(e.texto,"contexto"),theme:x,children:"Contexto"}),(0,j.jsx)(ue,{onClick:()=>Ze(e.texto,"conexiones"),theme:x,children:"Conexiones"}),(0,j.jsx)(ue,{onClick:()=>Ze(e.texto,"consecuencias"),theme:x,children:"Consecuencias"}),(0,j.jsx)(pe,{onClick:()=>oo(e.id),theme:x,children:"\ud83d\uddd1\ufe0f"})]})]})]},e.id)))})]})}),(0,j.jsxs)(C,{theme:x,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},children:[(0,j.jsxs)(E,{onClick:()=>De(!Te),children:[(0,j.jsx)(S,{theme:x,children:"\ud83d\udca1 Preguntas Gu\xeda"}),(0,j.jsx)(w,{$expanded:Te,children:"\u25bc"})]}),(0,j.jsx)(a.N,{children:Te&&(0,j.jsx)(k,{theme:x,initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},children:(0,j.jsx)(I,{children:null===io||void 0===io||null===(n=io.preguntasGuia)||void 0===n?void 0:n.map(((e,o)=>(0,j.jsx)(O,{theme:x,children:e},o)))})})})]}),!ke&&(0,j.jsxs)(j.Fragment,{children:[(ye||$e||Ce||Se)&&(0,j.jsx)(ge,{theme:x,children:"\ud83d\udcbe Tu trabajo se guarda autom\xe1ticamente. No perder\xe1s nada al cambiar de pesta\xf1a."}),(0,j.jsxs)(N,{theme:x,children:[(0,j.jsx)(M,{theme:x,children:"1\ufe0f\u20e3 Actores Sociales y Pol\xedticos"}),(0,j.jsx)(R,{theme:x,children:"\xbfQu\xe9 actores son relevantes en este texto?"}),(0,j.jsx)(T,{ref:Fe,theme:x,value:ye,onChange:e=>Ae(e.target.value),onClick:e=>eo("actores",e),onKeyUp:e=>eo("actores",e),onPaste:no,placeholder:"Ej: Empresas transnacionales, trabajadores precarizados, gobiernos neoliberales, organizaciones sindicales, movimientos sociales...",disabled:Oe}),Ue&&(0,j.jsx)(xe,{theme:x,children:Ue}),(0,j.jsx)(D,{theme:x,children:"Identifica individuos, grupos, instituciones o clases sociales mencionados o afectados"})]}),(0,j.jsxs)(N,{theme:x,children:[(0,j.jsx)(M,{theme:x,children:"2\ufe0f\u20e3 Contexto Hist\xf3rico/Social"}),(0,j.jsx)(R,{theme:x,children:"\xbfEn qu\xe9 contexto se produce este texto?"}),(0,j.jsx)(T,{ref:Ge,theme:x,value:$e,onChange:e=>ze(e.target.value),onClick:e=>eo("contexto",e),onKeyUp:e=>eo("contexto",e),onPaste:no,placeholder:"Ej: Contexto de globalizaci\xf3n neoliberal post-1990, crisis financiera 2008, pandemia COVID-19, dictadura militar Chile 1973-1990...",disabled:Oe,style:{minHeight:"100px"}}),(0,j.jsx)(D,{theme:x,children:"Sit\xfaa en \xe9poca, eventos hist\xf3ricos, procesos sociales o debates p\xfablicos"})]}),(0,j.jsxs)(N,{theme:x,children:[(0,j.jsx)(M,{theme:x,children:"3\ufe0f\u20e3 Conexiones e Intereses"}),(0,j.jsx)(R,{theme:x,children:"\xbfC\xf3mo se relacionan los actores? \xbfQu\xe9 intereses tienen?"}),(0,j.jsx)(T,{ref:Be,theme:x,value:Ce,onChange:e=>Ee(e.target.value),onClick:e=>eo("conexiones",e),onKeyUp:e=>eo("conexiones",e),onPaste:no,placeholder:"Ej: Empresas buscan maximizar ganancias mediante desregulaci\xf3n laboral, lo cual entra en conflicto con trabajadores que buscan estabilidad. Gobiernos median seg\xfan correlaci\xf3n de fuerzas...",disabled:Oe,style:{minHeight:"150px"}}),(0,j.jsx)(D,{theme:x,children:"Analiza relaciones de poder, conflictos, alianzas, hegemon\xedas, resistencias"})]}),(0,j.jsxs)(N,{theme:x,children:[(0,j.jsx)(M,{theme:x,children:"4\ufe0f\u20e3 Consecuencias e Impacto"}),(0,j.jsx)(R,{theme:x,children:"\xbfQu\xe9 consecuencias reales o potenciales tiene este discurso?"}),(0,j.jsx)(T,{ref:Xe,theme:x,value:Se,onChange:e=>we(e.target.value),onClick:e=>eo("consecuencias",e),onKeyUp:e=>eo("consecuencias",e),onPaste:no,placeholder:"Ej: Corto plazo: aumento del desempleo, protestas sociales. Largo plazo: debilitamiento de identidades colectivas, naturalizaci\xf3n del individualismo competitivo...",disabled:Oe,style:{minHeight:"150px"}}),(0,j.jsx)(D,{theme:x,children:"Distingue entre consecuencias inmediatas y efectos estructurales a largo plazo"})]}),(0,j.jsx)(L,{$valid:Qe,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},children:qe}),(0,j.jsxs)(P,{children:[(0,j.jsx)(te,{onClick:()=>Pe(!Le),theme:x,$active:Le,title:"Ver mis citas guardadas del texto",$hasNotification:We.length>0,children:Le?"\u2715 Cerrar Citas":`\ud83d\udccb Mis Citas (${We.length})`}),(0,j.jsx)(H,{onClick:to,disabled:!Qe||Oe,children:Oe?"\u23f3 Evaluando...":"\ud83d\uddfa\ufe0f Solicitar Evaluaci\xf3n Criterial"})]})]}),Oe&&(0,j.jsxs)(j.Fragment,{children:[(0,j.jsx)(_.A,{theme:x,isEvaluating:Oe,currentStep:Me}),(0,j.jsxs)(oe,{children:[(0,j.jsx)(ne,{animate:{rotate:360},transition:{duration:2,repeat:1/0,ease:"linear"},children:"\ud83d\udd04"}),(0,j.jsx)(ie,{theme:x,children:"Evaluando con estrategia dual (DeepSeek + OpenAI)..."})]})]}),(0,j.jsx)(a.N,{children:ke&&!Oe&&(0,j.jsxs)(F,{theme:x,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},children:[(0,j.jsx)(G,{children:(0,j.jsxs)("div",{children:[(0,j.jsx)("h3",{style:{margin:"0 0 0.5rem 0",color:x.text},children:"\ud83d\udcca Evaluaci\xf3n Criterial"}),(0,j.jsxs)(B,{$nivel:ke.nivel_global,children:["Nivel ",ke.nivel_global,"/4"]})]})}),(0,j.jsxs)(X,{theme:x,children:[(0,j.jsxs)("strong",{children:[ke.dimension_label,":"]})," ",ke.dimension_description]}),(0,j.jsxs)(V,{children:[(0,j.jsxs)(J,{theme:x,children:[(0,j.jsxs)(Q,{children:[(0,j.jsx)(q,{theme:x,children:"Actores y Contexto"}),(0,j.jsxs)(K,{$nivel:ke.criterios.actores_contexto.nivel,children:["Nivel ",ke.criterios.actores_contexto.nivel,"/4"]})]}),(null===(t=ke.criterios.actores_contexto.fortalezas)||void 0===t?void 0:t.length)>0&&(0,j.jsxs)(Y,{children:[(0,j.jsx)(W,{theme:x,children:"\u2705 Fortalezas:"}),(0,j.jsx)(Z,{children:ke.criterios.actores_contexto.fortalezas.map(((e,o)=>(0,j.jsx)(ee,{theme:x,$icon:"\u2713",children:(0,v.Gc)(e)},o)))})]}),(null===(l=ke.criterios.actores_contexto.mejoras)||void 0===l?void 0:l.length)>0&&(0,j.jsxs)(Y,{children:[(0,j.jsx)(W,{theme:x,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,j.jsx)(Z,{children:ke.criterios.actores_contexto.mejoras.map(((e,o)=>(0,j.jsx)(ee,{theme:x,$icon:"\u2192",children:(0,v.Gc)(e)},o)))})]})]}),(0,j.jsxs)(J,{theme:x,children:[(0,j.jsxs)(Q,{children:[(0,j.jsx)(q,{theme:x,children:"Conexiones e Intereses"}),(0,j.jsxs)(K,{$nivel:ke.criterios.conexiones_intereses.nivel,children:["Nivel ",ke.criterios.conexiones_intereses.nivel,"/4"]})]}),(null===(m=ke.criterios.conexiones_intereses.fortalezas)||void 0===m?void 0:m.length)>0&&(0,j.jsxs)(Y,{children:[(0,j.jsx)(W,{theme:x,children:"\u2705 Fortalezas:"}),(0,j.jsx)(Z,{children:ke.criterios.conexiones_intereses.fortalezas.map(((e,o)=>(0,j.jsx)(ee,{theme:x,$icon:"\u2713",children:(0,v.Gc)(e)},o)))})]}),(null===(u=ke.criterios.conexiones_intereses.mejoras)||void 0===u?void 0:u.length)>0&&(0,j.jsxs)(Y,{children:[(0,j.jsx)(W,{theme:x,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,j.jsx)(Z,{children:ke.criterios.conexiones_intereses.mejoras.map(((e,o)=>(0,j.jsx)(ee,{theme:x,$icon:"\u2192",children:(0,v.Gc)(e)},o)))})]})]}),(0,j.jsxs)(J,{theme:x,children:[(0,j.jsxs)(Q,{children:[(0,j.jsx)(q,{theme:x,children:"Impacto y Consecuencias"}),(0,j.jsxs)(K,{$nivel:ke.criterios.impacto_consecuencias.nivel,children:["Nivel ",ke.criterios.impacto_consecuencias.nivel,"/4"]})]}),(null===(p=ke.criterios.impacto_consecuencias.fortalezas)||void 0===p?void 0:p.length)>0&&(0,j.jsxs)(Y,{children:[(0,j.jsx)(W,{theme:x,children:"\u2705 Fortalezas:"}),(0,j.jsx)(Z,{children:ke.criterios.impacto_consecuencias.fortalezas.map(((e,o)=>(0,j.jsx)(ee,{theme:x,$icon:"\u2713",children:(0,v.Gc)(e)},o)))})]}),(null===(h=ke.criterios.impacto_consecuencias.mejoras)||void 0===h?void 0:h.length)>0&&(0,j.jsxs)(Y,{children:[(0,j.jsx)(W,{theme:x,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,j.jsx)(Z,{children:ke.criterios.impacto_consecuencias.mejoras.map(((e,o)=>(0,j.jsx)(ee,{theme:x,$icon:"\u2192",children:(0,v.Gc)(e)},o)))})]})]})]})]})})]}):(0,j.jsx)(y,{children:(0,j.jsxs)(A,{children:[(0,j.jsx)($,{children:"\ud83d\uddfa\ufe0f Mapa de Actores y Consecuencias"}),(0,j.jsx)(z,{children:"Carga un texto para comenzar"})]})})}}}]);