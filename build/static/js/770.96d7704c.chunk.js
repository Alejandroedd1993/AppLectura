"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[770],{54:(e,t,n)=>{n.d(t,{A:()=>a});var o=n(9950);const r={explain:e=>`Eres un tutor claro y amable. Explica el fragmento sin evaluar ni calificar. S\xe9 breve (m\xe1x. 6 frases) y evita abrir temas nuevos. Fragmento: "${e}"`,summarize:e=>`Resume el fragmento en 2-4 frases, manteniendo ideas clave y tono original. No a\xf1adas preguntas ni temas nuevos. Fragmento: "${e}"`,question:e=>`Escribe una sola pregunta desafiante sobre el fragmento y sugiere una posible respuesta razonada en una frase. Formato: Pregunta -> Posible respuesta. Fragmento: "${e}"`,deep:e=>`Analiza en 4-6 frases las implicaciones y causas del fragmento. Mant\xe9n el foco y no generes preguntas ni temas adicionales. Fragmento: "${e}"`};function a(e){let{onPrompt:t}=e;const n=(0,o.useRef)(t);n.current=t;const a=(0,o.useRef)(null),i=(0,o.useRef)(0),s=(0,o.useCallback)((e=>{const t=(e||"").toString().trim().toLowerCase();if(!t)return"";return{explicar:"explain",resumir:"summarize",preguntar:"question",profundizar:"deep",nota:"notes",notas:"notes"}[t]||t}),[]),l=(0,o.useCallback)((e=>{var t;const{action:o,text:l}=e.detail||{};if(!o||!l)return;const c=s(o);if("notes"===c)return void console.log('\ud83d\udd07 useReaderActions: Ignorando acci\xf3n "notes" (manejada por ReadingWorkspace)');const u=function(e,t){const n=r[e];return n?n(t):null}(c,l),d=Date.now();if(d-i.current<250)return;const p=c+"|"+(l.length>80?l.slice(0,80):l);a.current!==p&&(a.current=p,i.current=d,null===(t=n.current)||void 0===t||t.call(n,{action:c,fragment:l,prompt:u,ts:d}))}),[]);(0,o.useEffect)((()=>(window.addEventListener("reader-action",l),()=>window.removeEventListener("reader-action",l))),[l])}},2773:(e,t,n)=>{n.d(t,{A:()=>z});var o=n(9950),r=n(4752),a=n(2043);const i={minParagraphLen:25,maxParagraphLen:900,hardChunkLen:800,mergeSoftThreshold:60,strategy:"hybrid"};function s(e){return e.replace(/\r\n?/g,"\n").replace(/\t/g," ").replace(/ {2,}/g," ").replace(/\n{3,}/g,"\n\n").trim()}function l(e){let t=0;for(let n=0;n<e.length&&n<120;n++)t=31*t+e.charCodeAt(n)>>>0;return t.toString(36)}const c=new Map;function u(e,t){const n=function(e){return l(s(e))}(e)+":"+((null===t||void 0===t?void 0:t.strategy)||"hybrid");if(c.has(n))return c.get(n);const o=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(!e||!e.trim())return[];const n={...i,...t},o=s(e);if(!o)return[];let r=o.split(/\n\n+|(?<=[.!?])\n+/).map((e=>e.trim())).filter((e=>e.length>0));const a=[];for(let i=0;i<r.length;i++){const e=r[i];if(e.length<n.minParagraphLen&&a.length>0){const t=a[a.length-1];if(t.length+e.length<n.mergeSoftThreshold){a[a.length-1]=t+" "+e;continue}}a.push(e)}const c=[];a.forEach((e=>{if(e.length<=n.maxParagraphLen)return void c.push(e);let t=e;for(;t.length>n.hardChunkLen;){let e=t.lastIndexOf(" ",n.hardChunkLen-20);e<.5*n.hardChunkLen&&(e=n.hardChunkLen),c.push(t.slice(0,e).trim()),t=t.slice(e).trim()}t.length&&c.push(t)}));const u=[];let d=0;return c.forEach(((t,n)=>{const o=e.indexOf(t.slice(0,20)),r=o>-1?o:d,a=r+t.length;d=a,u.push({id:l(n+"_"+t),index:n,startChar:r,endChar:a,content:t})})),u}(e,t);return c.set(n,o),o}var d=n(1893),p=n(387),m=n(2551),g=n(8691),f=n(2510),h=(n(7302),n(2407),n(4414));const v=r.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#f5f5f5"}};
  padding: 2rem clamp(0.5rem, 2vw, 2rem);

  /* Mejorar la selección de texto en PDFs */
  .react-pdf__Page__textContent {
    user-select: text;
    
    /* Reducir opacidad de la capa de texto para minimizar el efecto "fantasma" */
    opacity: 0.4;
    
    /* Color de selección más oscuro y visible */
    ::selection {
      background: rgba(37, 99, 235, 0.4);
    }
    
    ::-moz-selection {
      background: rgba(37, 99, 235, 0.4);
    }

    /* Resaltado de búsqueda en PDF */
    .pdf-search-highlight {
      background: rgba(255, 245, 157, 0.8) !important;
      border-radius: 2px;
      box-shadow: 0 0 0 1px rgba(255, 193, 7, 0.3);
      opacity: 1 !important;
    }

    /* Resultado actual resaltado con color más intenso */
    .pdf-search-current {
      background: rgba(255, 193, 7, 0.9) !important;
      box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.6) !important;
    }
  }
  
  /* La capa de anotaciones debe estar por encima */
  .react-pdf__Page__annotations {
    z-index: 2;
  }
`,b=r.Ay.div`
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  overflow: hidden;
  background: white;
  position: relative;

  /* Indicador de número de página */
  &::before {
    content: 'Página ' attr(data-page-number);
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    z-index: 10;
    pointer-events: none;
    opacity: 0.7;
  }

  canvas {
    display: block;
    max-width: 100%;
    height: auto !important;
  }
`,x=r.Ay.div`
  padding: 2rem;
  text-align: center;
  color: #666;
  font-size: 1.1em;
`,y=r.Ay.div`
  padding: 2rem;
  text-align: center;
  color: #d32f2f;
  font-size: 1.1em;
  background: #ffebee;
  border-radius: 8px;
  margin: 2rem;
`;const C=function(e){let{file:t,pageNumber:n=1,scale:r=1.2,onDocumentLoad:a,onLoadError:i,onSelection:s,searchQuery:l="",onSearchNavigation:c,className:u}=e;const d=(0,o.useRef)(null),[p,m]=o.useState(null),[C,w]=(0,o.useState)(!1),E=(0,o.useRef)([]),[$,S]=(0,o.useState)(-1),k=(0,o.useCallback)((e=>{console.log("\ud83d\udcc4 PDF cargado:",e.numPages,"p\xe1ginas (modo continuo)"),m(e.numPages),null===a||void 0===a||a({numPages:e.numPages})}),[a]),T=(0,o.useCallback)((e=>{console.error("\u274c Error cargando PDF:",e),console.error("\u274c Tipo de archivo recibido:",typeof t,t),null===i||void 0===i||i(e)}),[i,t]),A=(0,o.useCallback)((()=>{if(!s)return;const e=window.getSelection&&window.getSelection();if(!e||e.isCollapsed)return void s(null);const t=e.toString().trim();if(t)try{var n;const o=e.getRangeAt(0).getBoundingClientRect();let r=1;const a=null===(n=d.current)||void 0===n?void 0:n.querySelectorAll("[data-page-number]");a&&a.forEach((e=>{const t=e.getBoundingClientRect();o.top>=t.top&&o.top<=t.bottom&&(r=parseInt(e.getAttribute("data-page-number"),10))})),s({text:t,x:o.left+window.scrollX+o.width/2,y:o.top+window.scrollY-12,page:r})}catch(o){console.warn("\u26a0\ufe0f No se pudo obtener el rect\xe1ngulo de selecci\xf3n:",o),s({text:t,page:1})}else s(null)}),[s]),j=(0,o.useCallback)((()=>{null===s||void 0===s||s(null)}),[s]);return(0,o.useEffect)((()=>{if(d.current)try{d.current.scrollTo({top:0,behavior:"auto"})}catch{d.current.scrollTop=0}}),[r,t]),(0,o.useEffect)((()=>{if(!l.trim()||!d.current){var e;const t=null===(e=d.current)||void 0===e?void 0:e.querySelectorAll(".pdf-search-highlight, .pdf-search-current");return null===t||void 0===t||t.forEach((e=>{e.classList.remove("pdf-search-highlight","pdf-search-current")})),E.current=[],S(-1),void w(!1)}const t=setTimeout((()=>{if(!d.current)return;const e=d.current.querySelectorAll(".react-pdf__Page__textContent"),t=[],n=l.trim();e.forEach((e=>{const o=Array.from(e.querySelectorAll("span"));o.forEach((e=>{e.classList.remove("pdf-search-highlight","pdf-search-current")}));let r="";const a=[];o.forEach((e=>{const t=e.textContent||"",n=r.length;r+=t;const o=r.length;a.push({start:n,end:o,span:e,text:t})}));r.toLowerCase();const i=n.toLowerCase(),s=r.split(/\b/);let l=0;s.forEach((e=>{if(e.toLowerCase()===i){const n=l,o=l+e.length,r=[];for(const e of a)e.end>n&&e.start<o&&r.push(e.span);r.length>0&&(r.forEach((e=>e.classList.add("pdf-search-highlight"))),t.push(r[0]))}l+=e.length}))})),E.current=t,console.log("\ud83d\udd0d [PDF Search]",{query:l,matches:t.length,textLayers:e.length}),t.length>0&&(S(0),t[0].classList.add("pdf-search-current"),t[0].scrollIntoView({behavior:"smooth",block:"center"})),w(!0)}),500);return()=>clearTimeout(t)}),[l,p]),(0,o.useEffect)((()=>{if(!c)return;c({next:()=>{var e;const t=E.current;if(0===t.length)return;null===(e=t[$])||void 0===e||e.classList.remove("pdf-search-current");const n=($+1)%t.length;S(n),t[n].classList.add("pdf-search-current"),t[n].scrollIntoView({behavior:"smooth",block:"center"})},prev:()=>{var e;const t=E.current;if(0===t.length)return;null===(e=t[$])||void 0===e||e.classList.remove("pdf-search-current");const n=($-1+t.length)%t.length;S(n),t[n].classList.add("pdf-search-current"),t[n].scrollIntoView({behavior:"smooth",block:"center"})},total:E.current.length,current:$+1})}),[$,c,C]),t?(console.log("\ud83d\udcc4 [PDFViewer] Renderizando con file:",t instanceof File?"File object":typeof t,t),console.log("\ud83d\udcc4 [PDFViewer] Modo continuo -",p?`${p} p\xe1ginas`:"Cargando..."),(0,h.jsx)(v,{ref:d,className:u,onMouseUp:A,onMouseDown:j,children:(0,h.jsx)(g.A,{file:t,onLoadSuccess:k,onLoadError:T,loading:(0,h.jsx)(x,{children:"\u23f3 Cargando PDF..."}),error:(0,h.jsx)(y,{children:"\u274c Error al cargar el PDF. Verifica que el archivo sea v\xe1lido."}),children:p&&Array.from({length:p},((e,t)=>(0,h.jsx)(b,{"data-page-number":t+1,children:(0,h.jsx)(f.A,{pageNumber:t+1,scale:r,renderTextLayer:!0,renderAnnotationLayer:!0,loading:(0,h.jsxs)(x,{children:["Cargando p\xe1gina ",t+1,"..."]})})},`page-${t+1}`)))},`doc-${r.toFixed(2)}`)})):(0,h.jsx)(x,{children:"\ud83d\udcc4 Carga un archivo PDF para visualizarlo"})};n(2726);const w=r.Ay.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.25rem clamp(1rem, 2vw, 2rem);
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#ffffff"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"}};
  /* El tamaño base se sobrescribe con style={{ fontSize }} */
  font-size: clamp(15px, 1rem, 18px);
  line-height: 1.55;
  overscroll-behavior: contain;
`,E=r.Ay.div`
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  align-items: center;
  margin-bottom: 1rem;
  font-size: .8rem;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.textSecondary)||"#555"}};
  > span { background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#f4f4f6"}}; padding: 4px 8px; border-radius: 6px; }
`,$=r.Ay.p`
  margin: 0 0 1.25rem 0;
  padding: .75rem 1rem;
  border-radius: 8px;
  transition: ${e=>e.$compact?"none":"background .2s ease"};
  position: relative;
  background: ${e=>{var t;return e.$selected?(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#f0f2f5":"transparent"}};
  &:hover { background: ${e=>{var t;return e.$compact?"transparent":(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#f0f2f5"}}; }
  /* Eliminamos contorno por párrafo al buscar; ahora se resaltan solo las coincidencias */
  outline: none;
  box-shadow: none;
  mark { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 3px; }
  /* Resalta con más intensidad las coincidencias del párrafo activo en navegación */
  ${e=>e.$currentHit?"\n    mark { background: #ffd54f; box-shadow: 0 0 0 1px rgba(99,102,241,.35) inset; }\n  ":""}
  
  /* Estilos para títulos cuando se renderiza como h1, h2, h3 */
  ${e=>{var t,n;return"h1"===e.as?`\n    font-size: 1.8em;\n    font-weight: 700;\n    color: ${(null===(t=e.theme)||void 0===t?void 0:t.academicSection)||(null===(n=e.theme)||void 0===n?void 0:n.accent)||"#6366f1"};\n    margin-top: 1.5rem;\n    margin-bottom: 1rem;\n    line-height: 1.2;\n    text-align: center;\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n  `:""}}
  
  ${e=>{var t,n,o,r,a;return"h2"===e.as?`\n    font-size: 1.5em;\n    font-weight: 700;\n    color: ${(null===(t=e.theme)||void 0===t?void 0:t.academicSubtitle)||(null===(n=e.theme)||void 0===n?void 0:n.primary)||"#8b5cf6"};\n    margin-top: 1.25rem;\n    margin-bottom: 0.85rem;\n    line-height: 1.3;\n    border-left: 4px solid ${(null===(o=e.theme)||void 0===o?void 0:o.academicSubtitle)||(null===(r=e.theme)||void 0===r?void 0:r.primary)||"#8b5cf6"};\n    padding-left: 1rem;\n    background: ${"dark"===(null===(a=e.theme)||void 0===a?void 0:a.name)?"rgba(139, 92, 246, 0.08)":"rgba(139, 92, 246, 0.04)"};\n  `:""}}
  
  ${e=>{var t,n;return"h3"===e.as?`\n    font-size: 1.25em;\n    font-weight: 600;\n    color: ${(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"};\n    margin-top: 1rem;\n    margin-bottom: 0.65rem;\n    line-height: 1.4;\n    border-bottom: 2px solid ${(null===(n=e.theme)||void 0===n?void 0:n.border)||"#e5e7eb"};\n    padding-bottom: 0.25rem;\n  `:""}}
  
  /* Párrafos normales con indentación opcional */
  ${e=>"p"!==e.as&&e.as?"":"\n    text-align: justify;\n    text-indent: 1.5em;\n    line-height: 1.65;\n    \n    /* Quitar indentaci\xf3n si es el primer p\xe1rrafo despu\xe9s de un t\xedtulo */\n    &:first-of-type { text-indent: 0; }\n  "}
`,S=r.Ay.li`
  margin: 0.5rem 0;
  padding: 0.5rem 1rem 0.5rem ${e=>e.$bullet?"2.5rem":"3rem"};
  position: relative;
  line-height: 1.6;
  background: ${e=>{var t;return e.$selected?(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#f0f2f5":"transparent"}};
  border-radius: 8px;
  transition: background 0.2s ease;
  list-style: none;
  
  &:hover {
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#f0f2f5"}};
  }
  
  /* Viñeta o número posicionado absolutamente */
  &::before {
    content: ${e=>e.$marker?`"${e.$marker}"`:'"\u2022"'};
    position: absolute;
    left: 1rem;
    color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}};
    font-weight: 600;
    font-size: ${e=>e.$bullet?"1.2em":"0.9em"};
  }
  
  mark { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 3px; }
  ${e=>e.$currentHit?"mark { background: #ffd54f; }":""}
`,k=r.Ay.blockquote`
  margin: 1rem 0;
  padding: 1rem 1.5rem;
  border-left: 4px solid ${e=>{var t,n;return(null===(t=e.theme)||void 0===t?void 0:t.academicQuote)||(null===(n=e.theme)||void 0===n?void 0:n.accent)||"#6b7280"}};
  background: ${e=>{var t;return"dark"===(null===(t=e.theme)||void 0===t?void 0:t.name)?"rgba(107, 114, 128, 0.1)":"rgba(107, 114, 128, 0.05)"}};
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.textSecondary)||"#64748b"}};
  line-height: 1.6;
  position: relative;
  
  &:hover {
    background: ${e=>{var t;return"dark"===(null===(t=e.theme)||void 0===t?void 0:t.name)?"rgba(107, 114, 128, 0.15)":"rgba(107, 114, 128, 0.08)"}};
  }
  
  &::before {
    content: '"';
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    font-size: 3em;
    color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.academicQuote)||"#6b7280"}};
    opacity: 0.2;
    font-family: Georgia, serif;
    line-height: 1;
  }
  
  mark { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 3px; }
`,T=r.Ay.div`
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  font-size: 0.85em;
  color: ${e=>{var t,n;return(null===(t=e.theme)||void 0===t?void 0:t.academicFootnote)||(null===(n=e.theme)||void 0===n?void 0:n.textSecondary)||"#9ca3af"}};
  background: ${e=>{var t;return"dark"===(null===(t=e.theme)||void 0===t?void 0:t.name)?"rgba(156, 163, 175, 0.08)":"rgba(156, 163, 175, 0.05)"}};
  border-left: 2px solid ${e=>{var t,n;return(null===(t=e.theme)||void 0===t?void 0:t.academicFootnote)||(null===(n=e.theme)||void 0===n?void 0:n.border)||"#9ca3af"}};
  border-radius: 4px;
  line-height: 1.5;
  font-style: italic;
  
  &:hover {
    background: ${e=>{var t;return"dark"===(null===(t=e.theme)||void 0===t?void 0:t.name)?"rgba(156, 163, 175, 0.12)":"rgba(156, 163, 175, 0.08)"}};
  }
  
  mark { background: #fff59d; color: inherit; padding: 0 2px; border-radius: 3px; }
`,A=r.Ay.div`
  position: fixed;
  top: ${e=>e.y}px;
  left: ${e=>e.x}px;
  transform: translateY(-120%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  padding: 6px;
  display: flex;
  gap: 4px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 2px 8px rgba(102,126,234,0.2);
  z-index: 10000;
  animation: fadeIn .15s ease;
  button {
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}};
    color: #fff;
    border: none;
    padding: 6px 10px;
    font-size: 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
    &:hover { opacity: 0.9; transform: translateY(-1px); }
    &:active { transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(calc(-120% - 4px)); }
    to { opacity: 1; transform: translateY(-120%); }
  }
`,j=r.Ay.div`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#111827"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#fff"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#374151"}};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: .8rem;
  box-shadow: 0 6px 16px rgba(0,0,0,.2);
  z-index: 2000;
`,q=r.Ay.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.accent)||"#10b981"}};
  color: white;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: .9rem;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
  z-index: 2000;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`,I=r.Ay.div`
  position: sticky;
  top: 6px; /* debajo de la barra de progreso sticky */
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
  margin-bottom: .5rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#ffffff"}};
  padding: 6px 6px;
  border-radius: 8px;
  box-shadow: 0 1px 0 rgba(0,0,0,.03);
  > input[type="search"] { padding: 6px 8px; border:1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#cbd5e1"}}; border-radius: 6px; min-width: 200px; }
  > button { background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#eef2ff"}}; border:1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#cbd5e1"}}; color:${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#1f2937"}}; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:.8rem; }
`,R=r.Ay.div`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#eef2ff"}};
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: .5rem;
  &:before { content: ''; display: block; height: 100%; width: ${e=>Math.max(0,Math.min(100,e.$percent||0))}%; background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.accent)||"#6366f1"}}; transition: width .12s linear; }
`;function P(e){let{texto:t,onParagraphClick:n}=e;const{textStructure:r,archivoActual:i,saveCitation:s,completeAnalysis:l}=(0,o.useContext)(p.BR),[c,g]=(0,o.useState)(!1),[f,v]=(0,o.useState)(null),[b,x]=(0,o.useState)(!1),y=((0,o.useRef)(!1),(0,o.useRef)(null)),[P,z]=(0,o.useState)(16),[L,O]=(0,o.useState)(0),[N,M]=(0,o.useState)(""),[D,F]=(0,o.useState)([]),[U,V]=(0,o.useState)(-1),[_,B]=(0,o.useState)(!1),[H,X]=(0,o.useState)(-1),G=(0,o.useRef)(!1),W=(0,o.useRef)([]),J=((0,o.useRef)("mouse"),(0,o.useRef)(null)),[Q,Y]=(0,o.useState)(null),[Z,K]=(0,o.useState)(1),[ee,te]=(0,o.useState)(null),ne=(0,o.useMemo)((()=>{var e;return i&&("application/pdf"===i.type||(null===(e=i.name)||void 0===e?void 0:e.toLowerCase().endsWith(".pdf")))}),[i]);(0,o.useEffect)((()=>{ne&&i?i.file instanceof File?te(i.file):i.objectUrl?te(i.objectUrl):te(null):te(null)}),[ne,i]),(0,o.useEffect)((()=>{J.current=f}),[f]),(0,o.useEffect)((()=>{try{if("undefined"===typeof localStorage)return;if(!localStorage.getItem("annotations_migrated_v1")){const e=[];for(let t=0;t<localStorage.length;t++){const n=localStorage.key(t);n&&((n.startsWith("visor_highlights_")||"notasLectura"===n)&&e.push(n))}e.forEach((e=>localStorage.removeItem(e))),localStorage.setItem("annotations_migrated_v1","1")}}catch{}}),[]);const oe=(0,o.useMemo)((()=>{if(!t||!t.trim())return[];if(console.log("\ud83d\udcd0 [VisorTexto] Procesando texto, estructura IA disponible:",!!r),r&&r.sections&&r.elements){console.log("\u2728 Usando estructura detectada por IA:",r);return(0,m.gS)(t,r).map((e=>({text:e.text,type:e.type,metadata:e.metadata})))}if(console.log("\ud83d\udd27 [VisorTexto] Usando segmentaci\xf3n manual/heur\xedstica"),/\n\n/.test(t)){const e=t.split(/\n\n+/).map((e=>e.trim())).filter(Boolean);if(e.length>=2&&e.some((e=>e.length>20)))return console.log(`\ud83d\udcc4 [VisorTexto] Usando ${e.length} p\xe1rrafos por \\n\\n`),e.map((e=>({text:e,type:"paragraph",metadata:{}})))}const e=u(t,{minParagraphLen:10}).map((e=>e.content));return console.log(`\ud83e\udd16 [VisorTexto] Usando ${e.length} p\xe1rrafos por segmentaci\xf3n algor\xedtmica`),e.map((e=>({text:e,type:"paragraph",metadata:{}})))}),[t,r]),re=oe.length>800,ae=(0,o.useMemo)((()=>t?t.split(/\s+/).filter(Boolean).length:0),[t]),ie=(0,o.useMemo)((()=>(0,d.UX)(t||"")),[t]);(0,o.useCallback)((()=>{g((e=>{const t=!e;try{window.dispatchEvent(new CustomEvent("visor-focus-mode",{detail:{active:t}}))}catch{}return t}))}),[]);(0,o.useEffect)((()=>{const e=e=>{var t;"boolean"===typeof(null===e||void 0===e||null===(t=e.detail)||void 0===t?void 0:t.active)&&g(e.detail.active)};return window.addEventListener("visor-focus-mode-external",e),()=>window.removeEventListener("visor-focus-mode-external",e)}),[]);const se=(0,o.useCallback)(((e,t)=>{n&&n(e,t)}),[n]),le=(0,o.useCallback)((()=>{var e;if(null===f||void 0===f||!f.text||f.text.trim().length<10)return void console.warn("\u26a0\ufe0f [VisorTexto] Cita muy corta (m\xednimo 10 caracteres)");const n=(null===l||void 0===l||null===(e=l.metadata)||void 0===e?void 0:e.document_id)||(t?`doc_${t.substring(0,50).replace(/\s+/g,"_")}`:"documento_sin_id");!1!==s({documentId:n,texto:f.text.trim(),nota:""})&&(console.log(`\u2705 [VisorTexto] Cita guardada para documento: ${n}`),x(!0),setTimeout((()=>x(!1)),2e3)),setTimeout((()=>{v(null)}),100)}),[f,t,s,l]),ce=(0,o.useCallback)((e=>{if(null===f||void 0===f||!f.text)return;const n=new CustomEvent("reader-action",{detail:{action:e,text:f.text,fragment:f.text,fullText:t},bubbles:!0,cancelable:!0});window.dispatchEvent(n),"copy"!==e&&setTimeout((()=>{v(null)}),100)}),[f,t]),ue=(0,o.useCallback)((function(){let e=arguments.length>0&&void 0!==arguments[0]&&arguments[0];if(v(null),e)try{var t;null===(t=window.getSelection())||void 0===t||t.removeAllRanges()}catch{}}),[]);(0,o.useEffect)((()=>{const e=e=>{if(e.target.closest("button"))return;const t=window.getSelection();if(!t||t.isCollapsed)return void v(null);const n=t.toString().trim();if(!n||n.length<3)return void v(null);const o=t.getRangeAt(0).getBoundingClientRect(),r=o.left+o.width/2+window.scrollX,a=o.top+window.scrollY;v({text:n,x:r,y:a})};return document.addEventListener("mouseup",e),()=>document.removeEventListener("mouseup",e)}),[]),(0,o.useEffect)((()=>{const e=N.trim();if(!e)return F([]),void V(-1);const t=e.toLowerCase(),n=[];for(let o=0;o<oe.length;o++){("string"===typeof oe[o]?oe[o]:oe[o].text||"").toLowerCase().includes(t)&&n.push(o)}F(n),V(n.length?0:-1)}),[N,oe]),(0,o.useEffect)((()=>{if(U>=0&&D.length>0){const e=D[U];e>=0&&e<oe.length&&setTimeout((()=>{if(G.current&&y.current&&"function"===typeof y.current.scrollToIndex)y.current.scrollToIndex({index:e,align:"center",behavior:"smooth"});else{const t=W.current[e];t&&"function"===typeof t.scrollIntoView&&t.scrollIntoView({behavior:"smooth",block:"center"})}}),100)}}),[U,D,oe.length]);const de=(0,o.useCallback)((e=>{if(!(e<0||e>=oe.length))if(G.current&&y.current&&"function"===typeof y.current.scrollToIndex)y.current.scrollToIndex({index:e,align:"start",behavior:"smooth"});else{const t=W.current[e];if(t&&"function"===typeof t.scrollIntoView){const e=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;t.scrollIntoView({behavior:e?"auto":"smooth",block:"start"})}}}),[oe.length]),pe=(0,o.useCallback)((()=>{D.length&&V((e=>{const t=(e+1)%D.length,n=D[t];return de(n),t}))}),[D,de]),me=(0,o.useCallback)((()=>{D.length&&V((e=>{const t=(e-1+D.length)%D.length,n=D[t];return de(n),t}))}),[D,de]),ge=(0,o.useCallback)((()=>{K((e=>Math.min(e+.2,3))),ue(!0)}),[]),fe=(0,o.useCallback)((()=>{K((e=>Math.max(e-.2,.5))),ue(!0)}),[]),he=(0,o.useCallback)((()=>{K(1),ue(!0)}),[]),[ve,be]=(0,o.useState)({next:null,prev:null,total:0,current:0}),xe=(0,o.useCallback)((e=>{be(e)}),[]),ye=(0,o.useCallback)((e=>{null!==e&&void 0!==e&&e.text&&v({text:e.text,x:e.x,y:e.y,page:e.page})}),[]);(0,o.useEffect)((()=>{if(G.current)return;if(!oe.length)return void O(0);const e=new Set,t=new IntersectionObserver((t=>{let n=-1;t.forEach((t=>{const o=Number(t.target.getAttribute("data-parrafo"));t.isIntersecting?e.add(o):e.delete(o),t.isIntersecting&&o>n&&(n=o)}));const o=e.size?Math.max(...Array.from(e)):Math.max(n,0);O((o+1)/oe.length*100)}),{root:null,rootMargin:"0px",threshold:.2});return W.current.forEach((e=>e&&t.observe(e))),()=>t.disconnect()}),[oe.length]);(0,o.useCallback)((async e=>{try{await navigator.clipboard.writeText(e),console.log("\u2705 Texto copiado al portapapeles")}catch(t){console.error("\u274c Error copiando al portapapeles:",t);const o=document.createElement("textarea");o.value=e,o.style.position="fixed",o.style.opacity="0",document.body.appendChild(o),o.select();try{document.execCommand("copy"),console.log("\u2705 Texto copiado (m\xe9todo fallback)")}catch(n){console.error("\u274c Error en fallback:",n)}document.body.removeChild(o)}}),[]);const Ce=(0,o.useCallback)((e=>{const t=e.trim();if(!t)return"p";if(/^(resumen|abstract|introducci\xf3n|introduction|objetivos|objectives|metodolog\xeda|methodology|resultados|results|conclusiones|conclusions|referencias|references|bibliograf\xeda|bibliography|anexos|appendix|agradecimientos|acknowledgments|marco te\xf3rico|theoretical framework|discusi\xf3n|discussion|an\xe1lisis|analysis)/i.test(t)&&t.length<100)return{type:"section-header",level:1,category:t.toLowerCase().replace(/\s+/g,"_").split(/[:\-]/)[0]};const n=/^[\-\*\u2022\u25e6\u25aa\u2023]\s+/;if(n.test(t))return{type:"list-item",bullet:!0};const o=/^([\d]+|[a-z]|[ivxlcdm]+)[\.\)]\s+/i;if(o.test(t))return{type:"list-item",bullet:!1,marker:t.match(o)[0]};if(t.startsWith(">")||/^\s{4,}/.test(e))return{type:"blockquote"};if(/^[\[\(]?\d+[\]\)]?\s*[:\-]?\s+/.test(t)&&t.length<200)return{type:"footnote"};const r=t.length<120,a=!t.endsWith("."),i=/^[\d]+[\.\)]\s+[A-Z\xc1\xc9\xcd\xd3\xda\xd1]/.test(t),s=/^[IVX]+[\.\)]\s+/.test(t),l=/^(cap\xedtulo|cap\.|chapter|secci\xf3n|parte|anexo|ap\xe9ndice)/i.test(t),c=t===t.toUpperCase()&&/[A-Z\xc1\xc9\xcd\xd3\xda\xd1]/.test(t)&&t.length>3&&t.length<100,u=t.split("\n")[0].length<80;return c&&r?{type:"h1"}:l||s?{type:"h2"}:i&&r&&a||r&&a&&u&&!n.test(t)&&/^[A-Z\xc1\xc9\xcd\xd3\xda\xd1]/.test(t)?{type:"h3"}:{type:"p"}}),[]),we=(0,o.useCallback)(((e,t)=>{const n="string"===typeof e?e:e.text,r="object"===typeof e?e.type:null,a="object"===typeof e?e.metadata:{},i=D.includes(t),s=U>=0&&D[U]===t;let l=r,c=null;l&&"paragraph"!==l||(c=Ce(n),l="string"===typeof c?c:c.type,"section-header"===l&&console.log("\ud83c\udfaf [VisorTexto] Secci\xf3n detectada:",{index:t,preview:n.substring(0,50),type:l,category:c.category}));let u=n;r||("list-item"===l?u=n.replace(/^[\-\*\u2022\u25e6\u25aa\u2023]\s+/,"").replace(/^([\d]+|[a-z]|[ivxlcdm]+)[\.\)]\s+/i,""):"blockquote"===l&&(u=n.replace(/^>\s*/,"").replace(/^\s{4,}/,"")));const d=N?((e,n)=>{const r=(n||"").trim();if(!r)return e;try{const n=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),a=new RegExp(`(${n})`,"gi");return e.split(a).map(((e,n)=>e.toLowerCase()===r.toLowerCase()?(0,h.jsx)("mark",{children:e},`m-${t}-${n}`):(0,h.jsx)(o.Fragment,{children:e},`t-${t}-${n}`)))}catch{return e}})(u,N):u;if("section-header"===l){a.level;const e=a.category||"",o=r?null:Ce(n),l=e||(null===o||void 0===o?void 0:o.category)||"";return(0,h.jsx)($,{as:"h1","data-parrafo":t,"data-section-category":l,ref:e=>{G.current||(W.current[t]=e)},$compact:!1,$selected:H===t,$searchHit:i,$currentHit:s,style:{color:l.includes("resumen")||l.includes("abstract")?"#6366f1":l.includes("introduc")||l.includes("introduction")?"#8b5cf6":l.includes("metodolog")||l.includes("methodology")?"#3b82f6":l.includes("resultado")||l.includes("results")?"#10b981":l.includes("conclus")||l.includes("conclusion")?"#f59e0b":"#6366f1",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",textAlign:"center",borderBottom:"3px solid currentColor",paddingBottom:"0.5rem",marginTop:"2rem",marginBottom:"1.5rem"},onClick:e=>{se(t,n),X(t)},children:d},t)}if("emphasis"===l)return(0,h.jsx)($,{"data-parrafo":t,ref:e=>{G.current||(W.current[t]=e)},$compact:re,$selected:H===t,$searchHit:i,$currentHit:s,style:{backgroundColor:"rgba(255, 235, 59, 0.15)",borderLeft:"3px solid #fbc02d",fontWeight:500},onClick:e=>{se(t,n),X(t)},children:d},t);if("list-item"===l){const e=Ce(n);return(0,h.jsx)(S,{"data-parrafo":t,$bullet:"object"!==typeof e||!1!==e.bullet,$marker:"object"===typeof e?e.marker:null,$selected:H===t,$searchHit:i,$currentHit:s,onClick:e=>{se(t,n),X(t)},children:d},t)}return"blockquote"===l?(0,h.jsx)(k,{"data-parrafo":t,onClick:e=>{se(t,n),X(t)},children:d},t):"footnote"===l?(0,h.jsx)(T,{"data-parrafo":t,onClick:e=>{se(t,n),X(t)},children:d},t):(0,h.jsx)($,{as:l,"data-parrafo":t,ref:e=>{G.current||(W.current[t]=e)},$compact:re,$selected:H===t,$searchHit:i,$currentHit:s,onClick:e=>{se(t,n),X(t)},children:d},t)}),[se,D,U,re,H,N,Ce]),Ee=oe.length>400;G.current=Ee;const $e=ne&&Q?(0,h.jsxs)(h.Fragment,{children:[(0,h.jsxs)(I,{"aria-label":"herramientas-pdf",children:[(0,h.jsx)("button",{"aria-label":"zoom-out",onClick:fe,children:"\ud83d\udd0d\u2212"}),(0,h.jsxs)("span",{style:{fontSize:".85rem",fontWeight:"600",minWidth:"55px",textAlign:"center"},children:[Math.round(100*Z),"%"]}),(0,h.jsx)("button",{"aria-label":"zoom-in",onClick:ge,children:"\ud83d\udd0d+"}),(0,h.jsx)("button",{"aria-label":"reset-zoom",onClick:he,children:"Reset"}),(0,h.jsx)("input",{type:"search",placeholder:"Buscar en el PDF...","aria-label":"buscar-pdf",value:N,onChange:e=>M(e.target.value),style:{minWidth:"200px"}}),(0,h.jsx)("button",{"aria-label":"anterior-coincidencia",disabled:0===ve.total,onClick:()=>{var e;return null===(e=ve.prev)||void 0===e?void 0:e.call(ve)},children:"\u25c0"}),(0,h.jsx)("button",{"aria-label":"siguiente-coincidencia",disabled:0===ve.total,onClick:()=>{var e;return null===(e=ve.next)||void 0===e?void 0:e.call(ve)},children:"\u25b6"}),(0,h.jsx)("span",{"aria-live":"polite",style:{fontSize:".8rem"},children:ve.total>0?`${ve.current} / ${ve.total}`:"0 / 0"}),(0,h.jsx)("button",{"aria-label":"abrir-notas",onClick:()=>window.dispatchEvent(new CustomEvent("reader-action",{detail:{action:"notes"}})),children:"\ud83d\udcdd Notas"})]}),(0,h.jsxs)(E,{children:[(0,h.jsxs)("span",{children:["\ud83d\udcc4 ",(null===i||void 0===i?void 0:i.name)||"Documento PDF"]}),(0,h.jsxs)("span",{children:[Q," p\xe1ginas \u2022 Lectura continua"]})]})]}):null,Se=ne?null:(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)(R,{"aria-label":"progreso-lectura",$percent:L}),(0,h.jsxs)(I,{"aria-label":"herramientas-lectura",children:[(0,h.jsx)("button",{"aria-label":"disminuir-tamano",onClick:()=>z((e=>Math.max(12,e-1))),children:"A\u2212"}),(0,h.jsx)("button",{"aria-label":"aumentar-tamano",onClick:()=>z((e=>Math.min(22,e+1))),children:"A+"}),(0,h.jsx)("button",{"aria-label":"reset-visor",onClick:()=>{z(16),M(""),F([]),V(-1),g(!1)},children:"Reset"}),(0,h.jsx)("input",{type:"search",placeholder:"Buscar en el texto...","aria-label":"buscar-texto",value:N,onChange:e=>M(e.target.value)}),(0,h.jsx)("button",{"aria-label":"anterior-coincidencia",disabled:!D.length,onClick:me,children:"\u25c0"}),(0,h.jsx)("button",{"aria-label":"siguiente-coincidencia",disabled:!D.length,onClick:pe,children:"\u25b6"}),(0,h.jsx)("span",{"aria-live":"polite",style:{fontSize:".8rem"},children:D.length?`${U+1} / ${D.length}`:"0 / 0"}),(0,h.jsx)("button",{"aria-label":"abrir-notas",onClick:()=>window.dispatchEvent(new CustomEvent("reader-action",{detail:{action:"notes"}})),children:"\ud83d\udcdd Notas"})]}),(0,h.jsxs)(E,{"data-testid":"rw-stats",children:[(0,h.jsxs)("span",{children:[oe.length," p\xe1rrafos"]}),(0,h.jsxs)("span",{children:[ae," palabras"]}),(0,h.jsxs)("span",{children:[t.length," caracteres"]}),(0,h.jsxs)("span",{children:["~",ie," min"]}),oe.length>400&&(0,h.jsx)("span",{children:"Virtualizado"})]})]}),ke=ne&&ee?(0,h.jsxs)(h.Fragment,{children:[$e,(0,h.jsx)(C,{file:ee,scale:Z,searchQuery:N,onSearchNavigation:xe,onDocumentLoad:e=>{let{numPages:t}=e;return Y(t)},onSelection:ye},`pdf-scale-${Z.toFixed(2)}`)]}):Ee?(0,h.jsx)(a.aY,{style:{height:"100%"},ref:y,totalCount:oe.length,components:{Header:()=>Se},itemContent:e=>we(oe[e],e),rangeChanged:e=>{const t=(e.endIndex+1)/oe.length*100;O(t)}}):(0,h.jsxs)(h.Fragment,{children:[Se,oe.map(we)]});return(0,h.jsxs)(w,{style:ne?void 0:{fontSize:`${P}px`},children:[(0,h.jsx)("div",{role:"document","aria-label":"contenido-lectura",children:ke}),f&&(0,h.jsxs)(A,{x:f.x,y:f.y,role:"toolbar","aria-label":"seleccion-herramientas",children:[(0,h.jsx)("button",{"aria-label":"explicar-seleccion",onClick:()=>ce("explain"),children:"\ud83d\udca1 Explicar"}),(0,h.jsx)("button",{"aria-label":"guardar-cita-seleccion",onClick:le,children:"\ud83d\udcbe Guardar Cita"}),(0,h.jsx)("button",{"aria-label":"abrir-notas-seleccion",onClick:()=>ce("notes"),children:"\ud83d\udcd3 Notas"}),(0,h.jsx)("button",{"aria-label":"copiar-seleccion",onClick:()=>{try{navigator.clipboard.writeText(f.text||""),B(!0),setTimeout((()=>B(!1)),1200)}catch{}ue(!0)},children:"\ud83d\udccb Copiar"}),(0,h.jsx)("button",{"aria-label":"cerrar-toolbar",onClick:()=>ue(!0),children:"\u2716"})]}),_&&(0,h.jsx)(j,{role:"status","aria-live":"polite",children:"\u2705 Copiado"}),b&&(0,h.jsx)(q,{role:"status","aria-live":"polite",children:"\ud83d\udcbe \xa1Cita guardada!"})]})}const z=o.memo(P)},4326:(e,t,n)=>{n.d(t,{A:()=>T});var o=n(9950),r=n(4752);let a=null,i=null;try{const e=n(7424);if(e.useZDPDetector&&e.useRewards){const t=()=>{try{const t=e.useZDPDetector();return{zdp:t,rew:e.useRewards()}}catch{return{zdp:null,rew:null}}};o.useZDPIntegration=t}}catch(A){console.log("[TutorCore] PedagogyContext no disponible (entorno de test)")}function s(e){let{onBusyChange:t,onMessagesChange:n,onAssistantMessage:r,initialMessages:s=[],children:l,maxMessages:c=40,backendUrl:u="http://localhost:3001"}=e;const d=o.useZDPIntegration?o.useZDPIntegration():{zdp:null,rew:null};a=d.zdp,i=d.rew;const[p,m]=(0,o.useState)((()=>Array.isArray(s)?s.map(((e,t)=>({id:Date.now()+"-init-"+t,role:e.role||"assistant",content:e.content||""}))).filter((e=>e.content)):[])),[g,f]=(0,o.useState)(!1),h=(0,o.useRef)(null),v=(0,o.useRef)(null),b=(0,o.useRef)(0),x=(0,o.useRef)(null),y=(0,o.useRef)(""),C=((0,o.useRef)(!1),'Eres un tutor experto en literacidad cr\xedtica y pedagog\xeda emp\xe1tica. Idioma: espa\xf1ol.\n\n\ud83c\udfaf **TU MISI\xd3N PRINCIPAL**: Apoyar al estudiante en su comprensi\xf3n lectora mediante:\n1. **Clarificar dudas** con explicaciones pedag\xf3gicas claras\n2. **Validar esfuerzos** reconociendo insights y preguntas del estudiante\n3. **Generar curiosidad** con preguntas org\xe1nicas que emergen naturalmente del di\xe1logo\n4. **Construir conocimiento** sobre lo que el estudiante ya comprende\n\n\u26a0\ufe0f **REGLA CR\xcdTICA - NO INVENTAR INFORMACI\xd3N**:\n- NUNCA menciones autor, t\xedtulo, fecha o contexto hist\xf3rico a menos que est\xe9 EXPL\xcdCITO en el texto\n- Si no tienes informaci\xf3n verificable, di: "En este fragmento..." o "El texto presenta..."\n- NO adivines datos biogr\xe1ficos, editoriales o de procedencia\n- Enf\xf3cate en el TEXTO EN S\xcd: lenguaje, estructura, significado, recursos literarios\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\ud83d\udcda **MODO 1: EXPLICATIVO** (acciones \'explain\', \'summarize\', \'deep\')\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\nCuando el estudiante solicita ayuda directa, S\xc9 GENEROSO con la informaci\xf3n PRIMERO:\n\n**Estructura de respuesta**:\n1. **Valida**: "Interesante fragmento" / "Buen punto para analizar"\n2. **Explica**: Tipo de texto, tema central, recursos ret\xf3ricos, significado\n3. **Conecta**: Relaciona con ideas previas de la conversaci\xf3n (si existen)\n4. **Profundiza**: 1-2 preguntas NATURALES (no forzadas) para continuar explorando\n\n**Ejemplo CORRECTO (acci\xf3n \'explain\')**:\nEstudiante: [Selecciona "islas dispersa procesi\xf3n del basalto"]\nTutor: "Interesante fragmento, tiene una carga po\xe9tica fuerte. Aqu\xed se combinan im\xe1genes fragmentadas: \'islas dispersas\' sugiere aislamiento, elementos desconectados. \'Procesi\xf3n del basalto\' es potente porque mezcla lo ceremonial (procesi\xf3n) con lo geol\xf3gico y duro (basalto, roca volc\xe1nica). Crea una atm\xf3sfera de solemnidad fr\xeda y desconexi\xf3n.\n\nSi tuvieras que describir la emoci\xf3n que transmiten estas im\xe1genes con una palabra, \xbfcu\xe1l ser\xeda?"\n\n**Ejemplo de VALIDACI\xd3N de insight del estudiante**:\nEstudiante: "Creo que el autor usa el basalto para mostrar dureza emocional"\nTutor: "\xa1Exacto! Has captado una lectura muy interesante. El basalto como met\xe1fora de dureza emocional funciona porque es una roca volc\xe1nica, surgida de calor extremo pero ahora fr\xeda y r\xedgida. \xbfVes alguna otra palabra en el fragmento que refuerce esa idea de frialdad o distancia emocional?"\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\ud83e\udd14 **MODO 2: SOCR\xc1TICO ADAPTATIVO** (preguntas del estudiante)\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\nCuando el estudiante hace preguntas, EQUILIBRA explicaci\xf3n + preguntas gu\xeda:\n\n**Si detectas CONFUSI\xd3N** ("no entiendo", "qu\xe9 significa", "me pierdo"):\n\u2192 EXPLICA PRIMERO brevemente, LUEGO gu\xeda con preguntas simples\n\n**Si detectas CURIOSIDAD** ("por qu\xe9", "c\xf3mo se relaciona", "qu\xe9 implica"):\n\u2192 Valida la pregunta, da pistas, invita a descubrir mediante preguntas\n\n**Si detectas AN\xc1LISIS PROFUNDO** (estudiante ya conecta ideas):\n\u2192 Reconoce su insight, expande con preguntas de nivel superior (s\xedntesis, evaluaci\xf3n)\n\n**T\xe9cnicas socr\xe1ticas (usar con TACTO)**:\n\u2022 Clarificaci\xf3n: "\xbfA qu\xe9 te refieres con...?" (solo si realmente hay ambig\xfcedad)\n\u2022 Evidencia textual: "\xbfQu\xe9 frase del texto te hace pensar eso?"\n\u2022 Perspectiva m\xfaltiple: "\xbfC\xf3mo podr\xeda interpretarse de otra manera?"\n\u2022 Implicaciones: "Si eso es cierto, \xbfqu\xe9 sugiere sobre...?"\n\u2022 Voces ausentes: "\xbfQu\xe9 perspectivas no est\xe1n representadas?"\n\n**Ejemplo (pregunta con confusi\xf3n)**:\nEstudiante: "No entiendo qu\xe9 quiere decir \'procesi\xf3n del basalto\'"\nTutor: "Te explico: \'procesi\xf3n\' usualmente significa un desfile ceremonial (religioso, f\xfanebre), algo solemne. \'Basalto\' es roca volc\xe1nica, muy dura y oscura. Al combinarlas, se crea una imagen de algo pesado, r\xedgido y ceremonioso. \n\n\xbfTe ayuda pensar en el basalto como algo que se mueve lentamente, con peso?"\n\n**Ejemplo (pregunta anal\xedtica)**:\nEstudiante: "\xbfEl texto critica la modernizaci\xf3n o la defiende?"\nTutor: "Excelente pregunta cr\xedtica. Busquemos pistas juntos:\n\u2022 \xbfQu\xe9 adjetivos usa para describir la modernizaci\xf3n? \xbfSon positivos, negativos, neutrales?\n\u2022 Cuando dice \'debe ser cautelosa\', \xbfeso sugiere apoyo total o reservas?\n\u2022 \xbfHay momentos donde contraste modernizaci\xf3n con algo m\xe1s?"\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\ud83d\udca1 **GENERACI\xd3N DE PREGUNTAS ORG\xc1NICAS**\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\nTus preguntas deben sentirse como **continuaci\xf3n natural** del di\xe1logo, NO como cuestionario.\n\n\u26a0\ufe0f **REGLA CR\xcdTICA - CONTEXTO DE PREGUNTAS**:\n- NUNCA hagas preguntas sobre palabras de TUS propios mensajes anteriores\n- SOLO pregunta sobre el TEXTO ORIGINAL que el estudiante est\xe1 leyendo\n- Si mencionas "Parece que..." en tu respuesta, NO preguntes "\xbfc\xf3mo se relaciona Parece?"\n- Enf\xf3cate en conceptos, ideas, temas del fragmento ORIGINAL, no de tu explicaci\xf3n\n\n\u2705 **HACER**:\n- Preguntas que emergen del punto que acabas de explicar\n- Preguntas sobre CONCEPTOS del texto original\n- Preguntas abiertas que invitan a explorar (no tienen respuesta "correcta" \xfanica)\n- Preguntas que dan opciones: "\xbfVes esto como X o m\xe1s bien como Y?"\n- Preguntas de S\xcdNTESIS: "\xbfC\xf3mo conectar\xedas esto con...?"\n\n\u274c **EVITAR**:\n- Listas de 3-4 preguntas seguidas sin contexto\n- Preguntas que parecen examen ("\xbfCu\xe1l es el tema principal?")\n- Preguntas sobre palabras que T\xda usaste en tu respuesta\n- Preguntas redundantes que ya se respondieron\n- Preguntas sin relaci\xf3n con lo que el estudiante dijo\n- Preguntas sobre transiciones o conectores gen\xe9ricos ("\xbfc\xf3mo se relacionan X y Y?" cuando X e Y son palabras tuyas)\n\n**Ejemplo NATURAL**:\n[Despu\xe9s de explicar met\xe1fora sobre "basalto fr\xedo"]\n"Si tuvieras que elegir un adjetivo para el tono emocional de este fragmento, \xbfcu\xe1l ser\xeda?"\n\n**Ejemplo CORRECTO (sobre el texto)**:\n[Fragmento menciona "hijo" y "nombre"]\n"\xbfPor qu\xe9 crees que el acto de nombrar tiene tanta importancia en este fragmento?"\n\n**Ejemplo INCORRECTO (evitar)**:\n[Tu mensaje dice "Parece que tu mensaje... \xbfQuieres volver..."]\n\u274c "\xbfC\xf3mo se relacionan Parece y Quieres dentro de este fragmento?" (estas palabras son TUYAS, no del fragmento)\n\n**Si no tienes pregunta natural que hacer**: Termina con una invitaci\xf3n abierta simple:\n"\xbfHay algo m\xe1s del fragmento que te llame la atenci\xf3n?"\n"\xbfQu\xe9 parte del texto te genera m\xe1s preguntas?"\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\ud83e\udde0 **DETECCI\xd3N INTELIGENTE DE NECESIDADES**\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\nAdapta tu respuesta seg\xfan se\xf1ales del estudiante:\n\n**Se\xf1ales de confusi\xf3n**: "no entiendo", "me pierdo", "qu\xe9 significa", "???"\n\u2192 RESPUESTA: Explicaci\xf3n m\xe1s simple, ejemplos concretos, sin jerga\n\n**Se\xf1ales de frustraci\xf3n**: "esto es dif\xedcil", "no le encuentro sentido", "complicado"\n\u2192 RESPUESTA: Validaci\xf3n emocional + desglose en pasos peque\xf1os + \xe1nimo\n\n**Se\xf1ales de curiosidad**: "me pregunto", "ser\xe1 que", "por qu\xe9", "c\xf3mo"\n\u2192 RESPUESTA: Reconoce curiosidad + pistas + invita a explorar\n\n**Se\xf1ales de insight**: "creo que", "tal vez", "podr\xeda ser", conexiones propias\n\u2192 RESPUESTA: CELEBRA el descubrimiento + expande la idea + pregunta m\xe1s profunda\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\ud83d\udccf **PRINCIPIOS DE EXTENSI\xd3N**\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n- **Explicaciones**: 4-6 frases + 1 pregunta de seguimiento\n- **Aclaraciones**: 2-3 frases directas + pregunta de verificaci\xf3n\n- **Validaciones**: 2 frases reconocimiento + expansi\xf3n + pregunta profundizaci\xf3n\n- **Respuestas socr\xe1ticas**: Breve contexto (1-2 frases) + 2-3 preguntas gu\xeda\n\n**NUNCA**:\n- Respuestas de 1 sola frase sin contexto (parece desinter\xe9s)\n- Bloques de texto > 10 frases (abruma al estudiante)\n- Repetir explicaciones ya dadas (frustra)\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n**TU TONO**: Emp\xe1tico, paciente, entusiasta por las preguntas del estudiante. NUNCA evaluativo ni correctivo. Siempre constructivo.'),w='Ten en cuenta el historial para evitar repetir preguntas ya hechas. Si el estudiante pide algo ya discutido, recon\xf3celo y profundiza:\n  \n"Antes mencionaste [X]. Ahora que tambi\xe9n observas [Y], \xbfc\xf3mo crees que se conectan?"\n"Interesante que vuelvas a este punto. \xbfVes algo nuevo ahora que no notaste antes?"\n\n**MEMORIA DE CONVERSACI\xd3N**: \n- Si el estudiante menciona una idea previa, refi\xe9rela expl\xedcitamente\n- Si ya explicaste un concepto, construye SOBRE eso (no lo repitas)\n- Si el estudiante mostr\xf3 confusi\xf3n antes y ahora entiende, reconoce su progreso: "Veo que ahora lo captas mejor..."\n\n**PROGRESI\xd3N NATURAL**:\n- Primeras interacciones: Preguntas b\xe1sicas de comprensi\xf3n\n- Interacciones medias: Preguntas de an\xe1lisis y conexi\xf3n\n- Interacciones avanzadas: Preguntas de s\xedntesis y evaluaci\xf3n cr\xedtica';(0,o.useEffect)((()=>{if(p.length&&n)try{n(p)}catch(A){}}),[]);const E=(0,o.useCallback)((e=>{m((t=>{const o=[...t,e];o.length>c&&o.splice(0,o.length-c);try{null===n||void 0===n||n(o)}catch(A){}return o})),"assistant"===e.role&&"string"===typeof e.content&&(y.current=e.content)}),[c,n]),$=(0,o.useCallback)((e=>{if(e.length<6)return null;const t=e.filter((e=>"user"===e.role)).slice(0,5),n=new Set,o=[];if(t.forEach((e=>{const t=e.content.toLowerCase().split(/\s+/).filter((e=>e.length>4));t.forEach((e=>{t.filter((t=>t===e)).length>1&&n.add(e)})),e.content.length>0&&o.push(e.content.slice(0,80).replace(/\n/g," "))})),0===n.size&&0===o.length)return null;const r=Array.from(n).slice(0,5);return`**Resumen de la conversaci\xf3n hasta ahora:**\n- El estudiante ha hecho ${t.length} preguntas principales.\n${r.length>0?`- Temas explorados: ${r.join(", ")}`:""}\n${o.length>0?`- Preguntas principales: ${o.slice(0,3).map(((e,t)=>`${t+1}. "${e}..."`)).join(" ")}`:""}\n\nUsa este contexto para evitar repetir explicaciones ya dadas y construir sobre lo que ya se ha discutido.`}),[]),S=(0,o.useCallback)((function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:8,t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:300;const n=(!(arguments.length>2&&void 0!==arguments[2])||arguments[2])&&p.length>10?$(p):null;return{items:p.slice(-e).filter((e=>"string"===typeof(null===e||void 0===e?void 0:e.content)&&!e.content.startsWith("\u26a0\ufe0f"))).map((e=>({role:"assistant"===e.role||"user"===e.role?e.role:"user",content:e.content.length>t?e.content.slice(0,t)+"\u2026":e.content}))),summary:n}}),[p,$]),k=(0,o.useCallback)((async function(e){var n;let o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0;f(!0),null===t||void 0===t||t(!0),null===(n=h.current)||void 0===n||n.abort(),h.current=new AbortController;const a=setTimeout((()=>{h.current&&h.current.abort()}),3e4);try{var i,s,l,c,d;if("undefined"!==typeof OpenAI)try{var m,g,v,b,C;const t=new OpenAI,n=await t.chat.completions.create({model:"gpt-3.5-turbo",messages:e});clearTimeout(a);let o=(null===n||void 0===n||null===(m=n.choices)||void 0===m||null===(g=m[0])||void 0===g||null===(v=g.message)||void 0===v||null===(b=v.content)||void 0===b?void 0:b.trim())||"Sin respuesta.";const i=x.current||{},s=p.filter((e=>"assistant"===e.role)).slice(-3),l=I(o,{fragment:i.fragment||"",fullText:i.fullText||"",previousAssistantMessages:s.map((e=>e.content))});if(!l.isValid&&null!==(C=l.correctedResponse)&&void 0!==C&&C.needsRegeneration){console.warn("\u26a0\ufe0f [TutorCore] Respuesta no v\xe1lida, regenerando...",l.errors);const t=[...e.slice(0,-1),{role:"user",content:l.correctedResponse.correctionPrompt}];return k(t,0)}o=P(y.current,o);const c={id:Date.now()+"-assistant",role:"assistant",content:o};E(c);try{null===r||void 0===r||r(c,j.current)}catch{}return}catch(A){console.warn("[TutorCore] Fallback a backend tras error OpenAI global:",null===A||void 0===A?void 0:A.message)}const t=x.current||{},n=t.temperature||.7,f=await fetch(`${u}/api/chat/completion`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:e,temperature:n}),signal:h.current.signal});if(clearTimeout(a),!f.ok){const e=await f.text().catch((()=>""));throw new Error(`HTTP ${f.status}: ${e||"Respuesta no OK"}`)}const $=await f.json();let S=(null===$||void 0===$||null===(i=$.choices)||void 0===i||null===(s=i[0])||void 0===s||null===(l=s.message)||void 0===l||null===(c=l.content)||void 0===c?void 0:c.trim())||(null===$||void 0===$?void 0:$.content)||"Sin respuesta.";const T=p.filter((e=>"assistant"===e.role)).slice(-3),q=I(S,{fragment:t.fragment||"",fullText:t.fullText||"",previousAssistantMessages:T.map((e=>e.content))});if(!q.isValid&&null!==(d=q.correctedResponse)&&void 0!==d&&d.needsRegeneration){if(console.warn("\u26a0\ufe0f [TutorCore] Respuesta no v\xe1lida detectada:",q.errors),o<1){var w;console.log("\ud83d\udd04 [TutorCore] Regenerando respuesta con correcci\xf3n...");const t=[...e.slice(0,-1),{role:"user",content:`${(null===(w=e[e.length-1])||void 0===w?void 0:w.content)||""}\n\n${q.correctedResponse.correctionPrompt}`}];return k(t,o)}console.warn("\u26a0\ufe0f [TutorCore] M\xe1ximo de regeneraciones alcanzado, usando respuesta con advertencia"),S=`\u26a0\ufe0f Nota: Esta respuesta puede contener informaci\xf3n inferida. ${S}`}S=P(y.current,S);const R={id:Date.now()+"-assistant",role:"assistant",content:S};E(R);try{null===r||void 0===r||r(R,j.current)}catch{}}catch(A){var $,S,T,q,R,z,L,O;if(clearTimeout(a),"AbortError"===A.name)return void console.log("\u2139\ufe0f [TutorCore] Petici\xf3n cancelada (AbortError), ignorando");const n=(null===($=A.message)||void 0===$?void 0:$.includes("Failed to fetch"))||(null===(S=A.message)||void 0===S?void 0:S.includes("NetworkError"))||(null===(T=A.message)||void 0===T?void 0:T.includes("timeout"))||(null===(q=A.message)||void 0===q?void 0:q.includes("HTTP"))&&parseInt((null===(R=A.message.match(/HTTP (\d+)/))||void 0===R?void 0:R[1])||"0")>=500;if(n&&o<2)return console.log(`\ud83d\udd04 [TutorCore] Reintentando... (${o+1}/2)`),await new Promise((e=>setTimeout(e,1e3*(o+1)))),k(e,o+1);const i=n&&o>=2?"\u26a0\ufe0f El servidor tard\xf3 demasiado en responder. Por favor, intenta nuevamente.":null!==(z=A.message)&&void 0!==z&&z.includes("timeout")||"TimeoutError"===A.name?"\u26a0\ufe0f La solicitud tard\xf3 demasiado. Por favor, intenta nuevamente.":null!==(L=A.message)&&void 0!==L&&L.includes("HTTP 5")?"\u26a0\ufe0f Error del servidor. Por favor, intenta m\xe1s tarde.":null!==(O=A.message)&&void 0!==O&&O.includes("HTTP 4")?"\u26a0\ufe0f Error en la solicitud. Por favor, verifica tu conexi\xf3n.":"\u26a0\ufe0f Error obteniendo respuesta del tutor. Por favor, intenta nuevamente.",s={id:Date.now()+"-error",role:"assistant",content:i};E(s);try{null===r||void 0===r||r(s,j.current)}catch{}console.warn("[TutorCore] Error:",A)}finally{f(!1),null===t||void 0===t||t(!1)}}),[E,t,p]),T=(0,o.useCallback)((async function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";const n=S(),o=Array.isArray(n)?n:n.items,r=Array.isArray(n)?null:n.summary,a=x.current||{},i=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};const t=(e.fragment||"").toString().trim(),n=(e.fullText||"").toString(),o=n?n.length>1200?n.slice(0,1200)+"\u2026":n:"";return t||o?`Contexto de lectura${t?" (fragmento)":""}: ${t?'"'+t+'"':""}${o?`\n\nContexto adicional (truncado):\n${o}`:""}`:""}(a),s=L(a.lengthMode,e);let l=C+" "+w;r&&(l+="\n\n"+r),s&&(l+=" "+s),t&&(l+=t),a.webEnrichment?(console.log("\ud83c\udf10 [TutorCore] Agregando contexto web al system prompt"),console.log("\ud83d\udcc4 [TutorCore] Contenido web:",a.webEnrichment.substring(0,300)),l+="\n\n"+a.webEnrichment,delete a.webEnrichment):console.log("\u26a0\ufe0f [TutorCore] No hay webEnrichment en contexto. ctx:",Object.keys(a)),console.log("\ud83d\udccb [TutorCore] System prompt final length:",l.length);const c=[{role:"system",content:l},...o,...i?[{role:"user",content:i}]:[],{role:"user",content:e}];return console.log("\ud83d\udce4 [TutorCore] Enviando al backend:",c.length,"mensajes"),k(c)}),[k,S]),j=(0,o.useRef)(null),q=j.current={messages:p,loading:g,getContext:()=>({lastAction:x.current}),setContext:function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};try{const t=x.current||{};x.current={...t,...e}}catch{}},loadMessages:e=>{try{if(!Array.isArray(e))return;const t=e.map(((e,t)=>({id:Date.now()+"-load-"+t,role:e.role||e.r||"assistant",content:e.content||e.c||""}))).filter((e=>e.content));m(t);try{null===n||void 0===n||n(t)}catch{}}catch{}},sendPrompt:e=>{const t=Date.now(),n=(e||"").trim().slice(0,140);if(n&&v.current===n&&t-b.current<500)return Promise.resolve();v.current=n,b.current=t;try{var o,s;const t={timestamp:(new Date).toISOString(),question:e,context:(null===(o=x.current)||void 0===o?void 0:o.fragment)||"",bloomLevel:null,tutorMode:(null===(s=x.current)||void 0===s?void 0:s.action)||"general"};console.log("\ud83e\udd16 [TutorCore] Emitiendo evento tutor-interaction-logged:",t),window.dispatchEvent(new CustomEvent("tutor-interaction-logged",{detail:t})),console.log("\u2705 [TutorCore] Evento emitido exitosamente")}catch(A){console.warn("[TutorCore] Error logging interaction:",A)}let l=null;if(a)try{var c;if(l=a.detectLevel(e),console.log("\ud83e\udde0 Nivel Bloom detectado:",l),i&&null!==(c=l)&&void 0!==c&&c.current){const t=`QUESTION_BLOOM_${l.current.id}`,n=i.recordEvent(t,{bloomLevel:l.current.id,question:e.substring(0,100),confidence:l.confidence});console.log("\ud83c\udfae Puntos registrados:",n)}}catch(A){console.warn("[TutorCore] Error en detecci\xf3n Bloom:",A)}const u=function(e){const t=(e||"").toLowerCase(),n=[/esto es dif[i\xed]cil/i,/no le encuentro sentido/i,/muy complicado/i,/s\xfaper complicad/i,/imposible/i,/es imposible/i,/no puedo/i,/no puedo m\xe1s/i,/ya no puedo/i,/ya intent[e\xe9]/i,/ya lo intent[e\xe9]/i,/no veo c[o\xf3]mo/i,/frustrante/i,/frustrad[oa]/i,/me frustra/i,/esto me frustra/i,/no me sale/i,/no me da/i,/estoy hart[oa]/i,/ya me cans[e\xe9]/i,/no puedo m\xe1s/i,/tirar la toalla/i,/me rindo/i,/rendirme/i,/no puedo con esto/i,/no doy m[a\xe1]s/i],o=[/me pregunto/i,/me estoy preguntando/i,/ser[a\xe1] que/i,/ser\xe1 que/i,/por qu[e\xe9]/i,/porque/i,/por qu\xe9 raz\xf3n/i,/c[o\xf3]mo/i,/de qu\xe9 manera/i,/de qu\xe9 forma/i,/qu[e\xe9] pasa si/i,/y si/i,/cu[a\xe1]l ser[i\xed]a/i,/interesante/i,/es interesante/i,/muy interesante/i,/curioso/i,/qu\xe9 curioso/i,/quisiera saber/i,/me gustar\xeda saber/i,/tengo curiosidad/i,/me da curiosidad/i,/me llama la atenci\xf3n/i,/qu\xe9 pasar\xeda si/i,/c\xf3mo funcionar\xeda/i,/cu\xe1l ser\xeda el resultado/i,/investigar/i,/explorar/i,/profundizar/i,/saber m\xe1s/i,/conocer m\xe1s/i],r=[/creo que/i,/pienso que/i,/me parece que/i,/opino que/i,/considero que/i,/tal vez/i,/quiz\xe1/i,/quiz\xe1s/i,/podr[i\xed]a ser/i,/podr\xeda ser/i,/esto se relaciona con/i,/esto me recuerda/i,/me recuerda a/i,/similar a/i,/parecido a/i,/se parece a/i,/conecta con/i,/est\xe1 conectado con/i,/entiendo que/i,/ahora entiendo/i,/ah[a\xe1],?\s/i,/\xa1ah!/i,/ya veo/i,/ahora veo/i,/tiene sentido/i,/ahora tiene sentido/i,/\xa1claro!/i,/exacto/i,/eso es/i,/tiene l\xf3gica/i,/es l\xf3gico/i,/como si/i,/analog\xeda/i,/comparar/i,/comparando/i,/igual que/i,/lo mismo que/i,/es como/i,/equivalente a/i],a=e=>e.reduce(((e,n)=>e+(n.test(t)?1:0)),0),i=a([/no entiendo/i,/no comprendo/i,/no comprend/i,/qu[e\xe9] significa/i,/qu[e\xe9] quiere decir/i,/qu[e\xe9] quieres decir/i,/me pierdo/i,/no capto/i,/no cacho/i,/no pillo/i,/no s[e\xe9] qu[e\xe9]/i,/no s[e\xe9] que/i,/confuso/i,/confundid[oa]/i,/me confund/i,/complicado/i,/muy complicad/i,/dif[i\xed]cil/i,/muy dif[i\xed]cil/i,/es dif[i\xed]cil/i,/\?\?\?+/,/no me queda claro/i,/no me queda/i,/no tengo claro/i,/no lo veo claro/i,/no lo pillo/i,/estoy perdid[oa]/i,/me perd[i\xed]/i,/no le veo sentido/i,/no tiene sentido/i,/no me cuadra/i,/estoy bloquead[oa]/i,/no me sale/i]),s=a(n),l=a(o),c=a(r);return{confusion:i>0,frustration:s>0,curiosity:l>0,insight:c>0,_scores:{confusion:i,frustration:s,curiosity:l,insight:c}}}(e);console.log("\ud83c\udfaf [TutorCore] Necesidades detectadas:",u);let d="";u.confusion?d='\n\n\ud83c\udd98 AJUSTE: El estudiante muestra confusi\xf3n. Responde con explicaci\xf3n simple y concreta (2-3 frases), sin jerga. Usa ejemplos si ayuda. Termina con pregunta de verificaci\xf3n: "\xbfEsto te ayuda a entenderlo mejor?"':u.frustration?d='\n\n\ud83d\udcaa AJUSTE: El estudiante muestra frustraci\xf3n. PRIMERO valida emocionalmente: "Entiendo que puede ser complejo...". LUEGO desglosa en pasos peque\xf1os. Termina con \xe1nimo: "Vamos paso a paso, lo est\xe1s haciendo bien."':u.curiosity?d='\n\n\u2728 AJUSTE: El estudiante muestra curiosidad genuina. Recon\xf3celo: "Interesante pregunta..." o "Me gusta tu curiosidad...". Da pistas en lugar de respuesta completa. Invita a explorar con pregunta abierta.':u.insight&&(d='\n\n\ud83c\udfaf AJUSTE: El estudiante mostr\xf3 un insight valioso. CELEBRA su descubrimiento: "\xa1Exacto!" o "Has captado algo importante...". Expande la idea conect\xe1ndola con conceptos m\xe1s profundos. Pregunta de nivel superior (s\xedntesis/evaluaci\xf3n).');try{var m,g;const t=((null===(m=x.current)||void 0===m?void 0:m.fragment)||"").toString().trim(),n=((null===(g=x.current)||void 0===g?void 0:g.fullText)||"").toString().trim(),o=(e||"").toString().toLowerCase(),a=n||t;if(a){const e=[/(qu[e\xe9]\s+significa|qu[e\xe9]\s+quiere\s+decir|explica|explicar|aclarar)/i,/(c[o\xf3]mo\s+se\s+relaciona|por\s+qu[e\xe9]|qu[e\xe9]\s+implica)/i,/(cu[a\xe1]l\s+es\s+el\s+(tema|sentido|significado|mensaje))/i,/(de\s+qu[e\xe9]\s+trata|resumen|resume|idea\s+principal)/i,/(entiendo\s+que|creo\s+que|parece\s+que|tal\s+vez)/i,/(en\s+el\s+(texto|fragmento|p[a\xe1]rrafo)|este\s+(texto|fragmento))/i,/(el\s+autor|dice|menciona|plantea|sugiere)/i,/(lenguaje|estilo|recurso|met[a\xe1]fora|imagen|s[i\xed]mbolo)/i,/(no\s+entiendo|no\s+comprendo|duda|confus)/i,/(profundiza|m[a\xe1]s\s+sobre|detalla|amplia)/i].some((e=>e.test(o))),t=p.filter((e=>"user"===e.role)).length;if(e||t>=2)console.log("\u2705 [TutorCore] Pregunta con intenci\xf3n v\xe1lida o conversaci\xf3n establecida, permitiendo");else{const e=e=>e.toLowerCase().normalize("NFD").replace(/[^a-z\s\xe1\xe9\xed\xf3\xfa\xf1]/gi," ").replace(/\s+/g," ").trim(),t=e(o).split(" ").filter((e=>e.length>2)),n=e(a).split(" ").filter((e=>e.length>2)),i=new Set(n);let s=0;for(const o of t)i.has(o)&&s++;const l=t.length?s/t.length:1;if(console.log(`\ud83d\udcca [TutorCore] An\xe1lisis off-topic: overlap ${(100*l).toFixed(1)}% (${s}/${t.length} tokens)`),l<.05&&t.length>=5){console.warn("\u26a0\ufe0f [TutorCore] Pregunta posiblemente off-topic detectada");const e="Parece que tu pregunta podr\xeda estar sobre un tema diferente al texto que estamos analizando. Si quieres discutir este texto, puedo ayudarte. Si prefieres cambiar de tema, podemos hacerlo tambi\xe9n. \xbfEn qu\xe9 te gustar\xeda que te ayude?";E({id:Date.now()+"-assistant-steer",role:"assistant",content:e});try{null===r||void 0===r||r({role:"assistant",content:e},j.current)}catch{}return Promise.resolve()}console.log("\u2705 [TutorCore] Pregunta v\xe1lida, permitiendo")}}else console.log("\u2139\ufe0f [TutorCore] Sin contexto de lectura, permitiendo pregunta libre")}catch(A){console.warn("[TutorCore] Error en validaci\xf3n off-topic:",A)}return E({id:Date.now()+"-user",role:"user",content:e}),T(e,d)},sendAction:async function(e,t){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};const o=x.current||{};x.current={...o,action:e,fragment:t,fullText:n.fullText||o.fullText||""};Date.now();const r=(t||"").trim(),a=(n.fullText||"").toString();r.length>80&&r.slice(0,80);let i="";switch(e){case"explain":case"explain|explicar":i="USAR MODO EXPLICATIVO: Valida el fragmento seleccionado + Explica claramente (tipo de texto, tema, recursos ret\xf3ricos) + Conecta con ideas previas si existen + Genera M\xc1XIMO 1 pregunta natural de seguimiento sobre EL FRAGMENTO ORIGINAL (NO sobre palabras de tu respuesta). \u26a0\ufe0f NO menciones autor/t\xedtulo a menos que est\xe9 expl\xedcito. S\xe9 generoso con la explicaci\xf3n PRIMERO. Si no tienes pregunta natural, termina con invitaci\xf3n abierta.";break;case"summarize":i="USAR MODO EXPLICATIVO: Resume ideas clave en 3-4 frases manteniendo tono y estructura. PRIMERO resume, LUEGO m\xe1ximo 1 pregunta opcional de reflexi\xf3n sobre EL TEXTO ORIGINAL. \u26a0\ufe0f NO inventes metadatos. NO hagas preguntas sobre palabras de tu resumen.";break;case"deep":i="USAR MODO EXPLICATIVO PROFUNDO: Analiza implicaciones, perspectivas m\xfaltiples, recursos persuasivos o literarios. Conecta con conocimiento previo del estudiante. 4-6 frases de an\xe1lisis + M\xc1XIMO 1-2 preguntas de s\xedntesis sobre CONCEPTOS DEL TEXTO (no sobre palabras de tu explicaci\xf3n). \u26a0\ufe0f Basa an\xe1lisis en evidencia textual.";break;case"question":i="USAR MODO SOCR\xc1TICO ADAPTATIVO: Genera 2-3 preguntas abiertas que gu\xeden descubrimiento SOBRE EL TEXTO ORIGINAL. Preguntas deben sentirse naturales, no como examen. Enf\xf3cate en significado profundo del texto. NUNCA preguntes sobre palabras que t\xfa usaste en mensajes anteriores.";break;default:i="Ayuda pedag\xf3gica emp\xe1tica adaptada a las necesidades del estudiante. Si haces preguntas, que sean sobre EL TEXTO que el estudiante est\xe1 leyendo, NO sobre tus propias palabras."}let s="";const l=a?a.length>1200?a.slice(0,1200)+"\u2026":a:"",c=`Fragmento seleccionado: "${r}"${l?`\n\nContexto adicional (truncado):\n${l}`:""}${s}`,u=`${C} ${i}`,d=S(),p=Array.isArray(d)?d:d.items,m=Array.isArray(d)?null:d.summary,g=L((x.current||{}).lengthMode,e);let f=u+" "+w;m&&(f+="\n\n"+m),g&&(f+=" "+g);const h=[{role:"system",content:f},...p,{role:"user",content:c}];return k(h)},injectAssistant:e=>{const t={id:Date.now()+"-assistant-fup",role:"assistant",content:e};E(t);try{null===r||void 0===r||r(t,j.current)}catch{}return t},clear:()=>{m([]);try{null===n||void 0===n||n([])}catch(A){}}};function I(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{fragment:n="",fullText:o="",previousAssistantMessages:r=[]}=t,a=[];if(!e||"string"!==typeof e)return{isValid:!1,errors:["Respuesta vac\xeda o inv\xe1lida"],correctedResponse:null};e.toLowerCase();const i=(o||n||"").toLowerCase(),s={autor:[/el autor (?:se llama|es|llamado|de nombre|llamada)\s+["']?([^"']+?)["']?[\s\.]/i,/seg\xfan (?:el )?autor[:\s]+([^\.]+?)[\.]/i,/autor[:\s]+([^\.]+?)[\.]/i],titulo:[/el (?:t\xedtulo|libro|texto|obra) (?:se llama|es|llamado|titulado)\s+["']([^"']+?)["']/i,/titulado\s+["']([^"']+?)["']/i,/(?:libro|obra|texto|poema) (?:titulado|llamado)\s+["']([^"']+?)["']/i],fecha:[/\b(?:en|de|del a\xf1o|a\xf1o)\s+(\d{4})\b/i,/\b(?:escrito|publicado|publicada)\s+(?:en|el a\xf1o|a\xf1o)\s+(\d{4})\b/i]},l={};for(const[d,p]of Object.entries(s))for(const t of p){const n=e.match(t);if(n&&n[1]){const e=n[1].trim();e.length>2&&!i.includes(e.toLowerCase())&&(l[d]||(l[d]=[]),l[d].push(e))}}for(const[d,p]of Object.entries(l))p.length>0&&a.push(`Menciona ${d} "${p[0]}" que no est\xe1 en el texto original`);const c=e.match(/[\xbf\?]\s*([^\xbf?\.]+?)[\?\.]/g)||[];for(const d of c){const e=d.replace(/[\xbf\?]/g,"").trim().toLowerCase(),t=["parece","comentamos","quieres","mencion\xe9","dije","explic\xe9","antes dije"].filter((t=>e.includes(t)));if(t.length>0){e.split(/\s+/).filter((e=>e.length>3)).filter((n=>!i.includes(n)&&t.some((t=>e.includes(t))))).length>0&&a.push(`Pregunta sobre palabras del tutor ("${t[0]}") que no est\xe1n en el texto original`)}const n=[/c\xf3mo se relacionan?\s+(["']?\w+["']?)\s+y\s+(["']?\w+["']?)\s+en\s+(?:este|el)\s+fragmento/i,/qu\xe9\s+significa\s+(["']?\w+["']?)\s+en\s+este\s+fragmento/i];for(const o of n){const t=e.match(o);if(t){const e=t.slice(1).filter(Boolean).filter((e=>{const t=e.replace(/["']/g,"").toLowerCase();return t.length>2&&!i.includes(t)}));e.length>0&&!i.includes(e[0].toLowerCase())&&a.push(`Pregunta sobre palabra "${e[0]}" que no est\xe1 en el fragmento original`)}}}let u=null;return a.length>0&&(u={needsRegeneration:!0,errors:a,correctionPrompt:`La respuesta anterior ten\xeda estos problemas:\n${a.map((e=>`- ${e}`)).join("\n")}\n\nPor favor, corrige la respuesta evitando estos errores. Enf\xf3cate solo en el texto que el estudiante est\xe1 leyendo, sin mencionar informaci\xf3n que no est\xe9 expl\xedcitamente en el texto.`}),{isValid:0===a.length,errors:a,correctedResponse:u}}function R(e){return(e||"").toLowerCase().normalize("NFD").replace(/[^a-z\s\xe1\xe9\xed\xf3\xfa\xf1]/gi," ").split(/\s+/).filter((e=>e.length>3))}function P(e,t){try{const n=R(e),o=R(t);if(n.length>=15&&o.length>=15){if(function(e,t){const n=new Set(e),o=new Set(t);let r=0;for(const a of n)o.has(a)&&r++;return r/(n.size+o.size-r||1)}(n,o)>=.65){const n=new Set(z(e).map((e=>e.trim().toLowerCase()))),o=z(t).filter((e=>!n.has(e.trim().toLowerCase()))).slice(0,3).join(" ");return o&&o.length>20?"Como comentamos antes, en resumen: "+o:"Como comentamos antes, \xbfquieres que profundice en alg\xfan aspecto concreto del fragmento?"}}}catch{}return t}function z(e){return(e||"").split(/(?<=[\.!?\u00BF\u00A1\?\!])\s+/).map((e=>e.trim())).filter(Boolean)}function L(e,t){try{const n=(e||"auto").toLowerCase();if("breve"===n)return"Responde brevemente (2-4 frases m\xe1ximo) a menos que el usuario pida m\xe1s.";if("media"===n)return"Responde en una extensi\xf3n media (4-6 frases), equilibrando concisi\xf3n y detalle.";if("detallada"===n)return"Responde de forma detallada (hasta 8-10 frases) cuando el contenido lo amerite.";const o=(t||"").toLowerCase();return/resume|resumen|de qu\xe9 trata|idea principal/.test(o)?"Responde de forma concisa (2-3 frases) y directa.":/explica|por qu\xe9|c\xf3mo|analiza|relaci\xf3n/.test(o)?"Responde con el detalle necesario (4-6 frases) apoy\xe1ndote en el texto.":""}catch{return""}}return l(q)}function l(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};const{enabled:t=!0,injectDelayMs:n=250}=e,r=(0,o.useRef)(0),a=(0,o.useRef)(0),i="\ud83e\udd14 Pregunta para profundizar:";return{onAssistantMessage:(e,o)=>{if(!t||!e||"assistant"!==e.role)return;const s=e.content||"";if(s.startsWith(i)||/\?$/.test(s.trim()))return;if(/\u26a0\ufe0f/u.test(s))return;const l=Date.now();if(l-r.current<150)return;if(r.current=l,l-a.current<3e4)return;let c=function(e){if(!e||e.length<150)return null;if(/(poema|po\xe9tico|verso|estrofa|rima|met\xe1fora|s\xedmbolo|imaginer\xeda|voz l\xedrica)/i.test(e))return`En clave literaria, \xbfqu\xe9 ${/(met\xe1fora|s\xedmbolo|imagen|ritmo|rima)/i.test(e)?"met\xe1foras o s\xedmbolos":"im\xe1genes y recursos expresivos"} te llamaron m\xe1s la atenci\xf3n y c\xf3mo conectan con la idea central del fragmento?`;if(/(sin embargo|pero|no obstante)/i.test(e))return"\xbfQu\xe9 factores podr\xedan explicar el contraste que se menciona?";if(/(\b1\b|\u2022|-\s)/.test(e)||/\b(primero|segundo|tercero)\b/i.test(e))return"Entre los puntos mencionados, \xbfcu\xe1l consideras m\xe1s relevante y por qu\xe9?";const t=e.match(/\b[A-Z\xc1\xc9\xcd\xd3\xda][a-z\xe1\xe9\xed\xf3\xfa]{3,}\b/g)||[],n=new Set(["El","La","Los","Las","Un","Una","Y","De","Del","Con","Para","Como","Esto","Esa","Ese","Esta","As\xed","Puede","Podr\xeda","Muestra","Refleja","Se","Es","Fue"]),o=[...new Set(t.filter((e=>!n.has(e))))];if(o.length>=2){const e=o[0],t=o.find((t=>t!==e))||o[0];if(e&&t&&e!==t)return`\xbfC\xf3mo se relacionan ${e} y ${t} en el contexto del fragmento?`}return"\xbfQu\xe9 implicaciones pr\xe1cticas tiene lo explicado para tu comprensi\xf3n del texto?"}(s);try{var u,d,p,m;const e=null===o||void 0===o||null===(u=o.getContext)||void 0===u?void 0:u.call(o),t=null===e||void 0===e||null===(d=e.lastAction)||void 0===d||null===(p=d.fragment)||void 0===p?void 0:p.trim(),n=(null===e||void 0===e||null===(m=e.lastAction)||void 0===m?void 0:m.fullText)||"",r=(e=>{try{const t=new Set(["el","la","los","las","un","una","unos","unas","lo","al","del","de","en","con","por","para","que","es","son","se","su","sus","como","m\xe1s","muy","todo","toda","todos","todas","este","esta","estos","estas","eso","esa","ese","aqui","aqu\xed","alli","all\xed","hacia","desde","entre","sobre","tambien","tambi\xe9n","pero","aunque","sin","embargo","no","si","s\xed","ya","porque","cuando","donde","d\xf3nde","quien","qui\xe9n","cual","cu\xe1l","cuales","cu\xe1les","cuanto","cu\xe1nto","cuantos","cu\xe1ntos","pues","entonces","ademas","adem\xe1s","igual","mismo","misma","mismas","mismos","cada","otros","otras","otro","otra","ser","estar","haber","tener","hacer","poder","decir","ver","ir"]),n=(e||"").toLowerCase().normalize("NFD").replace(/[^a-z\s\xe1\xe9\xed\xf3\xfa\xf1]/gi," ").split(/\s+/).filter((e=>e.length>3&&!t.has(e))),o={};for(const e of n)o[e]=(o[e]||0)+1;return Object.entries(o).filter((e=>{let[t,o]=e;return o>=(n.length>20?2:1)})).sort(((e,t)=>t[1]-e[1])).slice(0,5).map((e=>{let[t]=e;return t}))}catch{return[]}})(t||n);if(c&&(t||r.length)){const e=t?"este fragmento":"el texto",n=r.length?` (pista: ${r.slice(0,3).join(", ")})`:"";c=c.replace("\xbfC\xf3mo se relacionan",`En ${e}, \xbfc\xf3mo se relacionan`).replace("en el contexto del fragmento",`dentro de ${e}`),/implicaciones pr\xe1cticas/i.test(c)&&(c=`Pensando en ${e}${n}, ${c[0].toLowerCase()+c.slice(1)}`)}}catch{}c&&setTimeout((()=>{try{null===o||void 0===o||o.injectAssistant(i+" "+c),a.current=Date.now()}catch{}}),n)}}}var c=n(54),u=n(387),d=n(5485),p=n(4414);function m(e){if(!e)return"";let t=e;return t=t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),t=t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>"),t=t.replace(/\*(.+?)\*/g,"<em>$1</em>"),t=t.replace(/`([^`]+)`/g,"<code>$1</code>"),t=t.replace(/^(\d+)\.\s+(.+)$/gm,"<li>$2</li>"),t=t.replace(/(<li>.*<\/li>\n?)+/g,"<ol>$&</ol>"),t=t.replace(/^[-*]\s+(.+)$/gm,"<li>$1</li>"),t=t.replace(/(<li>.*<\/li>\n?)+/g,(e=>e.includes("<ol>")?e:`<ul>${e}</ul>`)),t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'),t=t.split("\n\n").map((e=>e.trim()?`<p>${e}</p>`:"")).join("\n"),t}const g=r.Ay.div`
  position: fixed;
  right: ${e=>e.$expanded?"0":"1.25rem"};
  bottom: ${e=>e.$expanded?"auto":"1.25rem"};
  top: ${e=>e.$expanded?"0":"auto"};
  width: ${e=>e.$width?`${e.$width}px`:e.$expanded?"420px":"320px"};
  min-width: 320px;
  max-width: ${e=>e.$expanded?"800px":"420px"};
  height: ${e=>e.$expanded?"100vh":"auto"};
  max-height: ${e=>e.$expanded?"none":"420px"};
  display: flex;
  flex-direction: column;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ccc"}};
  border-radius: ${e=>e.$expanded?"12px 0 0 12px":"14px"};
  box-shadow: 0 10px 28px rgba(0,0,0,.18);
  font-size: .85rem;
  overflow: hidden;
  z-index: 1600;
  transition: ${e=>e.$isResizing?"none":"width 0.2s ease"};
`,f=r.Ay.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s ease;
  z-index: 10;
  
  &:hover {
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}}40;
  }
  
  &::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 40px;
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}};
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover::after {
    opacity: 0.6;
  }
`,h=r.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .5rem .75rem;
  background: linear-gradient(90deg, ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}} 0%, ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.accent)||"#1d4ed8"}} 100%);
  color: #fff;
  font-weight: 600;
  font-size: .8rem;
  gap: .4rem;
  flex-wrap: wrap;
  transition: max-height .3s ease, padding .3s ease, opacity .25s ease;
  max-height: ${e=>e.$hidden?"0":"300px"}; /* Aumentado de 200px a 300px para más espacio */
  padding: ${e=>e.$hidden?"0 .75rem":".5rem .75rem"};
  opacity: ${e=>e.$hidden?0:1};
  overflow: ${e=>e.$hidden?"hidden":"visible"}; /* Cambio clave: visible cuando no está oculto */
`,v=r.Ay.div`
  flex: 1;
  padding: .65rem .85rem .9rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: .6rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#f8f9fb"}};
`,b=r.Ay.div`
  align-self: ${e=>e.$user?"flex-end":"flex-start"};
  background: ${e=>{var t,n;return e.$user?(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb":(null===(n=e.theme)||void 0===n?void 0:n.surface)||"#fff"}};
  color: ${e=>{var t;return e.$user?"#fff":(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"}};
  padding: .6rem .75rem;
  border-radius: 14px;
  max-width: 88%;
  line-height: 1.45;
  font-size: .78rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.08);
  border: ${e=>{var t;return e.$user?"none":`1px solid ${(null===(t=e.theme)||void 0===t?void 0:t.border)||"#e5e7eb"}`}};
  white-space: pre-wrap;
  
  /* Soporte para markdown renderizado */
  strong { font-weight: 700; }
  em { font-style: italic; }
  code { 
    background: ${e=>e.$user?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.05)"};
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }
  ul, ol {
    margin: 4px 0;
    padding-left: 20px;
  }
  li {
    margin: 2px 0;
    line-height: 1.5;
  }
  p {
    margin: 4px 0;
    line-height: 1.5;
    &:first-child { margin-top: 0; }
    &:last-child { margin-bottom: 0; }
  }
  h1, h2, h3, h4 {
    font-weight: 600;
    margin: 6px 0 3px 0;
    line-height: 1.4;
    &:first-child { margin-top: 0; }
  }
  h1 { font-size: 1.1em; }
  h2 { font-size: 1.05em; }
  h3 { font-size: 1em; }
  a {
    color: ${e=>{var t;return e.$user?"#fff":(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}};
    text-decoration: underline;
  }
`,x=(0,r.Ay)(b)`
  animation: pulse 1.5s ease-in-out infinite;
  opacity: 0.85;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}}15;
  border: 1px dashed ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}}40;
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.85;
    }
    50% {
      opacity: 1;
    }
  }
`,y=r.Ay.form`
  padding: .4rem .55rem .55rem;
  border-top: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ddd"}};
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
  display: flex;
  gap: .4rem;
`,C=(r.Ay.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 10px;
  background: transparent;
`,r.Ay.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,.25);
  color: #fff;
  border: 1px solid rgba(255,255,255,.5);
  border-radius: 999px;
  font-size: .7rem;
  padding: .15rem .4rem;
  cursor: pointer;
  display: ${e=>e.$visible?"inline-flex":"none"};
  align-items: center;
  gap: .3rem;
  backdrop-filter: blur(2px);
`),w=r.Ay.textarea`
  flex: 1;
  font-size: .7rem;
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#ccc"}};
  padding: .4rem .5rem;
  border-radius: 6px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.inputBg)||"#fff"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"}};
  font-family: inherit;
  resize: none;
  min-height: 32px;
  max-height: 120px;
  overflow-y: auto;
  line-height: 1.4;
  transition: height 0.2s ease;
`,E=r.Ay.button`
  font-size: .7rem;
  background: ${e=>{var t,n;return(null===(t=e.theme)||void 0===t?void 0:t.accent)||(null===(n=e.theme)||void 0===n?void 0:n.primary)||"#2563eb"}};
  color: #fff;
  border: none;
  padding: .4rem .6rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .25rem;
  &:disabled { opacity: .5; cursor: not-allowed; }
`,$=r.Ay.select`
  font-size: .73rem;
  padding: .25rem .4rem;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.4);
  background: rgba(255,255,255,.25);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  
  option {
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#fff"}};
    color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#222"}};
    font-weight: 500;
  }
  
  &:hover {
    background: rgba(255,255,255,.35);
  }
`,S=r.Ay.button`
  background: rgba(255,255,255,.25);
  color: #fff;
  border: 1px solid rgba(255,255,255,.4);
  cursor: pointer;
  font-size: .73rem;
  border-radius: 6px;
  padding: .25rem .5rem;
  font-weight: 500;
  
  &:hover {
    background: rgba(255,255,255,.35);
  }
  
  &.danger {
    background: rgba(255,100,100,.4);
    &:hover {
      background: rgba(255,100,100,.5);
    }
  }
`,k=r.Ay.button`
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#2563eb"}};
  color: #fff;
  border: none;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  font-size: 1.1rem;
  box-shadow: 0 6px 18px rgba(0,0,0,.25);
  cursor: pointer;
  z-index: 1580;
  display: flex;
  align-items: center;
  justify-content: center;
`;function T(e){let{followUps:t,expanded:r=!1,onToggleExpand:a}=e;const i=(0,o.useContext)(u.BR)||{},{texto:T}=i,[A,j]=(0,o.useState)(!0),[q,I]=(0,o.useState)((()=>{try{return JSON.parse(localStorage.getItem("tutorCompactMode")||"false")}catch{return!1}})),[R,P]=(0,o.useState)(!1),[z,L]=(0,o.useState)(null),[O,N]=(0,o.useState)((()=>{try{const e=localStorage.getItem("tutorDockWidth");return e?parseInt(e,10):420}catch{return 420}})),[M,D]=(0,o.useState)(!1),F=(0,o.useMemo)((()=>{try{return T?(0,d.f$)(T,"tutor"):"tutor_empty"}catch{return"tutor_empty"}}),[T]),{initialMessages:U,handleMessagesChange:V}=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};const{storageKey:t="tutorHistorial",max:n=40}=e;return{initialMessages:(0,o.useMemo)((()=>{try{const e=JSON.parse(localStorage.getItem(t)||"[]");return Array.isArray(e)?e.map((e=>({role:e.r,content:e.c}))).filter((e=>e.content)):[]}catch{return[]}}),[t]),handleMessagesChange:(0,o.useCallback)((e=>{try{const o=e.map((e=>({r:e.role,c:e.content}))).slice(-n);localStorage.setItem(t,JSON.stringify(o))}catch{}}),[t,n])}}({storageKey:`tutorHistorial:${F}`,max:40}),[_,B]=(0,o.useState)((()=>{if("boolean"===typeof t)return t;try{const e=localStorage.getItem("tutorFollowUpsEnabled");return!!e&&JSON.parse(e)}catch{return!1}}));(0,o.useEffect)((()=>{"boolean"===typeof t&&B(t)}),[t]);const{onAssistantMessage:H}=l({enabled:_}),{currentUser:X}=(0,o.useContext)(u.BR),[G,W]=(0,o.useState)((()=>{try{return JSON.parse(localStorage.getItem("tutorConvos")||"[]")}catch{return[]}})),[J,Q]=(0,o.useState)("");(0,o.useEffect)((()=>{if(null===X||void 0===X||!X.uid)return void console.log("\ud83d\udcda [Tutor] Sin usuario autenticado, no se cargan conversaciones");console.log(`\ud83d\udcda [Tutor] Cargando conversaciones guardadas para usuario: ${X.uid}`);let e=null,t=!0;return(async()=>{try{const{getStudentProgress:o,subscribeToStudentProgress:r}=await Promise.resolve().then(n.bind(n,9916)),a=await o(X.uid,"tutor_conversations");t&&null!==a&&void 0!==a&&a.conversations&&Array.isArray(a.conversations)&&(console.log(`\ud83d\udcda [Tutor] Carga inicial: ${a.conversations.length} conversaciones desde Firestore`),W(a.conversations),localStorage.setItem("tutorConvos",JSON.stringify(a.conversations))),e=r(X.uid,"tutor_conversations",(e=>{if(t&&(console.log("\ud83d\udcda [Tutor] Actualizaci\xf3n en tiempo real de Firestore:",e),null!==e&&void 0!==e&&e.conversations&&Array.isArray(e.conversations))){const t=e.conversations;W(t),localStorage.setItem("tutorConvos",JSON.stringify(t)),console.log(`\u2705 [Tutor] ${t.length} conversaciones sincronizadas`)}}))}catch(o){console.warn("\u26a0\ufe0f [Tutor] Error cargando conversaciones desde Firestore:",o)}})(),()=>{t=!1,e&&(console.log("\ud83d\udd0c [Tutor] Desconectando listener de conversaciones"),e())}}),[X]);const[Y,Z]=(0,o.useState)((()=>{try{return localStorage.getItem("tutorLengthMode")||"auto"}catch{return"auto"}})),[K,ee]=(0,o.useState)((()=>{try{const e=localStorage.getItem("tutorTemperature");return e?parseFloat(e):.7}catch{return.7}})),te=o.useRef(null),ne=o.useRef(null),oe=()=>j((e=>!e)),re=(0,o.useCallback)((e=>{if(!r)return;e.preventDefault(),D(!0);const t=e.clientX,n=O,o=e=>{const o=t-e.clientX,r=Math.max(320,Math.min(800,n+o));N(r)},a=()=>{D(!1);try{localStorage.setItem("tutorDockWidth",O.toString())}catch(e){console.warn("No se pudo guardar el ancho del tutor:",e)}document.removeEventListener("mousemove",o),document.removeEventListener("mouseup",a)};document.addEventListener("mousemove",o),document.addEventListener("mouseup",a)}),[r,O]);(0,o.useEffect)((()=>{if(r){const e=new CustomEvent("tutor-width-change",{detail:{width:O}});window.dispatchEvent(e)}}),[O,r]);const ae=(0,o.useCallback)((e=>{if(!q)return void P(!1);const t=e.currentTarget.scrollTop;P(t>30)}),[q]);return(0,p.jsx)(s,{onBusyChange:()=>{},initialMessages:U,onMessagesChange:V,onAssistantMessage:H,backendUrl:u.fn,children:e=>((0,o.useEffect)((()=>{try{e.setContext({fullText:T||"",lengthMode:Y,temperature:K})}catch{}}),[T,Y,K,e]),(0,o.useEffect)((()=>{try{const t=localStorage.getItem(`tutorHistorial:${F}`);if(t){const n=JSON.parse(t);if(Array.isArray(n)){const t=n.map((e=>({role:e.r||e.role,content:e.c||e.content}))).filter((e=>e.content));return void e.loadMessages(t)}}e.clear()}catch{}}),[F]),(0,c.A)({onPrompt:t=>{let{prompt:n,action:o,fragment:r}=t;if(L(o),o&&r){try{"summarize"===o?e.setContext({lengthMode:"breve"}):"explain"===o?e.setContext({lengthMode:"media"}):"deep"===o?e.setContext({lengthMode:"detallada"}):"question"===o&&e.setContext({lengthMode:"breve"})}catch{}e.sendAction(o,r,{})}else n&&e.sendPrompt(n)}}),(0,o.useEffect)((()=>{const t=t=>{try{const n=(null===t||void 0===t?void 0:t.detail)||{},{action:o,fragment:r,fullText:a,prompt:i,webContext:s}=n;if(o&&r){try{"summarize"===o?e.setContext({lengthMode:"breve"}):"explain"===o?e.setContext({lengthMode:"media"}):"deep"===o?e.setContext({lengthMode:"detallada"}):"question"===o&&e.setContext({lengthMode:"breve"})}catch{}e.sendAction(o,r,{fullText:a})}else if(i&&"string"===typeof i){if(a)try{e.setContext({fullText:a})}catch{}if(s){console.log("\ud83c\udf10 [TutorDock] Agregando contexto web al sistema");try{e.setContext({webEnrichment:s})}catch(t){console.warn("\u26a0\ufe0f [TutorDock] Error agregando webContext:",t)}}e.sendPrompt(i)}}catch{}};return window.addEventListener("tutor-external-prompt",t),()=>window.removeEventListener("tutor-external-prompt",t)}),[e]),(0,o.useEffect)((()=>{if(ne.current){const e=setTimeout((()=>{ne.current&&(ne.current.scrollTop=ne.current.scrollHeight)}),100);return()=>clearTimeout(e)}}),[e.loading,e.messages.length]),(0,o.useEffect)((()=>{console.log("\ud83c\udfaf [TutorDock] useEffect montaje ejecutado, programando tutor-ready");const e=setTimeout((()=>{console.log("\ud83c\udfaf [TutorDock] Disparando evento tutor-ready");try{window.dispatchEvent(new CustomEvent("tutor-ready")),console.log("\u2705 [TutorDock] Evento tutor-ready disparado exitosamente")}catch(e){console.error("\u274c [TutorDock] Error disparando tutor-ready:",e)}}),0);return()=>{console.log("\ud83c\udfaf [TutorDock] Limpiando timeout de tutor-ready"),clearTimeout(e)}}),[]),(0,p.jsxs)(p.Fragment,{children:[!A&&!r&&(0,p.jsx)(k,{onClick:oe,title:"Mostrar tutor",children:"\ud83e\uddd1\u200d\ud83c\udfeb"}),A&&(0,p.jsxs)(g,{$expanded:r,$width:r?O:null,$isResizing:M,children:[r&&(0,p.jsx)(f,{onMouseDown:re,title:"Arrastra para redimensionar"}),(0,p.jsxs)(h,{$hidden:R,children:[(0,p.jsx)("span",{children:"\ud83e\uddd1\u200d\ud83c\udfeb Tutor Inteligente"}),(0,p.jsxs)("div",{style:{display:"flex",gap:".5rem",flexWrap:"wrap",alignItems:"center"},children:[(0,p.jsxs)($,{value:Y,onChange:e=>{const t=e.target.value;Z(t);try{localStorage.setItem("tutorLengthMode",t)}catch{}},title:"Controla qu\xe9 tan extensas son las respuestas del tutor",children:[(0,p.jsx)("option",{value:"auto",children:"\ud83d\udccf Autom\xe1tico"}),(0,p.jsx)("option",{value:"breve",children:"\u26a1 Breve"}),(0,p.jsx)("option",{value:"media",children:"\ud83d\udcdd Media"}),(0,p.jsx)("option",{value:"detallada",children:"\ud83d\udcd6 Detallada"})]}),(0,p.jsxs)($,{value:K,onChange:t=>{const n=parseFloat(t.target.value);ee(n);try{localStorage.setItem("tutorTemperature",n.toString());try{e.setContext({temperature:n})}catch{}}catch{}},title:`Controla la creatividad de las respuestas (${K}). M\xe1s bajo = m\xe1s determinista, m\xe1s alto = m\xe1s creativo`,children:[(0,p.jsx)("option",{value:"0.3",children:"\ud83c\udfaf Determinista (0.3)"}),(0,p.jsx)("option",{value:"0.5",children:"\u2696\ufe0f Equilibrado (0.5)"}),(0,p.jsx)("option",{value:"0.7",children:"\ud83d\udca1 Creativo (0.7)"}),(0,p.jsx)("option",{value:"0.9",children:"\u2728 Muy Creativo (0.9)"}),(0,p.jsx)("option",{value:"1.0",children:"\ud83d\ude80 M\xe1ximo (1.0)"})]}),(0,p.jsx)(S,{onClick:async()=>{try{console.log("\ud83d\udcbe [Tutor] Guardando conversaci\xf3n...");const o=new Date,r=(e=>e.map((e=>({r:e.role,c:e.content}))))(e.messages||[]),a={name:o.toLocaleString("es-ES",{dateStyle:"short",timeStyle:"short"}),data:r,textHash:F},i=[...Array.isArray(G)?G:[],a];if(localStorage.setItem("tutorConvos",JSON.stringify(i)),W(i),console.log(`\ud83d\udcbe [Tutor] Guardado en localStorage: ${i.length} conversaciones`),null!==X&&void 0!==X&&X.uid){console.log(`\ud83d\udcbe [Tutor] Sincronizando con Firestore para usuario: ${X.uid}`);try{const{saveStudentProgress:e}=await Promise.resolve().then(n.bind(n,9916));await e(X.uid,"tutor_conversations",{conversations:i,lastSync:(new Date).toISOString()}),console.log("\u2705 [Tutor] Conversaciones sincronizadas con Firestore")}catch(t){console.error("\u274c [Tutor] Error sincronizando con Firestore:",t)}}else console.warn("\u26a0\ufe0f [Tutor] No hay usuario autenticado, solo guardado local");alert("\u2705 Conversaci\xf3n guardada exitosamente")}catch(t){console.error("\u274c [Tutor] Error guardando conversaci\xf3n:",t),alert("\u274c Error al guardar conversaci\xf3n")}},title:"\ud83d\udcbe Guardar esta conversaci\xf3n para revisar despu\xe9s",children:"\ud83d\udcbe Guardar"}),G.length>0&&(0,p.jsxs)(p.Fragment,{children:[(0,p.jsxs)($,{value:J,onChange:e=>Q(e.target.value),style:{maxWidth:"150px"},title:"Selecciona una conversaci\xf3n guardada",children:[(0,p.jsxs)("option",{value:"",children:["\ud83d\udcda Guardadas (",G.length,")"]}),Array.isArray(G)&&G.map(((e,t)=>(0,p.jsx)("option",{value:t,children:e.name||`Conversaci\xf3n ${t+1}`},t)))]}),""!==J&&(0,p.jsx)(S,{onClick:()=>{try{const t=parseInt(J,10),n=Array.isArray(G)?G[t]:null;if(n&&Array.isArray(n.data)){const t=n.data.map((e=>({role:e.r,content:e.c})));e.loadMessages(t),alert("\u2705 Conversaci\xf3n cargada")}}catch{}},title:"\ud83d\udcc2 Cargar la conversaci\xf3n seleccionada",children:"\ud83d\udcc2 Cargar"})]}),(0,p.jsx)(S,{className:"danger",onClick:()=>{if(window.confirm("\xbfSeguro que quieres borrar todo el historial de esta conversaci\xf3n?"))try{e.clear(),localStorage.setItem("tutorHistorial","[]")}catch{}},title:"\ud83e\uddf9 Borrar todo el historial de la conversaci\xf3n actual",children:"\ud83e\uddf9 Limpiar"}),a&&(0,p.jsx)(S,{onClick:a||(()=>{}),title:r?"Contraer el tutor a tama\xf1o peque\xf1o":"Expandir el tutor a pantalla completa lateral",children:r?"\u2b05\ufe0f Contraer":"\u27a1\ufe0f Expandir"}),(0,p.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:".4rem",fontSize:".73rem",background:"rgba(255,255,255,.25)",padding:".25rem .5rem",borderRadius:"6px",cursor:"pointer",fontWeight:"500",border:"1px solid rgba(255,255,255,.4)"},title:"\ud83d\udcd0 Modo compacto: oculta esta barra autom\xe1ticamente cuando haces scroll hacia abajo en la conversaci\xf3n. Ideal para ver m\xe1s mensajes. Desliza hacia arriba para que reaparezca.",children:[(0,p.jsx)("input",{type:"checkbox",checked:q,onChange:()=>{const e=!q;I(e);try{localStorage.setItem("tutorCompactMode",JSON.stringify(e))}catch{}}}),"\ud83d\udcd0 Compacto"]}),(0,p.jsxs)("label",{style:{display:"flex",alignItems:"center",gap:".4rem",fontSize:".73rem",background:"rgba(255,255,255,.25)",padding:".25rem .5rem",borderRadius:"6px",cursor:"pointer",fontWeight:"500",border:"1px solid rgba(255,255,255,.4)"},title:"\ud83d\udca1 Preguntas de seguimiento: el tutor sugiere autom\xe1ticamente preguntas relacionadas despu\xe9s de cada respuesta",children:[(0,p.jsx)("input",{type:"checkbox",checked:_,onChange:()=>{const e=!_;B(e);try{localStorage.setItem("tutorFollowUpsEnabled",JSON.stringify(e))}catch{}}}),"\ud83d\udca1 Seguimiento"]}),(0,p.jsx)(S,{onClick:oe,style:{background:"transparent",border:"none",fontSize:"1rem",padding:".2rem .4rem"},title:"Cerrar el tutor",children:"\u2716"})]})]}),(0,p.jsx)(C,{$visible:q&&R,onClick:()=>P(!1),title:"Mostrar cabecera",children:"\u2630 Opciones"}),(0,p.jsxs)(v,{ref:ne,onScroll:ae,children:[0===e.messages.length&&(0,p.jsx)(b,{$user:!1,children:"Selecciona texto y usa la toolbar (Explicar, Resumir, etc.) o escribe una pregunta."}),e.messages.map((e=>(0,p.jsx)(b,{$user:"user"===e.role,dangerouslySetInnerHTML:{__html:"user"===e.role?e.content:m(e.content)}},e.id))),e.loading&&(0,p.jsxs)(x,{$user:!1,children:[(0,p.jsxs)("span",{style:{display:"inline-flex",alignItems:"center",gap:"6px"},children:[(0,p.jsx)("span",{style:{display:"inline-block",width:"12px",height:"12px",border:"2px solid",borderColor:"transparent",borderTopColor:"currentColor",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}),"Pensando..."]}),(0,p.jsx)("style",{children:"\n                        @keyframes spin {\n                          to { transform: rotate(360deg); }\n                        }\n                      "})]})]}),(0,p.jsxs)(y,{onSubmit:t=>{t.preventDefault();const n=t.currentTarget.elements.namedItem("tutorUserInput"),o=n.value.trim();o&&(e.sendPrompt(o),n.value="",te.current&&(te.current.style.height="32px"))},children:[(0,p.jsx)(w,{ref:te,name:"tutorUserInput",placeholder:"Haz una pregunta...",autoComplete:"off",rows:1,onChange:e=>{const t=e.target;t.style.height="auto";const n=Math.min(Math.max(t.scrollHeight,32),120);t.style.height=`${n}px`},onKeyDown:t=>{if("Enter"===t.key&&!t.shiftKey){var n;t.preventDefault();const o=null===(n=t.target.value)||void 0===n?void 0:n.trim();o&&!e.loading&&(e.sendPrompt(o),t.target.value="",te.current&&(te.current.style.height="32px"))}}}),(0,p.jsx)(E,{type:"submit",disabled:e.loading,children:e.loading?(0,p.jsxs)("span",{style:{display:"inline-flex",alignItems:"center",gap:"4px"},children:[(0,p.jsx)("span",{style:{display:"inline-block",width:"10px",height:"10px",border:"2px solid rgba(255,255,255,0.5)",borderTopColor:"rgba(255,255,255,1)",borderRadius:"50%",animation:"spin 0.6s linear infinite"}}),"Enviando..."]}):"Enviar"})]})]})]}))})}}}]);