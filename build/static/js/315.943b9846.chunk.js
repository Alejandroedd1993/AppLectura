"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[315],{3505:(e,r,n)=>{n.d(r,{A:()=>i});var a=n(9950);const i=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{enabled:n=!0,preventDefault:i=!0,excludeInputs:t=!0,debug:o=!1}=r,s=(0,a.useRef)(e),c=(0,a.useRef)(new Set);(0,a.useEffect)((()=>{s.current=e}),[e]);const l=(0,a.useCallback)((e=>{const r=[];e.ctrlKey&&r.push("ctrl"),e.shiftKey&&r.push("shift"),e.altKey&&r.push("alt"),e.metaKey&&r.push("meta");const n=e.key.toLowerCase(),a={enter:"enter",escape:"escape",esc:"escape"," ":"space",arrowup:"up",arrowdown:"down",arrowleft:"left",arrowright:"right"}[n]||n;return r.push(a),r.join("+")}),[]),d=(0,a.useCallback)((e=>{if(!e)return!1;const r=e.tagName.toLowerCase(),n="true"===e.contentEditable;return"input"===r||"textarea"===r||"select"===r||n}),[]),m=(0,a.useCallback)((e=>{if(!n)return;if(t&&d(e.target))return;const r=l(e),a=s.current[r];if(o&&console.log("[useKeyboardShortcuts] Key combination:",r),a&&"function"===typeof a&&(i&&(e.preventDefault(),e.stopPropagation()),!c.current.has(r))){c.current.add(r);try{a(e)}catch(m){console.error("[useKeyboardShortcuts] Error executing handler:",m)}}}),[n,t,i,d,l,o]),u=(0,a.useCallback)((e=>{const r=l(e);c.current.delete(r)}),[l]);(0,a.useEffect)((()=>{if(n)return window.addEventListener("keydown",m),window.addEventListener("keyup",u),()=>{window.removeEventListener("keydown",m),window.removeEventListener("keyup",u)}}),[n,m,u]);return{trigger:(0,a.useCallback)((e=>{const r=s.current[e];r&&"function"===typeof r&&r({type:"manual",combination:e})}),[]),getRegisteredShortcuts:(0,a.useCallback)((()=>Object.keys(s.current)),[]),enabled:n}}},7315:(e,r,n)=>{n.r(r),n.d(r,{default:()=>Ne});var a=n(9950),i=n(4752),t=n(3291),o=n(1132),s=n(387),c=n(7424),l=n(6735);function d(e,r){const n=[];(!e||e.trim().length<100)&&n.push("El resumen debe tener al menos 100 caracteres");const a=e.match(/["']([^"']{10,})["']/g)||[],i=a.length;i<2&&n.push(`Se requieren al menos 2 citas textuales. Encontradas: ${i}`);let t=0;return a.forEach((e=>{const n=e.replace(/["']/g,"").trim();n.length>10&&!r.includes(n)&&t++})),t>0&&n.push(`${t} cita(s) no se encuentran en el texto original`),{valid:0===n.length,errors:n,citasEncontradas:i}}async function m(e){let{resumen:r,textoOriginal:n,citas:a}=e;const i=`Eval\xfaa este RESUMEN ACAD\xc9MICO seg\xfan los criterios de Comprensi\xf3n Anal\xedtica.\n\n**TEXTO ORIGINAL:**\n${n.substring(0,2e3)}...\n\n**RESUMEN DEL ESTUDIANTE:**\n${r}\n\n**CITAS DETECTADAS (${a.length}):**\n${a.map(((e,r)=>`${r+1}. "${e.cita}"`)).join("\n")}\n\n---\n\n**EVAL\xdaA SEG\xdaN ESTOS 3 CRITERIOS:**\n\n1. **Precisi\xf3n y Claridad del Resumen** (1-4):\n   - \xbfResume la tesis y argumentos principales con fidelidad?\n   - \xbfUsa sus propias palabras o solo copia fragmentos?\n   - \xbfCaptura matices y tono del autor?\n\n2. **Selecci\xf3n y Uso de Citas** (1-4):\n   - \xbfLas citas son pertinentes y representativas?\n   - \xbfSe integran coherentemente en el resumen?\n   - \xbfApoyan las ideas clave?\n\n3. **Estructura y Coherencia** (1-4):\n   - \xbfEl resumen tiene una estructura l\xf3gica?\n   - \xbfLas ideas fluyen coherentemente?\n   - \xbfSe distingue informaci\xf3n central de secundaria?\n\n**NIVELES:**\n1 = Insuficiente\n2 = B\xe1sico\n3 = Competente\n4 = Avanzado\n\n**RESPONDE EN JSON:**\n{\n  "precision_resumen": {\n    "nivel": 1-4,\n    "evidencia": "Cita espec\xedfica del resumen",\n    "fortaleza": "Lo que hizo bien",\n    "mejora": "Qu\xe9 puede mejorar"\n  },\n  "seleccion_citas": {\n    "nivel": 1-4,\n    "evidencia": "Ejemplo de cita bien/mal usada",\n    "fortaleza": "...",\n    "mejora": "..."\n  },\n  "estructura_coherencia": {\n    "nivel": 1-4,\n    "evidencia": "...",\n    "fortaleza": "...",\n    "mejora": "..."\n  }\n}`;try{const e=await(0,l.x8)({provider:"deepseek",messages:[{role:"user",content:i}],temperature:.2,max_tokens:1500,timeoutMs:3e4}),r=(0,l.HQ)(e);console.log("\ud83d\udd0d [DeepSeek ResumenAcademico] Respuesta cruda:",r.slice(0,200));let n=r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();const a=n.match(/\{[\s\S]*\}/);a&&(n=a[0]),console.log("\u2705 [DeepSeek ResumenAcademico] Respuesta limpia:",n.slice(0,200));const t=JSON.parse(n);if(!t.precision_resumen||!t.seleccion_citas||!t.estructura_coherencia)throw new Error("Respuesta sin criterios esperados");return t}catch(t){return console.error("[ResumenService] Error DeepSeek:",t),{precision_resumen:{nivel:3,evidencia:"",fortaleza:"An\xe1lisis en proceso",mejora:"Error en evaluaci\xf3n autom\xe1tica"},seleccion_citas:{nivel:3,evidencia:"",fortaleza:"An\xe1lisis en proceso",mejora:"Error en evaluaci\xf3n autom\xe1tica"},estructura_coherencia:{nivel:3,evidencia:"",fortaleza:"An\xe1lisis en proceso",mejora:"Error en evaluaci\xf3n autom\xe1tica"},_error:t.message}}}async function u(e){let{resumen:r,textoOriginal:n,citas:a}=e;const i=`Eval\xfaa la CALIDAD DE INFERENCIAS en este resumen acad\xe9mico.\n\n**TEXTO ORIGINAL:**\n${n.substring(0,2e3)}...\n\n**RESUMEN DEL ESTUDIANTE:**\n${r}\n\n---\n\n**CRITERIO CR\xcdTICO: Calidad de la Inferencia**\n\nAnaliza si el estudiante:\n- Va m\xe1s all\xe1 de lo literal para "leer entre l\xedneas"\n- Construye inferencias L\xd3GICAS basadas en evidencia textual\n- Conecta patrones sutiles y connotaciones\n- Revela significados que el autor NO declara expl\xedcitamente\n\n**NIVELES:**\n1 (Novato): Inferencias ausentes o basadas en opiniones sin sustento textual\n2 (Aprendiz): Inferencias simples o literales sin profundidad  \n3 (Competente): Inferencias l\xf3gicas y plausibles que leen entre l\xedneas\n4 (Experto): Inferencias profundas que revelan significado nuevo y perspicaz\n\n**ADEM\xc1S, EVAL\xdaA:**\n- \xbfLas citas apoyan las inferencias?\n- \xbfDistingue hechos de opiniones del autor?\n- \xbfParafrasea o solo repite?\n\n**RESPONDE EN JSON:**\n{\n  "calidad_inferencias": {\n    "nivel": 1-4,\n    "ejemplos_inferencias": ["Inferencia 1 detectada", "Inferencia 2..."],\n    "inferencias_validas": ["Las que est\xe1n bien fundamentadas"],\n    "inferencias_debiles": ["Las que necesitan m\xe1s evidencia"],\n    "evidencia_textual": "Cita del resumen que muestra la inferencia",\n    "fortaleza": "...",\n    "mejora": "..."\n  },\n  "distincion_hecho_opinion": {\n    "nivel": 1-4,\n    "evidencia": "...",\n    "fortaleza": "...",\n    "mejora": "..."\n  },\n  "parafraseo_vs_copia": {\n    "nivel": 1-4,\n    "porcentaje_parafraseado": 0-100,\n    "evidencia": "...",\n    "fortaleza": "...",\n    "mejora": "..."\n  }\n}`;try{const e=await(0,l.x8)({provider:"openai",messages:[{role:"user",content:i}],temperature:.3,max_tokens:2e3,timeoutMs:45e3}),r=(0,l.HQ)(e).replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();return JSON.parse(r)}catch(t){throw console.error("[ResumenService] Error OpenAI:",t),new Error(`Error en an\xe1lisis de inferencias: ${t.message}`)}}function p(e,r){const n={1:"Insuficiente",2:"B\xe1sico",3:"Competente",4:"Avanzado"}[r]||"En desarrollo",a=e.filter((e=>e.nivel>=3)).map((e=>e.criterio)),i=e.filter((e=>e.nivel<3)).map((e=>e.criterio));let t=`Tu resumen demuestra un nivel **${n}** de Comprensi\xf3n Anal\xedtica. `;return a.length>0&&(t+=`Destacas en: ${a.join(", ")}. `),i.length>0&&(t+=`\xc1reas de oportunidad: ${i.join(", ")}.`),t}function h(e){const r=[];return[...e].sort(((e,r)=>e.nivel-r.nivel)).slice(0,3).forEach((e=>{e.mejoras&&e.mejoras[0]&&r.push(e.mejoras[0])})),r}async function g(e){let{resumen:r,textoOriginal:n}=e;console.log("\ud83d\udcdd [ResumenService] Iniciando evaluaci\xf3n dual...");const a=d(r,n);if(!a.valid)throw new Error(`Validaci\xf3n fallida: ${a.errors.join("; ")}`);console.log(`\u2705 [ResumenService] Validaci\xf3n pasada. Citas encontradas: ${a.citasEncontradas}`);const i=function(e){const r=/["']([^"']{10,})["']/g,n=[];let a;for(;null!==(a=r.exec(e));)n.push({cita:a[1],inicio:a.index,fin:a.index+a[0].length});return n}(r),[t,o]=await Promise.all([m({resumen:r,textoOriginal:n,citas:i}).catch((e=>(console.warn("[ResumenService] DeepSeek fall\xf3, continuando solo con OpenAI:",e.message),null))),u({resumen:r,textoOriginal:n,citas:i}).catch((e=>(console.warn("[ResumenService] OpenAI fall\xf3, continuando solo con DeepSeek:",e.message),null)))]);if(!t&&!o)throw new Error("Ambas IAs fallaron. Intenta de nuevo.");console.log("\ud83d\udd00 [ResumenService] Combinando evaluaciones...");const s=function(e,r){const n=[];e.seleccion_citas&&n.push({id:"seleccion_citas",criterio:"Selecci\xf3n y Uso de Citas",nivel:e.seleccion_citas.nivel,evidencia:[e.seleccion_citas.evidencia],fortalezas:[e.seleccion_citas.fortaleza],mejoras:[e.seleccion_citas.mejora],fuente:"DeepSeek"}),r.calidad_inferencias&&n.push({id:"calidad_inferencias",criterio:"Calidad de la Inferencia",nivel:r.calidad_inferencias.nivel,evidencia:[r.calidad_inferencias.evidencia_textual,...r.calidad_inferencias.ejemplos_inferencias||[]],fortalezas:[r.calidad_inferencias.fortaleza],mejoras:[r.calidad_inferencias.mejora],inferencias_validas:r.calidad_inferencias.inferencias_validas||[],inferencias_debiles:r.calidad_inferencias.inferencias_debiles||[],fuente:"OpenAI"}),e.precision_resumen&&n.push({id:"precision_resumen",criterio:"Precisi\xf3n y Claridad del Resumen",nivel:e.precision_resumen.nivel,evidencia:[e.precision_resumen.evidencia],fortalezas:[e.precision_resumen.fortaleza],mejoras:[e.precision_resumen.mejora],fuente:"DeepSeek"}),r.distincion_hecho_opinion&&n.push({id:"distincion_hecho_opinion",criterio:"Distinci\xf3n Hecho vs Opini\xf3n",nivel:r.distincion_hecho_opinion.nivel,evidencia:[r.distincion_hecho_opinion.evidencia],fortalezas:[r.distincion_hecho_opinion.fortaleza],mejoras:[r.distincion_hecho_opinion.mejora],fuente:"OpenAI"}),r.parafraseo_vs_copia&&n.push({id:"parafraseo",criterio:"Par\xe1frasis vs Copia",nivel:r.parafraseo_vs_copia.nivel,evidencia:[r.parafraseo_vs_copia.evidencia],fortalezas:[r.parafraseo_vs_copia.fortaleza],mejoras:[r.parafraseo_vs_copia.mejora],porcentaje_parafraseado:r.parafraseo_vs_copia.porcentaje_parafraseado||0,fuente:"OpenAI"});const a=n.map((e=>e.nivel)),i=Math.round(a.reduce(((e,r)=>e+r),0)/a.length*2.5),t=Math.round(a.reduce(((e,r)=>e+r),0)/a.length);return{dimension:"comprension_analitica",scoreGlobal:i,nivel:t,criteriosEvaluados:n,resumenDimension:p(n,t),siguientesPasos:h(n),fuentes:{deepseek:e,openai:r}}}(t||{},o||{});return console.log(`\u2705 [ResumenService] Evaluaci\xf3n completada. Nivel global: ${s.nivel}/4`),s}var f=n(5361);const x=function(e){let r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{cooldownMs:n=5e3,maxPerHour:i=10}=r,[t,o]=(0,a.useState)(!0),[s,c]=(0,a.useState)(i),[l,d]=(0,a.useState)(0),m=(0,a.useRef)(0),u=(0,a.useRef)([]),p=(0,a.useRef)(null),h=(0,a.useCallback)((()=>{const e=Date.now()-36e5;u.current=u.current.filter((r=>r>e))}),[]),g=(0,a.useCallback)((()=>{h();const e=i-u.current.length;return c(Math.max(0,e)),e}),[h,i]),f=(0,a.useCallback)((()=>{const e=Date.now()-m.current;if(e<n){const r=n-e;return d(Math.ceil(r/1e3)),o(!1),!1}return d(0),!0}),[n]),x=(0,a.useCallback)((()=>g()>0),[g]),v=(0,a.useCallback)((()=>{if(!f())return{allowed:!1,reason:"cooldown",message:`Espera ${l} segundos antes de intentar nuevamente.`,waitSeconds:l};if(!x())return{allowed:!1,reason:"hourly_limit",message:`Has alcanzado el l\xedmite de ${i} operaciones por hora. Intenta m\xe1s tarde.`,waitSeconds:null};const r=Date.now();m.current=r,u.current.push(r),g(),o(!1),p.current&&clearTimeout(p.current),p.current=setTimeout((()=>{o(!0),d(0)}),n);try{localStorage.setItem(`ratelimit_${e}`,JSON.stringify({lastOperation:r,operations:u.current}))}catch(a){console.warn("No se pudo persistir rate limit:",a)}return{allowed:!0,reason:null,message:"Operaci\xf3n permitida",remaining:s-1}}),[f,x,n,e,i,l,s,g]),b=(0,a.useCallback)((()=>{p.current&&clearTimeout(p.current),o(!0),d(0)}),[]),y=(0,a.useCallback)((()=>{u.current=[],m.current=0,c(i),b();try{localStorage.removeItem(`ratelimit_${e}`)}catch(r){console.warn("No se pudo limpiar rate limit:",r)}}),[e,i,b]);return(0,a.useEffect)((()=>{try{const r=localStorage.getItem(`ratelimit_${e}`);if(r){const{lastOperation:e,operations:n}=JSON.parse(r);m.current=e,u.current=n||[],h(),g(),f()}}catch(r){console.warn("Error restaurando rate limit:",r)}}),[e,h,g,f]),(0,a.useEffect)((()=>{if(!t&&l>0){const e=setInterval((()=>{const r=Date.now()-m.current,a=n-r;a<=0?(o(!0),d(0),clearInterval(e)):d(Math.ceil(a/1e3))}),1e3);return()=>clearInterval(e)}}),[t,l,n]),(0,a.useEffect)((()=>()=>{p.current&&clearTimeout(p.current)}),[]),{canProceed:t&&s>0,remaining:s,nextAvailableIn:l,attemptOperation:v,resetCooldown:b,resetAll:y,info:{cooldownMs:n,maxPerHour:i,operationsThisHour:u.current.length}}};var v=n(3505),b=n(539),y=n(7525),$=n(4414);const j=i.Ay.div`
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
`,A=i.Ay.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${e=>e.theme.primary||"#2196F3"};
`,w=i.Ay.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary||"#333"};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,E=i.Ay.p`
  margin: 0;
  color: ${e=>e.theme.textSecondary||"#666"};
  line-height: 1.6;
`,k=i.Ay.div`
  background: ${e=>`${e.theme.primary||"#2196F3"}08`};
  border: 1px solid ${e=>`${e.theme.primary||"#2196F3"}40`};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,C=i.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`,_=i.Ay.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${e=>e.theme.textPrimary||"#333"};
`,S=i.Ay.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: ${e=>e.theme.textSecondary||"#666"};
  padding: 0.25rem 0.5rem;
  
  &:hover {
    color: ${e=>e.theme.textPrimary||"#333"};
  }
`,z=i.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,I=i.Ay.div`
  color: ${e=>e.theme.textPrimary||"#333"};
  line-height: 1.6;
  font-size: 0.95rem;
  
  strong {
    color: ${e=>e.theme.primary||"#2196F3"};
  }
`,R=i.Ay.div`
  background: ${e=>e.theme.cardBg||"#ffffff"};
  border: 1px solid ${e=>e.theme.border||"#e0e0e0"};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,P=i.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`,N=i.Ay.label`
  font-size: 1rem;
  font-weight: 600;
  color: ${e=>e.theme.textPrimary||"#333"};
`,D=i.Ay.div`
  display: flex;
  gap: 1rem;
`,O=i.Ay.span`
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  background: ${e=>e.$valid?`${e.theme.success||"#4CAF50"}20`:`${e.theme.warning||"#FF9800"}20`};
  color: ${e=>e.$valid?e.theme.success||"#4CAF50":e.theme.warning||"#FF9800"};
  font-weight: 600;
  font-size: 0.9rem;
`,F=i.Ay.textarea`
  width: 100%;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid ${e=>e.theme.border||"#e0e0e0"};
  background: ${e=>e.$isLocked?`${e.theme.surface||"#f5f5f5"}`:e.theme.background||"#fff"};
  color: ${e=>e.theme.textPrimary||"#333"};
  font-size: 1rem;
  line-height: 1.8;
  font-family: inherit;
  resize: vertical;
  min-height: 200px;
  opacity: ${e=>e.$isLocked?.7:1};
  
  &:focus {
    outline: none;
    border-color: ${e=>e.theme.primary||"#2196F3"};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${e=>e.theme.surface||"#f5f5f5"};
  }
`,T=i.Ay.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin-top: 1rem;
  background: linear-gradient(135deg, ${e=>e.theme.primary}15, ${e=>e.theme.info}10);
  border: 2px solid ${e=>e.theme.primary}40;
  border-radius: 8px;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`,L=i.Ay.div`
  font-size: 2rem;
  flex-shrink: 0;
`,M=i.Ay.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  strong {
    color: ${e=>e.theme.textPrimary};
    font-size: 1rem;
  }
  
  span {
    color: ${e=>e.theme.textSecondary};
    font-size: 0.9rem;
  }
`,G=i.Ay.button`
  padding: 0.6rem 1.2rem;
  background: ${e=>e.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    background: ${e=>e.theme.primaryDark||e.theme.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${e=>e.theme.primary}40;
  }
  
  &:active {
    transform: translateY(0);
  }
`,H=i.Ay.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${e=>`${e.theme.warning||"#FF9800"}15`};
  border-left: 3px solid ${e=>e.theme.warning||"#FF9800"};
  border-radius: 6px;
`,U=i.Ay.div`
  color: ${e=>e.theme.textPrimary||"#333"};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`,q=i.Ay.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`,B=i.Ay.button`
  padding: 0.9rem 1.8rem;
  background: ${e=>e.theme.primary||"#2196F3"};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: ${e=>e.disabled?"not-allowed":"pointer"};
  opacity: ${e=>e.disabled?.6:1};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  }
`,V=(i.Ay.button`
  padding: 0.9rem 1.8rem;
  background: transparent;
  color: ${e=>e.theme.primary||"#2196F3"};
  border: 2px solid ${e=>e.theme.primary||"#2196F3"};
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>`${e.theme.primary||"#2196F3"}10`};
    transform: translateY(-2px);
  }
`,i.Ay.div`
  background: ${e=>e.theme.cardBg||"#ffffff"};
  border: 2px solid ${e=>e.theme.primary||"#2196F3"};
  border-radius: 12px;
  padding: 2rem;
`),Y=i.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`,K=i.Ay.h2`
  margin: 0;
  font-size: 1.5rem;
  color: ${e=>e.theme.textPrimary||"#333"};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,J=i.Ay.span`
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  background: ${e=>e.$color};
  color: white;
  font-weight: 700;
  font-size: 1rem;
`,X=i.Ay.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${e=>`${e.theme.primary||"#2196F3"}08`};
  border-radius: 8px;
  font-size: 1.05rem;
  line-height: 1.8;
  color: ${e=>e.theme.textPrimary||"#333"};
`,Q=i.Ay.div`
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
`,W=i.Ay.div`
  background: ${e=>e.theme.surface||"#f5f5f5"};
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid ${e=>e.theme.border||"#e0e0e0"};
`,Z=i.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`,ee=i.Ay.h3`
  margin: 0;
  font-size: 1.1rem;
  color: ${e=>e.theme.textPrimary||"#333"};
`,re=i.Ay.span`
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  background: ${e=>e.$color};
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
`,ne=i.Ay.div`
  margin-bottom: 1rem;
`,ae=i.Ay.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${e=>e.$color||e.theme.textPrimary||"#333"};
  margin-bottom: 0.5rem;
`,ie=i.Ay.div`
  padding: 0.75rem;
  background: ${e=>e.theme.background||"#fff"};
  border-left: 3px solid ${e=>e.theme.primary||"#2196F3"};
  border-radius: 4px;
  font-style: italic;
  color: ${e=>e.theme.textSecondary||"#666"};
  margin-top: 0.5rem;
`,te=i.Ay.div`
  margin-bottom: 1rem;
`,oe=i.Ay.ul`
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
`,se=i.Ay.li`
  margin-bottom: 0.5rem;
  line-height: 1.6;
  color: ${e=>e.theme.textPrimary||"#333"};
`,ce=i.Ay.div`
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${e=>e.theme.border||"#e0e0e0"};
  font-size: 0.8rem;
  color: ${e=>e.theme.textSecondary||"#666"};
  font-style: italic;
`,le=i.Ay.div`
  background: ${e=>`${e.theme.success||"#4CAF50"}10`};
  border: 1px solid ${e=>`${e.theme.success||"#4CAF50"}40`};
  border-radius: 8px;
  padding: 1.5rem;
`,de=i.Ay.h3`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: ${e=>e.theme.textPrimary||"#333"};
`,me=i.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,ue=i.Ay.div`
  color: ${e=>e.theme.textPrimary||"#333"};
  line-height: 1.6;
  font-size: 0.95rem;
`,pe=i.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`,he=i.Ay.div`
  font-size: 64px;
  margin-bottom: 16px;
`,ge=i.Ay.h2`
  font-size: 1.75rem;
  margin-bottom: 8px;
  color: ${e=>e.theme.textPrimary||"#333"};
`,fe=i.Ay.p`
  font-size: 1rem;
  color: ${e=>e.theme.textSecondary||"#666"};
  max-width: 500px;
  line-height: 1.6;
`,xe=i.Ay.button`
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
`,ve=i.Ay.div`
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
`,be=i.Ay.div`
  padding: 1.5rem;
  background: ${e=>e.theme.primary};
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
`,ye=i.Ay.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,$e=i.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
`,je=i.Ay.p`
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${e=>e.theme.textPrimary};
  margin: 0 0 0.75rem 0;
  font-style: italic;
`,Ae=i.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`,we=i.Ay.span`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
`,Ee=(i.Ay.button`
  padding: 0.4rem 0.8rem;
  background: ${e=>e.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>e.theme.primaryHover};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`,i.Ay.div`
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
`),ke=i.Ay.div`
  padding: 0.75rem 1rem;
  background: ${e=>e.theme.danger}15;
  border: 1px solid ${e=>e.theme.danger}40;
  border-radius: 6px;
  color: ${e=>e.theme.danger||"#F44336"};
  font-size: 0.85rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: shake 0.5s ease;
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`,Ce=i.Ay.div`
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
`,_e=i.Ay.p`
  font-size: 0.8rem;
  line-height: 1.4;
  color: ${e=>e.theme.primary};
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: ${e=>e.theme.primary}10;
  border-left: 3px solid ${e=>e.theme.primary};
  border-radius: 4px;
`,Se=i.Ay.button`
  padding: 0.4rem 0.8rem;
  background: ${e=>e.theme.success||"#4CAF50"};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>e.theme.successHover||"#45a049"};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`,ze=i.Ay.button`
  padding: 0.4rem 0.6rem;
  background: transparent;
  color: ${e=>e.theme.danger||"#F44336"};
  border: 1px solid ${e=>e.theme.danger||"#F44336"};
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>e.theme.danger||"#F44336"};
    color: white;
  }
`,Ie=i.Ay.div`
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
`,Re=i.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: ${e=>e.theme.textSecondary||"#666"};
  
  kbd {
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
  }
  
  span {
    font-size: 0.75rem;
  }
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
    
    kbd {
      padding: 0.15rem 0.3rem;
      font-size: 0.7rem;
    }
  }
`,Pe=i.Ay.div`
  position: absolute;
  top: -40px;
  right: 0;
  background: ${e=>e.theme.success||"#4CAF50"};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 10;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    right: 20px;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid ${e=>e.theme.success||"#4CAF50"};
  }
`,Ne=e=>{var r,n;let{theme:i}=e;const{texto:l,completeAnalysis:m,setError:u,updateRubricScore:p,getCitations:h,deleteCitation:Ne}=(0,a.useContext)(s.BR),De=(0,c.useRewards)(),Oe=(null===m||void 0===m||null===(r=m.metadata)||void 0===r?void 0:r.document_id)||null,[Fe,Te]=(0,a.useState)((()=>sessionStorage.getItem("resumenAcademico_draft")||"")),[Le,Me]=(0,a.useState)(null),[Ge,He]=(0,a.useState)(!1),[Ue,qe]=(0,a.useState)(null),[Be,Ve]=(0,a.useState)(!0),[Ye,Ke]=(0,a.useState)(!1),[Je,Xe]=(0,a.useState)(null),[Qe,We]=(0,a.useState)(!1),Ze=x("evaluate_resumen",{cooldownMs:5e3,maxPerHour:10}),[er,rr]=(0,a.useState)(!1);(0,v.A)({"ctrl+s":e=>{console.log("\u2328\ufe0f Ctrl+S: Guardando borrador manualmente..."),nr.saveManual(),rr(!0),setTimeout((()=>rr(!1)),2e3)},"ctrl+enter":e=>{console.log("\u2328\ufe0f Ctrl+Enter: Evaluando resumen..."),!Ge&&ar.valid&&Ze.canProceed&&tr()},escape:e=>{console.log("\u2328\ufe0f Esc: Cerrando paneles..."),Ye?Ke(!1):Je&&Xe(null)}},{enabled:!0,excludeInputs:!1});const nr=(0,f.Ay)(Oe,{enabled:!!Oe,studentAnswers:{resumen:Fe},aiFeedbacks:{evaluacion:Le},criterionFeedbacks:{},currentIndex:0,onRehydrate:e=>{var r,n,a,i;console.log("\ud83d\udce6 [ResumenAcademico] Rehidratando datos...",{documentId:Oe,hasResumen:!(null===(r=e.student_answers)||void 0===r||!r.resumen),hasEvaluacion:!(null===(n=e.ai_feedbacks)||void 0===n||!n.evaluacion)}),null!==(a=e.student_answers)&&void 0!==a&&a.resumen&&(Te(e.student_answers.resumen),console.log(`\u2705 Resumen rehidratado: ${e.student_answers.resumen.substring(0,50)}...`)),null!==(i=e.ai_feedbacks)&&void 0!==i&&i.evaluacion&&(Me(e.ai_feedbacks.evaluacion),console.log("\u2705 Evaluaci\xf3n rehidratada"))}});(0,a.useEffect)((()=>{Fe&&(sessionStorage.setItem("resumenAcademico_draft",Fe),console.log("\ud83d\udcbe Respaldo guardado en sessionStorage"))}),[Fe]),(0,a.useEffect)((()=>{const e=()=>{const e=sessionStorage.getItem("resumenAcademico_draft");e&&e!==Fe&&(console.log("\ud83d\udd04 [ResumenAcademico] Restaurando borrador desde sesi\xf3n..."),Te(e))};return window.addEventListener("session-restored",e),()=>window.removeEventListener("session-restored",e)}),[Fe]);const ar=(0,a.useMemo)((()=>Fe&&l?d(Fe,l):{valid:!1,errors:[],citasEncontradas:0}),[Fe,l]),ir=(0,a.useMemo)((()=>Fe.trim().split(/\s+/).filter(Boolean).length),[Fe]),tr=(0,a.useCallback)((async()=>{if(!ar.valid)return void u(ar.errors.join("\n"));const e=Ze.attemptOperation();if(e.allowed){He(!0),u(null),qe({label:"Iniciando evaluaci\xf3n...",icon:"\ud83d\ude80",duration:2});try{console.log("\ud83d\udcdd [ResumenAcademico] Solicitando evaluaci\xf3n dual...");const e=[setTimeout((()=>qe({label:"Analizando estructura...",icon:"\ud83d\udcca",duration:5})),1e3),setTimeout((()=>qe({label:"Evaluando con DeepSeek...",icon:"\ud83e\udd16",duration:12})),3e3),setTimeout((()=>qe({label:"Evaluando con OpenAI...",icon:"\ud83e\udde0",duration:10})),15e3),setTimeout((()=>qe({label:"Combinando feedback...",icon:"\ud83d\udd27",duration:3})),25e3)],r=await g({resumen:Fe,textoOriginal:l});if(e.forEach((e=>clearTimeout(e))),console.log("\u2705 [ResumenAcademico] Evaluaci\xf3n recibida:",r),Me(r),We(!0),p("rubrica1",{score:r.scoreGlobal,nivel:r.nivel,artefacto:"ResumenAcademico",criterios:r.criteriosEvaluados}),De){De.recordEvent("EVALUATION_SUBMITTED",{artefacto:"ResumenAcademico",rubricId:"rubrica1"});const e=`EVALUATION_LEVEL_${r.nivel}`;De.recordEvent(e,{score:r.scoreGlobal,nivel:r.nivel,artefacto:"ResumenAcademico"});const n=(Fe.match(/"/g)||[]).length/2;n>0&&De.recordEvent("QUOTE_USED",{count:Math.floor(n),artefacto:"ResumenAcademico"}),n>=3&&De.recordEvent("STRONG_TEXTUAL_ANCHORING",{citasCount:Math.floor(n),artefacto:"ResumenAcademico"}),r.scoreGlobal>=9.5&&De.recordEvent("PERFECT_SCORE",{score:r.scoreGlobal,artefacto:"ResumenAcademico"}),console.log("\ud83c\udfae [ResumenAcademico] Recompensas registradas")}sessionStorage.removeItem("resumenAcademico_draft"),window.dispatchEvent(new Event("evaluation-complete")),nr.saveManual()}catch(r){console.error("\u274c [ResumenAcademico] Error:",r),u(`Error al evaluar: ${r.message}`)}finally{He(!1),qe(null)}}else"cooldown"===e.reason?u(`\u23f1\ufe0f Por favor espera ${e.waitSeconds} segundos antes de evaluar nuevamente.`):"hourly_limit"===e.reason&&u("\ud83d\udea6 Has alcanzado el l\xedmite de 10 evaluaciones por hora. Intenta m\xe1s tarde.")}),[Fe,l,ar,u,nr,Ze,p]),or=(0,a.useCallback)((()=>{console.log("\u270f\ufe0f [ResumenAcademico] Desbloqueando para editar..."),We(!1),Me(null)}),[]),sr=(0,a.useMemo)((()=>Oe?h(Oe):[]),[Oe,h]),cr=(0,a.useCallback)((e=>{const r=`"${e}" `;Te((e=>e+(e&&!e.endsWith(" ")?" ":"")+r)),Ke(!1),console.log("\u2705 Cita insertada en el resumen")}),[]),lr=(0,a.useCallback)((e=>{Oe&&(Ne(Oe,e),console.log(`\ud83d\uddd1\ufe0f Cita ${e} eliminada`))}),[Oe,Ne]),dr=(0,a.useCallback)((e=>{e.preventDefault();const r=e.clipboardData.getData("text"),n=r.trim().split(/\s+/).filter((e=>e.length>0)).length;if(n<=40)document.execCommand("insertText",!1,r),console.log(`\u2705 Paste permitido: ${n} palabras`);else{Xe(`\u26a0\ufe0f Solo puedes pegar hasta 40 palabras (intentaste pegar ${n}). Escribe con tus propias palabras o usa citas guardadas.`),setTimeout((()=>Xe(null)),5e3),console.warn("\ud83d\udeab Intento de pegado bloqueado (excede 40 palabras)")}}),[]),mr=(0,a.useCallback)((e=>({1:i.danger||"#F44336",2:i.warning||"#FF9800",3:i.primary||"#2196F3",4:i.success||"#4CAF50"}[e]||"#757575")),[i]),ur=(0,a.useCallback)((e=>({1:"Insuficiente",2:"B\xe1sico",3:"Competente",4:"Avanzado"}[e]||"En desarrollo")),[]);return l?(0,$.jsxs)(j,{children:[(0,$.jsxs)(A,{theme:i,children:[(0,$.jsxs)(w,{theme:i,children:[(0,$.jsx)("span",{children:"\ud83d\udcdd"}),"Resumen Acad\xe9mico con Citas"]}),(0,$.jsx)(E,{theme:i,children:"Demuestra tu comprensi\xf3n anal\xedtica resumiendo las ideas centrales del texto con al menos 2 citas textuales."})]}),(0,$.jsx)(t.N,{children:Be&&(0,$.jsxs)(k,{as:o.P.div,initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},theme:i,children:[(0,$.jsxs)(C,{children:[(0,$.jsx)(_,{theme:i,children:"\ud83d\udca1 \xbfC\xf3mo escribir un buen resumen acad\xe9mico?"}),(0,$.jsx)(S,{onClick:()=>Ve(!1),children:"\u2715"})]}),(0,$.jsxs)(z,{theme:i,children:[(0,$.jsxs)(I,{children:[(0,$.jsx)("strong",{children:"1. Identifica la tesis central:"})," \xbfCu\xe1l es la idea principal que defiende el autor?"]}),(0,$.jsxs)(I,{children:[(0,$.jsx)("strong",{children:"2. Usa citas textuales:"}),' Selecciona al menos 2 fragmentos representativos entre "comillas".']}),(0,$.jsxs)(I,{children:[(0,$.jsx)("strong",{children:"3. Parafrasea con tus palabras:"})," No copies p\xe1rrafos enteros, demuestra comprensi\xf3n."]}),(0,$.jsxs)(I,{children:[(0,$.jsx)("strong",{children:"4. Construye inferencias:"})," \xbfQu\xe9 sugiere el autor sin decirlo expl\xedcitamente?"]})]})]})}),(0,$.jsx)(t.N,{children:Ye&&(0,$.jsxs)(ve,{as:o.P.div,initial:{opacity:0,x:300},animate:{opacity:1,x:0},exit:{opacity:0,x:300},transition:{type:"spring",damping:25},theme:i,children:[(0,$.jsxs)(be,{theme:i,children:[(0,$.jsx)("h3",{style:{margin:0},children:"\ud83d\udccb Mis Citas Guardadas"}),(0,$.jsx)("p",{style:{fontSize:"0.85rem",margin:"0.5rem 0 0 0",opacity:.8},children:0===sr.length?'Selecciona texto en "Lectura Guiada" y haz clic en "\ud83d\udcbe Guardar Cita"':'Haz clic en "Insertar" para a\xf1adir al resumen'})]}),(0,$.jsx)(ye,{children:0===sr.length?(0,$.jsxs)(Ce,{theme:i,children:[(0,$.jsx)("div",{style:{fontSize:"3rem",marginBottom:"1rem"},children:"\ud83d\udca1"}),(0,$.jsx)("p",{children:(0,$.jsx)("strong",{children:"\xbfC\xf3mo guardar citas?"})}),(0,$.jsxs)("ol",{style:{textAlign:"left",lineHeight:1.6},children:[(0,$.jsx)("li",{children:'Ve a la pesta\xf1a "Lectura Guiada"'}),(0,$.jsx)("li",{children:"Selecciona el texto importante"}),(0,$.jsx)("li",{children:'En el men\xfa contextual, haz clic en "\ud83d\udcbe Guardar Cita"'}),(0,$.jsx)("li",{children:"Regresa aqu\xed para insertarla en tu resumen"})]})]}):sr.map((e=>(0,$.jsxs)($e,{theme:i,children:[(0,$.jsx)(je,{theme:i,children:e.texto}),e.nota&&(0,$.jsxs)(_e,{theme:i,children:["\ud83d\udcdd ",e.nota]}),(0,$.jsxs)(Ae,{children:[(0,$.jsx)(we,{theme:i,children:new Date(e.timestamp).toLocaleDateString("es-ES",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}),(0,$.jsxs)("div",{style:{display:"flex",gap:"0.5rem"},children:[(0,$.jsx)(Se,{onClick:()=>cr(e.texto),theme:i,children:"\ufffd Insertar"}),(0,$.jsx)(ze,{onClick:()=>lr(e.id),theme:i,title:"Eliminar cita guardada",children:"\ud83d\uddd1\ufe0f"})]})]})]},e.id)))})]})}),(0,$.jsxs)(R,{children:[(0,$.jsxs)(P,{children:[(0,$.jsx)(N,{theme:i,children:"\u270f\ufe0f Tu resumen"}),(0,$.jsxs)(D,{children:[(0,$.jsxs)(O,{$valid:ir>=50,theme:i,children:[ir," palabras"]}),(0,$.jsxs)(O,{$valid:ar.citasEncontradas>=2,theme:i,children:[ar.citasEncontradas," citas"]})]})]}),Fe.length>0&&(0,$.jsx)(Ee,{theme:i,children:"\ud83d\udcbe Tu trabajo se guarda autom\xe1ticamente. Puedes cambiar de pesta\xf1a sin perder tu progreso."}),(0,$.jsx)(t.N,{children:er&&(0,$.jsx)(Pe,{as:o.P.div,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},theme:i,children:"\u2705 Guardado manual exitoso"})}),(0,$.jsxs)(Ie,{theme:i,children:[(0,$.jsxs)(Re,{theme:i,children:[(0,$.jsx)("kbd",{children:"Ctrl"})," + ",(0,$.jsx)("kbd",{children:"S"})," ",(0,$.jsx)("span",{children:"Guardar"})]}),(0,$.jsxs)(Re,{theme:i,children:[(0,$.jsx)("kbd",{children:"Ctrl"})," + ",(0,$.jsx)("kbd",{children:"Enter"})," ",(0,$.jsx)("span",{children:"Evaluar"})]}),(0,$.jsxs)(Re,{theme:i,children:[(0,$.jsx)("kbd",{children:"Esc"})," ",(0,$.jsx)("span",{children:"Cerrar"})]})]}),(0,$.jsx)(F,{value:Fe,onChange:e=>Te(e.target.value),onPaste:dr,placeholder:'Ejemplo: El autor argumenta que "la literacidad cr\xedtica es esencial en la era digital". Esta tesis se sustenta en...',rows:12,theme:i,disabled:Ge||Qe,$isLocked:Qe}),Qe&&(0,$.jsxs)(T,{theme:i,children:[(0,$.jsx)(L,{children:"\ud83d\udd12"}),(0,$.jsxs)(M,{children:[(0,$.jsx)("strong",{children:"Resumen enviado a evaluaci\xf3n"}),(0,$.jsx)("span",{children:'Revisa el feedback abajo. Si deseas mejorar tu trabajo, haz clic en "Seguir Editando".'})]}),(0,$.jsx)(G,{onClick:or,theme:i,children:"\u270f\ufe0f Seguir Editando"})]}),Je&&(0,$.jsx)(ke,{theme:i,children:Je}),Fe.length>0&&!ar.valid&&(0,$.jsx)(H,{theme:i,children:ar.errors.map(((e,r)=>(0,$.jsxs)(U,{children:["\u26a0\ufe0f ",e]},r)))}),(0,$.jsxs)(q,{children:[(0,$.jsx)(xe,{onClick:()=>Ke(!Ye),theme:i,$active:Ye,title:"Ver mis citas guardadas del texto",$hasNotification:sr.length>0,children:Ye?"\u2715 Cerrar Citas":`\ud83d\udccb Mis Citas (${sr.length})`}),(0,$.jsx)(B,{onClick:tr,disabled:!ar.valid||Ge||!Ze.canProceed,theme:i,title:!Ze.canProceed&&Ze.nextAvailableIn>0?`Espera ${Ze.nextAvailableIn}s`:0===Ze.remaining?"L\xedmite de evaluaciones alcanzado (10/hora)":`${Ze.remaining} evaluaciones restantes esta hora`,children:Ge?"\u23f3 Evaluando con IA Dual...":!Ze.canProceed&&Ze.nextAvailableIn>0?`\u23f1\ufe0f Espera ${Ze.nextAvailableIn}s`:0===Ze.remaining?"\ud83d\udea6 L\xedmite alcanzado":"\ud83c\udf93 Solicitar Evaluaci\xf3n Criterial"})]})]}),(0,$.jsx)(t.N,{children:Ge&&(0,$.jsx)(b.A,{isEvaluating:Ge,estimatedSeconds:30,currentStep:Ue,theme:i})}),(0,$.jsx)(t.N,{children:Le&&(0,$.jsxs)(V,{as:o.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},theme:i,children:[(0,$.jsxs)(Y,{theme:i,children:[(0,$.jsxs)(K,{children:[(0,$.jsx)("span",{children:"\ud83c\udf93"}),"Evaluaci\xf3n Criterial de Comprensi\xf3n Anal\xedtica"]}),(0,$.jsxs)(J,{$color:mr(Le.nivel),children:["Nivel ",Le.nivel,"/4: ",ur(Le.nivel)]})]}),Le.resumenDimension&&(0,$.jsx)(X,{theme:i,children:(0,y.Gc)(Le.resumenDimension)}),(0,$.jsx)(Q,{children:null===(n=Le.criteriosEvaluados)||void 0===n?void 0:n.map(((e,r)=>(0,$.jsxs)(W,{theme:i,children:[(0,$.jsxs)(Z,{children:[(0,$.jsx)(ee,{theme:i,children:e.criterio}),(0,$.jsxs)(re,{$color:mr(e.nivel),children:["Nivel ",e.nivel,"/4"]})]}),e.evidencia&&e.evidencia.length>0&&(0,$.jsxs)(ne,{children:[(0,$.jsx)(ae,{theme:i,children:"\ud83d\udccc Evidencia detectada:"}),e.evidencia.map(((e,r)=>(0,$.jsxs)(ie,{theme:i,children:['"',e,'"']},r)))]}),e.fortalezas&&e.fortalezas.length>0&&(0,$.jsxs)(te,{children:[(0,$.jsx)(ae,{$color:i.success,children:"\u2728 Fortalezas:"}),(0,$.jsx)(oe,{children:e.fortalezas.map(((e,r)=>(0,$.jsx)(se,{theme:i,children:(0,y.Gc)(e)},r)))})]}),e.mejoras&&e.mejoras.length>0&&(0,$.jsxs)(te,{children:[(0,$.jsx)(ae,{$color:i.warning,children:"\ud83c\udf31 \xc1reas de mejora:"}),(0,$.jsx)(oe,{children:e.mejoras.map(((e,r)=>(0,$.jsx)(se,{theme:i,children:(0,y.Gc)(e)},r)))})]}),(0,$.jsxs)(ce,{theme:i,children:["Evaluado por: ",e.fuente]})]},r)))}),Le.siguientesPasos&&Le.siguientesPasos.length>0&&(0,$.jsxs)(le,{theme:i,children:[(0,$.jsx)(de,{theme:i,children:"\ud83d\ude80 Siguientes pasos para mejorar"}),(0,$.jsx)(me,{children:Le.siguientesPasos.map(((e,r)=>(0,$.jsxs)(ue,{theme:i,children:[r+1,". ",(0,y.Gc)(e)]},r)))})]})]})})]}):(0,$.jsxs)(pe,{children:[(0,$.jsx)(he,{children:"\ud83d\udcda"}),(0,$.jsx)(ge,{theme:i,children:"No hay texto cargado"}),(0,$.jsx)(fe,{theme:i,children:'Carga un texto en "Lectura Guiada" y anal\xedzalo en "An\xe1lisis del Texto" para crear tu resumen acad\xe9mico.'})]})}}}]);