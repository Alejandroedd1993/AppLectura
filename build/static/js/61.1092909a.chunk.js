"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[61],{4859:(e,t,r)=>{r.r(t),r.d(t,{default:()=>Fe});var i=r(9950);function n(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:4e3;if(!e)return"";return`Texto base para contextualizar la pregunta del usuario:\n${e.length>t?e.slice(0,t)+"\n[Texto truncado]":e}`}var o=r(4752),a=r(387),s=r(2773),l=r(4326),c=r(5803);const d=new class{constructor(){this.providers={tavily:{baseUrl:"https://api.tavily.com/search",requiresKey:!0},serper:{baseUrl:"https://google.serper.dev/search",requiresKey:!0},duckduckgo:{baseUrl:"https://api.duckduckgo.com/",requiresKey:!1}},this.defaultProvider="tavily",this.maxResults=5,this.timeout=1e4}async searchWeb(e){arguments.length>1&&void 0!==arguments[1]||this.defaultProvider;let t=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};try{console.log(`\ud83d\udd0d Buscando en web v\xeda backend: "${e}"`);const r={maxResults:t.maxResults||this.maxResults,language:t.language||"es",...t},i={query:e,type:t.analysisType||"general",maxResults:r.maxResults};console.log("\ud83d\udce4 [webSearchService] Enviando petici\xf3n a /api/web-search:",i);const n=await(0,c.u9)("/api/web-search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)},6e4);if(console.log("\ud83d\udce5 [webSearchService] Respuesta recibida:",n.status,n.statusText),!n.ok){const e=await n.json().catch((()=>({})));throw console.error("\u274c [webSearchService] Error del backend:",e),new Error(`Backend search error: ${n.status} - ${e.error||n.statusText}`)}const o=await n.json();console.log("\ud83d\udcca [webSearchService] Datos recibidos del backend:",o);const a=(o.resultados||[]).map((e=>({title:e.titulo,url:e.url,snippet:e.resumen||"",source:e.fuente,relevanceScore:e.score||0,publishedDate:e.fecha})));return console.log("\u2705 [webSearchService] Resultados formateados:",a.length),a}catch(r){throw console.error("\u274c Error en b\xfasqueda web:",r),new Error(`Error en b\xfasqueda web: ${r.message}`)}}generateCriticalLiteracyQueries(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"contexto-social";const r=[],i=this.extractKeywords(e),n=i.slice(0,3).join(" ");switch(t){case"contexto-social":r.push(`${n} contexto social hist\xf3rico`),r.push(`${n} impacto social contempor\xe1neo`),r.push(`${n} perspectiva sociol\xf3gica`);break;case"perspectiva-critica":r.push(`${n} an\xe1lisis cr\xedtico debate`),r.push(`${n} controversias opiniones`),r.push(`${n} puntos de vista alternativos`);break;case"fuentes-contraste":r.push(`${n} investigaci\xf3n acad\xe9mica reciente`),r.push(`${n} estudios cient\xedficos evidencia`),r.push(`${n} fuentes primarias documentos`);break;case"analisis-integral":r.push(`${n} contexto pol\xedtico econ\xf3mico`),r.push(`${n} dimensiones culturales`),r.push(`${n} implicaciones \xe9ticas`);break;case"academico":r.push(`${i.slice(0,3).join(" ")} investigaci\xf3n acad\xe9mica`),r.push(`${i.slice(0,2).join(" ")} estudios recientes`);break;case"historico":r.push(`${i.slice(0,3).join(" ")} contexto hist\xf3rico`),r.push(`${i.slice(0,2).join(" ")} antecedentes`);break;case"cientifico":r.push(`${i.slice(0,3).join(" ")} investigaci\xf3n cient\xedfica`),r.push(`${i.slice(0,2).join(" ")} estudios peer-reviewed`);break;default:r.push(`${n} informaci\xf3n actualizada`),r.push(`${n} contexto`)}return r}async searchForCriticalContext(e,t){let r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};try{console.log(`\ud83d\udd0d Iniciando b\xfasqueda para literacidad cr\xedtica: ${t}`);const n=this.generateCriticalLiteracyQueries(e,t),o=[];for(const e of n)try{const t=await this.searchWeb(e,r.provider,{maxResults:Math.ceil(r.maxResults/n.length)||2,includeContent:!0,language:"es"});o.push({query:e,results:t.slice(0,2)})}catch(i){console.warn(`\u26a0\ufe0f Error en consulta "${e}":`,i.message)}return{tipoAnalisis:t,totalQueries:n.length,resultados:o,summary:this.generateSearchSummary(o,t)}}catch(i){throw console.error("\u274c Error en b\xfasqueda de literacidad cr\xedtica:",i),i}}generateSearchSummary(e,t){const r={totalResultados:e.reduce(((e,t)=>e+t.results.length),0),consultasRealizadas:e.length,tipoAnalisis:t,fuentesEncontradas:[],temasRelevantes:[]};return e.forEach((e=>{e.results.forEach((e=>{var t;e.url&&!r.fuentesEncontradas.includes(e.url)&&r.fuentesEncontradas.push(e.url);const i=(null===(t=e.title)||void 0===t?void 0:t.toLowerCase().split(" ").filter((e=>e.length>4)))||[];r.temasRelevantes.push(...i)}))})),r.temasRelevantes=[...new Set(r.temasRelevantes)],r}extractKeywords(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:5;const r=new Set(["el","la","de","que","y","a","en","un","es","se","no","te","lo","le","da","su","por","son","con","para","al","del","los","las","una","como","pero","sus","han","fue","ser","est\xe1","todo","m\xe1s","muy","puede","sobre"]),i=e.toLowerCase().replace(/[^\w\s]/g," ").split(/\s+/).filter((e=>e.length>3&&!r.has(e))),n={};return i.forEach((e=>{n[e]=(n[e]||0)+1})),Object.entries(n).sort(((e,t)=>{let[,r]=e,[,i]=t;return i-r})).slice(0,t).map((e=>{let[t]=e;return t}))}async checkBackendAvailability(){try{var e;const t=await(0,c.u9)("/api/web-search/test",{method:"GET"},5e3);if(!t.ok)return!1;return"simulada"!==(null===(e=(await t.json()).configuracion)||void 0===e?void 0:e.modo_funcionamiento)}catch(t){return console.warn("\u26a0\ufe0f No se pudo verificar disponibilidad de b\xfasqueda web:",t),!1}}};const u=function(e){const[t,r]=(0,i.useState)(!1),[n,o]=(0,i.useState)(null),[a,s]=(0,i.useState)(null),[l,c]=(0,i.useState)(null);return{search:(0,i.useCallback)((async(t,i)=>{if(console.log("\ud83d\udd0e [useWebSearchTutor] Iniciando b\xfasqueda",{enabled:null===e||void 0===e?void 0:e.enabled,query:t}),null===e||void 0===e||!e.enabled)return console.warn("\u26a0\ufe0f [useWebSearchTutor] B\xfasqueda deshabilitada por config"),null;o(null),r(!0),s(t);try{const r=(i||"").slice(0,2e3);let n;n="function"===typeof d.generateCriticalLiteracyQueries?d.generateCriticalLiteracyQueries(r,e.analysisType):"function"===typeof d.generateSearchQueries?d.generateSearchQueries(r):[t];const o=t||n[0];console.log("\ud83c\udf10 [useWebSearchTutor] Llamando webSearchService.searchWeb",{effectiveQuery:o,provider:e.provider});const a=await d.searchWeb(o,e.provider,{maxResults:e.maxResults||5,language:"es"});return console.log("\u2705 [useWebSearchTutor] Resultados recibidos:",(null===a||void 0===a?void 0:a.length)||0),c(a),a}catch(n){return console.error("\u274c [useWebSearchTutor] Error en b\xfasqueda:",n),o(n.message||"Error en b\xfasqueda web"),null}finally{r(!1)}}),[e]),loading:t,error:n,lastQuery:a,lastResults:l}},m="Integra de forma cr\xedtica estos resultados externos en tu respuesta al usuario:";function p(e){if(!e||!Array.isArray(e)||0===e.length)return console.warn("\u26a0\ufe0f [buildEnrichmentPrompt] Sin resultados v\xe1lidos"),"";const t=e.map(((e,t)=>`Resultado ${t+1}:\nT\xedtulo: ${e.title||"Sin t\xedtulo"}\nResumen: ${e.snippet||e.description||e.resumen||"Sin resumen"}\nURL: ${e.url||"Sin URL"}`)).join("\n---\n"),r=`${m}\n\n${t}\n\nUsa esta informaci\xf3n para enriquecer tu respuesta, citando las fuentes cuando sea relevante.`;return console.log("\ud83d\udcdd [buildEnrichmentPrompt] Prompt construido, longitud:",r.length),r}var h=r(4414);const g=o.Ay.button`
  padding: 0.5rem 0.75rem;
  background: #16a34a;
  color: #fff;
  border: 1px solid #16a34a;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  transition: all .2s ease;
  &:disabled { opacity:.5; cursor:not-allowed; }
  &:hover:not(:disabled){ opacity:.9; }
`;function f(e){let{query:t,contextBuilder:r,onEnriched:n,provider:o="duckduckgo",maxResults:a=3,analysisType:s="contexto-social",disabled:l,children:c="\ud83c\udf10 Con Web",debug:d=!0}=e;const{search:m,loading:f}=u({enabled:!l,provider:o,maxResults:a,analysisType:s}),x=(0,i.useCallback)((async()=>{if(!l&&null!==t&&void 0!==t&&t.trim()){console.log("\ud83d\udd0d [WebEnrichmentButton] Iniciando b\xfasqueda web...",{query:t.trim()});try{const e=r?r(t):"";d&&console.log("[WebEnrichmentButton] Ejecutando b\xfasqueda",{query:t,contextoPreview:null===e||void 0===e?void 0:e.slice(0,120)});const i=await m(t.trim(),e);if(console.log("\ud83d\udcca [WebEnrichmentButton] Resultados recibidos:",(null===i||void 0===i?void 0:i.length)||0,i),i&&i.length){const e=p(i);console.log("\u2705 [WebEnrichmentButton] Contexto web enriquecido:",e.substring(0,200)),console.log("\ud83d\udcdd [WebEnrichmentButton] Pregunta original:",t.trim()),null===n||void 0===n||n(e),d&&console.log("[WebEnrichmentButton] Callback onEnriched ejecutado")}else console.warn("\u26a0\ufe0f [WebEnrichmentButton] Sin resultados de b\xfasqueda"),alert("No se encontraron resultados en la b\xfasqueda web. Intenta reformular tu pregunta.")}catch(e){console.error("\u274c [WebEnrichmentButton] Error en b\xfasqueda:",e),alert(`Error en b\xfasqueda web: ${e.message}`),d&&console.warn("[WebEnrichmentButton] Error",e)}}}),[l,t,m,r,n,d]);return(0,h.jsx)(g,{type:"button","data-testid":"btn-con-web",disabled:l||f||!(null!==t&&void 0!==t&&t.trim()),title:l?"Activa Web antes de usar":"Realizar b\xfasqueda web y enriquecer",onClick:x,children:f?"Buscando...":c})}var x=r(9877);const b=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{shadow:r=!0,onChange:n}=t,o=(0,i.useMemo)((()=>x.Qr.computeKeyFromText(e||"")),[e]),[a,s]=(0,i.useState)([]);(0,i.useRef)(!1),(0,i.useEffect)((()=>{if(!o)return;return x.Qr.subscribe(o,(e=>{s(e),n&&n(e)}))}),[o,n]);const l=(0,i.useMemo)((()=>a.filter((e=>"highlight"===e.kind))),[a]),c=(0,i.useMemo)((()=>a.filter((e=>"note"===e.kind))),[a]),d=(0,i.useCallback)((e=>l.some((t=>t.paragraphIndex===e))),[l]),u=(0,i.useCallback)((function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"manual";return o?x.Qr.toggleHighlight(o,e,t):{active:!1}}),[o]),m=(0,i.useCallback)((e=>o?x.Qr.addNote(o,e):null),[o]),p=(0,i.useCallback)(((e,t)=>o?x.Qr.updateAnnotation(o,e,t):null),[o]),h=(0,i.useCallback)((e=>!!o&&x.Qr.removeAnnotation(o,e)),[o]);return{storageKey:o,annotations:a,highlights:l,notes:c,isHighlighted:d,toggleHighlight:u,addNote:m,updateAnnotation:p,removeAnnotation:h,shadow:r}};const v=o.Ay.div`
  position: fixed;
  top: 60px;
  right: 20px;
  width: 320px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ccc"}};
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0,0,0,.15);
  z-index: 1700;
  overflow: hidden;
`,y=o.Ay.div`
  padding: .55rem .75rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}};
  color: #fff;
  font-size: .7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`,A=o.Ay.div`
  flex: 1;
  overflow-y: auto;
  padding: .6rem .65rem .75rem;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#f8f9fb"}};
`,E=o.Ay.div`
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ddd"}};
  border-radius: 8px;
  padding: .5rem .55rem .6rem;
  font-size: .65rem;
  line-height: 1.3;
  position: relative;
`,_=o.Ay.div`
  display: flex;
  gap: .35rem;
  margin-top: .4rem;
`,w=o.Ay.button`
  background: ${e=>{var t,r;return e.$danger?(null===(t=e.theme)||void 0===t?void 0:t.danger)||"#b91c1c":(null===(r=e.theme)||void 0===r?void 0:r.primary)||"#2563eb"}};
  color: #fff;
  border: none;
  font-size: .55rem;
  padding: .3rem .5rem;
  border-radius: 4px;
  cursor: pointer;
  &:hover { opacity:.85; }
`,S=o.Ay.div`
  font-size: .6rem;
  opacity: .7;
  text-align: center;
  padding: .75rem 0 .5rem;
`,j=o.Ay.form`
  padding: .45rem .55rem .55rem;
  border-top: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ddd"}};
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  display: flex;
  flex-direction: column;
  gap: .4rem;
`,R=o.Ay.textarea`
  resize: vertical;
  min-height: 52px;
  max-height: 140px;
  font-size: .6rem;
  line-height: 1.25;
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ccc"}};
  border-radius: 6px;
  padding: .4rem .45rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.inputBg)||"#fff"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"}};
`,$=500;function P(e){let{notesApi:t,onClose:r}=e;const[n,o]=(0,i.useState)("");return(0,h.jsxs)(v,{children:[(0,h.jsxs)(y,{children:[(0,h.jsxs)("span",{children:["\ud83d\udcdd Notas (",t.notes.length,")"]}),(0,h.jsx)("button",{onClick:r,style:{background:"transparent",color:"#fff",border:"none",cursor:"pointer",fontSize:".7rem"},children:"\u2716"})]}),(0,h.jsxs)(A,{children:[0===t.notes.length&&(0,h.jsx)(S,{children:"Sin notas a\xfan."}),t.notes.map((e=>(0,h.jsxs)(E,{children:[(0,h.jsx)("div",{style:{whiteSpace:"pre-wrap"},children:e.text}),(0,h.jsx)(_,{children:(0,h.jsx)(w,{$danger:!0,onClick:()=>t.removeNote(e.id),children:"Borrar"})})]},e.id)))]}),(0,h.jsxs)(j,{onSubmit:e=>{e.preventDefault();const r=n.trim();r&&(r.length>$?alert("Nota demasiado larga (m\xe1x 500 caracteres)"):(t.createNote(r,{createdAt:Date.now(),kind:"note"}),o("")))},children:[(0,h.jsx)(R,{value:n,onChange:e=>o(e.target.value.slice(0,$+20)),placeholder:"Escribe una nota..."}),(0,h.jsxs)("div",{style:{display:"flex",gap:".4rem"},children:[(0,h.jsx)(w,{type:"submit",style:{flex:1},children:"Guardar"}),(0,h.jsx)(w,{type:"button",onClick:()=>{const e=t.exportNotes();if(!e)return;const r=new Blob([e],{type:"text/plain"}),i=URL.createObjectURL(r),n=document.createElement("a");n.href=i,n.download="notas-lectura.txt",n.click(),URL.revokeObjectURL(i)},children:"Exportar"})]})]})]})}var k=r(54),C=r(1893),T=r(7424),I=r(1132);const z=(0,o.Ay)(I.P.div)`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: ${e=>e.theme.surface};
  border: 2px solid ${e=>e.$color||e.theme.border};
  border-radius: 8px;
  font-size: 0.85rem;
  
  @media (max-width: 768px) {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
`,B=o.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`,D=o.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: ${e=>e.$color||e.theme.textPrimary};
  
  .icon {
    font-size: 1.3em;
  }
  
  .name {
    font-size: 1em;
  }
`,N=o.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85em;
  color: ${e=>e.theme.textSecondary};
  background: ${e=>e.theme.background};
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  
  .value {
    font-weight: 700;
    color: #fbbf24;
  }
`,F=o.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8em;
  color: ${e=>e.theme.textSecondary};
  padding: 0.4rem 0.6rem;
  background: ${e=>e.theme.background};
  border-radius: 6px;
  border-left: 3px solid ${e=>e.$color||e.theme.primary};
  
  .label {
    opacity: 0.8;
  }
  
  .goal {
    font-weight: 700;
    color: ${e=>e.$color||e.theme.primary};
  }
`,W=o.Ay.div`
  width: 100%;
  height: 6px;
  background: ${e=>e.theme.background};
  border-radius: 3px;
  overflow: hidden;
  position: relative;
`,K=(0,o.Ay)(I.P.div)`
  height: 100%;
  background: linear-gradient(90deg, ${e=>e.$color||e.theme.primary} 0%, ${e=>e.$color?function(e,t){try{const r=parseInt(e.replace("#",""),16),i=Math.round(2.55*t),n=(r>>16)+i,o=(r>>8&255)+i,a=(255&r)+i;return"#"+(16777216+65536*(n<255?n<1?0:n:255)+256*(o<255?o<1?0:o:255)+(a<255?a<1?0:a:255)).toString(16).slice(1)}catch{return e}}(e.$color,-20):e.theme.primaryDark||e.theme.primary} 100%);
  border-radius: 3px;
`,O=o.Ay.div`
  font-size: 0.75em;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.4;
  margin-top: 0.3rem;
  padding: 0.4rem;
  background: ${e=>e.theme.background};
  border-radius: 4px;
  
  strong {
    color: ${e=>e.theme.textPrimary};
  }
`,L=(0,o.Ay)(I.P.div)`
  display: flex;
  align-items: start;
  gap: 0.4rem;
  padding: 0.5rem;
  background: ${e=>e.theme.info?`${e.theme.info}15`:"#dbeafe"};
  border: 1px solid ${e=>e.theme.info||"#3b82f6"};
  border-radius: 6px;
  font-size: 0.75em;
  color: ${e=>e.theme.textPrimary};
  line-height: 1.4;
  margin-top: 0.3rem;
  
  .icon {
    font-size: 1.2em;
    flex-shrink: 0;
  }
`;function q(e){var t,r;let{compact:n=!1,showTooltip:o=!0}=e;const a=(0,T.useZDPDetector)(),[s,l]=(0,i.useState)(null),[c,d]=(0,i.useState)(null);if((0,i.useEffect)((()=>{if(a)try{const e=a.analyzeProgression();d(e);const t=a.history||[];t.length>0&&l(t[t.length-1])}catch(e){console.warn("Error obteniendo progresi\xf3n ZDP:",e)}}),[a]),!a||!c)return(0,h.jsxs)(z,{$color:"#6b7280",children:[(0,h.jsx)(B,{children:(0,h.jsxs)(D,{$color:"#6b7280",children:[(0,h.jsx)("span",{className:"icon",children:"\ud83c\udfaf"}),(0,h.jsx)("span",{className:"name",children:"Sin nivel detectado"})]})}),!n&&o&&(0,h.jsx)(O,{children:"Haz una pregunta para que el tutor detecte tu nivel cognitivo actual"})]});const u=(null===s||void 0===s?void 0:s.current)||(null===c||void 0===c?void 0:c.current)||{id:1,name:"Recordar",color:"#10b981",icon:"\ud83d\udcd6"},m=(null===s||void 0===s?void 0:s.zdp)||(null===c||void 0===c?void 0:c.zdp)||{id:2,name:"Comprender",color:"#3b82f6",icon:"\ud83d\udca1"},p=null===(t=null===s||void 0===s?void 0:s.shouldScaffold)||void 0===t||t,g=(null===s||void 0===s?void 0:s.confidence)||0,f=Math.min(100*g,100),x=a.calculatePoints?a.calculatePoints(u.id):0;return(0,h.jsxs)(z,{$color:u.color,initial:{opacity:0,y:-10},animate:{opacity:1,y:0},transition:{duration:.3},children:[(0,h.jsxs)(B,{children:[(0,h.jsxs)(D,{$color:u.color,children:[(0,h.jsx)("span",{className:"icon",children:u.icon}),(0,h.jsx)("span",{className:"name",children:u.name})]}),(0,h.jsxs)(N,{children:[(0,h.jsxs)("span",{className:"value",children:["+",x]}),(0,h.jsx)("span",{children:"pts"})]})]}),!n&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsxs)(F,{$color:m.color,children:[(0,h.jsx)("span",{className:"label",children:"Meta ZDP:"}),(0,h.jsxs)("span",{className:"goal",children:[m.icon," ",m.name]})]}),(0,h.jsx)(W,{children:(0,h.jsx)(K,{$color:u.color,initial:{width:0},animate:{width:`${f}%`},transition:{duration:.5,ease:"easeOut"}})}),o&&u.description&&(0,h.jsxs)(O,{children:[(0,h.jsxs)("strong",{children:[u.name,":"]})," ",u.description]}),p&&m.scaffoldingPrompt&&(0,h.jsxs)(L,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},transition:{duration:.3},children:[(0,h.jsx)("span",{className:"icon",children:"\ud83d\udca1"}),(0,h.jsx)("span",{children:m.scaffoldingPrompt})]}),c&&c.trend&&(0,h.jsxs)("div",{style:{fontSize:"0.75em",color:"ascending"===c.trend?"#10b981":"descending"===c.trend?"#f59e0b":"#6b7280",marginTop:"0.3rem",display:"flex",alignItems:"center",gap:"0.3rem"},children:[(0,h.jsxs)("span",{children:["ascending"===c.trend&&"\ud83d\udcc8 Progreso ascendente","descending"===c.trend&&"\ud83d\udcc9 Dificultad temporal","stable"===c.trend&&"\u27a1\ufe0f Nivel estable"]}),(0,h.jsxs)("span",{style:{opacity:.7},children:["(Promedio: ",(null===(r=c.avgLevel)||void 0===r?void 0:r.toFixed(1))||"N/A",")"]})]})]})]})}const U=o.Ay.div`
  background: ${e=>e.theme.cardBg};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1rem 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`,M=o.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`,H=o.Ay.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${e=>e.theme.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.4rem;
`,Q=o.Ay.button`
  background: ${e=>e.theme.danger};
  color: #fff;
  border: none;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  font-size: 0.7rem;
  letter-spacing: .3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: .9;
  &:hover { opacity: 1; }
`,V=o.Ay.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`,G=o.Ay.li`
  background: ${e=>e.active?e.theme.primary+"18":e.theme.surface};
  border: 1px solid ${e=>e.active?e.theme.primary:e.theme.border};
  border-left: 5px solid
    ${e=>e.completed?"#16a34a":e.active?e.theme.primary:e.unlocked?"#f59e0b":e.theme.border};
  padding: 0.55rem 0.7rem 0.6rem 0.75rem;
  border-radius: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  opacity: ${e=>e.locked?.55:1};
`,Y=o.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
`,J=o.Ay.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${e=>e.theme.textPrimary};
`,Z=o.Ay.span`
  font-size: 0.6rem;
  text-transform: uppercase;
  background: ${e=>e.color||e.theme.border};
  color: #fff;
  padding: 2px 6px 2px;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: .5px;
`,X=o.Ay.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.6rem;
  color: ${e=>e.theme.textSecondary};
`,ee=o.Ay.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  padding: 2px 6px;
  border-radius: 12px;
`,te=o.Ay.div`
  height: 6px;
  border-radius: 4px;
  background: ${e=>e.theme.background};
  overflow: hidden;
  border: 1px solid ${e=>e.theme.border};
`,re=o.Ay.div`
  height: 100%;
  background: linear-gradient(90deg, ${e=>e.theme.primary}, #16a34a);
  width: ${e=>e.percent}%;
  transition: width .45s ease;
`,ie=o.Ay.button`
  margin-left: auto;
  background: ${e=>e.theme.primary};
  color: #fff;
  border: none;
  padding: 0.3rem 0.55rem;
  font-size: 0.65rem;
  border-radius: 6px;
  cursor: pointer;
  opacity: .9;
  &:hover { opacity: 1; }
  &:disabled { opacity: .4; cursor: not-allowed; }
`,ne=o.Ay.p`
  margin: 0;
  font-size: 0.65rem;
  line-height: 1.3;
  color: ${e=>e.theme.textSecondary};
`;function oe(e,t){if(!e)return 0;const{scores:r=[],evidence:i=[]}=e;if(!r.length)return 0;const n=r[r.length-1],o=i[i.length-1]||0;let a=0;return a+=70*Math.min(n/t.minScore,1),a+=30*Math.min(o/t.minEvidence,1),Math.round(a)}function ae(e){let{compact:t=!1}=e;const{RUBRIC:r}=(0,T.usePedagogy)(),n=(0,T.useProgression)(),o=n.getState(),{criteria:a,sequence:s}=n,l=(0,i.useMemo)((()=>{let e=0;return s.forEach((t=>{const r=o.completed[t];r&&oe(r,a[t])>=100&&(e+=1)})),Math.round(e/s.length*100)}),[o,a,s]);return(0,h.jsxs)(U,{children:[(0,h.jsxs)(M,{children:[(0,h.jsxs)(H,{children:["\ud83d\udd01 Progresi\xf3n Cr\xedtica ",(0,h.jsxs)("small",{style:{fontWeight:400,opacity:.7},children:["(",l,"%)"]})]}),!t&&(0,h.jsx)(Q,{onClick:()=>n.resetProgress(),title:"Reiniciar progreso",children:"\u267b\ufe0f Reset"})]}),(0,h.jsx)(te,{children:(0,h.jsx)(re,{percent:l})}),(0,h.jsx)(V,{children:s.map((e=>{var i,s,l,c,d;const u=r.dimensiones[e],m=o.completed[e],p=o.current===e,g=o.unlocked.includes?o.unlocked.includes(e):o.unlocked.has(e),f=oe(m,a[e]),x=f>=100,b=!g;let v={text:"BLOQUEADA",color:"#4b5563"};return x?v={text:"COMPLETADA",color:"#16a34a"}:p?v={text:"ACTIVA",color:"#2563eb"}:g&&(v={text:"DESBLOQUEADA",color:"#f59e0b"}),(0,h.jsxs)(G,{active:p,unlocked:g,completed:x,locked:b,children:[(0,h.jsxs)(Y,{children:[(0,h.jsx)(J,{children:u.nombre}),(0,h.jsx)(Z,{color:v.color,children:v.text}),(0,h.jsx)(ie,{disabled:!g||p,onClick:()=>n.setCurrent(e),title:g?"Activar esta dimensi\xf3n":"A\xfan bloqueada",children:"Ir"})]}),!t&&(0,h.jsxs)(X,{children:[(0,h.jsxs)(ee,{title:"Intentos registrados",children:["\ud83e\uddea ",(null===m||void 0===m?void 0:m.attempts)||0]}),(0,h.jsxs)(ee,{title:"\xdaltimo puntaje",children:["\ud83c\udfc5 ",null!==(i=null===m||void 0===m||null===(s=m.scores)||void 0===s?void 0:s.slice(-1)[0])&&void 0!==i?i:"\u2014"]}),(0,h.jsxs)(ee,{title:"Promedio reciente",children:["\ud83d\udcca ",null!==m&&void 0!==m&&null!==(l=m.scores)&&void 0!==l&&l.length?(m.scores.slice(-2).reduce(((e,t)=>e+t),0)/Math.min(m.scores.length,2)).toFixed(1):"\u2014"]}),(0,h.jsxs)(ee,{title:"Evidencia \xfaltima evaluaci\xf3n",children:["\ud83d\udd17 ",null!==(c=null===m||void 0===m||null===(d=m.evidence)||void 0===d?void 0:d.slice(-1)[0])&&void 0!==c?c:0]}),(0,h.jsxs)(ee,{title:"Criterio score m\xednimo",children:["\ud83c\udfaf \u2265 ",a[e].minScore]}),(0,h.jsxs)(ee,{title:"Criterio evidencia m\xednima",children:["\ud83d\udcce \u2265 ",a[e].minEvidence]})]}),(0,h.jsx)(te,{children:(0,h.jsx)(re,{percent:f})}),!t&&(0,h.jsx)(ne,{children:x?"\u2705 Criterios cumplidos. Puedes avanzar.":p?"Trabaja esta dimensi\xf3n hasta cumplir criterios para desbloquear la siguiente.":g?"Disponible para seguir practicando.":"Bloqueada: cumple criterios de la dimensi\xf3n anterior."})]},e)}))})]})}var se=r(3291);const le=(0,o.Ay)(I.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  margin: 0.75rem;
  overflow: hidden;
`,ce=o.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  }
  
  .title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 0.95rem;
  }
  
  .toggle {
    font-size: 1.2rem;
    transition: transform 0.3s ease;
    transform: ${e=>e.$expanded?"rotate(180deg)":"rotate(0deg)"};
  }
`,de=(0,o.Ay)(I.P.div)`
  padding: 1rem;
  max-height: 60vh;
  overflow-y: auto;
`,ue=o.Ay.button`
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .icon {
    font-size: 1.2em;
  }
`,me=o.Ay.div`
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`,pe=o.Ay.h4`
  color: ${e=>e.theme.textPrimary};
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .icon {
    font-size: 1.2em;
  }
`,he=(0,o.Ay)(I.P.div)`
  background: ${e=>e.$color?`${e.$color}15`:e.theme.background};
  border: 2px solid ${e=>e.$color||e.theme.border};
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`,ge=o.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`,fe=o.Ay.div`
  font-weight: 700;
  color: ${e=>e.$color||e.theme.textPrimary};
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .icon {
    font-size: 1.2em;
  }
`,xe=o.Ay.div`
  background: ${e=>e.$color||e.theme.primary};
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
`,be=o.Ay.div`
  font-size: 0.8rem;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.4;
  margin-bottom: 0.5rem;
`,ve=o.Ay.ul`
  margin: 0.5rem 0 0 1.2rem;
  padding: 0;
  font-size: 0.8rem;
  color: ${e=>e.theme.textSecondary};
  
  li {
    margin: 0.3rem 0;
    line-height: 1.3;
  }
`,ye=(0,o.Ay)(I.P.div)`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 6px;
  padding: 0.6rem;
  margin-bottom: 0.6rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`,Ae=o.Ay.div`
  font-weight: 700;
  color: ${e=>e.theme.textPrimary};
  font-size: 0.85rem;
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  
  .count {
    background: ${e=>e.theme.primary};
    color: white;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    font-size: 0.7rem;
  }
`,Ee=o.Ay.div`
  font-size: 0.75rem;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.3;
  margin-bottom: 0.4rem;
`,_e=o.Ay.div`
  background: ${e=>e.theme.info?`${e.theme.info}15`:"#dbeafe"};
  border-left: 3px solid ${e=>e.theme.info||"#3b82f6"};
  padding: 0.5rem 0.7rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: ${e=>e.theme.textPrimary};
  line-height: 1.4;
  font-style: italic;
  margin-top: 0.4rem;
`,we=o.Ay.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: ${e=>e.$color||e.theme.surface};
  color: ${e=>e.$textColor||e.theme.textPrimary};
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0.3rem 0.3rem 0.3rem 0;
  border: 1px solid ${e=>e.$color||e.theme.border};
`,Se=o.Ay.div`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: ${e=>e.$present?"#dcfce7":"#fef2f2"};
  color: ${e=>e.$present?"#166534":"#991b1b"};
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0.3rem 0.3rem 0.3rem 0;
  border: 1px solid ${e=>e.$present?"#22c55e":"#ef4444"};
`,je=o.Ay.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${e=>e.theme.textSecondary};
  font-size: 0.9rem;
  
  .spinner {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`,Re=o.Ay.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${e=>e.theme.textSecondary};
  font-size: 0.85rem;
  line-height: 1.5;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
  }
`,$e=(0,o.Ay)(I.P.div)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  .icon {
    font-size: 1.5em;
  }
`;function Pe(e){let{text:t,compact:r=!1}=e;const n=(0,T.useACDAnalyzer)(),o=(0,T.useRewards)(),[a,s]=(0,i.useState)(!1),[l,c]=(0,i.useState)(null),[d,u]=(0,i.useState)(!1),[m,p]=(0,i.useState)(0);(0,i.useEffect)((()=>{a&&t&&!l&&!d&&n&&g()}),[a,t]);const g=async()=>{if(t&&n){u(!0);try{const e=await n.analyze(t);if(c(e),o&&e.ideologicalFrames&&e.ideologicalFrames.length>0){let t=0;e.ideologicalFrames.forEach((e=>{const r=o.recordEvent("ACD_FRAME_IDENTIFIED",{frame:e.name,density:e.density,examples:e.examples.length});t+=r.earnedPoints})),p(t),setTimeout((()=>p(0)),5e3)}console.log("\ud83d\udd0d An\xe1lisis ACD completado:",e)}catch(e){console.error("Error en an\xe1lisis ACD:",e)}finally{u(!1)}}};return n?(0,h.jsxs)(le,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},transition:{duration:.3},children:[(0,h.jsxs)(ce,{onClick:()=>s(!a),$expanded:a,children:[(0,h.jsxs)("div",{className:"title",children:[(0,h.jsx)("span",{children:"\ud83d\udd0d"}),(0,h.jsx)("span",{children:"An\xe1lisis Cr\xedtico del Discurso"})]}),(0,h.jsx)("div",{className:"toggle",children:"\u25bc"})]}),(0,h.jsx)(se.N,{children:a&&(0,h.jsxs)(de,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.3},children:[!l&&!d&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsxs)(ue,{onClick:g,disabled:!t,children:[(0,h.jsx)("span",{className:"icon",children:"\ud83d\udd0d"}),(0,h.jsx)("span",{children:"Analizar Texto"})]}),(0,h.jsxs)(Re,{children:[(0,h.jsx)("div",{className:"icon",children:"\ud83d\udcca"}),(0,h.jsx)("div",{children:'Haz clic en "Analizar Texto" para detectar marcos ideol\xf3gicos, estrategias ret\xf3ricas y relaciones de poder en el texto.'})]})]}),d&&(0,h.jsxs)(je,{children:[(0,h.jsx)("div",{className:"spinner",children:"\ud83d\udd04"}),(0,h.jsx)("div",{children:"Analizando el discurso..."})]}),m>0&&(0,h.jsxs)($e,{initial:{opacity:0,scale:.8},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.8},children:[(0,h.jsx)("span",{className:"icon",children:"\ud83c\udf89"}),(0,h.jsxs)("span",{children:["+",m," pts por identificar marcos ideol\xf3gicos"]})]}),l&&(0,h.jsxs)(h.Fragment,{children:[l.ideologicalFrames&&l.ideologicalFrames.length>0&&(0,h.jsxs)(me,{children:[(0,h.jsxs)(pe,{children:[(0,h.jsx)("span",{className:"icon",children:"\ud83c\udfad"}),(0,h.jsx)("span",{children:"Marcos Ideol\xf3gicos Detectados"})]}),l.ideologicalFrames.map(((e,t)=>{var r;return(0,h.jsxs)(he,{$color:e.color,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.1*t},children:[(0,h.jsxs)(ge,{children:[(0,h.jsxs)(fe,{$color:e.color,children:[(0,h.jsx)("span",{className:"icon",children:e.icon||"\ud83c\udfad"}),(0,h.jsx)("span",{children:e.name})]}),(0,h.jsxs)(xe,{$color:e.color,children:[null===(r=e.density)||void 0===r?void 0:r.toFixed(1),"% densidad"]})]}),e.description&&(0,h.jsx)(be,{children:e.description}),e.examples&&e.examples.length>0&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)("div",{style:{fontSize:"0.75rem",fontWeight:600,marginTop:"0.5rem",marginBottom:"0.3rem"},children:"Ejemplos en el texto:"}),(0,h.jsx)(ve,{children:e.examples.slice(0,3).map(((e,t)=>(0,h.jsxs)("li",{children:['"',e,'"']},t)))})]}),e.criticalQuestions&&e.criticalQuestions.length>0&&(0,h.jsxs)(_e,{children:["\ud83d\udca1 ",e.criticalQuestions[0]]})]},t)}))]}),l.rhetoricalStrategies&&l.rhetoricalStrategies.length>0&&(0,h.jsxs)(me,{children:[(0,h.jsxs)(pe,{children:[(0,h.jsx)("span",{className:"icon",children:"\ud83d\udcdd"}),(0,h.jsx)("span",{children:"Estrategias Ret\xf3ricas"})]}),l.rhetoricalStrategies.map(((e,t)=>(0,h.jsxs)(ye,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.08*t},children:[(0,h.jsxs)(Ae,{children:[(0,h.jsx)("span",{children:e.name}),(0,h.jsxs)("span",{className:"count",children:[e.occurrences,"x"]})]}),e.description&&(0,h.jsx)(Ee,{children:e.description}),e.examples&&e.examples.length>0&&(0,h.jsx)(ve,{children:e.examples.slice(0,2).map(((e,t)=>(0,h.jsxs)("li",{children:['"',e,'"']},t)))}),e.criticalQuestion&&(0,h.jsxs)(_e,{children:["\ud83d\udcad ",e.criticalQuestion]})]},t)))]}),l.powerRelations&&(0,h.jsxs)(me,{children:[(0,h.jsxs)(pe,{children:[(0,h.jsx)("span",{className:"icon",children:"\u2696\ufe0f"}),(0,h.jsx)("span",{children:"Relaciones de Poder"})]}),(0,h.jsxs)("div",{children:[l.powerRelations.dominance&&l.powerRelations.dominance.length>0&&(0,h.jsxs)("div",{style:{marginBottom:"0.5rem"},children:[(0,h.jsx)("div",{style:{fontSize:"0.75rem",fontWeight:600,marginBottom:"0.3rem"},children:"Dominancia:"}),l.powerRelations.dominance.map(((e,t)=>(0,h.jsxs)(we,{$color:"#ef4444",$textColor:"white",children:["\u2b06\ufe0f ",e]},t)))]}),l.powerRelations.resistance&&l.powerRelations.resistance.length>0&&(0,h.jsxs)("div",{style:{marginBottom:"0.5rem"},children:[(0,h.jsx)("div",{style:{fontSize:"0.75rem",fontWeight:600,marginBottom:"0.3rem"},children:"Resistencia:"}),l.powerRelations.resistance.map(((e,t)=>(0,h.jsxs)(we,{$color:"#10b981",$textColor:"white",children:["\u270a ",e]},t)))]}),l.powerRelations.legitimation&&l.powerRelations.legitimation.length>0&&(0,h.jsxs)("div",{style:{marginBottom:"0.5rem"},children:[(0,h.jsx)("div",{style:{fontSize:"0.75rem",fontWeight:600,marginBottom:"0.3rem"},children:"Legitimaci\xf3n:"}),l.powerRelations.legitimation.map(((e,t)=>(0,h.jsxs)(we,{$color:"#f59e0b",$textColor:"white",children:["\u2713 ",e]},t)))]})]})]}),l.voiceAnalysis&&(0,h.jsxs)(me,{children:[(0,h.jsxs)(pe,{children:[(0,h.jsx)("span",{className:"icon",children:"\ud83d\udde3\ufe0f"}),(0,h.jsx)("span",{children:"An\xe1lisis de Voces"})]}),(0,h.jsxs)("div",{children:[l.voiceAnalysis.present&&l.voiceAnalysis.present.length>0&&(0,h.jsxs)("div",{style:{marginBottom:"0.5rem"},children:[(0,h.jsx)("div",{style:{fontSize:"0.75rem",fontWeight:600,marginBottom:"0.3rem"},children:"Voces Presentes:"}),l.voiceAnalysis.present.map(((e,t)=>(0,h.jsxs)(Se,{$present:!0,children:["\u2713 ",e]},t)))]}),l.voiceAnalysis.absent&&l.voiceAnalysis.absent.length>0&&(0,h.jsxs)("div",{children:[(0,h.jsx)("div",{style:{fontSize:"0.75rem",fontWeight:600,marginBottom:"0.3rem"},children:"Voces Ausentes/Silenciadas:"}),l.voiceAnalysis.absent.map(((e,t)=>(0,h.jsxs)(Se,{$present:!1,children:["\u2717 ",e]},t)))]})]})]}),(0,h.jsxs)(ue,{onClick:g,children:[(0,h.jsx)("span",{className:"icon",children:"\ud83d\udd04"}),(0,h.jsx)("span",{children:"Analizar Nuevamente"})]})]})]})})]}):null}const ke=o.Ay.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#fafafa"}};
`,Ce=o.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#ffffff"}};
  border-bottom: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ddd"}};
`,Te=o.Ay.div`
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
`,Ie=o.Ay.button`
  background: ${e=>{var t,r;return e.primary?(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb":(null===(r=e.theme)||void 0===r?void 0:r.surface)||"#f4f4f7"}};
  color: ${e=>{var t;return e.primary?"#fff":(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ccc"}};
  padding: .45rem .75rem;
  font-size: .75rem;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  &:hover { opacity: .9; }
`,ze=o.Ay.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
  padding-bottom: 80px; /* Espacio para PromptBar fijo más compacto */
`,Be=(o.Ay.div`
  position: fixed;
  top: 60px;
  right: 20px;
  width: 320px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ccc"}};
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0,0,0,.15);
  z-index: 1700;
  overflow: hidden;
`,o.Ay.div`
  padding: .55rem .75rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}};
  color: #fff;
  font-size: .7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`,o.Ay.div`
  flex: 1;
  overflow-y: auto;
  padding: .6rem .65rem .75rem;
  display: flex;
  flex-direction: column;
  gap: .55rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#f8f9fb"}};
`,o.Ay.div`
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ddd"}};
  border-radius: 8px;
  padding: .5rem .55rem .6rem;
  font-size: .65rem;
  line-height: 1.3;
  position: relative;
`,o.Ay.div`
  display: flex;
  gap: .35rem;
  margin-top: .4rem;
`,o.Ay.button`
  background: ${e=>{var t,r;return e.$danger?(null===(t=e.theme)||void 0===t?void 0:t.danger)||"#b91c1c":(null===(r=e.theme)||void 0===r?void 0:r.primary)||"#2563eb"}};
  color: #fff;
  border: none;
  font-size: .55rem;
  padding: .3rem .5rem;
  border-radius: 4px;
  cursor: pointer;
  &:hover { opacity:.85; }
`,o.Ay.div`
  font-size: .6rem;
  opacity: .7;
  text-align: center;
  padding: .75rem 0 .5rem;
`,o.Ay.form`
  padding: .45rem .55rem .55rem;
  border-top: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ddd"}};
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  display: flex;
  flex-direction: column;
  gap: .4rem;
`,o.Ay.textarea`
  resize: vertical;
  min-height: 52px;
  max-height: 140px;
  font-size: .6rem;
  line-height: 1.25;
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ccc"}};
  border-radius: 6px;
  padding: .4rem .45rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.inputBg)||"#fff"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"}};
`,o.Ay.form`
  position: fixed;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 700px;
  width: 85%;
  display: flex;
  gap: .45rem;
  padding: .5rem .75rem;
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#e5e7eb"}};
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  box-shadow: 0 2px 16px rgba(0,0,0,.1);
  z-index: 100;
  border-radius: 24px;
`),De=o.Ay.textarea`
  flex: 1;
  font-size: .8rem;
  padding: .5rem .7rem;
  border: none;
  border-radius: 18px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.inputBg)||"#f5f5f5"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"}};
  font-family: inherit;
  resize: none;
  min-height: 36px;
  max-height: 120px;
  overflow-y: auto;
  line-height: 1.4;
  transition: height 0.2s ease;
  &:focus {
    outline: none;
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.inputBg)||"#f0f0f0"}};
  }
`,Ne=o.Ay.button`
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}};
  color: #fff;
  border: none;
  padding: .5rem .75rem;
  border-radius: 18px;
  font-size: .75rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .35rem;
  transition: all 0.2s ease;
  &:hover { transform: scale(1.02); opacity: 0.9; }
  &:disabled { opacity:.55; cursor:not-allowed; transform: scale(1); }
`;function Fe(e){let{enableWeb:t=!0,followUps:r=!0}=e;const{texto:o,setTexto:c,modoOscuro:d}=(0,i.useContext)(a.BR),u="undefined"!==typeof process&&{NODE_ENV:"production",PUBLIC_URL:"",WDS_SOCKET_HOST:void 0,WDS_SOCKET_PATH:void 0,WDS_SOCKET_PORT:void 0,FAST_REFRESH:!0,REACT_APP_BACKEND_URL:"https://applectura-backend.onrender.com",REACT_APP_FIREBASE_API_KEY:"AIzaSyAzh5Qqiend6CSZzzCu6aUm4V9r17X42Ic",REACT_APP_FIREBASE_APP_ID:"1:522981088704:web:4d58bbb7f74ca661ccbc25",REACT_APP_FIREBASE_AUTH_DOMAIN:"applectura-cb058.firebaseapp.com",REACT_APP_FIREBASE_MESSAGING_SENDER_ID:"522981088704",REACT_APP_FIREBASE_PROJECT_ID:"applectura-cb058",REACT_APP_FIREBASE_STORAGE_BUCKET:"applectura-cb058.firebasestorage.app",REACT_APP_PORT:"3000",REACT_APP_SERPER_API_KEY:"",REACT_APP_TAVILY_API_KEY:"configured"}&&{NODE_ENV:"production",PUBLIC_URL:"",WDS_SOCKET_HOST:void 0,WDS_SOCKET_PATH:void 0,WDS_SOCKET_PORT:void 0,FAST_REFRESH:!0,REACT_APP_BACKEND_URL:"https://applectura-backend.onrender.com",REACT_APP_FIREBASE_API_KEY:"AIzaSyAzh5Qqiend6CSZzzCu6aUm4V9r17X42Ic",REACT_APP_FIREBASE_APP_ID:"1:522981088704:web:4d58bbb7f74ca661ccbc25",REACT_APP_FIREBASE_AUTH_DOMAIN:"applectura-cb058.firebaseapp.com",REACT_APP_FIREBASE_MESSAGING_SENDER_ID:"522981088704",REACT_APP_FIREBASE_PROJECT_ID:"applectura-cb058",REACT_APP_FIREBASE_STORAGE_BUCKET:"applectura-cb058.firebasestorage.app",REACT_APP_PORT:"3000",REACT_APP_SERPER_API_KEY:"",REACT_APP_TAVILY_API_KEY:"configured"}.JEST_WORKER_ID,m=!!(0,i.useContext)(T.PedagogyContext),p=d?{border:"#ddd",surface:"#f4f4f7"}:{border:"#ddd",surface:"#fff"},[g,x]=(0,i.useState)((()=>!!u)),[v,y]=(0,i.useState)(""),[A,E]=(0,i.useState)(!1),[_,w]=(0,i.useState)(!1),[S,j]=(0,i.useState)(""),[R,$]=(0,i.useState)(!1),[I,z]=(0,i.useState)(420),[B,D]=(0,i.useState)(!1),N=i.useRef(null),[F,W]=(0,i.useState)(!1),K=i.useRef(null),O=!(!o||!o.trim().length),L=function(e){const{notes:t,addNote:r,removeAnnotation:n,updateAnnotation:o,storageKey:a}=b(e,{shadow:!1}),s=(0,i.useMemo)((()=>[...t||[]].sort(((e,t)=>{var r,i;return((null===(r=t.meta)||void 0===r?void 0:r.createdAt)||0)-((null===(i=e.meta)||void 0===i?void 0:i.createdAt)||0)}))),[t]),l=(0,i.useCallback)((function(e){return r({text:e,meta:arguments.length>1&&void 0!==arguments[1]?arguments[1]:{}})}),[r]),c=(0,i.useCallback)((e=>n(e)),[n]),d=(0,i.useCallback)(((e,t)=>o(e,t)),[o]),u=(0,i.useCallback)((()=>s.length?s.map((e=>{var t;return`Fecha: ${new Date((null===(t=e.meta)||void 0===t?void 0:t.createdAt)||Date.now()).toLocaleString()}\nTexto: ${e.text||""}\nKind: ${e.kind||"note"}\n---\n`})).join("\n"):null),[s]);return{notes:s,createNote:l,removeNote:c,updateNote:d,exportNotes:u,storageKey:a}}(o);(0,i.useEffect)((()=>{fetch("/api/web-search/test").then((e=>e.json())).then((e=>{var t,r,i,n;const o=(null===(t=e.configuracion)||void 0===t?void 0:t.serper_disponible)||(null===(r=e.configuracion)||void 0===r?void 0:r.bing_disponible)||(null===(i=e.configuracion)||void 0===i?void 0:i.tavily_disponible)||"simulada"!==e.api_utilizada;E(o),console.log("\ud83c\udf10 B\xfasqueda web disponible:",o,"- API:",null===(n=e.configuracion)||void 0===n?void 0:n.modo_funcionamiento)})).catch((e=>{console.warn("\u26a0\ufe0f No se pudo verificar b\xfasqueda web:",e),E(!1)}))}),[]);(0,i.useMemo)((()=>{if(!O)return null;return{words:o.split(/\s+/).filter(Boolean).length,chars:o.length,tiempoLecturaMin:(0,C.UX)(o)}}),[o,O]);const U=(0,i.useCallback)((()=>{if(!v.trim())return;const e=new CustomEvent("tutor-external-prompt",{detail:{prompt:v.trim(),fullText:o}});window.dispatchEvent(e),y("")}),[v]),M=(0,i.useCallback)((e=>n(o)),[o]);(0,k.A)({onPrompt:e=>{let{action:t,fragment:r,prompt:i}=e;if("undefined"!==typeof process&&{NODE_ENV:"production",PUBLIC_URL:"",WDS_SOCKET_HOST:void 0,WDS_SOCKET_PATH:void 0,WDS_SOCKET_PORT:void 0,FAST_REFRESH:!0,REACT_APP_BACKEND_URL:"https://applectura-backend.onrender.com",REACT_APP_FIREBASE_API_KEY:"AIzaSyAzh5Qqiend6CSZzzCu6aUm4V9r17X42Ic",REACT_APP_FIREBASE_APP_ID:"1:522981088704:web:4d58bbb7f74ca661ccbc25",REACT_APP_FIREBASE_AUTH_DOMAIN:"applectura-cb058.firebaseapp.com",REACT_APP_FIREBASE_MESSAGING_SENDER_ID:"522981088704",REACT_APP_FIREBASE_PROJECT_ID:"applectura-cb058",REACT_APP_FIREBASE_STORAGE_BUCKET:"applectura-cb058.firebasestorage.app",REACT_APP_PORT:"3000",REACT_APP_SERPER_API_KEY:"",REACT_APP_TAVILY_API_KEY:"configured"}&&{NODE_ENV:"production",PUBLIC_URL:"",WDS_SOCKET_HOST:void 0,WDS_SOCKET_PATH:void 0,WDS_SOCKET_PORT:void 0,FAST_REFRESH:!0,REACT_APP_BACKEND_URL:"https://applectura-backend.onrender.com",REACT_APP_FIREBASE_API_KEY:"AIzaSyAzh5Qqiend6CSZzzCu6aUm4V9r17X42Ic",REACT_APP_FIREBASE_APP_ID:"1:522981088704:web:4d58bbb7f74ca661ccbc25",REACT_APP_FIREBASE_AUTH_DOMAIN:"applectura-cb058.firebaseapp.com",REACT_APP_FIREBASE_MESSAGING_SENDER_ID:"522981088704",REACT_APP_FIREBASE_PROJECT_ID:"applectura-cb058",REACT_APP_FIREBASE_STORAGE_BUCKET:"applectura-cb058.firebasestorage.app",REACT_APP_PORT:"3000",REACT_APP_SERPER_API_KEY:"",REACT_APP_TAVILY_API_KEY:"configured"}.JEST_WORKER_ID){const e=new CustomEvent("tutor-external-prompt",{detail:{prompt:i,action:t,fragment:r,fullText:o}});window.dispatchEvent(e)}else g||(N.current={prompt:i,action:t,fragment:r},x(!0))}}),(0,i.useEffect)((()=>{if(console.log("\ud83d\udd04 [ReadingWorkspace] useEffect tutor-ready listener, showTutor:",g),!g)return;const e=()=>{if(console.log("\ud83c\udf89 [ReadingWorkspace] Recibido evento tutor-ready"),W(!0),N.current){console.log("\ud83d\udce4 [ReadingWorkspace] Hay acci\xf3n pendiente, enviando tutor-external-prompt:",N.current);const{prompt:e,action:t,fragment:r,webContext:i}=N.current;try{const n=new CustomEvent("tutor-external-prompt",{detail:{prompt:e,action:t,fragment:r,webContext:i,fullText:o}});window.dispatchEvent(n),console.log("\u2705 [ReadingWorkspace] tutor-external-prompt enviado exitosamente")}finally{N.current=null}}else console.log("\u2139\ufe0f [ReadingWorkspace] No hay acci\xf3n pendiente")};console.log("\ud83d\udc42 [ReadingWorkspace] Registrando listener para tutor-ready"),window.addEventListener("tutor-ready",e,{once:!0});const t=requestAnimationFrame((()=>{if(!F&&N.current){console.warn("\u26a0\ufe0f [ReadingWorkspace] FALLBACK RAF: tutor-ready no recibido, enviando acci\xf3n pendiente");const{prompt:e,action:t,fragment:r,webContext:i}=N.current;try{const n=new CustomEvent("tutor-external-prompt",{detail:{prompt:e,action:t,fragment:r,webContext:i,fullText:o}});window.dispatchEvent(n),console.log("\u2705 [ReadingWorkspace] FALLBACK RAF: tutor-external-prompt enviado")}finally{N.current=null}}})),r=setTimeout((()=>{if(!F&&N.current){console.warn("\u26a0\ufe0f [ReadingWorkspace] FALLBACK TIMEOUT 120ms: tutor-ready no recibido, enviando acci\xf3n pendiente");const{prompt:e,action:t,fragment:r,webContext:i}=N.current;try{const n=new CustomEvent("tutor-external-prompt",{detail:{prompt:e,action:t,fragment:r,webContext:i,fullText:o}});window.dispatchEvent(n),console.log("\u2705 [ReadingWorkspace] FALLBACK TIMEOUT: tutor-external-prompt enviado")}finally{N.current=null}}}),120);return()=>{console.log("\ud83e\uddf9 [ReadingWorkspace] Limpiando listener tutor-ready y fallbacks"),window.removeEventListener("tutor-ready",e),cancelAnimationFrame(t),clearTimeout(r)}}),[g,o,F]),(0,i.useEffect)((()=>{g||W(!1)}),[g]),(0,i.useEffect)((()=>{const e=new CustomEvent("visor-focus-mode",{detail:{active:B}});window.dispatchEvent(e)}),[B]),(0,i.useEffect)((()=>{const e=e=>{const{width:t}=e.detail||{};"number"===typeof t&&z(t)};return window.addEventListener("tutor-width-change",e),()=>window.removeEventListener("tutor-width-change",e)}),[]);const H=(0,i.useCallback)((e=>{if(y(e.target.value),K.current){const e=K.current;e.style.height="auto";const t=Math.min(Math.max(e.scrollHeight,36),120);e.style.height=`${t}px`}}),[]),Q=(0,i.useCallback)((e=>{"Enter"!==e.key||e.shiftKey||(e.preventDefault(),v.trim()&&U())}),[v,U]);return(0,i.useEffect)((()=>{const e=e=>{console.log("\ud83d\udce8 ReadingWorkspace recibi\xf3 evento reader-action:",e.detail);const{action:t,text:r}=e.detail||{};if(console.log("\ud83c\udfac Ejecutando acci\xf3n:",t,"con texto:",null===r||void 0===r?void 0:r.substring(0,30)),"notes"===t)return console.log("\ud83d\udcdd Creando nota sin activar tutor"),w(!0),void(r&&L&&"function"===typeof L.createNote?(L.createNote(r,{createdAt:Date.now(),kind:"note"}),console.log("\u2705 Nota creada exitosamente")):console.warn("\u26a0\ufe0f notesApi no disponible:",L));switch(t){case"explain":g?(console.log("\u2705 [ReadingWorkspace] Tutor ya abierto, enviando evento inmediatamente"),window.dispatchEvent(new CustomEvent("tutor-external-prompt",{detail:{prompt:`Act\xfaa como profesor experto. Explica de forma clara y did\xe1ctica el significado, contexto e importancia de este fragmento: "${r}". Incluye ejemplos si es pertinente.`,action:"explain",fragment:r,fullText:o}}))):(console.log("\u23f3 [ReadingWorkspace] Tutor cerrado, guardando acci\xf3n pendiente"),N.current={prompt:`Act\xfaa como profesor experto. Explica de forma clara y did\xe1ctica el significado, contexto e importancia de este fragmento: "${r}". Incluye ejemplos si es pertinente.`,action:"explain",fragment:r},x(!0),$(!0));break;case"summarize":g?(console.log("\u2705 Tutor ya abierto, enviando evento inmediatamente"),window.dispatchEvent(new CustomEvent("tutor-external-prompt",{detail:{prompt:`Resume en m\xe1ximo 3 puntos las ideas PRINCIPALES y CLAVE de este fragmento. S\xe9 conciso y directo: "${r}"`,action:"summarize",fragment:r,fullText:o}}))):(console.log("\u23f3 Tutor cerrado, guardando acci\xf3n pendiente"),N.current={prompt:`Resume en m\xe1ximo 3 puntos las ideas PRINCIPALES y CLAVE de este fragmento. S\xe9 conciso y directo: "${r}"`,action:"summarize",fragment:r},x(!0),$(!0));break;case"question":g?(console.log("\u2705 Tutor ya abierto, precargando prompt"),y(`Genera 3 preguntas de comprensi\xf3n profunda sobre: "${r.slice(0,100)}..."`)):(console.log("\u23f3 Tutor cerrado, guardando prompt pendiente"),N.current={prompt:`Genera 3 preguntas de comprensi\xf3n profunda (nivel an\xe1lisis/evaluaci\xf3n seg\xfan Bloom) sobre este fragmento: "${r}"`,action:"question",fragment:r},x(!0),$(!0))}};return window.addEventListener("reader-action",e),()=>window.removeEventListener("reader-action",e)}),[L,o,g]),(0,h.jsxs)(ke,{children:[(0,h.jsxs)(Ce,{children:[(0,h.jsx)(Te,{children:(0,h.jsx)("strong",{children:"\ud83d\udcd8 Lectura Guiada"})}),(0,h.jsxs)(Te,{children:[O&&(0,h.jsx)(Ie,{onClick:()=>D((e=>!e)),children:B?"\ud83d\udc41\ufe0f Salir Enfoque":"\ud83c\udfaf Modo Enfoque"}),(0,h.jsx)(Ie,{onClick:()=>x((e=>!e)),children:g?"\ud83e\udd16 Ocultar Tutor":"\ud83e\udd16 Mostrar Tutor"})]})]}),(0,h.jsxs)(ze,{style:{paddingRight:g&&R?`${I+20}px`:void 0,transition:"padding-right 0.3s ease"},children:[!O&&(0,h.jsx)("div",{style:{padding:"2rem",textAlign:"center",fontSize:".9rem",color:"#666"},children:"Carga un texto para comenzar la lectura guiada."}),O&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)(s.A,{texto:o}),(0,h.jsxs)(Be,{onSubmit:e=>{e.preventDefault(),U()},children:[(0,h.jsx)(De,{ref:K,placeholder:"Pregunta algo sobre el texto...",value:v,onChange:H,onKeyDown:Q,rows:1}),(0,h.jsx)(f,{query:v,disabled:!A||!v.trim(),contextBuilder:M,onEnriched:e=>{if(console.log("\ud83c\udf10 [ReadingWorkspace] Prompt enriquecido con web:",e.substring(0,100)),g){const t=new CustomEvent("tutor-external-prompt",{detail:{prompt:v.trim(),webContext:e,fullText:o}});window.dispatchEvent(t),console.log("\u2705 [ReadingWorkspace] Evento tutor-external-prompt enviado con b\xfasqueda web")}else console.log("\ud83d\udcd6 [ReadingWorkspace] Mostrando tutor antes de enviar prompt enriquecido"),x(!0),N.current={prompt:v.trim(),webContext:e};y("")}}),(0,h.jsx)(Ne,{type:"submit",disabled:!v.trim(),children:"Enviar"})]})]}),g&&(0,h.jsx)(l.A,{followUps:r,expanded:R,onToggleExpand:()=>$((e=>!e)),children:m&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)("div",{style:{padding:"0.75rem 0.75rem 0.25rem",borderBottom:`1px solid ${p.border}`},children:(0,h.jsx)(ae,{compact:!0})}),(0,h.jsx)("div",{style:{padding:"0.75rem",borderBottom:`1px solid ${p.border}`,background:p.surface},children:(0,h.jsx)(q,{compact:!1,showTooltip:!0})}),(0,h.jsx)(Pe,{text:o,compact:!1})]})}),_&&(0,h.jsx)(P,{notesApi:L,onClose:()=>w(!1)})]})]})}},9877:(e,t,r)=>{r.d(t,{Qr:()=>i});const i=new class{constructor(){this._cache=new Map,this._subscribers=new Map,this._persistTimers=new Map}_reset(){this._persistTimers.forEach((e=>clearTimeout(e))),this._persistTimers.clear(),this._cache.clear(),this._subscribers.clear()}_ensureEntry(e){if(!this._cache.has(e)){let t=[];if("undefined"!==typeof localStorage){const r=localStorage.getItem(e);if(r){const e=function(e){try{return JSON.parse(e)}catch{return null}}(r);e&&Array.isArray(e.items)&&(t=e.items)}}this._cache.set(e,{items:t,dirty:!1})}return this._cache.get(e)}_persistNow(e){const t=this._cache.get(e);if(t&&t.dirty)try{const r=JSON.stringify({version:1,items:t.items});localStorage.setItem(e,r),t.dirty=!1}catch(r){console.warn("[AnnotationsService] Persistencia fallida, manteniendo en memoria.",r)}}_schedulePersist(e){if(this._persistTimers.has(e))return;const t=setTimeout((()=>{this._persistTimers.delete(e),this._persistNow(e)}),120);this._persistTimers.set(e,t)}_markDirtyAndSchedule(e){const t=this._cache.get(e);t&&(t.dirty=!0,this._schedulePersist(e))}_emit(e){const t=this._subscribers.get(e);if(t){const r=this.listByStorageKey(e);t.forEach((e=>{try{e(r)}catch{}}))}}_makeId(){return Math.random().toString(36).slice(2,10)}computeKeyFromText(e){return e&&e.trim()?`annotations:${function(e){let t=0,r=0,i=e.length;for(;r<i;)t=(t<<5)-t+e.charCodeAt(r++)|0;return(t>>>0).toString(36)}(e)}:v1`:null}subscribe(e,t){return e&&"function"===typeof t?(this._subscribers.has(e)||this._subscribers.set(e,new Set),this._subscribers.get(e).add(t),t(this.listByStorageKey(e)),()=>{const r=this._subscribers.get(e);r&&(r.delete(t),r.size||this._subscribers.delete(e))}):()=>{}}listByStorageKey(e){return this._ensureEntry(e).items.map((e=>({...e,meta:{...e.meta}})))}listHighlights(e){return this.listByStorageKey(e).filter((e=>"highlight"===e.kind))}listNotes(e){return this.listByStorageKey(e).filter((e=>"note"===e.kind))}addHighlight(e,t,r){let i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"manual";if(null==t)throw new Error("paragraphIndex requerido");const n=this._ensureEntry(e),o=Date.now(),a={id:this._makeId(),kind:"highlight",paragraphIndex:t,text:r||void 0,meta:{createdAt:o,updatedAt:o,source:i}};return n.items.push(a),this._markDirtyAndSchedule(e),this._emit(e),a}toggleHighlight(e,t){let r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"manual";const i=this._ensureEntry(e),n=i.items.findIndex((e=>"highlight"===e.kind&&e.paragraphIndex===t));if(n>=0){const[t]=i.items.splice(n,1);return this._markDirtyAndSchedule(e),this._emit(e),{removed:t,active:!1}}return{added:this.addHighlight(e,t,void 0,r),active:!0}}addNote(e){let{paragraphIndex:t=null,text:r="",source:i="manual",meta:n}=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const o=this._ensureEntry(e),a=Date.now(),s={id:this._makeId(),kind:"note",paragraphIndex:null==t?void 0:t,text:r,meta:{createdAt:a,updatedAt:a,source:i,...n||{}}};return o.items.push(s),this._markDirtyAndSchedule(e),this._emit(e),s}updateAnnotation(e,t,r){const i=this._ensureEntry(e),n=i.items.findIndex((e=>e.id===t));if(-1===n)return null;const o=Date.now(),a=i.items[n],s={...a,...r,meta:{...a.meta,updatedAt:o}};return i.items[n]=s,this._markDirtyAndSchedule(e),this._emit(e),s}removeAnnotation(e,t){const r=this._ensureEntry(e),i=r.items.findIndex((e=>e.id===t));return-1!==i&&(r.items.splice(i,1),this._markDirtyAndSchedule(e),this._emit(e),!0)}clearAll(e){this._ensureEntry(e).items=[],this._markDirtyAndSchedule(e),this._emit(e)}addAnchor(e,t){let{paragraphIndex:r,anchorType:i,refId:n,data:o,source:a="auto"}=t;if(null==r)throw new Error("paragraphIndex requerido para anchor");const s=this._ensureEntry(e),l=Date.now(),c={id:this._makeId(),kind:"anchor",paragraphIndex:r,text:void 0,meta:{createdAt:l,updatedAt:l,source:a,anchorType:i,refId:n,data:o}};return s.items.push(c),this._markDirtyAndSchedule(e),this._emit(e),c}listAnchors(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{anchorType:r}=t;return this.listByStorageKey(e).filter((e=>{var t;return"anchor"===e.kind&&(!r||(null===(t=e.meta)||void 0===t?void 0:t.anchorType)===r)}))}toExportBundle(e){const t=this.listByStorageKey(e);return{version:1,highlights:t.filter((e=>"highlight"===e.kind)),notes:t.filter((e=>"note"===e.kind)),anchors:t.filter((e=>"anchor"===e.kind))}}flush(e){this._persistTimers.has(e)&&(clearTimeout(this._persistTimers.get(e)),this._persistTimers.delete(e)),this._persistNow(e)}}}}]);