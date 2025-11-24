"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[526],{3505:(e,a,i)=>{i.d(a,{A:()=>s});var r=i(9950);const s=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},a=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{enabled:i=!0,preventDefault:s=!0,excludeInputs:t=!0,debug:o=!1}=a,n=(0,r.useRef)(e),c=(0,r.useRef)(new Set);(0,r.useEffect)((()=>{n.current=e}),[e]);const l=(0,r.useCallback)((e=>{const a=[];e.ctrlKey&&a.push("ctrl"),e.shiftKey&&a.push("shift"),e.altKey&&a.push("alt"),e.metaKey&&a.push("meta");const i=e.key.toLowerCase(),r={enter:"enter",escape:"escape",esc:"escape"," ":"space",arrowup:"up",arrowdown:"down",arrowleft:"left",arrowright:"right"}[i]||i;return a.push(r),a.join("+")}),[]),d=(0,r.useCallback)((e=>{if(!e)return!1;const a=e.tagName.toLowerCase(),i="true"===e.contentEditable;return"input"===a||"textarea"===a||"select"===a||i}),[]),m=(0,r.useCallback)((e=>{if(!i)return;if(t&&d(e.target))return;const a=l(e),r=n.current[a];if(o&&console.log("[useKeyboardShortcuts] Key combination:",a),r&&"function"===typeof r&&(s&&(e.preventDefault(),e.stopPropagation()),!c.current.has(a))){c.current.add(a);try{r(e)}catch(m){console.error("[useKeyboardShortcuts] Error executing handler:",m)}}}),[i,t,s,d,l,o]),u=(0,r.useCallback)((e=>{const a=l(e);c.current.delete(a)}),[l]);(0,r.useEffect)((()=>{if(i)return window.addEventListener("keydown",m),window.addEventListener("keyup",u),()=>{window.removeEventListener("keydown",m),window.removeEventListener("keyup",u)}}),[i,m,u]);return{trigger:(0,r.useCallback)((e=>{const a=n.current[e];a&&"function"===typeof a&&a({type:"manual",combination:e})}),[]),getRegisteredShortcuts:(0,r.useCallback)((()=>Object.keys(n.current)),[]),enabled:i}}},6526:(e,a,i)=>{i.r(a),i.d(a,{default:()=>Ae});var r=i(9950),s=i(4752),t=i(1132),o=i(3291),n=i(387),c=i(7424),l=i(6735),d=i(8864);const m="deepseek-chat",u="gpt-4o-mini",p="acd";function g(e){let a=e.trim();a=a.replace(/```json\s*/g,""),a=a.replace(/```\s*/g,"");const i=a.match(/\{[\s\S]*\}/);return i&&(a=i[0]),a}async function h(e,a,i,r,s,t){const o=function(e,a,i,r,s,t){return`Eres un evaluador experto en pensamiento cr\xedtico y an\xe1lisis del discurso.\n\nTEXTO ORIGINAL:\n"""\n${e.slice(0,3e3)}\n"""\n\nAN\xc1LISIS DEL ESTUDIANTE:\n\nMarco ideol\xf3gico: ${a}\nEstrategias ret\xf3ricas: ${i}\nVoces presentes: ${r}\nVoces silenciadas: ${s}\n\nEVALUACI\xd3N ESTRUCTURAL PREVIA (DeepSeek):\n${JSON.stringify(t,null,2)}\n\n---\n\nTAREA: Eval\xfaa la PROFUNDIDAD CR\xcdTICA del an\xe1lisis. No repitas la evaluaci\xf3n estructural.\n\nEnf\xf3cate en:\n\n1. **Conexiones ideol\xf3gicas**: \xbfConecta el marco con beneficiarios, intereses o sistemas de poder?\n2. **An\xe1lisis ret\xf3rico profundo**: \xbfExplica POR QU\xc9 esas estrategias son persuasivas o manipuladoras?\n3. **Implicaciones de silencios**: \xbfComprende el IMPACTO de las voces ausentes?\n\nEjemplos de an\xe1lisis SUPERFICIAL vs PROFUNDO:\n\nSUPERFICIAL: "El texto usa met\xe1foras."\nPROFUNDO: "Las met\xe1foras b\xe9licas ('batalla', 'combate') naturalizan el conflicto y legitiman la violencia."\n\nSUPERFICIAL: "Falta la voz de los trabajadores."\nPROFUNDO: "La ausencia de trabajadores en el discurso los despoja de agencia, present\xe1ndolos como objetos pasivos en lugar de actores pol\xedticos."\n\nIMPORTANTE: Responde SOLO con JSON v\xe1lido.\n\nFormato de respuesta JSON:\n{\n  "profundidad_critica": {\n    "marco_ideologico": {\n      "conecta_beneficiarios": true/false,\n      "analiza_intereses": true/false,\n      "comentario": "Breve an\xe1lisis"\n    },\n    "estrategias_retoricas": {\n      "explica_poder_persuasivo": true/false,\n      "identifica_manipulacion": true/false,\n      "comentario": "Breve an\xe1lisis"\n    },\n    "voces_silencios": {\n      "analiza_impacto": true/false,\n      "comprende_dinamicas_poder": true/false,\n      "comentario": "Breve an\xe1lisis"\n    }\n  },\n  "fortalezas_criticas": ["insight 1", "insight 2"],\n  "oportunidades_profundizacion": ["sugerencia 1", "sugerencia 2"],\n  "nivel_pensamiento_critico": 1-4\n}`}(e,a,i,r,s,t);try{const e=await(0,l.x8)({provider:"openai",model:u,messages:[{role:"user",content:o}],temperature:.3,max_tokens:1800,response_format:{type:"json_object"},timeoutMs:45e3}),a=(0,l.HQ)(e);console.log("\ud83d\udd0d [OpenAI TablaACD] Respuesta cruda:",a.slice(0,200));const i=g(a);console.log("\u2705 [OpenAI TablaACD] Respuesta limpia:",i.slice(0,200));const r=JSON.parse(i);if(!r.profundidad_critica||!r.nivel_pensamiento_critico)throw new Error("Respuesta sin profundidad_critica");return r}catch(n){return console.error("\u274c Error en evaluaci\xf3n OpenAI (TablaACD):",n),{profundidad_critica:{marco_ideologico:{conecta_beneficiarios:!0,analiza_naturalizacion:!0,comentario:"An\xe1lisis b\xe1sico"},estrategias_retoricas:{explica_poder_persuasivo:!0,identifica_manipulacion:!0,comentario:"An\xe1lisis b\xe1sico"},voces_silencios:{analiza_impacto:!0,conecta_poder:!0,comentario:"An\xe1lisis b\xe1sico"}},fortalezas_profundidad:["An\xe1lisis en proceso"],oportunidades_profundizacion:["Error en evaluaci\xf3n autom\xe1tica"],nivel_pensamiento_critico:3,_error:n.message}}}function f(e){const a=e.toLowerCase();return a.includes("marco")||a.includes("ideolog")?"marco_ideologico":a.includes("estrategia")||a.includes("ret\xf3ric")?"estrategias_retoricas":a.includes("voce")||a.includes("silenc")||a.includes("ausenc")?"voces_silencios":null}async function x(e){let{text:a,marcoIdeologico:i,estrategiasRetoricas:r,vocesPresentes:s,vocesSilenciadas:t}=e;console.log("\ud83d\udd0d [TablaACD] Iniciando evaluaci\xf3n dual...");const o=Date.now();try{console.log("\ud83d\udcca Evaluando precisi\xf3n estructural (DeepSeek)...");const e=await async function(e,a,i,r,s){const t=function(e,a,i,r,s){return`Eres un evaluador experto en An\xe1lisis Cr\xedtico del Discurso (ACD).\n\nTEXTO ORIGINAL:\n"""\n${e.slice(0,3e3)}\n"""\n\nAN\xc1LISIS DEL ESTUDIANTE:\n\n1. Marco ideol\xf3gico identificado:\n${a}\n\n2. Estrategias ret\xf3ricas identificadas:\n${i}\n\n3. Voces presentes en el discurso:\n${r}\n\n4. Voces silenciadas/ausentes:\n${s}\n\n---\n\nTAREA: Eval\xfaa la PRECISI\xd3N ESTRUCTURAL del an\xe1lisis seg\xfan estos 3 criterios:\n\n**Criterio 1: Marco Ideol\xf3gico (marco_ideologico)**\n- \xbfEl marco identificado es coherente con el texto?\n- \xbfHay evidencia textual que lo sustente?\n- Nivel (1-4): 1=No identifica, 2=Vago, 3=Correcto, 4=Profundo con evidencia\n\n**Criterio 2: Estrategias Ret\xf3ricas (estrategias_retoricas)**\n- \xbfLas estrategias est\xe1n correctamente identificadas?\n- \xbfLos ejemplos son precisos?\n- Nivel (1-4): 1=No identifica, 2=Algunas vagas, 3=Varias correctas, 4=An\xe1lisis cr\xedtico completo\n\n**Criterio 3: Voces y Silencios (voces_silencios)**\n- \xbfDistingue correctamente voces legitimadas de las ausentes?\n- \xbfExplica el efecto de estas ausencias?\n- Nivel (1-4): 1=No cuestiona, 2=Menciona sin especificar, 3=Identifica con efecto, 4=Analiza poder e implicaciones\n\nIMPORTANTE: Responde SOLO con JSON v\xe1lido, sin explicaciones adicionales.\n\nFormato de respuesta JSON:\n{\n  "criterios_evaluados": {\n    "marco_ideologico": {\n      "nivel": 1-4,\n      "es_coherente": true/false,\n      "evidencias_encontradas": ["cita 1", "cita 2"]\n    },\n    "estrategias_retoricas": {\n      "nivel": 1-4,\n      "estrategias_correctas": ["estrategia 1", "estrategia 2"],\n      "estrategias_imprecisas": ["estrategia X"]\n    },\n    "voces_silencios": {\n      "nivel": 1-4,\n      "voces_presentes_correctas": ["voz A", "voz B"],\n      "voces_silenciadas_correctas": ["voz X", "voz Y"]\n    }\n  },\n  "fortalezas_estructurales": ["fortaleza 1", "fortaleza 2"],\n  "mejoras_precision": ["mejora 1", "mejora 2"]\n}`}(e,a,i,r,s);try{const e=await(0,l.x8)({provider:"deepseek",model:m,messages:[{role:"user",content:t}],temperature:.2,max_tokens:1500,response_format:{type:"json_object"},timeoutMs:3e4}),a=(0,l.HQ)(e);console.log("\ud83d\udd0d [DeepSeek TablaACD] Respuesta cruda:",a.slice(0,200));const i=g(a);console.log("\u2705 [DeepSeek TablaACD] Respuesta limpia:",i.slice(0,200));const r=JSON.parse(i);if(!r.criterios_evaluados)throw new Error("Respuesta sin criterios_evaluados");return r}catch(o){return console.error("\u274c Error en evaluaci\xf3n DeepSeek (TablaACD):",o),{criterios_evaluados:{marco_ideologico:{nivel:3,evidencia_marco:"",coherencia:!0},estrategias_retoricas:{nivel:3,estrategias_correctas:[],ejemplos_precisos:[]},voces_silencios:{nivel:3,voces_presentes_correctas:[],voces_silenciadas_relevantes:[]}},fortalezas_estructurales:["An\xe1lisis en proceso"],mejoras_precision:["Error en evaluaci\xf3n autom\xe1tica"],_error:o.message}}}(a,i,r,s,t);console.log("\ud83e\udde0 Evaluando profundidad cr\xedtica (OpenAI)...");const n=await h(a,i,r,s,t,e);console.log("\ud83d\udd27 Combinando feedback dual...");const c=function(e,a){const i={marco_ideologico:{nivel:e.criterios_evaluados.marco_ideologico.nivel,fortalezas:[],mejoras:[]},estrategias_retoricas:{nivel:e.criterios_evaluados.estrategias_retoricas.nivel,fortalezas:[],mejoras:[]},voces_silencios:{nivel:e.criterios_evaluados.voces_silencios.nivel,fortalezas:[],mejoras:[]}};a.profundidad_critica.marco_ideologico.conecta_beneficiarios?i.marco_ideologico.fortalezas.push("Conecta el marco ideol\xf3gico con beneficiarios e intereses"):i.marco_ideologico.mejoras.push("Intenta conectar el marco ideol\xf3gico con qui\xe9nes se benefician de este discurso"),a.profundidad_critica.estrategias_retoricas.explica_poder_persuasivo?i.estrategias_retoricas.fortalezas.push("Explica el poder persuasivo de las estrategias ret\xf3ricas"):i.estrategias_retoricas.mejoras.push("Profundiza en POR QU\xc9 estas estrategias son persuasivas o manipuladoras"),a.profundidad_critica.voces_silencios.analiza_impacto?i.voces_silencios.fortalezas.push("Analiza el impacto de las voces silenciadas"):i.voces_silencios.mejoras.push("Reflexiona sobre el IMPACTO de las ausencias en el discurso"),e.fortalezas_estructurales.forEach((e=>{const a=f(e);a&&i[a]&&i[a].fortalezas.push(e)})),e.mejoras_precision.forEach((e=>{const a=f(e);a&&i[a]&&i[a].mejoras.push(e)})),a.fortalezas_criticas.forEach((e=>i.marco_ideologico.fortalezas.push(e))),a.oportunidades_profundizacion.forEach((e=>i.marco_ideologico.mejoras.push(e)));const r=(i.marco_ideologico.nivel+i.estrategias_retoricas.nivel+i.voces_silencios.nivel)/3,s=Math.min(4,Math.round(r+.3*(a.nivel_pensamiento_critico-r)));return{dimension:p,nivel_global:s,criterios:i,evidencias_deepseek:e.criterios_evaluados,profundidad_openai:a.profundidad_critica,fuentes:["DeepSeek (precisi\xf3n)","OpenAI (profundidad cr\xedtica)"]}}(e,n),u=(0,d.getDimension)(p),x=(0,d.scoreToLevelDescriptor)(p,c.nivel_global),b={...c,dimension_label:(null===u||void 0===u?void 0:u.nombre)||"An\xe1lisis Cr\xedtico del Discurso",dimension_description:(null===u||void 0===u?void 0:u.descripcion)||"",nivel_descriptor:x.descriptor,duracion_ms:Date.now()-o};return console.log(`\u2705 Evaluaci\xf3n completada en ${b.duracion_ms}ms`),console.log(`\ud83d\udcca Nivel global: ${c.nivel_global}/4`),b}catch(n){throw console.error("\u274c Error en evaluaci\xf3n dual de TablaACD:",n),n}}var b=i(5361),v=i(3505),_=i(4414);const y=s.Ay.div`
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: ${e=>e.theme.surfaceAlt||e.theme.background||"#f8f9fa"};
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    padding: 0.5rem;
  }
`,j=s.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: ${e=>e.theme.textSecondary||"#666"};
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`,A=s.Ay.kbd`
  display: inline-block;
  padding: 0.2rem 0.4rem;
  background: ${e=>e.theme.surface||"#fff"};
  border: 1px solid ${e=>e.theme.border||"#ddd"};
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${e=>e.theme.textPrimary||"#333"};
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  
  @media (max-width: 768px) {
    padding: 0.15rem 0.3rem;
    font-size: 0.7rem;
  }
`,C=s.Ay.span`
  margin: 0 0.15rem;
  font-weight: 600;
`,$=s.Ay.span`
  font-size: 0.75rem;
  margin-left: 0.2rem;
`,E=e=>{let{shortcuts:a,theme:i,className:s}=e;return(0,_.jsx)(y,{theme:i,className:s,children:a.map(((e,a)=>(0,_.jsxs)(j,{theme:i,children:[e.keys.map(((a,s)=>(0,_.jsxs)(r.Fragment,{children:[(0,_.jsx)(A,{theme:i,children:a}),s<e.keys.length-1&&(0,_.jsx)(C,{children:"+"})]},s))),(0,_.jsx)($,{children:e.label})]},a)))})};var w=i(539),k=i(7525);const S=s.Ay.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
`,z=s.Ay.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  border-radius: 12px;
  color: white;
`,D=s.Ay.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`,I=s.Ay.p`
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.5;
`,T=(0,s.Ay)(t.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,R=s.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
`,N=s.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
`,P=s.Ay.span`
  transition: transform 0.3s ease;
  transform: ${e=>e.$expanded?"rotate(180deg)":"rotate(0deg)"};
`,O=(0,s.Ay)(t.P.div)`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
`,L=s.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,M=s.Ay.li`
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
`,F=s.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,U=s.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,G=s.Ay.label`
  display: block;
  color: ${e=>e.theme.text};
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`,V=s.Ay.textarea`
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
    border-color: #8b5cf6;
  }

  &::placeholder {
    color: ${e=>e.theme.textMuted};
    opacity: 0.6;
  }
`,B=s.Ay.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${e=>e.theme.border};
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  color: ${e=>e.theme.text};
  background: ${e=>e.theme.background};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
  }

  &::placeholder {
    color: ${e=>e.theme.textMuted};
    opacity: 0.6;
  }
`,K=s.Ay.p`
  margin: 0.5rem 0 0 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
`,Q=(0,s.Ay)(t.P.div)`
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
`,H=s.Ay.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
`,J=s.Ay.button`
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
`,X=(0,s.Ay)(J)`
  background: ${e=>e.theme.success};
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 150, 136, 0.3);
    opacity: 0.9;
  }
`,Y=((0,s.Ay)(J)`
  background: ${e=>e.theme.surface};
  color: ${e=>e.theme.text};
  border: 1px solid ${e=>e.theme.border};

  &:hover:not(:disabled) {
    background: ${e=>e.theme.border};
  }
`,(0,s.Ay)(t.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`),q=s.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`,W=s.Ay.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${e=>{switch(e.$nivel){case 1:return"#fee2e2";case 2:return"#fed7aa";case 3:return"#dcfce7";case 4:return"#e9d5ff";default:return"#f3f4f6"}}};
  color: ${e=>{switch(e.$nivel){case 1:return"#991b1b";case 2:return"#c2410c";case 3:return"#166534";case 4:return"#6b21a8";default:return"#374151"}}};
  font-weight: 700;
  font-size: 1rem;
`,Z=s.Ay.p`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`,ee=s.Ay.div`
  display: grid;
  gap: 1.5rem;
`,ae=s.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
`,ie=s.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`,re=s.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  font-size: 0.95rem;
`,se=s.Ay.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${e=>{switch(e.$nivel){case 1:return"#fee2e2";case 2:return"#fed7aa";case 3:return"#dcfce7";case 4:return"#e9d5ff";default:return"#f3f4f6"}}};
  color: ${e=>{switch(e.$nivel){case 1:return"#991b1b";case 2:return"#c2410c";case 3:return"#166534";case 4:return"#6b21a8";default:return"#374151"}}};
`,te=s.Ay.div`
  margin-top: 0.75rem;
`,oe=s.Ay.p`
  margin: 0 0 0.5rem 0;
  color: ${e=>e.theme.text};
  font-weight: 600;
  font-size: 0.85rem;
`,ne=s.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,ce=s.Ay.li`
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
`,le=((0,s.Ay)(t.P.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
`,(0,s.Ay)(t.P.div)`
  font-size: 3rem;
`,s.Ay.p`
  color: ${e=>e.theme.textMuted};
  font-size: 0.95rem;
  margin: 0;
`,s.Ay.button`
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
`),de=s.Ay.div`
  position: fixed;
  right: 0;
  top: 0;
  width: 400px;
  height: 100vh;
  background: ${e=>e.theme.surface};
  border-left: 1px solid ${e=>e.theme.border};
  box-shadow: -4px 0 20px rgba(0,0,0,0.1);
  overflow-y: auto;
  z-index: 99;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`,me=s.Ay.div`
  padding: 1.5rem;
  background: ${e=>e.theme.primary};
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
`,ue=s.Ay.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,pe=s.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`,ge=s.Ay.p`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${e=>e.theme.textPrimary};
  margin: 0 0 0.75rem 0;
  font-style: italic;
`,he=s.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`,fe=s.Ay.span`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
`,xe=s.Ay.button`
  padding: 0.3rem 0.6rem;
  background: ${e=>e.theme.success||"#4CAF50"};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>e.theme.successHover||"#45a049"};
    transform: scale(1.05);
  }
`,be=s.Ay.button`
  padding: 0.3rem 0.5rem;
  background: transparent;
  color: ${e=>e.theme.danger||"#F44336"};
  border: 1px solid ${e=>e.theme.danger||"#F44336"};
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>e.theme.danger||"#F44336"};
    color: white;
  }
`,ve=s.Ay.div`
  text-align: center;
  padding: 2rem;
  color: ${e=>e.theme.textSecondary};
  
  strong {
    color: ${e=>e.theme.textPrimary};
    font-size: 1.1rem;
  }
  
  ol {
    margin-top: 1rem;
    padding-left: 1.5rem;
  }
  
  li {
    margin-bottom: 0.5rem;
  }
`,_e=s.Ay.div`
  padding: 0.75rem 1rem;
  background: ${e=>e.theme.danger}15;
  border: 1px solid ${e=>e.theme.danger}40;
  border-radius: 6px;
  color: ${e=>e.theme.danger||"#F44336"};
  font-size: 0.85rem;
  margin-top: 0.5rem;
  animation: shake 0.5s ease;
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`,ye=s.Ay.div`
  padding: 0.75rem 1rem;
  background: ${e=>e.theme.success}15;
  border: 1px solid ${e=>e.theme.success}40;
  border-radius: 6px;
  color: ${e=>e.theme.success||"#4CAF50"};
  font-size: 0.85rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,je=s.Ay.div`
  position: fixed;
  top: 80px;
  right: 20px;
  background: ${e=>e.theme.success||"#4CAF50"};
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 9999;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    right: 30px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${e=>e.theme.success||"#4CAF50"};
  }
`;function Ae(e){var a,i,s,l,m,u,p,g;let{theme:h}=e;const{texto:f,completeAnalysis:y,setError:j,updateRubricScore:A,getCitations:C,deleteCitation:$}=(0,r.useContext)(n.BR),J=(0,c.useRewards)(),[Ae,Ce]=(0,r.useState)((()=>sessionStorage.getItem("tablaACD_marcoIdeologico")||"")),[$e,Ee]=(0,r.useState)((()=>sessionStorage.getItem("tablaACD_estrategiasRetoricas")||"")),[we,ke]=(0,r.useState)((()=>sessionStorage.getItem("tablaACD_vocesPresentes")||"")),[Se,ze]=(0,r.useState)((()=>sessionStorage.getItem("tablaACD_vocesSilenciadas")||"")),[De,Ie]=(0,r.useState)(null),[Te,Re]=(0,r.useState)(!1),[Ne,Pe]=(0,r.useState)(null),[Oe,Le]=(0,r.useState)(!0),[Me,Fe]=(0,r.useState)(!1),[Ue,Ge]=(0,r.useState)(null),[Ve,Be]=(0,r.useState)(!1);(0,v.A)({"ctrl+s":e=>{console.log("\u2328\ufe0f Ctrl+S: Guardando borrador TablaACD..."),sessionStorage.setItem("tablaACD_marcoIdeologico",Ae),sessionStorage.setItem("tablaACD_estrategiasRetoricas",$e),sessionStorage.setItem("tablaACD_vocesPresentes",we),sessionStorage.setItem("tablaACD_vocesSilenciadas",Se),Be(!0),setTimeout((()=>Be(!1)),2e3)},"ctrl+enter":e=>{console.log("\u2328\ufe0f Ctrl+Enter: Evaluando tabla ACD..."),!Te&&qe&&handleSubmit()},escape:e=>{console.log("\u2328\ufe0f Esc: Cerrando paneles..."),Me?Fe(!1):Ue&&Ge(null)}},{enabled:!0,excludeInputs:!1});const Ke=r.useRef(null),Qe=r.useRef(null),He=r.useRef(null),Je=r.useRef(null),[Xe,Ye]=r.useState({marco:0,estrategias:0,presentes:0,silenciadas:0}),qe=(0,r.useMemo)((()=>Ae.trim().length>=10&&$e.trim().length>=20&&we.trim().length>=3&&Se.trim().length>=3),[Ae,$e,we,Se]),We=(0,r.useMemo)((()=>Ae.trim()?Ae.trim().length<10?"\u26a0\ufe0f Describe el marco ideol\xf3gico con m\xe1s detalle (m\xedn. 10 caracteres)":$e.trim()?$e.trim().length<20?"\u26a0\ufe0f Desarrolla las estrategias ret\xf3ricas (m\xedn. 20 caracteres)":we.trim()?Se.trim()?"\u2705 An\xe1lisis completo. Solicita evaluaci\xf3n criterial.":"\u26a0\ufe0f Identifica las voces silenciadas o ausentes":"\u26a0\ufe0f Identifica las voces presentes en el discurso":"\u26a0\ufe0f Lista al menos 2 estrategias ret\xf3ricas con ejemplos":"\u26a0\ufe0f Identifica el marco ideol\xf3gico del texto"),[Ae,$e,we,Se]);(0,r.useEffect)((()=>{Ae&&sessionStorage.setItem("tablaACD_marcoIdeologico",Ae)}),[Ae]),(0,r.useEffect)((()=>{$e&&sessionStorage.setItem("tablaACD_estrategiasRetoricas",$e)}),[$e]),(0,r.useEffect)((()=>{we&&sessionStorage.setItem("tablaACD_vocesPresentes",we)}),[we]),(0,r.useEffect)((()=>{Se&&sessionStorage.setItem("tablaACD_vocesSilenciadas",Se)}),[Se]),(0,r.useEffect)((()=>{const e=()=>{const e=sessionStorage.getItem("tablaACD_marcoIdeologico")||"",a=sessionStorage.getItem("tablaACD_estrategiasRetoricas")||"",i=sessionStorage.getItem("tablaACD_vocesPresentes")||"",r=sessionStorage.getItem("tablaACD_vocesSilenciadas")||"";e!==Ae&&Ce(e),a!==$e&&Ee(a),i!==we&&ke(i),r!==Se&&ze(r),(e||a||i||r)&&console.log("\ud83d\udd04 [TablaACD] Borradores restaurados desde sesi\xf3n")};return window.addEventListener("session-restored",e),()=>window.removeEventListener("session-restored",e)}),[Ae,$e,we,Se]);const Ze=(null===y||void 0===y||null===(a=y.metadata)||void 0===a?void 0:a.document_id)||null,ea=`tabla_acd_${Ze}`;(0,b.Ay)(ea,{enabled:null!==Ze,studentAnswers:{marco_ideologico:Ae,estrategias_retoricas:$e,voces_presentes:we,voces_silenciadas:Se},aiFeedbacks:{tabla_acd:De},onRehydrate:e=>{var a,i,r,s,t;null!==(a=e.student_answers)&&void 0!==a&&a.marco_ideologico&&Ce(e.student_answers.marco_ideologico),null!==(i=e.student_answers)&&void 0!==i&&i.estrategias_retoricas&&Ee(e.student_answers.estrategias_retoricas),null!==(r=e.student_answers)&&void 0!==r&&r.voces_presentes&&ke(e.student_answers.voces_presentes),null!==(s=e.student_answers)&&void 0!==s&&s.voces_silenciadas&&ze(e.student_answers.voces_silenciadas),null!==(t=e.ai_feedbacks)&&void 0!==t&&t.tabla_acd&&Ie(e.ai_feedbacks.tabla_acd)}});const aa=(0,r.useMemo)((()=>Ze?C(Ze):[]),[Ze,C]),ia=(0,r.useCallback)(((e,a)=>{const i=`"${e}" `,r={marco:Ke,estrategias:Qe,presentes:He,silenciadas:Je}[a],s={marco:Ce,estrategias:Ee,presentes:ke,silenciadas:ze}[a];if(r&&r.current&&s){const e=r.current,t=e.selectionStart||Xe[a]||0,o=e.selectionEnd||Xe[a]||0;s((a=>{const r=a.substring(0,t),s=a.substring(o),n=r+i+s;return setTimeout((()=>{if(e){const a=t+i.length;e.focus(),e.setSelectionRange(a,a)}}),0),n}))}Fe(!1)}),[Xe]),ra=(0,r.useCallback)(((e,a)=>{const i=a.target.selectionStart;Ye((a=>({...a,[e]:i})))}),[]),sa=(0,r.useCallback)((e=>{Ze&&$(Ze,e)}),[Ze,$]),ta=(0,r.useCallback)((e=>{e.preventDefault();const a=e.clipboardData.getData("text"),i=a.trim().split(/\s+/).filter((e=>e.length>0)).length;i<=40?document.execCommand("insertText",!1,a):(Ge(`\u26a0\ufe0f Solo puedes pegar hasta 40 palabras (intentaste pegar ${i}). Escribe con tus propias palabras o usa citas guardadas.`),setTimeout((()=>Ge(null)),5e3))}),[]),oa=(0,r.useMemo)((()=>(0,d.getDimension)("acd")),[]),na=(0,r.useCallback)((async()=>{if(qe&&f){Re(!0),j(null),Pe({label:"Iniciando an\xe1lisis cr\xedtico...",icon:"\ud83d\udd0d",duration:2});try{const e=[setTimeout((()=>Pe({label:"Analizando marco ideol\xf3gico...",icon:"\ud83d\udcca",duration:6})),1e3),setTimeout((()=>Pe({label:"Evaluando con DeepSeek...",icon:"\ud83e\udd16",duration:12})),4e3),setTimeout((()=>Pe({label:"Evaluando con OpenAI...",icon:"\ud83e\udde0",duration:12})),16e3),setTimeout((()=>Pe({label:"Combinando an\xe1lisis...",icon:"\ud83d\udd27",duration:4})),28e3)],a=await x({text:f,marcoIdeologico:Ae,estrategiasRetoricas:$e,vocesPresentes:we,vocesSilenciadas:Se});if(e.forEach((e=>clearTimeout(e))),Ie(a),A("rubrica2",{score:2.5*a.nivel_global,nivel:a.nivel_global,artefacto:"TablaACD",criterios:a.criterios}),J){J.recordEvent("EVALUATION_SUBMITTED",{artefacto:"TablaACD",rubricId:"rubrica2"});const e=`EVALUATION_LEVEL_${a.nivel_global}`;J.recordEvent(e,{score:2.5*a.nivel_global,nivel:a.nivel_global,artefacto:"TablaACD"}),J.recordEvent("TABLA_ACD_COMPLETED",{score:2.5*a.nivel_global,nivel:a.nivel_global}),Ae&&Ae.trim().length>50&&J.recordEvent("ACD_FRAME_IDENTIFIED",{frame:Ae.substring(0,100)}),$e&&$e.trim().length>50&&J.recordEvent("ACD_STRATEGY_IDENTIFIED",{strategies:$e.substring(0,100)}),Se&&Se.trim().length>50&&J.recordEvent("ACD_POWER_ANALYSIS",{analysis:Se.substring(0,100)}),4===a.nivel_global&&J.recordEvent("PERFECT_SCORE",{score:10,artefacto:"TablaACD"}),console.log("\ud83c\udfae [TablaACD] Recompensas registradas")}}catch(e){console.error("Error evaluando Tabla ACD:",e),j(e.message||"Error al evaluar el an\xe1lisis")}finally{Re(!1),Pe(null)}}}),[qe,f,Ae,$e,we,Se,j]);return f?(0,_.jsxs)(S,{children:[(0,_.jsxs)(z,{children:[(0,_.jsx)(D,{children:"\ud83d\udd0d Tabla de An\xe1lisis Cr\xedtico del Discurso (ACD)"}),(0,_.jsx)(I,{children:"Identifica marcos ideol\xf3gicos, estrategias ret\xf3ricas y voces presentes/silenciadas en el texto. Recibir\xe1s evaluaci\xf3n criterial basada en la R\xfabrica 2 de Literacidad Cr\xedtica."})]}),(0,_.jsx)(o.N,{children:Me&&(0,_.jsxs)(de,{as:t.P.div,initial:{opacity:0,x:300},animate:{opacity:1,x:0},exit:{opacity:0,x:300},transition:{type:"spring",damping:25},theme:h,children:[(0,_.jsxs)(me,{theme:h,children:[(0,_.jsx)("h3",{style:{margin:0},children:"\ud83d\udccb Mis Citas Guardadas"}),(0,_.jsx)("p",{style:{fontSize:"0.85rem",margin:"0.5rem 0 0 0",opacity:.8},children:0===aa.length?'Selecciona texto en "Lectura Guiada" y guarda citas':'Selecciona el campo y haz clic en "Insertar"'})]}),(0,_.jsx)(ue,{children:0===aa.length?(0,_.jsxs)(ve,{theme:h,children:[(0,_.jsx)("div",{style:{fontSize:"3rem",marginBottom:"1rem"},children:"\ud83d\udca1"}),(0,_.jsx)("p",{children:(0,_.jsx)("strong",{children:"\xbfC\xf3mo guardar citas?"})}),(0,_.jsxs)("ol",{style:{textAlign:"left",lineHeight:1.6},children:[(0,_.jsx)("li",{children:'Ve a "Lectura Guiada"'}),(0,_.jsx)("li",{children:"Selecciona texto importante"}),(0,_.jsx)("li",{children:'Clic en "\ud83d\udcbe Guardar Cita"'}),(0,_.jsx)("li",{children:"Regresa aqu\xed para usar"})]})]}):aa.map((e=>(0,_.jsxs)(pe,{theme:h,children:[(0,_.jsx)(ge,{theme:h,children:e.texto}),(0,_.jsxs)(he,{children:[(0,_.jsx)(fe,{theme:h,children:new Date(e.timestamp).toLocaleDateString("es-ES",{month:"short",day:"numeric"})}),(0,_.jsxs)("div",{style:{display:"flex",gap:"0.5rem",flexWrap:"wrap"},children:[(0,_.jsx)(xe,{onClick:()=>ia(e.texto,"marco"),theme:h,children:"Marco"}),(0,_.jsx)(xe,{onClick:()=>ia(e.texto,"estrategias"),theme:h,children:"Estrategias"}),(0,_.jsx)(xe,{onClick:()=>ia(e.texto,"presentes"),theme:h,children:"Presentes"}),(0,_.jsx)(xe,{onClick:()=>ia(e.texto,"silenciadas"),theme:h,children:"Silenciadas"}),(0,_.jsx)(be,{onClick:()=>sa(e.id),theme:h,children:"\ud83d\uddd1\ufe0f"})]})]})]},e.id)))})]})}),(0,_.jsxs)(T,{theme:h,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},children:[(0,_.jsxs)(R,{onClick:()=>Le(!Oe),children:[(0,_.jsx)(N,{theme:h,children:"\ud83d\udca1 Preguntas Gu\xeda"}),(0,_.jsx)(P,{$expanded:Oe,children:"\u25bc"})]}),(0,_.jsx)(o.N,{children:Oe&&(0,_.jsx)(O,{theme:h,initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},children:(0,_.jsx)(L,{children:null===oa||void 0===oa||null===(i=oa.preguntasGuia)||void 0===i?void 0:i.map(((e,a)=>(0,_.jsx)(M,{theme:h,children:e},a)))})})})]}),!De&&(0,_.jsxs)(_.Fragment,{children:[(Ae||$e||we||Se)&&(0,_.jsx)(ye,{theme:h,children:"\ud83d\udcbe Tu trabajo se guarda autom\xe1ticamente. Puedes cambiar de pesta\xf1a sin perder tu progreso."}),(0,_.jsx)(o.N,{children:Ve&&(0,_.jsx)(je,{as:t.P.div,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},theme:h,children:"\u2705 Guardado manual exitoso"})}),(0,_.jsx)(E,{theme:h,shortcuts:[{keys:["Ctrl","S"],label:"Guardar"},{keys:["Ctrl","Enter"],label:"Evaluar"},{keys:["Esc"],label:"Cerrar"}]}),(0,_.jsxs)(F,{theme:h,children:[(0,_.jsx)(U,{theme:h,children:"1\ufe0f\u20e3 Marco Ideol\xf3gico"}),(0,_.jsx)(G,{theme:h,children:"\xbfQu\xe9 marco ideol\xf3gico identifica en el texto?"}),(0,_.jsx)(V,{ref:Ke,theme:h,value:Ae,onChange:e=>Ce(e.target.value),onClick:e=>ra("marco",e),onKeyUp:e=>ra("marco",e),onPaste:ta,placeholder:"Ej: El texto adopta un marco neoliberal, naturalizando la competencia y el individualismo como valores universales...",disabled:Te}),Ue&&(0,_.jsx)(_e,{theme:h,children:Ue}),(0,_.jsx)(K,{theme:h,children:"Ejemplos: neoliberal, feminista, conservador, socialista, postcolonial, ambientalista..."})]}),(0,_.jsxs)(F,{theme:h,children:[(0,_.jsx)(U,{theme:h,children:"2\ufe0f\u20e3 Estrategias Ret\xf3ricas"}),(0,_.jsx)(G,{theme:h,children:"\xbfQu\xe9 estrategias ret\xf3ricas usa el autor y para qu\xe9?"}),(0,_.jsx)(V,{ref:Qe,theme:h,value:$e,onChange:e=>Ee(e.target.value),onClick:e=>ra("estrategias",e),onKeyUp:e=>ra("estrategias",e),onPaste:ta,placeholder:"Ej: \u2022 Met\xe1foras b\xe9licas ('batalla', 'combate') para naturalizar conflictos\n\u2022 Eufemismos ('ajuste estructural' en vez de 'despidos masivos')\n\u2022 Nominalizaci\xf3n ('la globalizaci\xf3n') para ocultar agentes responsables...",disabled:Te,style:{minHeight:"150px"}}),(0,_.jsx)(K,{theme:h,children:"Ejemplos: met\xe1foras, eufemismos, nominalizaci\xf3n, voz pasiva, presuposiciones, apelaci\xf3n a autoridad, falsa dicotom\xeda..."})]}),(0,_.jsxs)(F,{theme:h,children:[(0,_.jsx)(U,{theme:h,children:"3\ufe0f\u20e3 Voces en el Discurso"}),(0,_.jsx)(G,{theme:h,children:"Voces presentes (legitimadas):"}),(0,_.jsx)(B,{ref:He,theme:h,value:we,onChange:e=>ke(e.target.value),onClick:e=>ra("presentes",e),onKeyUp:e=>ra("presentes",e),onPaste:ta,placeholder:"Ej: Empresarios, economistas, expertos internacionales...",disabled:Te}),(0,_.jsx)(K,{theme:h,style:{marginBottom:"1rem"},children:"\xbfQui\xe9nes tienen autoridad en este texto?"}),(0,_.jsx)(G,{theme:h,children:"Voces silenciadas (ausentes):"}),(0,_.jsx)(B,{ref:Je,theme:h,value:Se,onChange:e=>ze(e.target.value),onClick:e=>ra("silenciadas",e),onKeyUp:e=>ra("silenciadas",e),onPaste:ta,placeholder:"Ej: Trabajadores, comunidades locales, movimientos sociales...",disabled:Te}),(0,_.jsx)(K,{theme:h,children:"\xbfQui\xe9nes NO tienen voz en este discurso?"})]}),(0,_.jsx)(Q,{$valid:qe,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},children:We}),(0,_.jsxs)(H,{children:[(0,_.jsx)(le,{onClick:()=>Fe(!Me),theme:h,$active:Me,title:"Ver mis citas guardadas del texto",$hasNotification:aa.length>0,children:Me?"\u2715 Cerrar Citas":`\ud83d\udccb Mis Citas (${aa.length})`}),(0,_.jsx)(X,{onClick:na,disabled:!qe||Te,children:Te?"\u23f3 Evaluando...":"\ud83d\udd0d Solicitar Evaluaci\xf3n Criterial"})]})]}),(0,_.jsx)(o.N,{children:Te&&(0,_.jsx)(w.A,{isEvaluating:Te,estimatedSeconds:35,currentStep:Ne,theme:h})}),Te&&!1,(0,_.jsx)(o.N,{children:De&&!Te&&(0,_.jsxs)(Y,{theme:h,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},children:[(0,_.jsx)(q,{children:(0,_.jsxs)("div",{children:[(0,_.jsx)("h3",{style:{margin:"0 0 0.5rem 0",color:h.text},children:"\ud83d\udcca Evaluaci\xf3n Criterial"}),(0,_.jsxs)(W,{$nivel:De.nivel_global,children:["Nivel ",De.nivel_global,"/4"]})]})}),(0,_.jsxs)(Z,{theme:h,children:[(0,_.jsxs)("strong",{children:[De.dimension_label,":"]})," ",De.dimension_description]}),(0,_.jsxs)(ee,{children:[(0,_.jsxs)(ae,{theme:h,children:[(0,_.jsxs)(ie,{children:[(0,_.jsx)(re,{theme:h,children:"Marco Ideol\xf3gico"}),(0,_.jsxs)(se,{$nivel:De.criterios.marco_ideologico.nivel,children:["Nivel ",De.criterios.marco_ideologico.nivel,"/4"]})]}),(null===(s=De.criterios.marco_ideologico.fortalezas)||void 0===s?void 0:s.length)>0&&(0,_.jsxs)(te,{children:[(0,_.jsx)(oe,{theme:h,children:"\u2705 Fortalezas:"}),(0,_.jsx)(ne,{children:De.criterios.marco_ideologico.fortalezas.map(((e,a)=>(0,_.jsx)(ce,{theme:h,$icon:"\u2713",children:(0,k.Gc)(e)},a)))})]}),(null===(l=De.criterios.marco_ideologico.mejoras)||void 0===l?void 0:l.length)>0&&(0,_.jsxs)(te,{children:[(0,_.jsx)(oe,{theme:h,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,_.jsx)(ne,{children:De.criterios.marco_ideologico.mejoras.map(((e,a)=>(0,_.jsx)(ce,{theme:h,$icon:"\u2192",children:(0,k.Gc)(e)},a)))})]})]}),(0,_.jsxs)(ae,{theme:h,children:[(0,_.jsxs)(ie,{children:[(0,_.jsx)(re,{theme:h,children:"Estrategias Ret\xf3ricas"}),(0,_.jsxs)(se,{$nivel:De.criterios.estrategias_retoricas.nivel,children:["Nivel ",De.criterios.estrategias_retoricas.nivel,"/4"]})]}),(null===(m=De.criterios.estrategias_retoricas.fortalezas)||void 0===m?void 0:m.length)>0&&(0,_.jsxs)(te,{children:[(0,_.jsx)(oe,{theme:h,children:"\u2705 Fortalezas:"}),(0,_.jsx)(ne,{children:De.criterios.estrategias_retoricas.fortalezas.map(((e,a)=>(0,_.jsx)(ce,{theme:h,$icon:"\u2713",children:(0,k.Gc)(e)},a)))})]}),(null===(u=De.criterios.estrategias_retoricas.mejoras)||void 0===u?void 0:u.length)>0&&(0,_.jsxs)(te,{children:[(0,_.jsx)(oe,{theme:h,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,_.jsx)(ne,{children:De.criterios.estrategias_retoricas.mejoras.map(((e,a)=>(0,_.jsx)(ce,{theme:h,$icon:"\u2192",children:(0,k.Gc)(e)},a)))})]})]}),(0,_.jsxs)(ae,{theme:h,children:[(0,_.jsxs)(ie,{children:[(0,_.jsx)(re,{theme:h,children:"Voces y Silencios"}),(0,_.jsxs)(se,{$nivel:De.criterios.voces_silencios.nivel,children:["Nivel ",De.criterios.voces_silencios.nivel,"/4"]})]}),(null===(p=De.criterios.voces_silencios.fortalezas)||void 0===p?void 0:p.length)>0&&(0,_.jsxs)(te,{children:[(0,_.jsx)(oe,{theme:h,children:"\u2705 Fortalezas:"}),(0,_.jsx)(ne,{children:De.criterios.voces_silencios.fortalezas.map(((e,a)=>(0,_.jsx)(ce,{theme:h,$icon:"\u2713",children:(0,k.Gc)(e)},a)))})]}),(null===(g=De.criterios.voces_silencios.mejoras)||void 0===g?void 0:g.length)>0&&(0,_.jsxs)(te,{children:[(0,_.jsx)(oe,{theme:h,children:"\ud83d\udca1 Oportunidades de mejora:"}),(0,_.jsx)(ne,{children:De.criterios.voces_silencios.mejoras.map(((e,a)=>(0,_.jsx)(ce,{theme:h,$icon:"\u2192",children:(0,k.Gc)(e)},a)))})]})]})]})]})})]}):(0,_.jsx)(S,{children:(0,_.jsxs)(z,{children:[(0,_.jsx)(D,{children:"\ud83d\udd0d Tabla de An\xe1lisis Cr\xedtico del Discurso"}),(0,_.jsx)(I,{children:"Carga un texto para comenzar"})]})})}}}]);