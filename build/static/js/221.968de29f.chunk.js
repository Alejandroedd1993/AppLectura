"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[221],{539:(e,t,n)=>{n.d(t,{A:()=>w});var r=n(9950),i=n(4752),o=n(1132),a=n(4414);const s=[{label:"Analizando estructura...",icon:"\ud83d\udcca",duration:5},{label:"Evaluando con DeepSeek...",icon:"\ud83e\udd16",duration:12},{label:"Evaluando con OpenAI...",icon:"\ud83e\udde0",duration:10},{label:"Combinando feedback...",icon:"\ud83d\udd27",duration:3}],c=i.i7`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`,l=i.i7`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`,d=i.Ay.div`
  background: ${e=>e.theme.surface||"#fff"};
  border: 2px solid ${e=>e.theme.primary||"#2196F3"};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
`,u=i.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`,m=i.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,p=i.Ay.span`
  font-size: 1.5rem;
  animation: ${c} 2s ease-in-out infinite;
`,h=i.Ay.span`
  font-weight: 600;
  color: ${e=>e.theme.textPrimary||"#333"};
  font-size: 0.95rem;
`,f=i.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textSecondary||"#666"};
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  background: ${e=>e.theme.surfaceAlt||"#f5f5f5"};
  border-radius: 20px;
`,g=i.Ay.div`
  position: relative;
  width: 100%;
  height: 24px;
  background: ${e=>e.theme.border||"#e0e0e0"};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
`,b=i.Ay.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${e=>e.$progress}%;
  background: linear-gradient(
    90deg,
    ${e=>e.theme.primary||"#2196F3"} 0%,
    ${e=>e.theme.success||"#4CAF50"} 100%
  );
  background-size: 200% 100%;
  animation: ${l} 2s linear infinite;
  transition: width 0.3s ease;
  border-radius: 12px;
`,x=i.Ay.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: ${e=>e.theme.surface||"#fff"};
  font-weight: 700;
  font-size: 0.8rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  z-index: 1;
  mix-blend-mode: difference;
`,y=i.Ay.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
`,v=i.Ay.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  ${e=>e.$completed&&i.AH`
    background: ${e.theme.success||"#4CAF50"};
    color: white;
    box-shadow: 0 2px 8px ${e.theme.success}40;
  `}
  
  ${e=>e.$active&&i.AH`
    background: ${e.theme.primary||"#2196F3"};
    color: white;
    box-shadow: 0 2px 8px ${e.theme.primary}40;
    animation: ${c} 1.5s ease-in-out infinite;
  `}
  
  ${e=>!e.$active&&!e.$completed&&i.AH`
    background: ${e.theme.border||"#e0e0e0"};
    opacity: 0.5;
  `}
`,$=i.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textSecondary||"#666"};
  text-align: center;
  line-height: 1.5;
  padding: 0.75rem;
  background: ${e=>e.theme.warning}10 || '#fff3cd';
  border-radius: 6px;
  
  strong {
    color: ${e=>e.theme.textPrimary||"#333"};
  }
`,w=e=>{let{isEvaluating:t,estimatedSeconds:n=30,currentStep:i=null,theme:c}=e;const[l,w]=(0,r.useState)(0),[k,A]=(0,r.useState)(0),[S,j]=(0,r.useState)(0),_=(0,r.useMemo)((()=>s),[]);(0,r.useEffect)((()=>{if(!t)return w(0),A(0),void j(0);const e=Date.now(),r=setInterval((()=>{const t=Math.floor((Date.now()-e)/1e3);A(t);const r=Math.min(t/n*100,95),i=100*Math.pow(r/100,.8);w(Math.min(i,95));let o=0;for(let e=0;e<_.length;e++)if(o+=_[e].duration,t<o){j(e);break}}),200);return()=>clearInterval(r)}),[t,n]);const E=i||_[S];if(!t)return null;const I=Math.max(0,n-k);return(0,a.jsxs)(d,{as:o.P.div,initial:{opacity:0,y:-20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},theme:c,children:[(0,a.jsxs)(u,{children:[(0,a.jsxs)(m,{children:[(0,a.jsx)(p,{children:E.icon}),(0,a.jsx)(h,{theme:c,children:E.label})]}),(0,a.jsxs)(f,{theme:c,children:["\u23f1\ufe0f ~",I,"s restantes"]})]}),(0,a.jsxs)(g,{theme:c,children:[(0,a.jsx)(b,{$progress:l,theme:c}),(0,a.jsxs)(x,{theme:c,children:[Math.round(l),"%"]})]}),(0,a.jsx)(y,{children:_.map(((e,t)=>(0,a.jsx)(v,{$active:t===S,$completed:t<S,theme:c,title:e.label,children:t<S?"\u2713":e.icon},t)))}),(0,a.jsxs)($,{theme:c,children:["\ud83d\udca1 ",(0,a.jsx)("strong",{children:"Tip:"})," Evaluaci\xf3n dual para m\xe1xima precisi\xf3n. No cierres esta pesta\xf1a."]})]})}},5361:(e,t,n)=>{n.d(t,{Ay:()=>c});var r=n(9950);const i="activity_results_",o="1.0",a=15,s=30;function c(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{enabled:n=!0,studentAnswers:c={},aiFeedbacks:l={},criterionFeedbacks:d={},currentIndex:u=0,onRehydrate:m}=t,p=(0,r.useRef)(null),h=(0,r.useRef)(!1),f=(0,r.useCallback)((e=>e?`${i}${e}`:null),[]),g=(0,r.useCallback)((()=>{const e=Math.max(...Object.keys(c).map((e=>parseInt(e,10))),-1)+1,t=Object.values(c).filter((e=>!!e&&("string"===typeof e?e.trim().length>0:"object"===typeof e&&Object.values(e).some((e=>e&&String(e).trim().length>0))))).length,n=Object.keys(l).length,r={};return Object.values(l).forEach((e=>{if(!e)return;const t=e.evaluacion||"Sin evaluar";r[t]=(r[t]||0)+1})),{total_questions:e,answered_count:t,feedback_count:n,completion_percentage:e>0?Math.round(t/e*100):0,evaluation_distribution:r,last_question_index:u}}),[c,l,u]),b=(0,r.useCallback)((()=>{if(!e||!n)return!1;const t=f(e);if(!t)return!1;try{const n=g(),r={version:o,document_id:e,timestamp:(new Date).toISOString(),last_modified:Date.now(),data:{student_answers:c,ai_feedbacks:l,criterion_feedbacks:d,current_index:u},metrics:n};return localStorage.setItem(t,JSON.stringify(r)),x(e,n),console.log(`\u2705 [ActivityPersistence] Guardado para documento: ${e}`),!0}catch(r){return console.error("[ActivityPersistence] Error al guardar:",r),!1}}),[e,n,c,l,d,u,f,g]),x=(0,r.useCallback)(((e,t)=>{try{const n=`${i}index`,r=localStorage.getItem(n)||"{}",o=JSON.parse(r);o[e]={last_modified:Date.now(),completion:t.completion_percentage,answered_count:t.answered_count};const c=Object.entries(o);if(c.length>a){c.sort(((e,t)=>e[1].last_modified-t[1].last_modified));c.slice(0,c.length-a).forEach((e=>{let[t]=e;const n=f(t);n&&(localStorage.removeItem(n),console.log(`\ud83d\uddd1\ufe0f [ActivityPersistence] Documento antiguo eliminado: ${t}`)),delete o[t]}))}const l=Date.now(),d=24*s*60*60*1e3;c.forEach((e=>{let[t,n]=e;if(l-n.last_modified>d){const e=f(t);e&&(localStorage.removeItem(e),console.log(`\u23f0 [ActivityPersistence] Documento expirado eliminado: ${t}`)),delete o[t]}})),localStorage.setItem(n,JSON.stringify(o))}catch(n){console.warn("[ActivityPersistence] Error al actualizar \xedndice:",n)}}),[f]),y=(0,r.useCallback)((()=>{if(!e)return null;const t=f(e);if(!t)return null;try{const n=localStorage.getItem(t);if(!n)return null;const r=JSON.parse(n);return r.version!==o&&console.warn(`[ActivityPersistence] Versi\xf3n incompatible: ${r.version} vs ${o}`),console.log(`\ud83d\udce6 [ActivityPersistence] Datos cargados para documento: ${e}`),r.data}catch(n){return console.error("[ActivityPersistence] Error al cargar:",n),null}}),[e,f]),v=(0,r.useCallback)((()=>{if(!e)return!1;const t=f(e);if(!t)return!1;try{localStorage.removeItem(t);const n=`${i}index`,r=localStorage.getItem(n)||"{}",o=JSON.parse(r);return delete o[e],localStorage.setItem(n,JSON.stringify(o)),console.log(`\ud83d\uddd1\ufe0f [ActivityPersistence] Resultados eliminados para: ${e}`),!0}catch(n){return console.error("[ActivityPersistence] Error al limpiar:",n),!1}}),[e,f]),$=(0,r.useCallback)((()=>g()),[g]);return(0,r.useEffect)((()=>{if(!e)return h.current=!1,void(p.current=null);if(p.current===e)return;p.current=e,h.current=!0;const t=y();t&&m&&m(t)}),[e,y,m]),(0,r.useEffect)((()=>{if(!e||!n||!h.current)return;const t=setTimeout((()=>{b()}),3e3);return()=>clearTimeout(t)}),[e,n,c,l,d,u,b]),(0,r.useEffect)((()=>{if(!e||!n||!h.current)return;const t=setInterval((()=>{b()}),3e4);return()=>clearInterval(t)}),[e,n,b]),{saveManual:b,clearResults:v,getMetrics:$}}},6735:(e,t,n)=>{n.d(t,{HQ:()=>s,x8:()=>a});var r=n(5803),i=n(1382);const o={openai:"gpt-3.5-turbo",deepseek:"deepseek-chat",gemini:"gemini-pro"};async function a(e){let{messages:t,provider:n="deepseek",model:a,apiKey:s,temperature:c=.7,max_tokens:l=800,signal:d,timeoutMs:u=45e3}=e;const m=`${(0,i.wE)()}/api/chat/completion`,p={provider:n,model:a||o[n]||o.openai,messages:t,temperature:c,max_tokens:l,...s?{apiKey:s}:{}},h=await(0,r.u9)(m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p),signal:d},u);if(!h.ok){const e=await h.text().catch((()=>""));throw new Error(e||`HTTP ${h.status}`)}return h.json()}function s(e){var t,n,r;return null!==e&&void 0!==e&&null!==(t=e.choices)&&void 0!==t&&null!==(n=t[0])&&void 0!==n&&null!==(r=n.message)&&void 0!==r&&r.content?e.choices[0].message.content:null!==e&&void 0!==e&&e.content?e.content:null!==e&&void 0!==e&&e.message?e.message:null!==e&&void 0!==e&&e.result?e.result:void 0}},7525:(e,t,n)=>{n.d(t,{Gc:()=>i});n(9950);var r=n(4414);const i=e=>{if(!e||"string"!==typeof e)return e;const t=[];let n=0,i=0;const o=/(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)/g;let a;for(;null!==(a=o.exec(e));){a.index>n&&t.push(e.substring(n,a.index));const o=a[0],s=o.slice(o.startsWith("**")?2:1,o.endsWith("**")?-2:-1);o.startsWith("**")?t.push((0,r.jsx)("strong",{children:s},"bold-"+i++)):o.startsWith("*")?t.push((0,r.jsx)("em",{children:s},"italic-"+i++)):o.startsWith("`")&&t.push((0,r.jsx)("code",{style:{background:"#f5f5f5",padding:"2px 6px",borderRadius:"3px",fontFamily:"monospace",fontSize:"0.9em"},children:s},"code-"+i++)),n=a.index+o.length}return n<e.length&&t.push(e.substring(n)),t.length>0?(0,r.jsx)(r.Fragment,{children:t}):e}}}]);