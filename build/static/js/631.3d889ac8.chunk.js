"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[631],{5361:(e,r,t)=>{t.d(r,{Ay:()=>l});var i=t(9950);const n="activity_results_",a="1.0",o=15,s=30;function l(e){let r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{enabled:t=!0,studentAnswers:l={},aiFeedbacks:d={},criterionFeedbacks:c={},currentIndex:m=0,onRehydrate:u}=r,h=(0,i.useRef)(null),p=(0,i.useRef)(!1),g=(0,i.useCallback)((e=>e?`${n}${e}`:null),[]),x=(0,i.useCallback)((()=>{const e=Math.max(...Object.keys(l).map((e=>parseInt(e,10))),-1)+1,r=Object.values(l).filter((e=>!!e&&("string"===typeof e?e.trim().length>0:"object"===typeof e&&Object.values(e).some((e=>e&&String(e).trim().length>0))))).length,t=Object.keys(d).length,i={};return Object.values(d).forEach((e=>{if(!e)return;const r=e.evaluacion||"Sin evaluar";i[r]=(i[r]||0)+1})),{total_questions:e,answered_count:r,feedback_count:t,completion_percentage:e>0?Math.round(r/e*100):0,evaluation_distribution:i,last_question_index:m}}),[l,d,m]),b=(0,i.useCallback)((()=>{if(!e||!t)return!1;const r=g(e);if(!r)return!1;try{const t=x(),i={version:a,document_id:e,timestamp:(new Date).toISOString(),last_modified:Date.now(),data:{student_answers:l,ai_feedbacks:d,criterion_feedbacks:c,current_index:m},metrics:t};return localStorage.setItem(r,JSON.stringify(i)),v(e,t),console.log(`\u2705 [ActivityPersistence] Guardado para documento: ${e}`),!0}catch(i){return console.error("[ActivityPersistence] Error al guardar:",i),!1}}),[e,t,l,d,c,m,g,x]),v=(0,i.useCallback)(((e,r)=>{try{const t=`${n}index`,i=localStorage.getItem(t)||"{}",a=JSON.parse(i);a[e]={last_modified:Date.now(),completion:r.completion_percentage,answered_count:r.answered_count};const l=Object.entries(a);if(l.length>o){l.sort(((e,r)=>e[1].last_modified-r[1].last_modified));l.slice(0,l.length-o).forEach((e=>{let[r]=e;const t=g(r);t&&(localStorage.removeItem(t),console.log(`\ud83d\uddd1\ufe0f [ActivityPersistence] Documento antiguo eliminado: ${r}`)),delete a[r]}))}const d=Date.now(),c=24*s*60*60*1e3;l.forEach((e=>{let[r,t]=e;if(d-t.last_modified>c){const e=g(r);e&&(localStorage.removeItem(e),console.log(`\u23f0 [ActivityPersistence] Documento expirado eliminado: ${r}`)),delete a[r]}})),localStorage.setItem(t,JSON.stringify(a))}catch(t){console.warn("[ActivityPersistence] Error al actualizar \xedndice:",t)}}),[g]),f=(0,i.useCallback)((()=>{if(!e)return null;const r=g(e);if(!r)return null;try{const t=localStorage.getItem(r);if(!t)return null;const i=JSON.parse(t);return i.version!==a&&console.warn(`[ActivityPersistence] Versi\xf3n incompatible: ${i.version} vs ${a}`),console.log(`\ud83d\udce6 [ActivityPersistence] Datos cargados para documento: ${e}`),i.data}catch(t){return console.error("[ActivityPersistence] Error al cargar:",t),null}}),[e,g]),y=(0,i.useCallback)((()=>{if(!e)return!1;const r=g(e);if(!r)return!1;try{localStorage.removeItem(r);const t=`${n}index`,i=localStorage.getItem(t)||"{}",a=JSON.parse(i);return delete a[e],localStorage.setItem(t,JSON.stringify(a)),console.log(`\ud83d\uddd1\ufe0f [ActivityPersistence] Resultados eliminados para: ${e}`),!0}catch(t){return console.error("[ActivityPersistence] Error al limpiar:",t),!1}}),[e,g]),j=(0,i.useCallback)((()=>x()),[x]);return(0,i.useEffect)((()=>{if(!e)return p.current=!1,void(h.current=null);if(h.current===e)return;h.current=e,p.current=!0;const r=f();r&&u&&u(r)}),[e,f,u]),(0,i.useEffect)((()=>{if(!e||!t||!p.current)return;const r=setTimeout((()=>{b()}),3e3);return()=>clearTimeout(r)}),[e,t,l,d,c,m,b]),(0,i.useEffect)((()=>{if(!e||!t||!p.current)return;const r=setInterval((()=>{b()}),3e4);return()=>clearInterval(r)}),[e,t,b]),{saveManual:b,clearResults:y,getMetrics:j}}},5631:(e,r,t)=>{t.r(r),t.d(r,{default:()=>Oa});var i=t(9950),n=t(4752),a=t(1132),o=t(3291),s=t(387),l=t(6393),d=t(4414);const c=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`,m=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`,u=n.Ay.h3`
  margin: 0;
  color: ${e=>e.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,h=n.Ay.div`
  display: flex;
  gap: 0.5rem;
  background: ${e=>e.theme.background};
  padding: 0.25rem;
  border-radius: 8px;
`,p=n.Ay.button`
  padding: 0.5rem 1rem;
  border: none;
  background: ${e=>e.$active?e.theme.primary:"transparent"};
  color: ${e=>e.$active?"white":e.theme.text};
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>e.$active?e.theme.primaryDark:e.theme.surfaceHover};
  }
`,g=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`,x=n.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`,b=n.Ay.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${e=>e.$color||e.theme.primary};
  margin-bottom: 0.25rem;
`,v=n.Ay.div`
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,f=n.Ay.div`
  display: grid;
  grid-template-columns: ${e=>"compact"===e.$view?"repeat(auto-fit, minmax(150px, 1fr))":"detailed"===e.$view?"repeat(auto-fit, minmax(280px, 1fr))":"repeat(auto-fit, minmax(200px, 1fr))"};
  gap: 1rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`,y=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.background};
  border: 2px solid ${e=>e.$borderColor||e.theme.border};
  border-radius: 10px;
  padding: ${e=>"compact"===e.$view?"0.75rem":"1rem"};
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${e=>{var r;return(null===(r=e.theme.shadow)||void 0===r?void 0:r.lg)||"0 10px 15px rgba(0, 0, 0, 0.1)"}};
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${e=>e.$borderColor||e.theme.border};
  }
`,j=n.Ay.div`
  font-size: ${e=>"compact"===e.$view?"1.5rem":"2rem"};
  margin-bottom: 0.5rem;
  text-align: center;
`,$=n.Ay.div`
  font-size: ${e=>"compact"===e.$view?"0.75rem":"0.85rem"};
  font-weight: 600;
  color: ${e=>e.theme.text};
  text-align: center;
  margin-bottom: 0.75rem;
  min-height: ${e=>"compact"===e.$view?"2rem":"2.5rem"};
  display: flex;
  align-items: center;
  justify-content: center;
`,A=n.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`,E=n.Ay.div`
  font-size: ${e=>"compact"===e.$view?"1.25rem":"1.5rem"};
  font-weight: 700;
  color: ${e=>e.$color};
`,k=n.Ay.div`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`,w=n.Ay.div`
  width: 100%;
  height: 6px;
  background: ${e=>e.theme.backgroundSecondary};
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
`,S=(0,n.Ay)(a.P.div)`
  height: 100%;
  background: ${e=>e.$color};
  border-radius: 3px;
`,F=n.Ay.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
  display: flex;
  justify-content: space-around;
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
`,z=n.Ay.div`
  text-align: center;
  
  strong {
    display: block;
    color: ${e=>e.theme.text};
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }
`,I=n.Ay.div`
  text-align: center;
  padding: 2rem;
  color: ${e=>e.theme.textMuted};
  
  p {
    margin: 0.5rem 0;
  }
`,T=e=>0===e?"#9ca3af":e>=8.6?"#8b5cf6":e>=5.6?"#10b981":e>=2.6?"#f59e0b":"#ef4444",C=e=>{let{rubricProgress:r={},onSelectRubric:t,theme:n}=e;const[a,o]=(0,i.useState)("normal"),s=(0,i.useMemo)((()=>{const e=Object.values(r),t=e.filter((e=>e&&e.scores&&e.scores.length>0)),i=e.reduce(((e,r)=>e+(r&&r.scores?r.scores.length:0)),0),n=t.length>0?t.reduce(((e,r)=>e+Number(r.average||0)),0)/t.length:0;return{totalRubrics:e.length,evaluatedRubrics:t.length,totalAttempts:i,averageScore:n.toFixed(1)}}),[r]),l=Object.keys(r).length>0;return(0,d.jsxs)(c,{theme:n,children:[(0,d.jsxs)(m,{children:[(0,d.jsx)(u,{theme:n,children:"\ud83d\udcca Progreso en R\xfabricas"}),(0,d.jsxs)(h,{theme:n,children:[(0,d.jsx)(p,{$active:"compact"===a,onClick:()=>o("compact"),theme:n,children:"Compacto"}),(0,d.jsx)(p,{$active:"normal"===a,onClick:()=>o("normal"),theme:n,children:"Normal"}),(0,d.jsx)(p,{$active:"detailed"===a,onClick:()=>o("detailed"),theme:n,children:"Detallado"})]})]}),l&&(0,d.jsxs)(g,{children:[(0,d.jsxs)(x,{theme:n,children:[(0,d.jsxs)(b,{theme:n,$color:n.primary,children:[s.evaluatedRubrics,"/",s.totalRubrics]}),(0,d.jsx)(v,{theme:n,children:"R\xfabricas Evaluadas"})]}),(0,d.jsxs)(x,{theme:n,children:[(0,d.jsx)(b,{theme:n,$color:n.success,children:s.totalAttempts}),(0,d.jsx)(v,{theme:n,children:"Total Intentos"})]}),(0,d.jsxs)(x,{theme:n,children:[(0,d.jsx)(b,{theme:n,$color:T(parseFloat(s.averageScore)),children:s.averageScore}),(0,d.jsx)(v,{theme:n,children:"Promedio Global"})]})]}),(0,d.jsx)(f,{$view:a,children:[{id:"rubrica1",name:"Comprensi\xf3n Anal\xedtica",icon:"\ud83d\udcda"},{id:"rubrica2",name:"An\xe1lisis Cr\xedtico del Discurso",icon:"\ud83d\udd0d"},{id:"rubrica3",name:"Contextualizaci\xf3n",icon:"\ud83d\uddfa\ufe0f"},{id:"rubrica4",name:"Argumentaci\xf3n",icon:"\ud83d\udcad"},{id:"rubrica5",name:"Metacognici\xf3n \xc9tica IA",icon:"\ud83e\udd16"}].map((e=>{const i=r[e.id]||{scores:[],average:0},o=(i.scores||[]).map((e=>Number("object"===typeof e?e.score:e))),s=T(Number(i.average)),l=0===(c=Number(i.average))?"Sin evaluar":c>=8.6?"\u2b50 Excepcional":c>=5.6?"\u2713 Competente":c>=2.6?"\u25b3 En desarrollo":"\u2717 Requiere apoyo";var c;const m=o.length,u=o.length>0?o[o.length-1]:null,h=o.length>0?Math.max(...o):null;return(0,d.jsxs)(y,{theme:n,$view:a,$borderColor:s,onClick:()=>null===t||void 0===t?void 0:t(e.id),whileHover:{scale:1.02},whileTap:{scale:.98},children:[(0,d.jsx)(j,{$view:a,children:e.icon}),(0,d.jsx)($,{theme:n,$view:a,children:e.name}),(0,d.jsxs)(A,{children:[(0,d.jsx)(E,{$view:a,$color:s,children:i.average>0?i.average.toFixed(1):"\u2014"}),"compact"!==a&&(0,d.jsx)(k,{theme:n,children:l})]}),"compact"!==a&&i.average>0&&(0,d.jsx)(w,{theme:n,children:(0,d.jsx)(S,{$color:s,initial:{width:0},animate:{width:i.average/10*100+"%"},transition:{duration:.8,ease:"easeOut"}})}),"detailed"===a&&(0,d.jsxs)(F,{theme:n,children:[(0,d.jsxs)(z,{theme:n,children:[(0,d.jsx)("strong",{children:m}),"Intentos"]}),(0,d.jsxs)(z,{theme:n,children:[(0,d.jsx)("strong",{children:u?u.toFixed(1):"\u2014"}),"\xdaltimo"]}),(0,d.jsxs)(z,{theme:n,children:[(0,d.jsx)("strong",{children:h?h.toFixed(1):"\u2014"}),"Mejor"]})]})]},e.id)}))}),!l&&(0,d.jsxs)(I,{theme:n,children:[(0,d.jsx)("p",{children:"\ud83d\udcdd A\xfan no has realizado evaluaciones"}),(0,d.jsx)("p",{children:"Selecciona una dimensi\xf3n arriba para comenzar"})]})]})};function P(e){const r=Object.entries(e);if(0===r.length)return{summary:{totalRubrics:0,evaluatedRubrics:0,totalAttempts:0,averageScore:0,medianScore:0,completionRate:0},performance:{strengths:[],weaknesses:[],improving:[],declining:[]},trends:{overallTrend:"stable",consistencyScore:0},recommendations:[]};const t=r.filter((e=>{var r;let[t,i]=e;return(null===(r=i.scores)||void 0===r?void 0:r.length)>0})),i=r.flatMap((e=>{let[r,t]=e;return(t.scores||[]).map((e=>Number("object"===typeof e?e.score:e)))})),n=i.length,a=t.length>0?t.reduce(((e,r)=>{let[t,i]=r;return e+Number(i.average||0)}),0)/t.length:0,o=[...i].sort(((e,r)=>e-r)),s=Math.floor(o.length/2),l=o.length>0?o.length%2===0?(Number(o[s-1])+Number(o[s]))/2:Number(o[s]):0,d=t.filter((e=>{let[r,t]=e;return Number(t.average)>=8.6})).map((e=>{let[r,t]=e;return{rubricId:r,score:Number(t.average)}})),c=t.filter((e=>{let[r,t]=e;return Number(t.average)<5.6})).map((e=>{let[r,t]=e;return{rubricId:r,score:Number(t.average)}})),m=[],u=[];t.forEach((e=>{let[r,t]=e;if(t.scores.length>=3){const e=e=>Number("object"===typeof e?e.score:e),i=t.scores.slice(0,3).reduce(((r,t)=>r+e(t)),0)/3,n=t.scores.slice(-3).reduce(((r,t)=>r+e(t)),0)/3-i;n>1&&m.push({rubricId:r,improvement:n}),n<-1&&u.push({rubricId:r,decline:Math.abs(n)})}}));let h="stable";m.length>u.length&&(h="improving"),u.length>m.length&&(h="declining");const p=i.reduce(((e,r)=>e+Math.pow(r-a,2)),0)/i.length,g=Math.sqrt(p),x=Math.max(0,10-g),b=function(e){const r=[];e.averageScore<5.6&&r.push({type:"improvement",priority:"high",title:"Refuerza conceptos fundamentales",description:"Tu promedio actual sugiere que necesitas fortalecer las bases. Revisa los artefactos de las dimensiones con menor puntaje.",action:"Visita el tab de An\xe1lisis para revisar el texto"});e.weaknesses.length>0&&r.push({type:"focus",priority:"high",title:`Enf\xf3cate en ${e.weaknesses.length} dimensi\xf3n(es) d\xe9bil(es)`,description:"Has identificado \xe1reas de mejora espec\xedficas. Trabaja en ellas sistem\xe1ticamente.",action:"Practica m\xe1s en las dimensiones con puntaje bajo"});e.improving.length>0&&r.push({type:"motivation",priority:"medium",title:"\xa1Est\xe1s mejorando!",description:`Has mostrado progreso en ${e.improving.length} dimensi\xf3n(es). Mant\xe9n el ritmo.`,action:"Contin\xfaa practicando con constancia"});e.consistencyScore<6&&r.push({type:"strategy",priority:"medium",title:"Mejora tu consistencia",description:"Tus puntajes var\xedan mucho. Desarrolla una estrategia de respuesta m\xe1s sistem\xe1tica.",action:"Revisa los feedbacks para identificar patrones"});e.declining.length>0&&r.push({type:"alert",priority:"high",title:"\u26a0\ufe0f Atenci\xf3n: declive detectado",description:`${e.declining.length} dimensi\xf3n(es) muestran declive. Puede ser fatiga o falta de pr\xe1ctica.`,action:"Toma un descanso y retoma con enfoque renovado"});e.totalAttempts<5&&r.push({type:"engagement",priority:"low",title:"Aumenta tu pr\xe1ctica",description:"M\xe1s evaluaciones te dar\xe1n mejor feedback sobre tu progreso.",action:"Intenta responder al menos 2 preguntas por dimensi\xf3n"});e.averageScore>=8.6&&r.push({type:"challenge",priority:"low",title:"\ud83c\udf1f \xa1Excelente desempe\xf1o!",description:"Has demostrado dominio. Considera desaf\xedos m\xe1s complejos.",action:"Explora textos m\xe1s avanzados o g\xe9neros diferentes"});return r.sort(((e,r)=>{const t={high:0,medium:1,low:2};return t[e.priority]-t[r.priority]}))}({averageScore:a,strengths:d,weaknesses:c,improving:m,declining:u,totalAttempts:n,consistencyScore:x});return{summary:{totalRubrics:r.length,evaluatedRubrics:t.length,totalAttempts:n,averageScore:parseFloat(a.toFixed(2)),medianScore:parseFloat(l.toFixed(2)),completionRate:t.length/r.length*100},performance:{strengths:d,weaknesses:c,improving:m,declining:u},trends:{overallTrend:h,consistencyScore:parseFloat(x.toFixed(2))},recommendations:b}}var N=t(7927),M=t(6538),D=t(2847),R=t(3245),O=t(158),_=t(4813),B=t(2174),L=t(7202),U=t(4980);const G=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 640px) {
    padding: 1rem;
  }
`,H=n.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,q=n.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  line-height: 1.4;
`,V=n.Ay.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
`,Y=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`,W=n.Ay.div`
  font-weight: 600;
  color: ${e=>e.theme.text};
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
`,J=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0;
  font-size: 0.8rem;
`,K=n.Ay.div`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${e=>e.$color};
`,Q={rubrica1:"#3B82F6",rubrica2:"#8B5CF6",rubrica3:"#10B981",rubrica4:"#F59E0B",rubrica5:"#EF4444"},X={rubrica1:"Comprensi\xf3n",rubrica2:"ACD",rubrica3:"Contextualizaci\xf3n",rubrica4:"Argumentaci\xf3n",rubrica5:"Metacognici\xf3n"},Z=e=>{let{active:r,payload:t,label:i,theme:n}=e;return r&&t?(0,d.jsxs)(Y,{theme:n,children:[(0,d.jsxs)(W,{theme:n,children:["Intento #",i]}),t.map(((e,r)=>(0,d.jsxs)(J,{children:[(0,d.jsx)(K,{$color:e.color}),(0,d.jsxs)("span",{style:{color:n.text},children:[e.name,": ",(0,d.jsx)("strong",{children:e.value.toFixed(1)}),"/10"]})]},r)))]}):null},ee=e=>{let{rubricProgress:r={},theme:t}=e;const n=(0,i.useMemo)((()=>{const e=Object.entries(r).filter((e=>{var r;let[t,i]=e;return t.startsWith("rubrica")&&(null===(r=i.scores)||void 0===r?void 0:r.length)>0}));if(0===e.length)return[];const t=Math.max(...e.map((e=>{let[r,t]=e;return t.scores.length}))),i=[];for(let r=0;r<t;r++){const t={attempt:r+1};e.forEach((e=>{let[i,n]=e;if(void 0!==n.scores[r]){const e="object"===typeof n.scores[r]?Number(n.scores[r].score):Number(n.scores[r]);t[i]=e}})),i.push(t)}return i}),[r]),a=(0,i.useMemo)((()=>Object.keys(r).filter((e=>{var t,i;return e.startsWith("rubrica")&&(null===(t=r[e])||void 0===t||null===(i=t.scores)||void 0===i?void 0:i.length)>0}))),[r]);return 0===n.length?(0,d.jsxs)(G,{theme:t,children:[(0,d.jsx)(H,{theme:t,children:"\ud83d\udcc8 Evoluci\xf3n Temporal"}),(0,d.jsxs)(V,{theme:t,children:[(0,d.jsx)("p",{children:"\ud83d\udcca A\xfan no hay suficientes datos para generar el gr\xe1fico"}),(0,d.jsx)("p",{children:"Completa al menos 2 evaluaciones en una r\xfabrica para ver tu progreso"})]})]}):(0,d.jsxs)(G,{theme:t,children:[(0,d.jsx)(H,{theme:t,children:"\ud83d\udcc8 Evoluci\xf3n Temporal de Progreso"}),(0,d.jsx)(q,{theme:t,children:"Observa c\xf3mo ha evolucionado tu desempe\xf1o en cada dimensi\xf3n a lo largo de tus intentos. Las l\xedneas ascendentes indican mejora continua."}),(0,d.jsx)(M.u,{width:"100%",height:350,children:(0,d.jsxs)(D.b,{data:n,margin:{top:5,right:20,left:-10,bottom:5},children:[(0,d.jsx)(R.d,{strokeDasharray:"3 3",stroke:t.border||"#E4EAF1",opacity:.5}),(0,d.jsx)(O.W,{dataKey:"attempt",stroke:t.textMuted||"#607D8B",style:{fontSize:"0.85rem"},label:{value:"N\xfamero de Intento",position:"insideBottom",offset:-5,style:{fill:t.textMuted,fontSize:"0.8rem"}}}),(0,d.jsx)(_.h,{domain:[0,10],stroke:t.textMuted||"#607D8B",style:{fontSize:"0.85rem"},label:{value:"Puntuaci\xf3n (0-10)",angle:-90,position:"insideLeft",style:{fill:t.textMuted,fontSize:"0.8rem"}}}),(0,d.jsx)(B.m,{content:(0,d.jsx)(Z,{theme:t}),cursor:{stroke:t.primary,strokeDasharray:"5 5"}}),(0,d.jsx)(L.s,{wrapperStyle:{fontSize:"0.85rem",paddingTop:"1rem"},formatter:e=>X[e]||e}),a.map((e=>(0,d.jsx)(U.N,{type:"monotone",dataKey:e,stroke:Q[e],strokeWidth:2.5,dot:{r:4,fill:Q[e],strokeWidth:2,stroke:"#fff"},activeDot:{r:6,stroke:"#fff",strokeWidth:2},name:X[e],connectNulls:!0},e)))]})})]})};var re=t(9510),te=t(5100),ie=t(7515),ne=t(8438),ae=t(3101);const oe=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 640px) {
    padding: 1rem;
  }
`,se=n.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,le=n.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  line-height: 1.4;
`,de=n.Ay.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
`,ce=n.Ay.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`,me=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
`,ue=n.Ay.div`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: ${e=>e.$color};
`,he=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${e=>e.theme.border};
`,pe=n.Ay.div`
  text-align: center;
`,ge=n.Ay.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${e=>e.$color};
  margin-bottom: 0.25rem;
`,xe=n.Ay.div`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
  text-transform: uppercase;
`,be=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`,ve=n.Ay.div`
  font-weight: 600;
  color: ${e=>e.theme.text};
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
`,fe=n.Ay.div`
  color: ${e=>e.$color};
  font-size: 1.25rem;
  font-weight: 700;
`,ye={rubrica1:"Comprensi\xf3n Anal\xedtica",rubrica2:"An\xe1lisis Cr\xedtico del Discurso",rubrica3:"Contextualizaci\xf3n",rubrica4:"Argumentaci\xf3n",rubrica5:"Metacognici\xf3n IA"},je=e=>{let{active:r,payload:t,theme:i}=e;if(!r||!t||!t[0])return null;const n=t[0].payload,a=t[0].value;return(0,d.jsxs)(be,{theme:i,children:[(0,d.jsx)(ve,{theme:i,children:n.fullName}),(0,d.jsxs)(fe,{$color:t[0].fill,children:[a.toFixed(1),"/10"]})]})},$e=e=>{let{rubricProgress:r={},theme:t}=e;const n=(0,i.useMemo)((()=>{const e=[];return Object.entries(r).forEach((r=>{let[t,i]=r;var n;t.startsWith("rubrica")&&void 0!==(null===i||void 0===i?void 0:i.average)&&e.push({rubric:t,name:(null===(n=ye[t])||void 0===n?void 0:n.split(" ")[0])||t,fullName:ye[t]||t,score:Number(i.average)})})),e}),[r]),a=(0,i.useMemo)((()=>{if(0===n.length)return null;const e=n.map((e=>e.score)),r=e.reduce(((e,r)=>e+r),0)/e.length,t=Math.max(...e),i=Math.min(...e),a=t-i;return{average:r.toFixed(1),max:t.toFixed(1),min:i.toFixed(1),range:a.toFixed(1),balance:a<2?"Equilibrado":a<4?"Moderado":"Desbalanceado"}}),[n]);return 0===n.length?(0,d.jsxs)(oe,{theme:t,children:[(0,d.jsx)(se,{theme:t,children:"\ud83c\udfaf Comparaci\xf3n de Competencias"}),(0,d.jsxs)(de,{theme:t,children:[(0,d.jsx)("p",{children:"\ud83d\udcca A\xfan no hay datos suficientes"}),(0,d.jsx)("p",{children:"Completa al menos 2 r\xfabricas para ver la comparaci\xf3n"})]})]}):(0,d.jsxs)(oe,{theme:t,children:[(0,d.jsx)(se,{theme:t,children:"\ud83c\udfaf Comparaci\xf3n de Competencias"}),(0,d.jsx)(le,{theme:t,children:"Este gr\xe1fico de radar muestra tu nivel de dominio en cada dimensi\xf3n. Un \xe1rea m\xe1s amplia indica mayor desarrollo de competencias."}),(0,d.jsx)(M.u,{width:"100%",height:400,children:(0,d.jsxs)(re.V,{data:n,children:[(0,d.jsx)(te.z,{stroke:t.border||"#E4EAF1",opacity:.5}),(0,d.jsx)(ie.r,{dataKey:"name",stroke:t.textMuted||"#607D8B",style:{fontSize:"0.8rem",fontWeight:"500"}}),(0,d.jsx)(ne.E,{angle:90,domain:[0,10],stroke:t.textMuted||"#607D8B",style:{fontSize:"0.75rem"},tick:{fill:t.textMuted}}),(0,d.jsx)(ae.V,{name:"Puntuaci\xf3n",dataKey:"score",stroke:t.primary||"#3190FC",fill:t.primary||"#3190FC",fillOpacity:.5,strokeWidth:2}),(0,d.jsx)(B.m,{content:(0,d.jsx)(je,{theme:t})})]})}),(0,d.jsx)(ce,{children:(0,d.jsxs)(me,{children:[(0,d.jsx)(ue,{$color:t.primary||"#3190FC"}),(0,d.jsx)("span",{style:{color:t.text},children:"Tu Desempe\xf1o Actual"})]})}),a&&(0,d.jsxs)(he,{theme:t,children:[(0,d.jsxs)(pe,{children:[(0,d.jsx)(ge,{$color:t.primary,theme:t,children:a.average}),(0,d.jsx)(xe,{theme:t,children:"Promedio"})]}),(0,d.jsxs)(pe,{children:[(0,d.jsx)(ge,{$color:"#10B981",theme:t,children:a.max}),(0,d.jsx)(xe,{theme:t,children:"M\xe1ximo"})]}),(0,d.jsxs)(pe,{children:[(0,d.jsx)(ge,{$color:"#EF4444",theme:t,children:a.min}),(0,d.jsx)(xe,{theme:t,children:"M\xednimo"})]}),(0,d.jsxs)(pe,{children:[(0,d.jsx)(ge,{$color:t.textMuted,theme:t,children:a.balance}),(0,d.jsx)(xe,{theme:t,children:"Balance"})]})]})]})};var Ae=t(294),Ee=t(5023),ke=t(2528);const we=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 640px) {
    padding: 1rem;
  }
`,Se=n.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Fe=n.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  line-height: 1.4;
`,ze=n.Ay.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
`,Ie=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`,Te=n.Ay.div`
  font-weight: 600;
  color: ${e=>e.theme.text};
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
`,Ce=n.Ay.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin: 0.25rem 0;
  font-size: 0.8rem;
`,Pe=n.Ay.span`
  color: ${e=>e.theme.textMuted};
`,Ne=n.Ay.span`
  color: ${e=>e.theme.text};
  font-weight: 600;
`,Me=n.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
`,De=n.Ay.div`
  font-weight: 600;
  color: ${e=>e.theme.text};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Re=n.Ay.ul`
  margin: 0;
  padding-left: 1.5rem;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  line-height: 1.6;
`,Oe={rubrica1:"#3B82F6",rubrica2:"#8B5CF6",rubrica3:"#10B981",rubrica4:"#F59E0B",rubrica5:"#EF4444"},_e={rubrica1:"Comprensi\xf3n",rubrica2:"ACD",rubrica3:"Contextualizaci\xf3n",rubrica4:"Argumentaci\xf3n",rubrica5:"Metacognici\xf3n"},Be=e=>{let{active:r,payload:t,theme:i}=e;if(!r||!t||!t[0])return null;const n=t[0].payload;return(0,d.jsxs)(Ie,{theme:i,children:[(0,d.jsx)(Te,{theme:i,children:n.fullName}),(0,d.jsxs)(Ce,{children:[(0,d.jsx)(Pe,{theme:i,children:"Intentos:"}),(0,d.jsx)(Ne,{theme:i,children:n.attempts})]}),(0,d.jsxs)(Ce,{children:[(0,d.jsx)(Pe,{theme:i,children:"Promedio:"}),(0,d.jsxs)(Ne,{theme:i,children:[n.average.toFixed(1),"/10"]})]}),(0,d.jsxs)(Ce,{children:[(0,d.jsx)(Pe,{theme:i,children:"Mejor:"}),(0,d.jsxs)(Ne,{theme:i,style:{color:"#10B981"},children:[n.best.toFixed(1),"/10"]})]}),(0,d.jsxs)(Ce,{children:[(0,d.jsx)(Pe,{theme:i,children:"\xdaltimo:"}),(0,d.jsxs)(Ne,{theme:i,children:[n.last.toFixed(1),"/10"]})]})]})},Le=e=>{let{rubricProgress:r={},theme:t}=e;const n=(0,i.useMemo)((()=>{const e=[];return Object.entries(r).forEach((r=>{var t;let[i,n]=r;if(i.startsWith("rubrica")&&(null===n||void 0===n||null===(t=n.scores)||void 0===t?void 0:t.length)>0){const r=n.scores.map((e=>Number("object"===typeof e?e.score:e)));e.push({rubric:i,name:_e[i]||i,fullName:_e[i]||i,attempts:r.length,average:Number(n.average||0),best:Math.max(...r),last:r[r.length-1],color:Oe[i]})}})),e.sort(((e,r)=>r.attempts-e.attempts))}),[r]),a=(0,i.useMemo)((()=>{if(0===n.length)return[];const e=[],r=n.reduce(((e,r)=>e+r.attempts),0)/n.length,t=n[0];t.attempts>1.5*r&&e.push(`${t.name} es tu dimensi\xf3n m\xe1s practicada (${t.attempts} intentos)`);const i=n[n.length-1];i.attempts<.5*r&&e.push(`Considera practicar m\xe1s ${i.name} (solo ${i.attempts} intento${i.attempts>1?"s":""})`);const a=n.filter((e=>e.last>e.average));if(a.length>0){const r=a.sort(((e,r)=>r.last-r.average-(e.last-e.average)))[0];e.push(`\xa1Tu \xfaltimo intento en ${r.name} super\xf3 tu promedio! (${r.last.toFixed(1)} vs ${r.average.toFixed(1)})`)}return Math.max(...n.map((e=>e.attempts)))-Math.min(...n.map((e=>e.attempts)))>5&&e.push("Tu pr\xe1ctica est\xe1 desbalanceada. Intenta distribuir intentos m\xe1s equitativamente"),e}),[n]);return 0===n.length?(0,d.jsxs)(we,{theme:t,children:[(0,d.jsx)(Se,{theme:t,children:"\ud83d\udcca Distribuci\xf3n de Intentos"}),(0,d.jsxs)(ze,{theme:t,children:[(0,d.jsx)("p",{children:"\ud83d\udcca A\xfan no hay datos"}),(0,d.jsx)("p",{children:"Completa evaluaciones para ver la distribuci\xf3n de tus intentos"})]})]}):(0,d.jsxs)(we,{theme:t,children:[(0,d.jsx)(Se,{theme:t,children:"\ud83d\udcca Distribuci\xf3n de Intentos por Dimensi\xf3n"}),(0,d.jsx)(Fe,{theme:t,children:"Visualiza cu\xe1ntas veces has evaluado cada dimensi\xf3n y tu promedio en cada una. Las barras m\xe1s altas indican mayor pr\xe1ctica."}),(0,d.jsx)(M.u,{width:"100%",height:300,children:(0,d.jsxs)(Ae.E,{data:n,margin:{top:5,right:20,left:-10,bottom:5},children:[(0,d.jsx)(R.d,{strokeDasharray:"3 3",stroke:t.border||"#E4EAF1",opacity:.5}),(0,d.jsx)(O.W,{dataKey:"name",stroke:t.textMuted||"#607D8B",style:{fontSize:"0.8rem"},angle:-15,textAnchor:"end",height:60}),(0,d.jsx)(_.h,{stroke:t.textMuted||"#607D8B",style:{fontSize:"0.85rem"},label:{value:"N\xfamero de Intentos",angle:-90,position:"insideLeft",style:{fill:t.textMuted,fontSize:"0.8rem"}}}),(0,d.jsx)(B.m,{content:(0,d.jsx)(Be,{theme:t}),cursor:{fill:t.background,opacity:.5}}),(0,d.jsx)(Ee.y,{dataKey:"attempts",name:"Intentos",radius:[8,8,0,0],children:n.map(((e,r)=>(0,d.jsx)(ke.f,{fill:e.color},`cell-${r}`)))})]})}),a.length>0&&(0,d.jsxs)(Me,{theme:t,children:[(0,d.jsx)(De,{theme:t,children:"\ud83d\udca1 Insights de tu Pr\xe1ctica"}),(0,d.jsx)(Re,{theme:t,children:a.map(((e,r)=>(0,d.jsx)("li",{children:e},r)))})]})]})},Ue=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1.5rem;
`,Ge=n.Ay.div`
  text-align: center;
  margin-bottom: 0.5rem;
`,He=n.Ay.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.theme.text||"#1F2937"};
  margin: 0 0 0.5rem 0;
`,qe=n.Ay.p`
  font-size: 1rem;
  color: ${e=>e.theme.textMuted||"#6B7280"};
  margin: 0;
`,Ve=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`,Ye=n.Ay.div`
  background: ${e=>e.theme.surfaceVariant||"#F9FAFB"};
  border: 1px solid ${e=>e.theme.border||"#E5E7EB"};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`,We=n.Ay.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`,Je=n.Ay.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.$color||e.theme.text||"#1F2937"};
  margin-bottom: 0.25rem;
`,Ke=n.Ay.div`
  font-size: 0.875rem;
  color: ${e=>e.theme.textMuted||"#6B7280"};
  font-weight: 500;
`,Qe=n.Ay.div`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted||"#9CA3AF"};
  margin-top: 0.25rem;
  font-style: italic;
`,Xe=n.Ay.div`
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.background)||"#FFFFFF"}};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
`,Ze=n.Ay.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${e=>e.theme.text||"#1F2937"};
  margin: 0 0 1rem 0;
`,er=n.Ay.div`
  width: 100%;
  height: 350px;
`,rr=n.Ay.div`
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.background)||"#FFFFFF"}};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
`,tr=n.Ay.div`
  overflow-x: auto;
`,ir=n.Ay.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`,nr=n.Ay.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: ${e=>e.theme.text||"#1F2937"};
  border-bottom: 2px solid ${e=>e.theme.border||"#E5E7EB"};
  background: ${e=>e.theme.surfaceVariant||"#F9FAFB"};
`,ar=n.Ay.tr`
  background: ${e=>e.$highlight?e.theme.successLight||"#D1FAE5":"transparent"};
  transition: background 0.2s;

  &:hover {
    background: ${e=>e.theme.surfaceVariant||"#F9FAFB"};
  }
`,or=n.Ay.td`
  padding: 0.75rem;
  border-bottom: 1px solid ${e=>e.theme.border||"#E5E7EB"};
  color: ${e=>e.theme.text||"#1F2937"};
  font-weight: ${e=>e.$bold?"600":"400"};
`,sr=n.Ay.span`
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-weight: 600;
  background: ${e=>e.$score>=8?"#D1FAE5":e.$score>=6?"#FEF3C7":e.$score>=4?"#FED7AA":"#FEE2E2"};
  color: ${e=>e.$score>=8?"#065F46":e.$score>=6?"#92400E":e.$score>=4?"#9A3412":"#991B1B"};
`,lr=n.Ay.div`
  background: ${e=>e.theme.surfaceVariant||"#F9FAFB"};
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid ${e=>e.theme.border||"#E5E7EB"};
`,dr=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,cr=n.Ay.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  background: ${e=>"success"===e.$type?"#D1FAE5":"warning"===e.$type?"#FEF3C7":"info"===e.$type?"#DBEAFE":e.theme.background||"#FFFFFF"};
  border-left: 4px solid ${e=>"success"===e.$type?"#10B981":"warning"===e.$type?"#F59E0B":"info"===e.$type?"#3B82F6":e.theme.border||"#E5E7EB"};
`,mr=n.Ay.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`,ur=n.Ay.div`
  font-size: 0.95rem;
  line-height: 1.5;
  color: ${e=>e.theme.text||"#1F2937"};

  strong {
    font-weight: 600;
  }
`,hr=n.Ay.div`
  background: ${e=>e.theme.surface||"#FFFFFF"};
  border: 1px solid ${e=>e.theme.border||"#E5E7EB"};
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`,pr=n.Ay.div`
  font-weight: 600;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.text)||"#1F2937"}};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`,gr=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.textMuted)||"#6B7280"}};
  margin: 0.25rem 0;

  strong {
    font-weight: 600;
    color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.text)||"#1F2937"}};
  }
`,xr=n.Ay.div`
  height: 1px;
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
  margin: 0.5rem 0;
`,br=n.Ay.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: ${e=>e.theme.textMuted||"#6B7280"};
`,vr=n.Ay.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`,fr=n.Ay.div`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${e=>e.theme.text||"#1F2937"};
`,yr=n.Ay.div`
  font-size: 0.9rem;
`,jr=e=>{let{sessions:r,theme:t}=e;const n=(0,i.useMemo)((()=>r.filter((e=>e.rubricProgress&&Object.keys(e.rubricProgress).length>0))),[r]),a=(0,i.useMemo)((()=>0===n.length?[]:n.sort(((e,r)=>(e.timestamp||e.createdAt)-(r.timestamp||r.createdAt))).map(((e,r)=>{var t,i,n,a,o;const s=e.rubricProgress||{},l=Object.keys(s).filter((e=>e.startsWith("rubrica"))),d=l.length>0?l.reduce(((e,r)=>{var t;return e+((null===(t=s[r])||void 0===t?void 0:t.average)||0)}),0)/l.length:0;return{sessionNumber:r+1,sessionTitle:e.title||`Sesi\xf3n ${r+1}`,promedio:Math.round(10*d)/10,rubrica1:(null===(t=s.rubrica1)||void 0===t?void 0:t.average)||0,rubrica2:(null===(i=s.rubrica2)||void 0===i?void 0:i.average)||0,rubrica3:(null===(n=s.rubrica3)||void 0===n?void 0:n.average)||0,rubrica4:(null===(a=s.rubrica4)||void 0===a?void 0:a.average)||0,rubrica5:(null===(o=s.rubrica5)||void 0===o?void 0:o.average)||0,timestamp:e.timestamp||e.createdAt}}))),[n]),o=(0,i.useMemo)((()=>{if(0===a.length)return null;const e=a.map((e=>e.promedio)),r=Math.max(...e),t=Math.min(...e),i=e.reduce(((e,r)=>e+r),0)/e.length,n=e.slice(0,Math.ceil(e.length/2)),o=e.slice(Math.ceil(e.length/2)),s=n.reduce(((e,r)=>e+r),0)/n.length,l=o.reduce(((e,r)=>e+r),0)/o.length,d=l>s?"mejora":l<s?"declive":"estable",c=Math.abs(l-s),m=e.indexOf(r),u=e.indexOf(t);return{totalSessions:a.length,globalAverage:Math.round(10*i)/10,maxScore:Math.round(10*r)/10,minScore:Math.round(10*t)/10,trend:d,trendDiff:Math.round(10*c)/10,bestSession:a[m],worstSession:a[u],improvement:r-t}}),[a]),s=e=>{let{active:r,payload:i}=e;if(!r||!i||0===i.length)return null;const n=i[0].payload;return(0,d.jsxs)(hr,{theme:t,children:[(0,d.jsx)(pr,{children:n.sessionTitle}),(0,d.jsxs)(gr,{children:[(0,d.jsx)("strong",{children:"Promedio:"})," ",n.promedio.toFixed(1),"/10"]}),(0,d.jsx)(xr,{}),(0,d.jsxs)(gr,{children:["\ud83d\udcd6 Comprensi\xf3n: ",n.rubrica1.toFixed(1)]}),(0,d.jsxs)(gr,{children:["\ud83d\udd0d ACD: ",n.rubrica2.toFixed(1)]}),(0,d.jsxs)(gr,{children:["\ud83c\udf0d Contextualizaci\xf3n: ",n.rubrica3.toFixed(1)]}),(0,d.jsxs)(gr,{children:["\ud83d\udcac Argumentaci\xf3n: ",n.rubrica4.toFixed(1)]}),(0,d.jsxs)(gr,{children:["\ud83e\udde0 Metacognici\xf3n: ",n.rubrica5.toFixed(1)]})]})};return 0===n.length?(0,d.jsxs)(br,{theme:t,children:[(0,d.jsx)(vr,{children:"\ud83d\udcca"}),(0,d.jsx)(fr,{children:"No hay sesiones con progreso para comparar"}),(0,d.jsx)(yr,{children:"Completa evaluaciones en tus sesiones para ver comparaciones"})]}):1===n.length?(0,d.jsxs)(br,{theme:t,children:[(0,d.jsx)(vr,{children:"\ud83d\udcc8"}),(0,d.jsx)(fr,{children:"Se necesitan al menos 2 sesiones con progreso"}),(0,d.jsx)(yr,{children:"Contin\xfaa trabajando en m\xe1s textos para ver tu evoluci\xf3n"})]}):(0,d.jsxs)(Ue,{children:[(0,d.jsxs)(Ge,{children:[(0,d.jsx)(He,{theme:t,children:"\ud83d\udcca Comparaci\xf3n entre Sesiones"}),(0,d.jsxs)(qe,{theme:t,children:["Analiza tu evoluci\xf3n a trav\xe9s de ",o.totalSessions," sesiones"]})]}),o&&(0,d.jsxs)(Ve,{children:[(0,d.jsxs)(Ye,{theme:t,children:[(0,d.jsx)(We,{children:"\ud83c\udfaf"}),(0,d.jsxs)(Je,{children:[o.globalAverage,"/10"]}),(0,d.jsx)(Ke,{children:"Promedio Global"})]}),(0,d.jsxs)(Ye,{theme:t,children:[(0,d.jsx)(We,{children:"\ud83c\udfc6"}),(0,d.jsxs)(Je,{children:[o.maxScore,"/10"]}),(0,d.jsx)(Ke,{children:"Mejor Sesi\xf3n"}),(0,d.jsx)(Qe,{children:o.bestSession.sessionTitle})]}),(0,d.jsxs)(Ye,{theme:t,children:[(0,d.jsx)(We,{children:"mejora"===o.trend?"\ud83d\udcc8":"declive"===o.trend?"\ud83d\udcc9":"\u27a1\ufe0f"}),(0,d.jsxs)(Je,{$color:"mejora"===o.trend?"#10B981":"declive"===o.trend?"#EF4444":"#6B7280",children:["mejora"===o.trend?"+":"declive"===o.trend?"-":"",o.trendDiff]}),(0,d.jsxs)(Ke,{children:["Tendencia ","mejora"===o.trend?"positiva":"declive"===o.trend?"negativa":"estable"]})]}),(0,d.jsxs)(Ye,{theme:t,children:[(0,d.jsx)(We,{children:"\ud83d\udcda"}),(0,d.jsx)(Je,{children:o.totalSessions}),(0,d.jsx)(Ke,{children:"Sesiones Completadas"})]})]}),(0,d.jsxs)(Xe,{children:[(0,d.jsx)(Ze,{theme:t,children:"\ud83d\udcc8 Evoluci\xf3n del Promedio"}),(0,d.jsx)(er,{children:(0,d.jsx)(M.u,{width:"100%",height:350,children:(0,d.jsxs)(D.b,{data:a,children:[(0,d.jsx)(R.d,{strokeDasharray:"3 3",stroke:t.border||"#E5E7EB"}),(0,d.jsx)(O.W,{dataKey:"sessionNumber",stroke:t.textMuted||"#6B7280",tick:{fontSize:12},label:{value:"N\xfamero de Sesi\xf3n",position:"insideBottom",offset:-5}}),(0,d.jsx)(_.h,{domain:[0,10],stroke:t.textMuted||"#6B7280",tick:{fontSize:12},label:{value:"Puntuaci\xf3n",angle:-90,position:"insideLeft"}}),(0,d.jsx)(B.m,{content:(0,d.jsx)(s,{})}),(0,d.jsx)(L.s,{wrapperStyle:{paddingTop:"20px"},iconType:"line"}),(0,d.jsx)(U.N,{type:"monotone",dataKey:"promedio",stroke:t.primary||"#3B82F6",strokeWidth:3,dot:{r:5,fill:t.primary||"#3B82F6"},activeDot:{r:7},name:"Promedio General"})]})})})]}),(0,d.jsxs)(rr,{children:[(0,d.jsx)(Ze,{theme:t,children:"\ud83d\udccb Detalle por Sesi\xf3n"}),(0,d.jsx)(tr,{children:(0,d.jsxs)(ir,{theme:t,children:[(0,d.jsx)("thead",{children:(0,d.jsxs)("tr",{children:[(0,d.jsx)(nr,{theme:t,children:"#"}),(0,d.jsx)(nr,{theme:t,children:"Sesi\xf3n"}),(0,d.jsx)(nr,{theme:t,children:"Promedio"}),(0,d.jsx)(nr,{theme:t,children:"\ud83d\udcd6"}),(0,d.jsx)(nr,{theme:t,children:"\ud83d\udd0d"}),(0,d.jsx)(nr,{theme:t,children:"\ud83c\udf0d"}),(0,d.jsx)(nr,{theme:t,children:"\ud83d\udcac"}),(0,d.jsx)(nr,{theme:t,children:"\ud83e\udde0"})]})}),(0,d.jsx)("tbody",{children:a.map(((e,r)=>(0,d.jsxs)(ar,{theme:t,$highlight:e.sessionNumber===o.bestSession.sessionNumber,children:[(0,d.jsx)(or,{theme:t,children:e.sessionNumber}),(0,d.jsx)(or,{theme:t,$bold:!0,children:e.sessionTitle}),(0,d.jsx)(or,{theme:t,$bold:!0,children:(0,d.jsx)(sr,{$score:e.promedio,children:e.promedio.toFixed(1)})}),(0,d.jsx)(or,{theme:t,children:e.rubrica1.toFixed(1)}),(0,d.jsx)(or,{theme:t,children:e.rubrica2.toFixed(1)}),(0,d.jsx)(or,{theme:t,children:e.rubrica3.toFixed(1)}),(0,d.jsx)(or,{theme:t,children:e.rubrica4.toFixed(1)}),(0,d.jsx)(or,{theme:t,children:e.rubrica5.toFixed(1)})]},r)))})]})})]}),(0,d.jsxs)(lr,{theme:t,children:[(0,d.jsx)(Ze,{theme:t,children:"\ud83d\udca1 Insights"}),(0,d.jsxs)(dr,{children:["mejora"===o.trend&&(0,d.jsxs)(cr,{theme:t,$type:"success",children:[(0,d.jsx)(mr,{children:"\u2705"}),(0,d.jsxs)(ur,{children:[(0,d.jsx)("strong",{children:"Mejora constante:"})," Tu promedio mejor\xf3 ",o.trendDiff," puntos entre la primera y segunda mitad de tus sesiones. \xa1Sigue as\xed!"]})]}),"declive"===o.trend&&(0,d.jsxs)(cr,{theme:t,$type:"warning",children:[(0,d.jsx)(mr,{children:"\u26a0\ufe0f"}),(0,d.jsxs)(ur,{children:[(0,d.jsx)("strong",{children:"Atenci\xf3n:"})," Tu promedio disminuy\xf3 ",o.trendDiff," puntos en las \xfaltimas sesiones. Considera revisar tus estrategias de lectura."]})]}),o.improvement>3&&(0,d.jsxs)(cr,{theme:t,$type:"success",children:[(0,d.jsx)(mr,{children:"\ud83d\ude80"}),(0,d.jsxs)(ur,{children:[(0,d.jsx)("strong",{children:"Excelente progreso:"})," La diferencia entre tu mejor y peor sesi\xf3n es de ",o.improvement.toFixed(1)," puntos, mostrando una capacidad de mejora significativa."]})]}),o.globalAverage>=7&&(0,d.jsxs)(cr,{theme:t,$type:"info",children:[(0,d.jsx)(mr,{children:"\ud83c\udf1f"}),(0,d.jsxs)(ur,{children:[(0,d.jsx)("strong",{children:"Alto rendimiento:"})," Tu promedio global de ",o.globalAverage,"/10 demuestra consistencia y dominio de las competencias lectoras."]})]})]})]})]})};var $r=t(5973),Ar=t(987);const Er=n.Ay.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,kr=n.Ay.div`
  text-align: center;
`,wr=n.Ay.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.theme.text||"#1F2937"};
  margin: 0 0 0.5rem 0;
`,Sr=n.Ay.p`
  font-size: 1rem;
  color: ${e=>e.theme.textMuted||"#6B7280"};
  margin: 0;
`,Fr=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.surfaceVariant)||"#F9FAFB"}};
  border-radius: 12px;
  border: 1px solid ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
`,zr=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`,Ir=n.Ay.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${e=>e.theme.text||"#1F2937"};
`,Tr=n.Ay.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`,Cr=n.Ay.button`
  padding: 0.5rem 1rem;
  background: ${e=>e.$active?e.theme.primary||"#3B82F6":e.theme.background||"#FFFFFF"};
  color: ${e=>e.$active?"#FFFFFF":e.theme.text||"#1F2937"};
  border: 1px solid ${e=>e.$active?e.theme.primary||"#3B82F6":e.theme.border||"#E5E7EB"};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${e=>e.$active?e.theme.primaryDark||"#2563EB":e.theme.surfaceVariant||"#F3F4F6"};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`,Pr=n.Ay.span`
  padding: 0.125rem 0.375rem;
  background: ${e=>e.$active?"rgba(255, 255, 255, 0.2)":e.theme.surfaceVariant||"#E5E7EB"};
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
`,Nr=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`,Mr=n.Ay.div`
  background: ${e=>e.theme.surfaceVariant||"#F9FAFB"};
  border: 1px solid ${e=>e.theme.border||"#E5E7EB"};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`,Dr=n.Ay.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`,Rr=n.Ay.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>{var r;return e.$color||(null===(r=e.theme)||void 0===r?void 0:r.text)||"#1F2937"}};
  margin-bottom: 0.25rem;
`,Or=n.Ay.div`
  font-size: 0.875rem;
  color: ${e=>e.theme.textMuted||"#6B7280"};
  font-weight: 500;
`,_r=n.Ay.div`
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.background)||"#FFFFFF"}};
  border: 1px solid ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
  border-radius: 12px;
  padding: 1.5rem;
`,Br=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`,Lr=n.Ay.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${e=>e.theme.text||"#1F2937"};
  margin: 0;
`,Ur=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted||"#6B7280"};
  font-style: italic;
`,Gr=n.Ay.div`
  width: 100%;
`,Hr=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`,qr=n.Ay.div`
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.background)||"#FFFFFF"}};
  border: 1px solid ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
  border-radius: 12px;
  padding: 1.5rem;
`,Vr=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`,Yr=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,Wr=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Jr=n.Ay.span`
  font-size: 1.25rem;
`,Kr=n.Ay.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.text)||"#1F2937"}};
`,Qr=n.Ay.div`
  height: 8px;
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
  border-radius: 4px;
  overflow: hidden;
`,Xr=n.Ay.div`
  height: 100%;
  width: ${e=>e.$percent}%;
  background: ${e=>e.$color||"#3B82F6"};
  transition: width 0.5s ease;
  border-radius: 4px;
`,Zr=n.Ay.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${e=>e.$color||"#1F2937"};
  text-align: right;
`,et=n.Ay.div`
  background: ${e=>e.theme.surfaceVariant||"#F9FAFB"};
  border: 1px solid ${e=>e.theme.border||"#E5E7EB"};
  border-radius: 12px;
  padding: 1.5rem;
`,rt=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`,tt=n.Ay.div`
  background: ${e=>e.theme.background||"#FFFFFF"};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`,it=n.Ay.div`
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted||"#6B7280"};
  margin-bottom: 0.5rem;
`,nt=n.Ay.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${e=>e.theme.text||"#1F2937"};
`,at=n.Ay.div`
  background: ${e=>e.theme.surface||"#FFFFFF"};
  border: 1px solid ${e=>e.theme.border||"#E5E7EB"};
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`,ot=n.Ay.div`
  font-weight: 600;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.text)||"#1F2937"}};
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`,st=n.Ay.div`
  font-size: 0.75rem;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.textMuted)||"#9CA3AF"}};
  margin-bottom: 0.5rem;
`,lt=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.textMuted)||"#6B7280"}};
  margin: 0.25rem 0;

  strong {
    font-weight: 600;
    color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.text)||"#1F2937"}};
  }
`,dt=n.Ay.div`
  height: 1px;
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
  margin: 0.5rem 0;
`,ct=n.Ay.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: ${e=>e.theme.textMuted||"#6B7280"};
`,mt=n.Ay.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`,ut=n.Ay.div`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${e=>e.theme.text||"#1F2937"};
`,ht=n.Ay.div`
  font-size: 0.9rem;
`,pt=e=>{var r;let{sessions:t,theme:n}=e;const[a,o]=(0,i.useState)("all"),[s,l]=(0,i.useState)("all"),c=[{id:"all",name:"Todas las R\xfabricas",icon:"\ud83d\udcca",color:"#3B82F6"},{id:"rubrica1",name:"Comprensi\xf3n Literal",icon:"\ud83d\udcd6",color:"#3B82F6"},{id:"rubrica2",name:"An\xe1lisis Cr\xedtico",icon:"\ud83d\udd0d",color:"#8B5CF6"},{id:"rubrica3",name:"Contextualizaci\xf3n",icon:"\ud83c\udf0d",color:"#10B981"},{id:"rubrica4",name:"Argumentaci\xf3n",icon:"\ud83d\udcac",color:"#F59E0B"},{id:"rubrica5",name:"Metacognici\xf3n",icon:"\ud83e\udde0",color:"#EF4444"}],m=(0,i.useMemo)((()=>t.filter((e=>e.rubricProgress&&Object.keys(e.rubricProgress).length>0))),[t]),u=(0,i.useMemo)((()=>{if("all"===a)return m;const e=Date.now()-{week:6048e5,month:2592e6,quarter:7776e6}[a];return m.filter((r=>(r.timestamp||r.createdAt||0)>=e))}),[m,a]),h=(0,i.useMemo)((()=>{if(0===u.length)return null;const e="all"===s?["rubrica1","rubrica2","rubrica3","rubrica4","rubrica5"]:[s],r=u.map(((r,t)=>{var i,n,a,o,s;const l=r.rubricProgress||{},d=e.map((e=>{var r;return(null===(r=l[e])||void 0===r?void 0:r.average)||0})),c=d.reduce(((e,r)=>e+r),0)/d.length;return{sessionNumber:t+1,sessionTitle:r.title||`Sesi\xf3n ${t+1}`,average:Math.round(10*c)/10,rubrica1:(null===(i=l.rubrica1)||void 0===i?void 0:i.average)||0,rubrica2:(null===(n=l.rubrica2)||void 0===n?void 0:n.average)||0,rubrica3:(null===(a=l.rubrica3)||void 0===a?void 0:a.average)||0,rubrica4:(null===(o=l.rubrica4)||void 0===o?void 0:o.average)||0,rubrica5:(null===(s=l.rubrica5)||void 0===s?void 0:s.average)||0,timestamp:r.timestamp||r.createdAt,date:new Date(r.timestamp||r.createdAt).toLocaleDateString("es-ES",{day:"2-digit",month:"short"})}})),t=r.map((e=>e.average)),i=r.reduce(((t,i)=>{const n=u[r.indexOf(i)].rubricProgress||{};return t+e.reduce(((e,r)=>{var t,i;return e+((null===(t=n[r])||void 0===t||null===(i=t.scores)||void 0===i?void 0:i.length)||0)}),0)}),0),n=Math.ceil(t.length/2),a=t.slice(0,n),o=t.slice(n),l=a.reduce(((e,r)=>e+r),0)/a.length,d=(o.reduce(((e,r)=>e+r),0)/o.length-l)/l*100,m={excelente:t.filter((e=>e>=8)).length,bueno:t.filter((e=>e>=6&&e<8)).length,regular:t.filter((e=>e>=4&&e<6)).length,bajo:t.filter((e=>e<4)).length},h="all"===s?e.map((e=>{var r,t,i;const n=u.map((r=>{var t,i;return(null===(t=r.rubricProgress)||void 0===t||null===(i=t[e])||void 0===i?void 0:i.average)||0})),a=n.reduce(((e,r)=>e+r),0)/n.length;return{id:e,name:null===(r=c.find((r=>r.id===e)))||void 0===r?void 0:r.name,icon:null===(t=c.find((r=>r.id===e)))||void 0===t?void 0:t.icon,average:Math.round(10*a)/10,color:null===(i=c.find((r=>r.id===e)))||void 0===i?void 0:i.color}})):null;return{sessionScores:r,stats:{totalSessions:u.length,averageScore:Math.round(t.reduce(((e,r)=>e+r),0)/t.length*10)/10,maxScore:Math.max(...t),minScore:Math.min(...t),totalAttempts:i,trendPercentage:Math.round(10*d)/10,isImproving:d>0},distribution:m,rubricProgress:h}}),[u,s,c]),p=e=>{var r;let{active:t,payload:i}=e;if(!t||!i||0===i.length)return null;const a=i[0].payload;return(0,d.jsxs)(at,{theme:n,children:[(0,d.jsx)(ot,{children:a.sessionTitle}),(0,d.jsx)(st,{children:a.date}),(0,d.jsx)(dt,{}),"all"===s?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)(lt,{children:[(0,d.jsx)("strong",{children:"Promedio General:"})," ",a.average.toFixed(1),"/10"]}),(0,d.jsx)(dt,{}),(0,d.jsxs)(lt,{children:["\ud83d\udcd6 Comprensi\xf3n: ",a.rubrica1.toFixed(1)]}),(0,d.jsxs)(lt,{children:["\ud83d\udd0d ACD: ",a.rubrica2.toFixed(1)]}),(0,d.jsxs)(lt,{children:["\ud83c\udf0d Contextualizaci\xf3n: ",a.rubrica3.toFixed(1)]}),(0,d.jsxs)(lt,{children:["\ud83d\udcac Argumentaci\xf3n: ",a.rubrica4.toFixed(1)]}),(0,d.jsxs)(lt,{children:["\ud83e\udde0 Metacognici\xf3n: ",a.rubrica5.toFixed(1)]})]}):(0,d.jsxs)(lt,{children:[(0,d.jsxs)("strong",{children:[null===(r=c.find((e=>e.id===s)))||void 0===r?void 0:r.name,":"]})," ",a[s].toFixed(1),"/10"]})]})};return 0===m.length?(0,d.jsxs)(ct,{theme:n,children:[(0,d.jsx)(mt,{children:"\ud83d\udcca"}),(0,d.jsx)(ut,{children:"No hay sesiones con progreso"}),(0,d.jsx)(ht,{children:"Completa evaluaciones para ver el dashboard"})]}):0===u.length?(0,d.jsxs)(Er,{children:[(0,d.jsx)(kr,{children:(0,d.jsx)(wr,{theme:n,children:"\ud83d\udcca Dashboard de Anal\xedticas"})}),(0,d.jsx)(Fr,{children:(0,d.jsxs)(zr,{children:[(0,d.jsx)(Ir,{theme:n,children:"\ud83d\udcc5 Per\xedodo"}),(0,d.jsx)(Tr,{children:[{value:"week",label:"\xdaltima semana"},{value:"month",label:"\xdaltimo mes"},{value:"quarter",label:"\xdaltimos 3 meses"},{value:"all",label:"Todo el tiempo"}].map((e=>(0,d.jsx)(Cr,{theme:n,$active:a===e.value,onClick:()=>o(e.value),children:e.label},e.value)))})]})}),(0,d.jsxs)(ct,{theme:n,children:[(0,d.jsx)(mt,{children:"\ud83d\udd0d"}),(0,d.jsx)(ut,{children:"No hay datos en este per\xedodo"}),(0,d.jsx)(ht,{children:"Intenta seleccionar un rango de tiempo m\xe1s amplio"})]})]}):(0,d.jsxs)(Er,{children:[(0,d.jsxs)(kr,{children:[(0,d.jsx)(wr,{theme:n,children:"\ud83d\udcca Dashboard de Anal\xedticas"}),(0,d.jsx)(Sr,{theme:n,children:"An\xe1lisis interactivo de tu progreso acad\xe9mico"})]}),(0,d.jsxs)(Fr,{children:[(0,d.jsxs)(zr,{children:[(0,d.jsx)(Ir,{theme:n,children:"\ud83d\udcc5 Per\xedodo"}),(0,d.jsx)(Tr,{children:[{value:"week",label:"\xdaltima semana",count:m.filter((e=>{const r=Date.now();return(e.timestamp||e.createdAt||0)>=r-6048e5})).length},{value:"month",label:"\xdaltimo mes",count:m.filter((e=>{const r=Date.now();return(e.timestamp||e.createdAt||0)>=r-2592e6})).length},{value:"quarter",label:"3 meses",count:m.filter((e=>{const r=Date.now();return(e.timestamp||e.createdAt||0)>=r-7776e6})).length},{value:"all",label:"Todo",count:m.length}].map((e=>(0,d.jsxs)(Cr,{theme:n,$active:a===e.value,onClick:()=>o(e.value),children:[e.label,(0,d.jsx)(Pr,{theme:n,$active:a===e.value,children:e.count})]},e.value)))})]}),(0,d.jsxs)(zr,{children:[(0,d.jsx)(Ir,{theme:n,children:"\ud83c\udfaf R\xfabrica"}),(0,d.jsx)(Tr,{children:c.map((e=>(0,d.jsxs)(Cr,{theme:n,$active:s===e.id,onClick:()=>l(e.id),children:[e.icon," ",e.name.split(" ")[0]]},e.id)))})]})]}),(0,d.jsxs)(Nr,{children:[(0,d.jsxs)(Mr,{theme:n,children:[(0,d.jsx)(Dr,{children:"\ud83d\udcda"}),(0,d.jsx)(Rr,{children:h.stats.totalSessions}),(0,d.jsx)(Or,{children:"Sesiones"})]}),(0,d.jsxs)(Mr,{theme:n,children:[(0,d.jsx)(Dr,{children:"\ud83c\udfaf"}),(0,d.jsxs)(Rr,{children:[h.stats.averageScore.toFixed(1),"/10"]}),(0,d.jsx)(Or,{children:"Promedio"})]}),(0,d.jsxs)(Mr,{theme:n,children:[(0,d.jsx)(Dr,{children:"\ud83c\udfc6"}),(0,d.jsxs)(Rr,{children:[h.stats.maxScore.toFixed(1),"/10"]}),(0,d.jsx)(Or,{children:"Mejor Score"})]}),(0,d.jsxs)(Mr,{theme:n,children:[(0,d.jsx)(Dr,{children:h.stats.isImproving?"\ud83d\udcc8":"\ud83d\udcc9"}),(0,d.jsxs)(Rr,{$color:h.stats.isImproving?"#10B981":"#EF4444",children:[h.stats.isImproving?"+":"",h.stats.trendPercentage,"%"]}),(0,d.jsx)(Or,{children:"Tendencia"})]})]}),(0,d.jsxs)(_r,{children:[(0,d.jsxs)(Br,{children:[(0,d.jsx)(Lr,{theme:n,children:"\ud83d\udcc8 Evoluci\xf3n Temporal"}),(0,d.jsx)(Ur,{theme:n,children:"all"===s?"Promedio de todas las r\xfabricas":null===(r=c.find((e=>e.id===s)))||void 0===r?void 0:r.name})]}),(0,d.jsx)(Gr,{children:(0,d.jsx)(M.u,{width:"100%",height:300,children:(0,d.jsxs)($r.Q,{data:h.sessionScores,children:[(0,d.jsx)("defs",{children:(0,d.jsxs)("linearGradient",{id:"colorAverage",x1:"0",y1:"0",x2:"0",y2:"1",children:[(0,d.jsx)("stop",{offset:"5%",stopColor:n.primary||"#3B82F6",stopOpacity:.3}),(0,d.jsx)("stop",{offset:"95%",stopColor:n.primary||"#3B82F6",stopOpacity:0})]})}),(0,d.jsx)(R.d,{strokeDasharray:"3 3",stroke:n.border||"#E5E7EB"}),(0,d.jsx)(O.W,{dataKey:"date",stroke:n.textMuted||"#6B7280",tick:{fontSize:12}}),(0,d.jsx)(_.h,{domain:[0,10],stroke:n.textMuted||"#6B7280",tick:{fontSize:12}}),(0,d.jsx)(B.m,{content:(0,d.jsx)(p,{})}),(0,d.jsx)(Ar.Gk,{type:"monotone",dataKey:"all"===s?"average":s,stroke:n.primary||"#3B82F6",strokeWidth:2.5,fill:"url(#colorAverage)",dot:{r:4,fill:n.primary||"#3B82F6"},activeDot:{r:6}})]})})})]}),(0,d.jsxs)(Hr,{children:[(0,d.jsxs)(_r,{children:[(0,d.jsx)(Lr,{theme:n,children:"\ud83d\udcca Distribuci\xf3n de Resultados"}),(0,d.jsx)(Gr,{children:(0,d.jsx)(M.u,{width:"100%",height:250,children:(0,d.jsxs)(Ae.E,{data:[{name:"Excelente\n(8-10)",count:h.distribution.excelente,fill:"#10B981"},{name:"Bueno\n(6-8)",count:h.distribution.bueno,fill:"#F59E0B"},{name:"Regular\n(4-6)",count:h.distribution.regular,fill:"#F97316"},{name:"Bajo\n(<4)",count:h.distribution.bajo,fill:"#EF4444"}],children:[(0,d.jsx)(R.d,{strokeDasharray:"3 3",stroke:n.border||"#E5E7EB"}),(0,d.jsx)(O.W,{dataKey:"name",stroke:n.textMuted||"#6B7280",tick:{fontSize:11}}),(0,d.jsx)(_.h,{stroke:n.textMuted||"#6B7280",tick:{fontSize:12}}),(0,d.jsx)(B.m,{contentStyle:{background:n.surface||"#FFFFFF",border:`1px solid ${n.border||"#E5E7EB"}`,borderRadius:"8px"}}),(0,d.jsx)(Ee.y,{dataKey:"count",radius:[8,8,0,0],children:[{name:"Excelente\n(8-10)",count:h.distribution.excelente,fill:"#10B981"},{name:"Bueno\n(6-8)",count:h.distribution.bueno,fill:"#F59E0B"},{name:"Regular\n(4-6)",count:h.distribution.regular,fill:"#F97316"},{name:"Bajo\n(<4)",count:h.distribution.bajo,fill:"#EF4444"}].map(((e,r)=>(0,d.jsx)(Ee.y,{dataKey:"count",fill:e.fill},`cell-${r}`)))})]})})})]}),h.rubricProgress&&(0,d.jsxs)(qr,{children:[(0,d.jsx)(Lr,{theme:n,children:"\ud83d\udccb Progreso por Competencia"}),(0,d.jsx)(Vr,{children:h.rubricProgress.sort(((e,r)=>r.average-e.average)).map((e=>(0,d.jsxs)(Yr,{theme:n,children:[(0,d.jsxs)(Wr,{children:[(0,d.jsx)(Jr,{children:e.icon}),(0,d.jsx)(Kr,{children:e.name})]}),(0,d.jsx)(Qr,{children:(0,d.jsx)(Xr,{$percent:e.average/10*100,$color:e.color})}),(0,d.jsxs)(Zr,{$color:e.color,children:[e.average.toFixed(1),"/10"]})]},e.id)))})]})]}),(0,d.jsxs)(et,{theme:n,children:[(0,d.jsx)(Lr,{theme:n,children:"\ud83d\udcc8 Resumen del Per\xedodo"}),(0,d.jsxs)(rt,{children:[(0,d.jsxs)(tt,{theme:n,children:[(0,d.jsx)(it,{children:"Total de intentos"}),(0,d.jsx)(nt,{children:h.stats.totalAttempts})]}),(0,d.jsxs)(tt,{theme:n,children:[(0,d.jsx)(it,{children:"Puntuaci\xf3n m\xe1xima"}),(0,d.jsxs)(nt,{children:[h.stats.maxScore.toFixed(1),"/10"]})]}),(0,d.jsxs)(tt,{theme:n,children:[(0,d.jsx)(it,{children:"Puntuaci\xf3n m\xednima"}),(0,d.jsxs)(nt,{children:[h.stats.minScore.toFixed(1),"/10"]})]}),(0,d.jsxs)(tt,{theme:n,children:[(0,d.jsx)(it,{children:"Rango de tiempo"}),(0,d.jsx)(nt,{children:"week"===a?"7 d\xedas":"month"===a?"30 d\xedas":"quarter"===a?"90 d\xedas":"Todo el historial"})]})]})]})]})},gt=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`,xt=n.Ay.h3`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,bt=n.Ay.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`,vt=n.Ay.h4`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,ft=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`,yt=n.Ay.div`
  background: ${e=>e.$bgColor||e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`,jt=n.Ay.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.$color||e.theme.text};
  margin-bottom: 0.25rem;
`,$t=n.Ay.div`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,At=n.Ay.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${e=>"improving"===e.$trend?"#10b98120":"declining"===e.$trend?"#ef444420":e.theme.background};
  color: ${e=>"improving"===e.$trend?"#10b981":"declining"===e.$trend?"#ef4444":e.theme.textMuted};
`,Et=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,kt=n.Ay.div`
  background: ${e=>"high"===e.$priority?e.theme.errorBackground||"#fee":"medium"===e.$priority?e.theme.infoBg:e.theme.background};
  border-left: 4px solid ${e=>"high"===e.$priority?"#ef4444":"medium"===e.$priority?e.theme.primary:e.theme.border};
  padding: 1rem;
  border-radius: 6px;
`,wt=n.Ay.div`
  font-weight: 600;
  color: ${e=>e.theme.text};
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`,St=n.Ay.div`
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
`,Ft=n.Ay.div`
  color: ${e=>e.theme.primary};
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`,zt=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,It=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: ${e=>e.theme.background};
  border-radius: 6px;
  font-size: 0.85rem;
`,Tt=n.Ay.div`
  text-align: center;
  padding: 2rem;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
`,Ct=n.Ay.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#E5E7EB"}};
`,Pt=n.Ay.button`
  padding: 0.75rem 1.25rem;
  background: ${e=>{var r;return e.$active?(null===(r=e.theme)||void 0===r?void 0:r.primary)||"#3B82F6":"transparent"}};
  color: ${e=>{var r;return e.$active?"#FFFFFF":(null===(r=e.theme)||void 0===r?void 0:r.textMuted)||"#6B7280"}};
  border: none;
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: ${e=>e.disabled?"not-allowed":"pointer"};
  opacity: ${e=>e.disabled?.5:1};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${e=>{var r,t;return e.$active?(null===(r=e.theme)||void 0===r?void 0:r.primaryDark)||"#2563EB":(null===(t=e.theme)||void 0===t?void 0:t.surfaceVariant)||"#F3F4F6"}};
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`,Nt=e=>{let{rubricProgress:r={},theme:t}=e;const[n,a]=(0,i.useState)("current"),[o,s]=(0,i.useState)([]);(0,i.useEffect)((()=>{(async()=>{const e=await(0,N.L2)();s(e)})()}),[]);const l=(0,i.useMemo)((()=>P(r)),[r]),c=l.summary.totalAttempts>0,m=o.filter((e=>e.rubricProgress&&Object.keys(e.rubricProgress).length>0)).length>=2;return c?(0,d.jsxs)(gt,{theme:t,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.3},children:[(0,d.jsx)(xt,{theme:t,children:"\ud83d\udcc8 Anal\xedticas y M\xe9tricas"}),(0,d.jsxs)(Ct,{children:[(0,d.jsx)(Pt,{theme:t,$active:"current"===n,onClick:()=>a("current"),children:"\ud83d\udcca Sesi\xf3n Actual"}),(0,d.jsxs)(Pt,{theme:t,$active:"comparison"===n,onClick:()=>a("comparison"),disabled:!m,title:m?"":"Necesitas al menos 2 sesiones con progreso",children:["\ud83d\udcc8 Comparar Sesiones",!m&&" \ud83d\udd12"]}),(0,d.jsxs)(Pt,{theme:t,$active:"dashboard"===n,onClick:()=>a("dashboard"),disabled:!c,title:c?"":"Completa evaluaciones para ver el dashboard",children:["\ud83c\udfaf Dashboard Interactivo",!c&&" \ud83d\udd12"]})]}),"current"===n?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(ee,{rubricProgress:r,theme:t}),(0,d.jsx)($e,{rubricProgress:r,theme:t}),(0,d.jsx)(Le,{rubricProgress:r,theme:t}),(0,d.jsxs)(bt,{children:[(0,d.jsx)(vt,{theme:t,children:"\ud83d\udcca Resumen General"}),(0,d.jsxs)(ft,{children:[(0,d.jsxs)(yt,{theme:t,children:[(0,d.jsxs)(jt,{theme:t,$color:t.primary,children:[l.summary.evaluatedRubrics,"/",l.summary.totalRubrics]}),(0,d.jsx)($t,{theme:t,children:"Completadas"})]}),(0,d.jsxs)(yt,{theme:t,children:[(0,d.jsx)(jt,{theme:t,children:l.summary.totalAttempts}),(0,d.jsx)($t,{theme:t,children:"Total Intentos"})]}),(0,d.jsxs)(yt,{theme:t,children:[(0,d.jsx)(jt,{theme:t,$color:l.summary.averageScore>=8.6?"#8b5cf6":l.summary.averageScore>=5.6?"#10b981":l.summary.averageScore>=2.6?"#f59e0b":"#ef4444",children:l.summary.averageScore.toFixed(1)}),(0,d.jsx)($t,{theme:t,children:"Promedio"})]}),(0,d.jsxs)(yt,{theme:t,children:[(0,d.jsx)(jt,{theme:t,children:l.summary.medianScore.toFixed(1)}),(0,d.jsx)($t,{theme:t,children:"Mediana"})]}),(0,d.jsxs)(yt,{theme:t,children:[(0,d.jsx)(jt,{theme:t,$color:t.info,children:l.trends.consistencyScore.toFixed(1)}),(0,d.jsx)($t,{theme:t,children:"Consistencia"})]}),(0,d.jsxs)(yt,{theme:t,children:[(0,d.jsx)(jt,{theme:t,children:(0,d.jsxs)(At,{$trend:l.trends.overallTrend,theme:t,children:["improving"===l.trends.overallTrend&&"\ud83d\udcc8 Mejorando","declining"===l.trends.overallTrend&&"\ud83d\udcc9 Declinando","stable"===l.trends.overallTrend&&"\u27a1\ufe0f Estable"]})}),(0,d.jsx)($t,{theme:t,children:"Tendencia"})]})]})]}),l.performance.strengths.length>0&&(0,d.jsxs)(bt,{children:[(0,d.jsx)(vt,{theme:t,children:"\ud83d\udcaa Fortalezas"}),(0,d.jsx)(zt,{children:l.performance.strengths.map(((e,r)=>(0,d.jsxs)(It,{theme:t,children:[(0,d.jsx)("span",{children:e.rubricId}),(0,d.jsx)("strong",{style:{color:"#10b981"},children:e.score.toFixed(1)})]},r)))})]}),l.performance.weaknesses.length>0&&(0,d.jsxs)(bt,{children:[(0,d.jsx)(vt,{theme:t,children:"\ud83c\udfaf \xc1reas de Mejora"}),(0,d.jsx)(zt,{children:l.performance.weaknesses.map(((e,r)=>(0,d.jsxs)(It,{theme:t,children:[(0,d.jsx)("span",{children:e.rubricId}),(0,d.jsx)("strong",{style:{color:"#ef4444"},children:e.score.toFixed(1)})]},r)))})]}),l.recommendations.length>0&&(0,d.jsxs)(bt,{children:[(0,d.jsx)(vt,{theme:t,children:"\ud83d\udca1 Recomendaciones Personalizadas"}),(0,d.jsx)(Et,{children:l.recommendations.map(((e,r)=>(0,d.jsxs)(kt,{theme:t,$priority:e.priority,children:[(0,d.jsx)(wt,{theme:t,children:e.title}),(0,d.jsx)(St,{theme:t,children:e.description}),(0,d.jsxs)(Ft,{theme:t,children:["\u2192 ",e.action]})]},r)))})]})]}):"comparison"===n?(0,d.jsx)(jr,{sessions:o,theme:t}):(0,d.jsx)(pt,{sessions:o,theme:t})]}):(0,d.jsxs)(gt,{theme:t,children:[(0,d.jsx)(xt,{theme:t,children:"\ud83d\udcc8 Anal\xedticas y M\xe9tricas"}),(0,d.jsxs)(Tt,{theme:t,children:[(0,d.jsx)("p",{children:"\ud83d\udcca A\xfan no hay datos para analizar"}),(0,d.jsx)("p",{children:"Completa algunas evaluaciones para ver tus m\xe9tricas de progreso"})]})]})},Mt=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`,Dt=n.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Rt=n.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`,Ot=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`,_t=n.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,Bt=n.Ay.div`
  font-size: 2rem;
`,Lt=n.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  font-size: 0.95rem;
  font-weight: 600;
`,Ut=n.Ay.p`
  margin: 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.8rem;
  line-height: 1.4;
  flex: 1;
`,Gt=(0,n.Ay)(a.P.button)`
  background: ${e=>e.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.625rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>e.theme.primaryDark};
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: ${e=>e.theme.border};
    cursor: not-allowed;
    transform: none;
  }
`,Ht=(0,n.Ay)(a.P.div)`
  background: #10b98120;
  color: #10b981;
  border: 1px solid #10b981;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,qt=n.Ay.div`
  text-align: center;
  padding: 2rem;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
`,Vt=e=>{let{rubricProgress:r={},theme:t}=e;const[n,a]=(0,i.useState)(""),o=Object.keys(r).length>0,s=(e,r,t)=>{const i=new Blob([e],{type:t}),n=URL.createObjectURL(i),a=document.createElement("a");a.href=n,a.download=r,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(n)};return o?(0,d.jsxs)(Mt,{theme:t,children:[(0,d.jsx)(Dt,{theme:t,children:"\ud83d\udce5 Exportar Datos"}),(0,d.jsx)(Rt,{theme:t,children:"Descarga tus resultados en formatos estructurados para an\xe1lisis, portafolio o seguimiento docente."}),(0,d.jsxs)(Ot,{children:[(0,d.jsxs)(_t,{theme:t,children:[(0,d.jsx)(Bt,{children:"\ud83d\udcca"}),(0,d.jsx)(Lt,{theme:t,children:"Excel / CSV"}),(0,d.jsx)(Ut,{theme:t,children:"Tabla legible con: nombre de artefacto, promedio sobre 10, nivel alcanzado (Inicial/B\xe1sico/Competente/Avanzado), n\xfamero de intentos y mejor puntuaci\xf3n. Ideal para Excel y Google Sheets."}),(0,d.jsx)(Gt,{theme:t,onClick:()=>{try{const e=function(e){const r={rubrica1:"Resumen Acad\xe9mico",rubrica2:"Tabla ACD",rubrica3:"Mapa de Actores",rubrica4:"Respuesta Argumentativa",rubrica5:"Bit\xe1cora \xc9tica IA"},t={1:"Inicial",2:"B\xe1sico",3:"Competente",4:"Avanzado"},i=Object.entries(e).map((e=>{let[i,n]=e;const a=(n.scores||[]).map((e=>Number("object"===typeof e?e.score:e))),o=a.length>0?Math.max(...a):0,s=a.length>0?a[a.length-1]:0,l=Number(n.average||0),d=Math.ceil(l/2.5);return[r[i]||i,l.toFixed(2),d,t[d]||"Sin clasificar",a.length,o.toFixed(2),s.toFixed(2),i]}));return"\ufeff"+[["Artefacto","Promedio sobre 10","Nivel Alcanzado","Descripci\xf3n del Nivel","N\xfamero de Intentos","Mejor Puntuaci\xf3n","\xdaltima Puntuaci\xf3n","ID T\xe9cnico"].join(","),...i.map((e=>e.map((e=>`"${e}"`)).join(",")))].join("\n")}(r),t=(new Date).toISOString().split("T")[0];s(e,`evaluacion-rubricas-${t}.csv`,"text/csv;charset=utf-8;"),a("\u2705 CSV exportado exitosamente"),setTimeout((()=>a("")),3e3)}catch(e){console.error("Error al exportar CSV:",e),a("\u274c Error al exportar CSV"),setTimeout((()=>a("")),3e3)}},whileHover:{scale:1.02},whileTap:{scale:.98},children:"\ud83d\udcca Descargar CSV"})]}),(0,d.jsxs)(_t,{theme:t,children:[(0,d.jsx)(Bt,{children:"\ud83d\udcbe"}),(0,d.jsx)(Lt,{theme:t,children:"Datos Completos (JSON)"}),(0,d.jsx)(Ut,{theme:t,children:"Archivo estructurado con metadatos, resumen ejecutivo (r\xfabricas evaluadas, promedio general, mediana, completitud), estad\xedsticas avanzadas y datos completos por artefacto. Ideal para an\xe1lisis program\xe1tico."}),(0,d.jsx)(Gt,{theme:t,onClick:()=>{try{const e=P(r),t=function(e,r){const t={rubrica1:"Resumen Acad\xe9mico",rubrica2:"Tabla ACD",rubrica3:"Mapa de Actores",rubrica4:"Respuesta Argumentativa",rubrica5:"Bit\xe1cora \xc9tica IA"},i={1:"Inicial - Requiere desarrollo",2:"B\xe1sico - En progreso",3:"Competente - Satisfactorio",4:"Avanzado - Excelente"},n={};return Object.entries(e).forEach((e=>{let[r,a]=e;const o=Number(a.average||0),s=Math.ceil(o/2.5);n[r]={nombre:t[r]||r,nivelAlcanzado:s,descripcionNivel:i[s]||"Sin clasificar",...a}})),JSON.stringify({metadata:{fechaExportacion:(new Date).toLocaleString("es-ES"),version:"1.0"},resumen:{rubricasEvaluadas:r.summary.evaluatedRubrics,totalIntentos:r.summary.totalAttempts,promedioGeneral:r.summary.averageScore.toFixed(2),mediana:r.summary.medianScore.toFixed(2),tasaCompletitud:r.summary.completionRate.toFixed(1)+"%"},estadisticas:r,rubricas:n},null,2)}(r,e),i=(new Date).toISOString().split("T")[0];s(t,`evaluacion-completa-${i}.json`,"application/json;charset=utf-8;"),a("\u2705 JSON exportado exitosamente"),setTimeout((()=>a("")),3e3)}catch(e){console.error("Error al exportar JSON:",e),a("\u274c Error al exportar JSON"),setTimeout((()=>a("")),3e3)}},whileHover:{scale:1.02},whileTap:{scale:.98},children:"\ud83d\udcbe Descargar JSON"})]}),(0,d.jsxs)(_t,{theme:t,children:[(0,d.jsx)(Bt,{children:"\ud83d\udcc4"}),(0,d.jsx)(Lt,{theme:t,children:"Reporte Legible (TXT)"}),(0,d.jsx)(Ut,{theme:t,children:"Reporte formateado en texto plano con resumen, fortalezas y recomendaciones."}),(0,d.jsx)(Gt,{theme:t,onClick:()=>{try{const e=P(r);let t="\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n";t+="         REPORTE DE EVALUACI\xd3N CRITERIAL\n",t+="\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n",t+="\ud83d\udcca RESUMEN GENERAL\n",t+="\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n",t+=`R\xfabricas completadas: ${e.summary.evaluatedRubrics}/${e.summary.totalRubrics}\n`,t+=`Total de intentos: ${e.summary.totalAttempts}\n`,t+=`Promedio general: ${e.summary.averageScore.toFixed(2)}/10\n`,t+=`Mediana: ${e.summary.medianScore.toFixed(2)}/10\n`,t+=`Tasa de completitud: ${e.summary.completionRate.toFixed(1)}%\n`,t+=`Consistencia: ${e.trends.consistencyScore.toFixed(2)}/10\n`,t+=`Tendencia: ${e.trends.overallTrend}\n\n`,t+="\ud83d\udcdd DESGLOSE POR R\xdaBRICA\n",t+="\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n",Object.entries(r).forEach((e=>{let[r,i]=e;const n=(i.scores||[]).map((e=>Number("object"===typeof e?e.score:e))),a=n.length>0?Math.max(...n):0,o=n.length>0?n[n.length-1]:0;t+=`\n${r}\n`,t+=`  Promedio: ${Number(i.average||0).toFixed(2)}/10\n`,t+=`  Intentos: ${n.length}\n`,t+=`  Mejor puntaje: ${a.toFixed(2)}\n`,t+=`  \xdaltimo puntaje: ${o.toFixed(2)}\n`})),e.performance.strengths.length>0&&(t+="\n\n\ud83d\udcaa FORTALEZAS\n",t+="\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n",e.performance.strengths.forEach((e=>{t+=`${e.rubricId}: ${e.score.toFixed(2)}/10\n`}))),e.performance.weaknesses.length>0&&(t+="\n\ud83c\udfaf \xc1REAS DE MEJORA\n",t+="\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n",e.performance.weaknesses.forEach((e=>{t+=`${e.rubricId}: ${e.score.toFixed(2)}/10\n`}))),e.recommendations.length>0&&(t+="\n\n\ud83d\udca1 RECOMENDACIONES\n",t+="\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n",e.recommendations.forEach(((e,r)=>{t+=`\n${r+1}. ${e.title}\n`,t+=`   ${e.description}\n`,t+=`   \u2192 ${e.action}\n`}))),t+="\n\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n",t+=`Generado el: ${(new Date).toLocaleString("es-ES")}\n`,t+="\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n";const i=(new Date).toISOString().split("T")[0];s(t,`reporte-evaluacion-${i}.txt`,"text/plain;charset=utf-8;"),a("\u2705 Reporte TXT exportado exitosamente"),setTimeout((()=>a("")),3e3)}catch(e){console.error("Error al exportar TXT:",e),a("\u274c Error al exportar reporte"),setTimeout((()=>a("")),3e3)}},whileHover:{scale:1.02},whileTap:{scale:.98},children:"\ud83d\udcc4 Descargar Reporte"})]})]}),n&&(0,d.jsx)(Ht,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},exit:{opacity:0},children:n})]}):(0,d.jsxs)(Mt,{theme:t,children:[(0,d.jsx)(Dt,{theme:t,children:"\ud83d\udce5 Exportar Datos"}),(0,d.jsxs)(qt,{theme:t,children:[(0,d.jsx)("p",{children:"\ud83d\udcca No hay datos para exportar"}),(0,d.jsx)("p",{children:"Completa algunas evaluaciones para descargar tus resultados"})]})]})},Yt=n.Ay.div`
  background: ${e=>e.theme.infoBg};
  border: 1px solid ${e=>e.theme.info};
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
`,Wt=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`,Jt=n.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Kt=n.Ay.div`
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`,Qt=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,Xt=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.surface};
  border-left: 3px solid ${e=>e.theme.info};
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.5;
  color: ${e=>e.theme.text};
`,Zt=(0,n.Ay)(a.P.button)`
  background: ${e=>e.theme.info};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${e=>e.theme.infoDark||e.theme.info};
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: ${e=>e.theme.border};
    cursor: not-allowed;
    opacity: 0.6;
  }
`,ei=n.Ay.div`
  text-align: center;
  padding: 1rem;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
`,ri=n.Ay.div`
  background: ${e=>e.theme.warningBg||"#fff3cd"};
  color: ${e=>e.theme.warning||"#856404"};
  border: 1px solid ${e=>e.theme.warning||"#ffc107"};
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,ti=e=>{let{hints:r=[],maxHints:t=3,onHintRevealed:n,theme:a}=e;const[s,l]=(0,i.useState)([]),c=r&&r.length>0,m=t-s.length>0&&s.length<r.length;return c?(0,d.jsxs)(Yt,{theme:a,children:[(0,d.jsxs)(Wt,{children:[(0,d.jsx)(Jt,{theme:a,children:"\ud83d\udca1 Hints de Apoyo"}),(0,d.jsxs)(Kt,{theme:a,children:[(0,d.jsxs)("span",{children:[s.length,"/",Math.min(t,r.length)]}),(0,d.jsx)("span",{children:"disponibles"})]})]}),s.length>0&&(0,d.jsx)(Qt,{children:(0,d.jsx)(o.N,{children:s.map(((e,r)=>(0,d.jsx)(Xt,{theme:a,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},exit:{opacity:0,x:20},transition:{duration:.3,delay:.1*r},children:e},r)))})}),m?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)(Zt,{theme:a,onClick:()=>{if(m){const e=s.length,t=[...s,r[e]];l(t),n&&n(e,r[e])}},whileHover:{scale:1.02},whileTap:{scale:.98},children:[(0,d.jsx)("span",{children:"\ud83d\udca1"}),(0,d.jsxs)("span",{children:["Revelar Hint #",s.length+1]})]}),0===s.length&&(0,d.jsx)(ri,{theme:a,children:"\u26a0\ufe0f Intenta responder primero sin hints para desarrollar tu pensamiento cr\xedtico"})]}):(0,d.jsx)(ei,{theme:a,children:s.length>=t?"\u2705 Has usado todos los hints disponibles":"\u2705 Has revelado todos los hints"})]}):(0,d.jsxs)(Yt,{theme:a,children:[(0,d.jsx)(Jt,{theme:a,children:"\ud83d\udca1 Hints de Apoyo"}),(0,d.jsx)(ei,{theme:a,children:"No hay hints disponibles para esta pregunta"})]})};var ii=t(8114);const ni=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.surface};
  border: 2px solid ${e=>e.theme.primary};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`,ai=n.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${e=>e.theme.border};
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
`,oi=n.Ay.h3`
  margin: 0;
  color: ${e=>e.theme.text};
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,si=n.Ay.div`
  background: ${e=>e.theme.primary};
  color: white;
  padding: 0.375rem 0.875rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,li=n.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`,di=n.Ay.h4`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,ci=n.Ay.p`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`,mi=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`,ui=(0,n.Ay)(a.P.button)`
  background: ${e=>e.$selected?e.theme.primary:e.theme.background};
  color: ${e=>e.$selected?"white":e.theme.text};
  border: 2px solid ${e=>e.$selected?e.theme.primary:e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    border-color: ${e=>e.theme.primary};
  }
`,hi=n.Ay.div`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`,pi=n.Ay.div`
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
`,gi=n.Ay.div`
  font-size: 0.75rem;
  opacity: 0.9;
  line-height: 1.3;
`,xi=n.Ay.ul`
  margin: 0.5rem 0 0 0;
  padding-left: 1.25rem;
  font-size: 0.7rem;
  opacity: 0.8;
  
  li {
    margin: 0.25rem 0;
  }
`,bi=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`,vi=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 6px;
  padding: 0.75rem;
  text-align: center;
`,fi=n.Ay.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${e=>e.$color||e.theme.text};
  margin-bottom: 0.25rem;
`,yi=n.Ay.div`
  font-size: 0.7rem;
  color: ${e=>e.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,ji=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`,$i=n.Ay.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`,Ai=n.Ay.div`
  background: ${e=>e.theme.primary};
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
`,Ei=n.Ay.div`
  flex: 1;
`,ki=n.Ay.div`
  font-weight: 600;
  color: ${e=>e.theme.text};
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
`,wi=n.Ay.div`
  color: ${e=>e.theme.textMuted};
  font-size: 0.8rem;
  line-height: 1.4;
`,Si=(0,n.Ay)(a.P.button)`
  background: ${e=>e.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  
  &:hover {
    background: ${e=>e.theme.primaryDark};
  }
`,Fi=(0,n.Ay)(a.P.button)`
  background: transparent;
  color: ${e=>e.theme.textMuted};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 6px;
  padding: 0.5rem 0.875rem;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${e=>e.theme.primary};
    color: ${e=>e.theme.primary};
  }
`,zi=n.Ay.div`
  background: linear-gradient(135deg, ${e=>e.theme.primary}15, ${e=>e.theme.info}15);
  border: 1px solid ${e=>e.theme.primary};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,Ii=n.Ay.div`
  font-size: 2rem;
  flex-shrink: 0;
`,Ti=n.Ay.div`
  flex: 1;
  
  h4 {
    margin: 0 0 0.25rem 0;
    color: ${e=>e.theme.text};
    font-size: 0.9rem;
  }
  
  p {
    margin: 0;
    color: ${e=>e.theme.textMuted};
    font-size: 0.8rem;
    line-height: 1.4;
  }
`,Ci=n.Ay.div`
  background: ${e=>e.theme.warning}15;
  border: 1px solid ${e=>e.theme.warning};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
`,Pi=n.Ay.div`
  font-size: 2rem;
  flex-shrink: 0;
`,Ni=n.Ay.div`
  flex: 1;
  
  h4 {
    margin: 0 0 0.25rem 0;
    color: ${e=>e.theme.text};
    font-size: 0.9rem;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    color: ${e=>e.theme.textMuted};
    font-size: 0.85rem;
    line-height: 1.4;
  }
`,Mi=e=>{let{rubricProgress:r,selectedDimension:t,onStartPractice:n,theme:s}=e;const[l,c]=(0,i.useState)(!1),[m,u]=(0,i.useState)(null),h=(0,i.useMemo)((()=>(0,ii.generatePracticePlan)(r)),[r]),p=(0,i.useMemo)((()=>t?(0,ii.determineDifficultyLevel)(r,t):ii.DIFFICULTY_LEVELS.EASY),[r,t]),g=(0,i.useMemo)((()=>t&&m?(0,ii.getHintsForDimension)(t,m):[]),[t,m]);return l?(0,d.jsxs)(ni,{theme:s,initial:{opacity:0,y:-20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[(0,d.jsxs)(ai,{theme:s,children:[(0,d.jsx)(oi,{theme:s,children:"\ud83c\udfaf Modo Pr\xe1ctica Guiada"}),(0,d.jsxs)(si,{theme:s,children:[(0,d.jsx)("span",{children:"\u2728"}),(0,d.jsx)("span",{children:"ACTIVO"})]})]}),!t&&(0,d.jsxs)(Ci,{theme:s,children:[(0,d.jsx)(Pi,{children:"\u26a0\ufe0f"}),(0,d.jsxs)(Ni,{theme:s,children:[(0,d.jsx)("h4",{children:"Selecciona una Dimensi\xf3n Primero"}),(0,d.jsx)("p",{children:"Para comenzar la pr\xe1ctica guiada, primero debes seleccionar una de las 5 dimensiones en las tarjetas de arriba. Cada dimensi\xf3n eval\xfaa un aspecto diferente de tu literacidad cr\xedtica."})]})]}),t&&(0,d.jsxs)(zi,{theme:s,children:[(0,d.jsx)(Ii,{children:"\ud83c\udf93"}),(0,d.jsxs)(Ti,{theme:s,children:[(0,d.jsx)("h4",{children:"Recomendaci\xf3n Personalizada"}),(0,d.jsx)("p",{children:h.reason})]})]}),(0,d.jsxs)(li,{theme:s,children:[(0,d.jsx)(di,{theme:s,children:"\ud83d\udccb Tu Plan de Pr\xe1ctica"}),(0,d.jsxs)(ci,{theme:s,children:["Tiempo estimado: ",h.estimatedTime]}),(0,d.jsx)(bi,{children:Object.entries(h.statistics).map((e=>{let[r,t]=e;return(0,d.jsxs)(vi,{theme:s,children:[(0,d.jsx)(fi,{theme:s,$color:"easy"===r?"#10b981":"medium"===r?"#f59e0b":"#ef4444",children:t.completed}),(0,d.jsx)(yi,{theme:s,children:ii.DIFFICULTY_LEVELS[r.toUpperCase()].label})]},r)}))}),(0,d.jsx)(ji,{children:h.steps.map((e=>(0,d.jsxs)($i,{children:[(0,d.jsx)(Ai,{theme:s,children:e.step}),(0,d.jsxs)(Ei,{children:[(0,d.jsx)(ki,{theme:s,children:e.title}),(0,d.jsx)(wi,{theme:s,children:e.description})]})]},e.step)))})]}),t&&(0,d.jsxs)(li,{theme:s,children:[(0,d.jsx)(di,{theme:s,children:"\ud83c\udfaf Dimensi\xf3n Seleccionada"}),(0,d.jsxs)(ci,{theme:s,children:["Practicar\xe1s con preguntas espec\xedficas de la dimensi\xf3n: ",(0,d.jsx)("strong",{children:t}),(0,d.jsx)("br",{}),"Tu progreso actual en esta dimensi\xf3n se reflejar\xe1 en las estad\xedsticas y plan de pr\xe1ctica."]})]}),(0,d.jsx)(di,{theme:s,children:"\ud83c\udf9a\ufe0f Selecciona tu Nivel de Dificultad"}),!t&&(0,d.jsx)(ci,{theme:s,style:{marginBottom:"1rem",opacity:.7},children:"\u26a0\ufe0f Selecciona una dimensi\xf3n arriba para activar el selector de dificultad"}),(0,d.jsx)(mi,{style:{opacity:t?1:.5},children:Object.values(ii.DIFFICULTY_LEVELS).map((e=>(0,d.jsxs)(ui,{theme:s,$selected:m===e.id,onClick:()=>t&&u(e.id),whileHover:{scale:t?1.02:1},whileTap:{scale:t?.98:1},style:{cursor:t?"pointer":"not-allowed"},disabled:!t,children:[(0,d.jsx)(hi,{children:e.label.split(" ")[0]}),(0,d.jsx)(pi,{children:e.label}),(0,d.jsx)(gi,{children:e.description}),(0,d.jsx)(xi,{children:e.characteristics.map(((e,r)=>(0,d.jsx)("li",{children:e},r)))})]},e.id)))}),m&&t&&g.length>0&&(0,d.jsx)(o.N,{children:(0,d.jsx)(a.P.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},children:(0,d.jsxs)(ci,{theme:s,children:["\ud83d\udca1 Tendr\xe1s ",ii.DIFFICULTY_LEVELS[m.toUpperCase()].hintsAvailable," hints disponibles para esta pr\xe1ctica"]})})}),(0,d.jsxs)(Si,{theme:s,onClick:()=>{n&&n({difficulty:m||p.id,hints:g,level:m?ii.DIFFICULTY_LEVELS[m.toUpperCase()]:p})},disabled:!m||!t,style:{opacity:m&&t?1:.5,cursor:m&&t?"pointer":"not-allowed"},whileHover:{scale:m&&t?1.02:1},whileTap:{scale:m&&t?.98:1},children:[(0,d.jsx)("span",{children:"\ud83d\ude80"}),(0,d.jsx)("span",{children:t?m?"Comenzar Pr\xe1ctica":"Selecciona un Nivel de Dificultad":"Selecciona una Dimensi\xf3n"})]}),t&&m&&(0,d.jsxs)(ci,{theme:s,style:{textAlign:"center",marginTop:"0.75rem",fontSize:"0.85rem",color:s.success},children:["\u2705 Todo listo para comenzar tu pr\xe1ctica guiada en ",(0,d.jsx)("strong",{children:t})," nivel ",(0,d.jsx)("strong",{children:ii.DIFFICULTY_LEVELS[m.toUpperCase()].label})]}),(0,d.jsxs)(Fi,{theme:s,onClick:()=>c(!1),style:{marginTop:"0.75rem"},whileHover:{scale:1.02},whileTap:{scale:.98},children:[(0,d.jsx)("span",{children:"\u274c"}),(0,d.jsx)("span",{children:"Desactivar Modo Guiado"})]})]}):(0,d.jsxs)(Fi,{theme:s,onClick:()=>c(!0),whileHover:{scale:1.02},whileTap:{scale:.98},children:[(0,d.jsx)("span",{children:"\ud83c\udfaf"}),(0,d.jsx)("span",{children:"Activar Modo Pr\xe1ctica Guiada"})]})},Di=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.surface};
  border: 2px solid ${e=>e.theme.warning||"#f59e0b"};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
`,Ri=n.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.text};
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Oi=n.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.6;
  font-size: 0.95rem;
`,_i=n.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,Bi=n.Ay.li`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${e=>e.$complete?`${e.theme.success||"#10b981"}10`:`${e.theme.background}`};
  border: 1px solid ${e=>e.$complete?e.theme.success||"#10b981":e.theme.border};
  border-radius: 8px;
  transition: all 0.2s ease;
`,Li=n.Ay.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`,Ui=n.Ay.div`
  flex: 1;
`,Gi=n.Ay.div`
  font-weight: 600;
  color: ${e=>e.theme.text};
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
`,Hi=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted};
  line-height: 1.4;
`,qi=n.Ay.button`
  padding: 0.5rem 1rem;
  background: ${e=>e.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`,Vi=n.Ay.div`
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`,Yi=n.Ay.div`
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
`,Wi=n.Ay.div`
  flex: 1;
  min-width: 150px;
  height: 8px;
  background: ${e=>e.theme.border};
  border-radius: 4px;
  overflow: hidden;
`,Ji=(0,n.Ay)(a.P.div)`
  height: 100%;
  background: ${e=>e.theme.primary};
  border-radius: 4px;
`;function Ki(e){let{dimension:r,faltantes:t=[],onNavigate:i,theme:n}=e;const a={prelecture:{label:"An\xe1lisis de Pre-lectura",description:"Completa el an\xe1lisis acad\xe9mico estructurado del texto",action:()=>null===i||void 0===i?void 0:i("prelectura")},critical_analysis:{label:"An\xe1lisis Cr\xedtico del Discurso",description:"Realiza el an\xe1lisis ideol\xf3gico y ret\xf3rico del texto",action:()=>null===i||void 0===i?void 0:i("prelectura")}},o=Object.keys(a).map((e=>({...a[e],id:e,complete:!t.includes(e)}))),s=o.filter((e=>e.complete)).length,l=o.length,c=s/l*100;return(0,d.jsxs)(Di,{theme:n,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.3},children:[(0,d.jsx)(Ri,{theme:n,children:"\ud83d\udccb Prerequisitos Pedag\xf3gicos"}),(0,d.jsxs)(Oi,{theme:n,children:["Para evaluar tu nivel en ",(0,d.jsx)("strong",{children:{comprension_analitica:"Comprensi\xf3n Anal\xedtica",acd:"An\xe1lisis Ideol\xf3gico-Discursivo (ACD)",contextualizacion:"Contextualizaci\xf3n Socio-Hist\xf3rica",argumentacion:"Argumentaci\xf3n y Contraargumento",metacognicion_etica_ia:"Metacognici\xf3n \xc9tica del Uso de IA"}[r]}),", primero necesitas completar los siguientes an\xe1lisis del texto. Estos an\xe1lisis proporcionan el contexto necesario para generar preguntas relevantes y personalizadas."]}),(0,d.jsx)(_i,{children:o.map((e=>(0,d.jsxs)(Bi,{$complete:e.complete,theme:n,children:[(0,d.jsx)(Li,{children:e.complete?"\u2705":"\u23f3"}),(0,d.jsxs)(Ui,{children:[(0,d.jsx)(Gi,{theme:n,children:e.label}),(0,d.jsx)(Hi,{theme:n,children:e.description})]}),!e.complete&&(0,d.jsx)(qi,{theme:n,onClick:e.action,children:"Completar \u2192"})]},e.id)))}),(0,d.jsxs)(Vi,{theme:n,children:[(0,d.jsxs)(Yi,{theme:n,children:[s," de ",l," completados"]}),(0,d.jsx)(Wi,{theme:n,children:(0,d.jsx)(Ji,{theme:n,initial:{width:0},animate:{width:`${c}%`},transition:{duration:.5}})})]})]})}class Qi extends Error{constructor(e,r){let t=arguments.length>2&&void 0!==arguments[2]&&arguments[2],i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{};super(e),this.name="EvaluationError",this.type=r,this.retryable=t,this.details=i,this.timestamp=new Date}toJSON(){return{name:this.name,message:this.message,type:this.type,retryable:this.retryable,details:this.details,timestamp:this.timestamp}}}const Xi={VALIDATION:"validation",PREREQUISITE:"prerequisite",INPUT_TOO_SHORT:"input_too_short",INPUT_TOO_LONG:"input_too_long",NETWORK:"network",TIMEOUT:"timeout",RATE_LIMIT:"rate_limit",API_ERROR:"api_error",PARSING:"parsing",INVALID_RESPONSE:"invalid_response",UNKNOWN:"unknown"},Zi={[Xi.VALIDATION]:{title:"\u26a0\ufe0f Error de validaci\xf3n",message:"Hay un problema con los datos proporcionados.",action:"Por favor, verifica tu respuesta e intenta nuevamente."},[Xi.PREREQUISITE]:{title:"\ud83d\udccb Prerequisitos incompletos",message:"Necesitas completar algunos pasos previos.",action:"Completa los artefactos indicados antes de continuar."},[Xi.INPUT_TOO_SHORT]:{title:"\u270f\ufe0f Respuesta muy corta",message:"Tu respuesta debe tener al menos 50 caracteres.",action:"Desarrolla m\xe1s tu respuesta con ejemplos y explicaciones."},[Xi.INPUT_TOO_LONG]:{title:"\ud83d\udccf Respuesta muy larga",message:"Tu respuesta no debe exceder 2000 caracteres.",action:"Resume tu respuesta manteniendo las ideas principales."},[Xi.NETWORK]:{title:"\ud83c\udf10 Error de conexi\xf3n",message:"No se pudo conectar con el servidor.",action:"Verifica tu conexi\xf3n a internet e intenta nuevamente."},[Xi.TIMEOUT]:{title:"\u23f1\ufe0f Tiempo de espera agotado",message:"La operaci\xf3n tard\xf3 demasiado en completarse.",action:"El servidor est\xe1 ocupado. Intenta nuevamente en unos momentos."},[Xi.RATE_LIMIT]:{title:"\ud83d\udea6 L\xedmite de solicitudes alcanzado",message:"Has realizado muchas solicitudes en poco tiempo.",action:"Espera 1-2 minutos antes de intentar nuevamente."},[Xi.API_ERROR]:{title:"\u2699\ufe0f Error del servidor",message:"El servidor encontr\xf3 un problema al procesar tu solicitud.",action:"Nuestro equipo ha sido notificado. Intenta nuevamente m\xe1s tarde."},[Xi.PARSING]:{title:"\ud83d\udcc4 Error de procesamiento",message:"No se pudo interpretar la respuesta del servidor.",action:"Intenta nuevamente. Si persiste, contacta soporte."},[Xi.INVALID_RESPONSE]:{title:"\u274c Respuesta inv\xe1lida",message:"El servidor envi\xf3 una respuesta con formato incorrecto.",action:"Intenta nuevamente. Si persiste, contacta soporte."},[Xi.UNKNOWN]:{title:"\ud83d\udd27 Error inesperado",message:"Ocurri\xf3 un error que no pudimos identificar.",action:"Intenta nuevamente. Si persiste, contacta soporte."}};function en(e){var r;if(e instanceof Qi)return e;const t=function(e){var r,t,i,n,a,o,s,l,d,c,m,u,h,p,g,x,b,v,f;return null!==(r=e.message)&&void 0!==r&&r.includes("al menos 50 caracteres")?Xi.INPUT_TOO_SHORT:null!==(t=e.message)&&void 0!==t&&t.includes("no debe exceder 2000 caracteres")?Xi.INPUT_TOO_LONG:null!==(i=e.message)&&void 0!==i&&i.includes("Dimensi\xf3n no encontrada")?Xi.VALIDATION:null!==(n=e.message)&&void 0!==n&&n.includes("prerequisitos")||null!==(a=e.message)&&void 0!==a&&a.includes("completar")?Xi.PREREQUISITE:null!==(o=e.message)&&void 0!==o&&o.includes("ECONNREFUSED")||null!==(s=e.message)&&void 0!==s&&s.includes("Network")||null!==(l=e.message)&&void 0!==l&&l.includes("fetch failed")?Xi.NETWORK:null!==(d=e.message)&&void 0!==d&&d.includes("timeout")||null!==(c=e.message)&&void 0!==c&&c.includes("timed out")||"ETIMEDOUT"===e.code?Xi.TIMEOUT:null!==(m=e.message)&&void 0!==m&&m.includes("429")||null!==(u=e.message)&&void 0!==u&&u.includes("rate limit")||null!==(h=e.message)&&void 0!==h&&h.includes("Too Many Requests")?Xi.RATE_LIMIT:null!==(p=e.message)&&void 0!==p&&p.includes("500")||null!==(g=e.message)&&void 0!==g&&g.includes("502")||null!==(x=e.message)&&void 0!==x&&x.includes("503")||null!==(b=e.message)&&void 0!==b&&b.includes("API error")?Xi.API_ERROR:null!==(v=e.message)&&void 0!==v&&v.includes("JSON")||null!==(f=e.message)&&void 0!==f&&f.includes("parse")||e instanceof SyntaxError?Xi.PARSING:Xi.UNKNOWN}(e),i=(n=t,[Xi.NETWORK,Xi.TIMEOUT,Xi.RATE_LIMIT,Xi.API_ERROR,Xi.PARSING,Xi.INVALID_RESPONSE].includes(n));var n;return new Qi(e.message||"Error desconocido",t,i,{originalError:e.name,stack:null===(r=e.stack)||void 0===r?void 0:r.substring(0,500)})}const rn=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.errorBackground||"#fee"};
  border: 2px solid ${e=>e.theme.errorBorder||"#f88"};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(255, 0, 0, 0.1);
`,tn=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`,nn=n.Ay.h3`
  color: ${e=>e.theme.errorText||"#c00"};
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`,an=n.Ay.p`
  color: ${e=>e.theme.text};
  margin: 0 0 1rem 0;
  line-height: 1.5;
`,on=n.Ay.p`
  color: ${e=>e.theme.textSecondary};
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-style: italic;
`,sn=n.Ay.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`,ln=n.Ay.button`
  background: ${e=>e.theme.primary};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${e=>e.theme.primaryDark||e.theme.primary};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: ${e=>e.theme.disabled||"#ccc"};
    cursor: not-allowed;
    transform: none;
  }
`,dn=n.Ay.button`
  background: transparent;
  color: ${e=>e.theme.textSecondary};
  border: 2px solid ${e=>e.theme.border};
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${e=>e.theme.backgroundSecondary};
    border-color: ${e=>e.theme.textSecondary};
  }
`,cn=n.Ay.details`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
  
  summary {
    cursor: pointer;
    color: ${e=>e.theme.textSecondary};
    font-size: 0.9rem;
    user-select: none;
    
    &:hover {
      color: ${e=>e.theme.text};
    }
  }
`,mn=n.Ay.pre`
  background: ${e=>e.theme.backgroundSecondary};
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  overflow-x: auto;
  color: ${e=>e.theme.textSecondary};
`,un=n.Ay.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: ${e=>e.theme.backgroundSecondary};
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  color: ${e=>e.theme.textSecondary};
  margin-bottom: 1rem;
`,hn=e=>{let{error:r,onRetry:t,onDismiss:i,showDetails:n=!1,attempt:a=null,maxAttempts:s=null,theme:l}=e;if(!r)return null;const c=r instanceof Error?{type:"UNKNOWN",message:r.message,retryable:!0,details:{}}:r,m=(u=c.type||"UNKNOWN",Zi[u]||Zi[Xi.UNKNOWN]);var u;const h=c.retryable&&t;return(0,d.jsx)(o.N,{mode:"wait",children:(0,d.jsxs)(rn,{theme:l,initial:{opacity:0,y:-20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[a&&s&&(0,d.jsxs)(un,{theme:l,children:["\ud83d\udd04 Intento ",a,"/",s]}),(0,d.jsx)(tn,{children:(0,d.jsx)(nn,{theme:l,children:m.title})}),(0,d.jsx)(an,{theme:l,children:m.message}),(0,d.jsxs)(on,{theme:l,children:["\ud83d\udca1 ",m.action]}),(0,d.jsxs)(sn,{children:[h&&(0,d.jsx)(ln,{theme:l,onClick:t,children:"\ud83d\udd04 Reintentar"}),i&&(0,d.jsx)(dn,{theme:l,onClick:i,children:"\u2715 Cerrar"})]}),n&&c.details&&(0,d.jsxs)(cn,{theme:l,children:[(0,d.jsx)("summary",{children:"\ud83d\udd0d Detalles t\xe9cnicos"}),(0,d.jsx)(mn,{theme:l,children:JSON.stringify({type:c.type,message:c.message,timestamp:c.timestamp,details:"object"===typeof c.details?Object.keys(c.details).reduce(((e,r)=>{const t=c.details[r];return e[r]=t instanceof Error?t.message:t,e}),{}):c.details},null,2)})]})]})})},pn=n.i7`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`,gn=n.i7`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`,xn=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.surface};
  border: 2px solid ${e=>e.theme.primary};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`,bn=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`,vn=n.Ay.div`
  font-size: 2rem;
  ${n.AH`animation: ${gn} 2s ease-in-out infinite;`}
`,fn=n.Ay.h3`
  color: ${e=>e.theme.text};
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`,yn=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,jn=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`,$n=n.Ay.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  
  ${e=>"completed"===e.$status?n.AH`
        background: ${e.theme.success||"#4caf50"};
        color: white;
      `:"active"===e.$status?n.AH`
        background: ${e.theme.primary};
        color: white;
        animation: ${gn} 1.5s ease-in-out infinite;
      `:n.AH`
      background: ${e.theme.backgroundSecondary};
      color: ${e.theme.textSecondary};
      border: 2px solid ${e.theme.border};
    `}
`,An=n.Ay.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`,En=n.Ay.div`
  color: ${e=>e.$active?e.theme.text:e.theme.textSecondary};
  font-weight: ${e=>e.$active?"600":"400"};
  font-size: 0.95rem;
`,kn=n.Ay.div`
  color: ${e=>e.theme.textSecondary};
  font-size: 0.85rem;
  font-style: italic;
`,wn=n.Ay.div`
  width: 100%;
  height: 8px;
  background: ${e=>e.theme.backgroundSecondary};
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
`,Sn=(0,n.Ay)(a.P.div)`
  height: 100%;
  background: linear-gradient(
    90deg,
    ${e=>e.theme.primary} 0%,
    ${e=>e.theme.primaryLight||e.theme.primary} 50%,
    ${e=>e.theme.primary} 100%
  );
  background-size: 200% 100%;
  ${n.AH`animation: ${pn} 2s linear infinite;`}
  border-radius: 4px;
`,Fn=n.Ay.div`
  color: ${e=>e.theme.textSecondary};
  font-size: 0.85rem;
  text-align: center;
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`,zn={GENERATING:{id:"generating",icon:"\u2728",label:"Generando pregunta",description:"Analizando el texto y creando pregunta contextualizada",estimatedDuration:3e3},SUBMITTING:{id:"submitting",icon:"\ud83d\udce4",label:"Enviando respuesta",description:"Preparando tu respuesta para evaluaci\xf3n",estimatedDuration:1e3},EVALUATING_STRUCTURE:{id:"evaluating_structure",icon:"\ud83d\udd0d",label:"Evaluando estructura",description:"DeepSeek analiza claridad y evidencias textuales",estimatedDuration:5e3},EVALUATING_DEPTH:{id:"evaluating_depth",icon:"\ud83e\udde0",label:"Evaluando profundidad",description:"GPT-4 eval\xfaa pensamiento cr\xedtico y originalidad",estimatedDuration:6e3},COMBINING:{id:"combining",icon:"\u2696\ufe0f",label:"Combinando resultados",description:"Generando retroalimentaci\xf3n integral",estimatedDuration:1e3}},In=e=>{let{mode:r="generating",currentStep:t=null,progress:i=0,estimatedTimeRemaining:n=null,theme:a}=e;const s="generating"===r?[zn.GENERATING]:[zn.SUBMITTING,zn.EVALUATING_STRUCTURE,zn.EVALUATING_DEPTH,zn.COMBINING],l=t?s.findIndex((e=>e.id===t)):0,c=t?(l+1)/s.length*100:i;return(0,d.jsx)(o.N,{mode:"wait",children:(0,d.jsxs)(xn,{theme:a,initial:{opacity:0,y:-20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[(0,d.jsxs)(bn,{children:[(0,d.jsx)(vn,{children:"generating"===r?"\u2728":"\ud83c\udfaf"}),(0,d.jsx)(fn,{theme:a,children:"generating"===r?"Generando pregunta contextualizada...":"Evaluando tu respuesta..."})]}),(0,d.jsx)(yn,{children:s.map(((e,r)=>{const t=r<l,i=r===l,n=t?"completed":i?"active":"pending";return(0,d.jsxs)(jn,{children:[(0,d.jsx)($n,{$status:n,theme:a,children:t?"\u2713":e.icon}),(0,d.jsxs)(An,{children:[(0,d.jsx)(En,{$active:i,theme:a,children:e.label}),i&&(0,d.jsx)(kn,{theme:a,children:e.description})]})]},e.id)}))}),(0,d.jsx)(wn,{theme:a,children:(0,d.jsx)(Sn,{theme:a,initial:{width:0},animate:{width:`${c}%`},transition:{duration:.5,ease:"easeOut"}})}),n&&(0,d.jsxs)(Fn,{theme:a,children:["\u23f1\ufe0f Tiempo estimado: ",Math.ceil(n/1e3),"s"]})]})})},Tn=n.Ay.a`
  position: absolute;
  top: -40px;
  left: 0;
  background: ${e=>e.theme.primary};
  color: white;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  font-weight: 600;
  z-index: 10000;
  border-radius: 0 0 8px 0;
  transition: top 0.2s ease;

  &:focus {
    top: 0;
    outline: 3px solid ${e=>e.theme.focus||"#4d90fe"};
    outline-offset: 2px;
  }
`,Cn=n.Ay.div`
  position: relative;
`,Pn=e=>{let{links:r=[],theme:t}=e;const i=[{href:"#main-content",label:"Saltar al contenido principal"},{href:"#dashboard-rubricas",label:"Saltar al dashboard de r\xfabricas"},{href:"#pregunta-actual",label:"Saltar a la pregunta actual"},...r];return(0,d.jsx)(Cn,{children:i.map(((e,r)=>(0,d.jsx)(Tn,{href:e.href,theme:t,onClick:r=>{r.preventDefault();const t=document.querySelector(e.href);t&&(t.focus(),t.scrollIntoView({behavior:"smooth",block:"start"}))},children:e.label},r)))})};function Nn(e){let r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"polite";const t=document.createElement("div");t.setAttribute("role","status"),t.setAttribute("aria-live",r),t.setAttribute("aria-atomic","true"),t.className="sr-only",t.textContent=e,document.body.appendChild(t),setTimeout((()=>{document.body.removeChild(t)}),1e3)}var Mn=t(6735),Dn=t(8864);const Rn="deepseek-chat",On="gpt-4o-mini",_n={comprension_analitica:"comprensionAnalitica",acd:"acd",contextualizacion:"contextualizacion",argumentacion:"argumentacion",metacognicion_etica_ia:"comprensionAnalitica"};async function Bn(e){var r,t;let{texto:i,completeAnalysis:n,dimension:a,nivelDificultad:o="intermedio",onProgress:s}=e;console.log(`\ud83d\udcdd [EvaluacionIntegral] Generando pregunta para dimensi\xf3n: ${a}`),s&&s({step:"generating",progress:0});const l=function(e,r){const t={comprension_analitica:{requiere:["prelecture"]},acd:{requiere:["prelecture","critical_analysis"]},contextualizacion:{requiere:["prelecture"]},argumentacion:{requiere:["prelecture"]},metacognicion_etica_ia:{requiere:[]}}[e];if(!t||!t.requiere.length)return{valido:!0,faltantes:[],dimension:e};const i=[];for(const n of t.requiere)null!==r&&void 0!==r&&r[n]||i.push(n);return{valido:0===i.length,faltantes:i,dimension:e}}(a,n);if(!l.valido)return{needsPrerequisites:!0,...l};const d=_n[a];if(!d)throw new Error(`Dimensi\xf3n no mapeada: ${a}`);const c=(0,Dn.getDimension)(d);if(!c)throw new Error(`Dimensi\xf3n no encontrada en r\xfabrica: ${d} (desde ${a})`);const m=function(e,r){if(!e)return"";const t={comprension_analitica:()=>{var r,t,i,n;const a=null===e||void 0===e?void 0:e.prelecture;return a?`\nAN\xc1LISIS DISPONIBLE DEL TEXTO:\n- G\xe9nero: ${(null===(r=a.metadata)||void 0===r?void 0:r.genero_textual)||"No identificado"}\n- Prop\xf3sito: ${(null===(t=a.metadata)||void 0===t?void 0:t.proposito_comunicativo)||"No identificado"}\n- Tesis central: ${(null===(i=a.argumentation)||void 0===i?void 0:i.tesis_central)||"No identificada"}\n- Tipo de argumentaci\xf3n: ${(null===(n=a.argumentation)||void 0===n?void 0:n.tipo_argumentacion)||"No identificado"}\n`:""},acd:()=>{var r,t,i,n,a,o;const s=null===e||void 0===e?void 0:e.critical_analysis;return s?`\nAN\xc1LISIS IDEOL\xd3GICO-DISCURSIVO DISPONIBLE:\n- Marcos ideol\xf3gicos detectados: ${(null===(r=s.marcos_ideologicos)||void 0===r?void 0:r.map((e=>e.nombre)).join(", "))||"Ninguno"}\n- Estrategias ret\xf3ricas identificadas: ${(null===(t=s.estrategias_retoricas)||void 0===t?void 0:t.map((e=>e.tipo)).join(", "))||"Ninguna"}\n- Voces presentes: ${(null===(i=s.voces)||void 0===i||null===(n=i.presentes)||void 0===n?void 0:n.join(", "))||"No identificadas"}\n- Voces silenciadas: ${(null===(a=s.voces)||void 0===a||null===(o=a.ausentes)||void 0===o?void 0:o.join(", "))||"No identificadas"}\n`:""},contextualizacion:()=>{var r,t,i,n;const a=null===e||void 0===e?void 0:e.prelecture;return a?`\nCONTEXTUALIZACI\xd3N DISPONIBLE:\n- Autor: ${(null===(r=a.metadata)||void 0===r?void 0:r.autor)||"No identificado"}\n- Fecha: ${(null===(t=a.metadata)||void 0===t?void 0:t.fecha_texto)||"No identificada"}\n- G\xe9nero textual: ${(null===(i=a.metadata)||void 0===i?void 0:i.genero_textual)||"No identificado"}\n- Fuentes web consultadas: ${(null===(n=a.web_sources)||void 0===n?void 0:n.length)||0}\n`:""},argumentacion:()=>{var r;const t=null===e||void 0===e?void 0:e.prelecture;return null!==t&&void 0!==t&&t.argumentation?`\nESTRUCTURA ARGUMENTATIVA DEL TEXTO:\n- Tesis: ${t.argumentation.tesis_central||"No identificada"}\n- Argumentos principales: ${(null===(r=t.argumentation.argumentos_principales)||void 0===r?void 0:r.length)||0}\n- Tipo de razonamiento: ${t.argumentation.tipo_razonamiento||"No identificado"}\n`:""},metacognicion_etica_ia:()=>"\nDIMENSI\xd3N METACOGNITIVA:\nEsta pregunta evaluar\xe1 tu reflexi\xf3n sobre el uso \xe9tico de IA en tu proceso de aprendizaje.\n"},i=t[r];return i?i():""}(n,a),u=`Eres un evaluador experto en literacidad cr\xedtica.\n\nDIMENSI\xd3N A EVALUAR: ${c.nombre}\nDESCRIPCI\xd3N: ${c.descripcion}\n\nTEXTO ORIGINAL (extracto):\n"""\n${i.substring(0,1500)}...\n"""\n\n${m}\n\nTAREA: Genera UNA pregunta de nivel ${o} que eval\xfae la dimensi\xf3n "${c.nombre}".\n\nCRITERIOS DE LA PREGUNTA:\n${(null===(r=c.criterios)||void 0===r?void 0:r.map(((e,r)=>`${r+1}. ${e.nombre}: ${e.descripcion}`)).join("\n"))||""}\n\nPREGUNTAS GU\xcdA DE LA R\xdaBRICA:\n${(null===(t=c.preguntasGuia)||void 0===t?void 0:t.map(((e,r)=>`${r+1}. ${e}`)).join("\n"))||""}\n\nIMPORTANTE:\n- La pregunta debe ser espec\xedfica al texto (usar ejemplos concretos del an\xe1lisis)\n- Debe requerir pensamiento cr\xedtico, no solo recordar informaci\xf3n\n- Debe permitir evaluar uno o m\xe1s criterios de la r\xfabrica\n- Nivel ${o}: ${{basico:"Identificar elementos b\xe1sicos",intermedio:"Analizar relaciones y patrones",avanzado:"Evaluar cr\xedticamente y sintetizar"}[o]}\n\nResponde SOLO con la pregunta (sin numeraci\xf3n, sin "Pregunta:", solo el texto de la pregunta).`;try{const e=await(0,Mn.x8)({provider:"deepseek",model:Rn,messages:[{role:"user",content:u}],temperature:.7,max_tokens:300,timeoutMs:3e4}),r=(0,Mn.HQ)(e).trim();return console.log(`\u2705 Pregunta generada: ${r.substring(0,80)}...`),s&&s({step:"completed",progress:100}),{pregunta:r,dimension:a,dimensionLabel:c.nombre,nivelDificultad:o,contextoUsado:m.substring(0,200)}}catch(h){throw console.error("\u274c Error generando pregunta:",h),new Error(`Error generando pregunta: ${h.message}`)}}async function Ln(e){let{texto:r,pregunta:t,respuesta:i,dimension:n,onProgress:a}=e;if(console.log(`\ud83d\udcca [EvaluacionIntegral] Evaluando respuesta para dimensi\xf3n: ${n}`),!i||i.trim().length<50)throw new Error("La respuesta debe tener al menos 50 caracteres");if(i.length>2e3)throw new Error("La respuesta no debe exceder 2000 caracteres");const o=Date.now();let s={deepseek:0,openai:0};try{var l,d;a&&a({step:"submitting",progress:0}),a&&a({step:"evaluating_structure",progress:25});const e=await async function(e){let{texto:r,pregunta:t,respuesta:i,dimension:n}=e;const a=_n[n]||n,o=`Eres un evaluador experto en literacidad cr\xedtica.\n\nDIMENSI\xd3N: ${(0,Dn.getDimension)(a).nombre}\n\nPREGUNTA:\n${t}\n\nRESPUESTA DEL ESTUDIANTE:\n${i}\n\nTEXTO ORIGINAL (extracto):\n${r.substring(0,1e3)}...\n\nTAREA: Eval\xfaa la ESTRUCTURA Y CLARIDAD de la respuesta seg\xfan estos criterios:\n\n1. **Claridad**: \xbfLa respuesta es clara y coherente?\n2. **Anclaje textual**: \xbfUsa evidencias del texto?\n3. **Completitud**: \xbfResponde directamente a la pregunta?\n4. **Extensi\xf3n**: \xbfEs suficientemente desarrollada?\n\nResponde SOLO con JSON:\n{\n  "claridad": 1-4,\n  "anclaje_textual": 1-4,\n  "completitud": 1-4,\n  "extension_adecuada": true/false,\n  "evidencias_encontradas": ["evidencia 1", "evidencia 2"],\n  "fortalezas_estructurales": ["fortaleza 1"],\n  "mejoras_estructurales": ["mejora 1"]\n}`,s=await(0,Mn.x8)({provider:"deepseek",model:Rn,messages:[{role:"user",content:o}],temperature:.2,max_tokens:800,response_format:{type:"json_object"},timeoutMs:3e4});try{const e=(0,Mn.HQ)(s);console.log("\ud83d\udd0d [DeepSeek] Respuesta cruda:",e.substring(0,200));const r=Un(e);console.log("\u2705 [DeepSeek] Respuesta limpia:",r.substring(0,200));const t=JSON.parse(r);if(!t.claridad||!t.anclaje_textual||!t.completitud)throw new Error("Respuesta JSON incompleta de DeepSeek");return t}catch(l){return console.error("\u274c [DeepSeek] Error parseando JSON:",l.message),console.error("\ud83d\udcc4 [DeepSeek] Contenido recibido:",(0,Mn.HQ)(s)),{claridad:3,anclaje_textual:3,completitud:3,extension_adecuada:!0,evidencias_encontradas:["Respuesta analizada manualmente"],fortalezas_estructurales:["Estructura b\xe1sica presente"],mejoras_estructurales:["Error en evaluaci\xf3n autom\xe1tica, revisar manualmente"],_error:l.message}}}({texto:r,pregunta:t,respuesta:i,dimension:n});s.deepseek=(null===(l=e.usage)||void 0===l?void 0:l.total_tokens)||0,a&&a({step:"evaluating_depth",progress:50});const c=await async function(e){let{texto:r,pregunta:t,respuesta:i,dimension:n,deepseekResult:a}=e;const o=_n[n]||n,s=(0,Dn.getDimension)(o),l=`Eres un evaluador experto en pensamiento cr\xedtico y literacidad cr\xedtica.\n\nDIMENSI\xd3N: ${s.nombre}\n\nPREGUNTA:\n${t}\n\nRESPUESTA DEL ESTUDIANTE:\n${i}\n\nEVALUACI\xd3N ESTRUCTURAL PREVIA:\n${JSON.stringify(a,null,2)}\n\nTAREA: Eval\xfaa la PROFUNDIDAD CR\xcdTICA de la respuesta. No repitas la evaluaci\xf3n estructural.\n\nEnf\xf3cate en:\n1. **Pensamiento cr\xedtico**: \xbfDemuestra an\xe1lisis profundo?\n2. **Comprensi\xf3n de la dimensi\xf3n**: \xbfEntiende los conceptos clave de "${s.nombre}"?\n3. **Originalidad**: \xbfVa m\xe1s all\xe1 de lo obvio?\n4. **Conexiones**: \xbfConecta ideas de forma sofisticada?\n\nNIVELES DE PROFUNDIDAD:\n- Nivel 1: Respuesta superficial, sin an\xe1lisis\n- Nivel 2: An\xe1lisis b\xe1sico pero limitado\n- Nivel 3: An\xe1lisis s\xf3lido con conexiones claras\n- Nivel 4: An\xe1lisis profundo, original, perspicaz\n\nResponde SOLO con JSON:\n{\n  "profundidad_critica": 1-4,\n  "comprension_dimension": 1-4,\n  "originalidad": 1-4,\n  "comentario_critico": "An\xe1lisis breve",\n  "fortalezas_criticas": ["fortaleza 1"],\n  "oportunidades_profundizacion": ["sugerencia 1"]\n}`,d=await(0,Mn.x8)({provider:"openai",model:On,messages:[{role:"user",content:l}],temperature:.3,max_tokens:1e3,response_format:{type:"json_object"},timeoutMs:45e3});try{const e=(0,Mn.HQ)(d);console.log("\ud83d\udd0d [OpenAI] Respuesta cruda:",e.substring(0,200));const r=Un(e);console.log("\u2705 [OpenAI] Respuesta limpia:",r.substring(0,200));const t=JSON.parse(r);if(!t.profundidad_critica||!t.comprension_dimension)throw new Error("Respuesta JSON incompleta de OpenAI");return t}catch(c){return console.error("\u274c [OpenAI] Error parseando JSON:",c.message),console.error("\ud83d\udcc4 [OpenAI] Contenido recibido:",(0,Mn.HQ)(d)),{profundidad_critica:3,comprension_dimension:3,originalidad:3,comentario_critico:"An\xe1lisis autom\xe1tico no disponible. Revisar respuesta manualmente.",fortalezas_criticas:["Respuesta proporcionada"],oportunidades_profundizacion:["Error en evaluaci\xf3n autom\xe1tica"],_error:c.message}}}({texto:r,pregunta:t,respuesta:i,dimension:n,deepseekResult:e});s.openai=(null===(d=c.usage)||void 0===d?void 0:d.total_tokens)||0,a&&a({step:"combining",progress:90});const m=function(e,r,t){const i=_n[t]||t,n=(0,Dn.getDimension)(i),a=((e.claridad||0)+(e.anclaje_textual||0)+(e.completitud||0))/3,o=((r.profundidad_critica||0)+(r.comprension_dimension||0)+(r.originalidad||0))/3,s=Math.round(.6*a+.4*o),l=Math.round(2.5*s),d=[...e.fortalezas_estructurales||[],...r.fortalezas_criticas||[]],c=[...e.mejoras_estructurales||[],...r.oportunidades_profundizacion||[]];return{dimension:t,dimensionLabel:(null===n||void 0===n?void 0:n.nombre)||t,score:Math.round(10*l)/10,nivel:s,scoreEstructural:Math.round(10*a)/10,scoreProfundidad:Math.round(10*o)/10,fortalezas:d,mejoras:c,evidencias:e.evidencias_encontradas||[],comentarioCritico:r.comentario_critico||"",detalles:{claridad:e.claridad,anclaje:e.anclaje_textual,completitud:e.completitud,profundidad:r.profundidad_critica,comprension:r.comprension_dimension,originalidad:r.originalidad}}}(e,c,n);return console.log(`\u2705 Evaluaci\xf3n completada en ${Date.now()-o}ms`),console.log(`\ud83d\udcca Score: ${m.score}/10, Nivel: ${m.nivel}/4`),console.log(`\ud83d\udcb0 Tokens usados - DeepSeek: ${s.deepseek}, OpenAI: ${s.openai}, Total: ${s.deepseek+s.openai}`),a&&a({step:"completed",progress:100}),m}catch(c){throw console.error("\u274c Error evaluando respuesta:",c),c}}function Un(e){if(!e)return e;let r=e.replace(/```json\s*/gi,"").replace(/```\s*/g,"");const t=r.match(/\{[\s\S]*\}/);t&&(r=t[0]);const i=r.indexOf("{");i>0&&(r=r.substring(i));const n=r.lastIndexOf("}");return-1!==n&&n<r.length-1&&(r=r.substring(0,n+1)),r=r.trim(),r}const Gn={maxAttempts:3,baseDelay:1e3,maxDelay:1e4,backoffMultiplier:2,timeoutPerAttempt:3e4};function Hn(e){const r=Gn.baseDelay*Math.pow(Gn.backoffMultiplier,e-1),t=.25*r*(2*Math.random()-1);return Math.min(r+t,Gn.maxDelay)}function qn(e){return new Promise((r=>setTimeout(r,e)))}async function Vn(e){let r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t=arguments.length>2&&void 0!==arguments[2]?arguments[2]:null;const i={...Gn,...r};let n=null;for(let o=1;o<=i.maxAttempts;o++)try{t&&t({type:"attempt",attempt:o,maxAttempts:i.maxAttempts,message:1===o?"Procesando solicitud...":`Reintentando (${o}/${i.maxAttempts})...`});const r=await Promise.race([e(),new Promise(((e,r)=>setTimeout((()=>r(new Error(`Timeout despu\xe9s de ${i.timeoutPerAttempt}ms`))),i.timeoutPerAttempt)))]);return t&&t({type:"success",attempt:o,message:"Operaci\xf3n completada exitosamente"}),r}catch(a){const e=en(a);if(n=e,console.warn(`\u274c Intento ${o}/${i.maxAttempts} fall\xf3:`,{type:e.type,message:e.message,retryable:e.retryable}),!e.retryable)throw t&&t({type:"error",error:e,message:"Error no reintentable"}),e;if(o===i.maxAttempts)throw t&&t({type:"error",error:e,message:`Fall\xf3 despu\xe9s de ${o} intentos`}),e;const r=Hn(o);t&&t({type:"retry",attempt:o,maxAttempts:i.maxAttempts,delay:r,message:`Reintentando en ${Math.round(r/1e3)}s...`}),await qn(r)}throw n}var Yn=t(5361),Wn=t(7337),Jn=t(7653);const Kn=n.Ay.div`
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`,Qn=n.Ay.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  color: ${e=>e.theme.text};
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`,Xn=n.Ay.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: ${e=>e.theme.text};
  
  @media (max-width: 640px) {
    font-size: 1.5rem;
    flex-direction: column;
    gap: 0.25rem;
  }
`,Zn=n.Ay.p`
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
  line-height: 1.5;
  
  @media (max-width: 640px) {
    font-size: 0.875rem;
    padding: 0 0.5rem;
  }
`,ea=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,ra=n.Ay.h4`
  margin: 0 0 0.5rem 0;
  color: ${e=>e.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,ta=n.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
  
  strong {
    color: ${e=>e.theme.primary};
    font-weight: 600;
  }
`,ia=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`,na=n.Ay.button`
  background: ${e=>e.$selected?e.theme.primary:"transparent"};
  color: ${e=>e.$selected?"white":e.theme.text};
  border: 2px solid ${e=>e.$selected?e.theme.primary:e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${e=>e.$selected?e.theme.primary:e.theme.border}40;
  }
`,aa=n.Ay.div`
  font-size: 1.5rem;
`,oa=n.Ay.div`
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
`,sa=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
    border-radius: 8px;
  }
`,la=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`,da=n.Ay.span`
  padding: 0.25rem 0.75rem;
  background: ${e=>e.theme.primary}20;
  color: ${e=>e.theme.primary};
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
`,ca=n.Ay.div`
  font-size: 1.1rem;
  line-height: 1.6;
  color: ${e=>e.theme.text};
  font-weight: 500;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${e=>e.theme.background};
  border-left: 4px solid ${e=>e.theme.primary};
  border-radius: 4px;
  
  @media (max-width: 640px) {
    font-size: 1rem;
    padding: 0.75rem;
    line-height: 1.5;
  }
`,ma=n.Ay.textarea`
  width: 100%;
  min-height: 150px;
  padding: 1rem;
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  background: ${e=>e.theme.background};
  color: ${e=>e.theme.text};
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: ${e=>e.theme.primary};
    box-shadow: 0 0 0 3px ${e=>e.theme.primary}20;
  }
  
  &::placeholder {
    color: ${e=>e.theme.textMuted};
  }
`,ua=n.Ay.div`
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
`,ha=n.Ay.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,pa=(0,n.Ay)(ha)`
  background: ${e=>e.theme.success};
  color: white;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`,ga=(0,n.Ay)(ha)`
  background: transparent;
  color: ${e=>e.theme.text};
  border: 1px solid ${e=>e.theme.border};

  &:hover:not(:disabled) {
    background: ${e=>e.theme.surfaceHover};
  }
`,xa=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted};
`,ba=(0,n.Ay)(a.P.div)`
  background: ${e=>e.theme.surface};
  border: 2px solid ${e=>e.theme.primary};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,va=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`,fa=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`,ya=n.Ay.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${e=>{const r=e.$score;return r>=8.6?"#8b5cf6":r>=5.6?"#10b981":r>=2.6?"#f59e0b":"#ef4444"}};
`,ja=n.Ay.div`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${e=>{const r=e.$nivel;return 4===r?"#e9d5ff":3===r?"#dcfce7":2===r?"#fed7aa":"#fee2e2"}};
  color: ${e=>{const r=e.$nivel;return 4===r?"#6b21a8":3===r?"#166534":2===r?"#c2410c":"#991b1b"}};
  font-weight: 700;
  font-size: 0.9rem;
`,$a=n.Ay.div`
  margin-bottom: 1.5rem;
`,Aa=n.Ay.h4`
  margin: 0 0 0.75rem 0;
  color: ${e=>e.theme.text};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Ea=n.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,ka=n.Ay.li`
  padding-left: 1.5rem;
  position: relative;
  color: ${e=>e.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.5;

  &::before {
    content: '${e=>e.$icon}';
    position: absolute;
    left: 0;
  }
`,wa=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  background: ${e=>e.theme.background};
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`,Sa=n.Ay.div`
  text-align: center;
`,Fa=n.Ay.div`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
`,za=n.Ay.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${e=>e.theme.primary};
`,Ia=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1.5rem;
`,Ta=n.Ay.div`
  padding: 1rem;
  background: ${e=>e.theme.background};
  border-left: 4px solid ${e=>e.theme.primary};
  border-radius: 4px;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
`,Ca=n.Ay.div`
  font-weight: 600;
  color: ${e=>e.theme.text};
  margin-bottom: 0.25rem;
`,Pa=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted};
`,Na=(0,n.Ay)(a.P.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1rem;
`,Ma=(0,n.Ay)(a.P.div)`
  font-size: 3rem;
`,Da=n.Ay.div`
  color: ${e=>e.theme.textMuted};
  font-size: 0.95rem;
`,Ra=[{id:"comprension_analitica",nombre:"Comprensi\xf3n Anal\xedtica",icono:"\ud83d\udcda"},{id:"acd",nombre:"An\xe1lisis Ideol\xf3gico-Discursivo",icono:"\ud83d\udd0d"},{id:"contextualizacion",nombre:"Contextualizaci\xf3n Socio-Hist\xf3rica",icono:"\ud83d\uddfa\ufe0f"},{id:"argumentacion",nombre:"Argumentaci\xf3n y Contraargumento",icono:"\ud83d\udcad"},{id:"metacognicion_etica_ia",nombre:"Metacognici\xf3n \xc9tica del Uso de IA",icono:"\ud83e\udd16"}];function Oa(){var e,r,n,a;const{texto:c,completeAnalysis:m,modoOscuro:u,rubricProgress:h,updateRubricScore:p}=(0,i.useContext)(s.BR),g=u?l.a5:l._k,[x,b]=(0,i.useState)(null),[v,f]=(0,i.useState)(null),[y,j]=(0,i.useState)(""),[$,A]=(0,i.useState)(null),[E,k]=(0,i.useState)(!1),[w,S]=(0,i.useState)(!1),[F,z]=(0,i.useState)(null),[I,T]=(0,i.useState)([]),[P,N]=(0,i.useState)(null),[M,D]=(0,i.useState)(0),[R,O]=(0,i.useState)(null),[_,B]=(0,i.useState)(null),[L,U]=(0,i.useState)(0),[G,H]=(0,i.useState)(null),[q,V]=(0,i.useState)(0),Y=(null===m||void 0===m||null===(e=m.metadata)||void 0===e?void 0:e.document_id)||"general",W=Y,{saveManual:J,clearResults:K,getMetrics:Q}=(0,Yn.Ay)(W,{enabled:!!Y&&!!c,studentAnswers:{[x||"general"]:y},aiFeedbacks:{[x||"general"]:$},currentIndex:x?Ra.findIndex((e=>e.id===x)):0,onRehydrate:(0,i.useCallback)((e=>{var r,t;console.log("\ud83d\udd04 [SistemaEvaluacion] Rehidratando datos:",e);const i=null===(r=e.student_answers)||void 0===r?void 0:r[x];i&&j(i);const n=null===(t=e.ai_feedbacks)||void 0===t?void 0:t[x];n&&A(n)}),[x])}),X=(0,i.useCallback)((async()=>{if(c&&x&&!E){k(!0),z(null),j(""),A(null),T([]),N(null),D(0),B("generating"),U(0);try{const e=await async function(e,r){return Vn((()=>e(r)),{maxAttempts:3,baseDelay:1e3,timeoutPerAttempt:3e4},arguments.length>2&&void 0!==arguments[2]?arguments[2]:null)}(Bn,{texto:c,completeAnalysis:m,dimension:x,nivelDificultad:"intermedio",onProgress:e=>{B(e.step),U(e.progress)}},(e=>{"attempt"===e.type&&D(e.attempt)}));if(e.needsPrerequisites)return void N(e);f(e),D(0),B(null),U(0),Nn("Pregunta generada exitosamente. Puedes comenzar a responder.")}catch(e){console.error("\u274c Error generando pregunta:",e),console.error("Error type:",typeof e),console.error("Error message:",null===e||void 0===e?void 0:e.message),console.error("Error stack:",null===e||void 0===e?void 0:e.stack),console.error("Full error object:",JSON.stringify(e,Object.getOwnPropertyNames(e)));const r=en(e);console.log("\u2705 Evaluation error created:",r),console.log("Error type:",r.type),console.log("Error message:",r.message),z(r),r.retryable&&O((()=>X)),B(null),U(0)}finally{k(!1)}}}),[c,m,x,E]),Z=(0,i.useCallback)((async()=>{if(v&&y.trim()&&!w)if(y.trim().length<50){const e=en(new Error("Tu respuesta debe tener al menos 50 caracteres"));z(e)}else if(y.length>2e3){const e=en(new Error("Tu respuesta no debe exceder 2000 caracteres"));z(e)}else{S(!0),z(null),D(0),B("submitting"),U(0);try{const e=await async function(e,r){return Vn((()=>e(r)),{maxAttempts:3,baseDelay:2e3,timeoutPerAttempt:45e3},arguments.length>2&&void 0!==arguments[2]?arguments[2]:null)}(Ln,{texto:c,pregunta:v.pregunta,respuesta:y,dimension:x,onProgress:e=>{B(e.step),U(e.progress)}},(e=>{"attempt"===e.type&&D(e.attempt)}));let r=e;if(G&&G.difficulty){const{adaptFeedbackToDifficulty:i}=t(8114),n=i(e.feedback_estructura+"\n\n"+e.feedback_profundidad,G.difficulty,e.score);r={...e,feedback_combined:n,practiceMode:{difficulty:G.difficulty,level:G.level.label,hintsUsed:q}}}A(r),D(0),B(null),U(0),Nn(`Evaluaci\xf3n completada. Obtuviste ${r.score} puntos sobre 10, nivel ${r.nivel} de 4.`,"assertive");const i=_n[x];i&&p&&p(i,{score:e.score,nivel:e.nivel,artefacto:"Evaluacion",criterios:e.detalles});const n=function(e,r){const t=[],i={comprension_analitica:{icono:"\ud83d\udcda",nombre:"Resumen Acad\xe9mico",seccion:"resumen",descripcion:"Practica identificar las ideas centrales y citar evidencias textuales"},acd:{icono:"\ud83d\udd0d",nombre:"Tabla de An\xe1lisis Cr\xedtico del Discurso",seccion:"tabla-acd",descripcion:"Profundiza en marcos ideol\xf3gicos y estrategias ret\xf3ricas"},contextualizacion:{icono:"\ud83d\uddfa\ufe0f",nombre:"Mapa de Actores y Consecuencias",seccion:"mapa-actores",descripcion:"Sit\xfaa el texto en su contexto socio-hist\xf3rico"},argumentacion:{icono:"\ud83d\udcad",nombre:"Respuesta Argumentativa",seccion:"respuesta-argumentativa",descripcion:"Construye argumentos s\xf3lidos con evidencias y contraargumentos"},metacognicion_etica_ia:{icono:"\ud83e\udd16",nombre:"Bit\xe1cora \xc9tica de IA",seccion:"bitacora-etica",descripcion:"Reflexiona sobre tu uso \xe9tico de herramientas de IA"}};return e.score<6&&i[e.dimension]&&t.push({...i[e.dimension],razon:`Tu puntuaci\xf3n en ${e.dimensionLabel} fue ${e.score}/10. Este artefacto te ayudar\xe1 a fortalecerla.`}),r&&Object.entries(r).forEach((r=>{let[n,a]=r;if(a&&"object"===typeof a&&a.average>0&&a.average<6){const r=Object.keys(_n).find((e=>_n[e]===n));r&&i[r]&&r!==e.dimension&&t.push({...i[r],razon:`Tu promedio en ${i[r].nombre} es ${a.average}/10.`})}})),t.slice(0,2)}(e,h);T(n)}catch(e){console.error("Error evaluando respuesta:",e);const r=en(e);z(r),r.retryable&&O((()=>Z)),B(null),U(0)}finally{S(!1)}}}),[v,y,w,c,x,h,p]),ee=(0,i.useCallback)((e=>{const r=Object.keys(_n).find((r=>_n[r]===e));r&&(b(r),f(null),j(""),A(null),T([]),N(null),z(null),D(0))}),[]),re=(0,i.useCallback)((()=>{f(null),j(""),A(null),T([]),N(null),z(null),D(0)}),[]),te=(0,i.useCallback)((e=>{window.dispatchEvent(new CustomEvent("app-change-tab",{detail:{tabId:e}}))}),[]),ie=(0,i.useCallback)((e=>{H(e),V(0),Nn(`Modo de pr\xe1ctica guiada activado. Nivel: ${e.level.label}`)}),[]),ne=(0,i.useCallback)(((e,r)=>{V((e=>e+1)),Nn(`Hint revelado: ${r}`)}),[]);return c?(0,d.jsxs)(Kn,{role:"main","aria-label":"Sistema de evaluaci\xf3n de literacidad cr\xedtica",id:"main-content",tabIndex:-1,children:[(0,d.jsx)(Pn,{theme:g}),(0,d.jsxs)(Qn,{theme:g,role:"banner",children:[(0,d.jsx)(Xn,{theme:g,as:"h1",children:"\ud83d\udcdd Evaluaci\xf3n Criterial Integral"}),(0,d.jsx)(Zn,{children:"Eval\xfaa tu literacidad cr\xedtica en las 5 dimensiones pedag\xf3gicas con preguntas contextualizadas y feedback dual (DeepSeek + OpenAI)"})]}),(0,d.jsx)("div",{id:"dashboard-rubricas",children:(0,d.jsx)(C,{rubricProgress:h,theme:g,onSelectRubric:ee})}),(0,d.jsx)(Nt,{rubricProgress:h,theme:g}),(0,d.jsx)(Vt,{rubricProgress:h,theme:g}),!v&&!$&&(0,d.jsx)(Mi,{rubricProgress:h,selectedDimension:x,onStartPractice:ie,theme:g}),P&&(0,d.jsx)(Ki,{dimension:P.dimension,faltantes:P.faltantes,onNavigate:te,theme:g}),F&&(0,d.jsx)(hn,{error:F,onRetry:R?()=>R():null,onDismiss:()=>z(null),attempt:M,maxAttempts:3,showDetails:!1,theme:g}),(E||w)&&_&&(0,d.jsx)(In,{mode:E?"generating":"evaluating",currentStep:_,progress:L,theme:g}),!v&&!$&&!P&&(0,d.jsxs)(ea,{theme:g,role:"region","aria-label":"Selecci\xf3n de dimensi\xf3n a evaluar",children:[(0,d.jsx)(ra,{theme:g,children:"\ud83c\udfaf Selecciona la dimensi\xf3n que deseas evaluar"}),(0,d.jsxs)(ta,{theme:g,children:["Solo puedes evaluar ",(0,d.jsx)("strong",{children:"una dimensi\xf3n a la vez"})," para garantizar un an\xe1lisis profundo y contextualizado.",x&&(0,d.jsxs)("span",{style:{display:"block",marginTop:"0.5rem",color:g.success},children:["\u2705 Dimensi\xf3n seleccionada: ",(0,d.jsx)("strong",{children:null===(r=Ra.find((e=>e.id===x)))||void 0===r?void 0:r.nombre})]})]}),(0,d.jsx)(ia,{children:Ra.map((e=>(0,d.jsxs)(na,{$selected:x===e.id,theme:g,onClick:()=>{b(e.id),Nn(`Dimensi\xf3n ${e.nombre} seleccionada`)},role:"button",tabIndex:0,"aria-pressed":x===e.id,"aria-label":`Seleccionar dimensi\xf3n: ${e.nombre}`,onKeyPress:r=>{"Enter"!==r.key&&" "!==r.key||(r.preventDefault(),b(e.id),Nn(`Dimensi\xf3n ${e.nombre} seleccionada`))},children:[(0,d.jsx)(aa,{children:e.icono}),(0,d.jsx)(oa,{children:e.nombre})]},e.id)))}),x&&(0,d.jsx)("div",{style:{marginTop:"1.5rem",textAlign:"center"},children:(0,d.jsx)(pa,{theme:g,onClick:X,disabled:E,children:E?"\u23f3 Generando pregunta...":"\u2728 Generar Pregunta Contextualizada"})})]}),E&&(0,d.jsxs)(Na,{children:[(0,d.jsx)(Ma,{animate:{rotate:360},transition:{duration:2,repeat:1/0,ease:"linear"},children:"\ud83d\udd04"}),(0,d.jsx)(Da,{theme:g,children:"Generando pregunta contextualizada con IA..."})]}),v&&!$&&!E&&(0,d.jsxs)(sa,{theme:g,initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,d.jsxs)(la,{children:[(0,d.jsx)(da,{theme:g,children:v.dimensionLabel}),(0,d.jsxs)("span",{style:{fontSize:"0.85rem",color:g.textMuted},children:["Nivel: ",v.nivelDificultad]})]}),(0,d.jsx)(ca,{theme:g,children:v.pregunta}),G&&G.hints&&G.hints.length>0&&(0,d.jsx)(ti,{hints:G.hints,maxHints:G.level.hintsAvailable,onHintRevealed:ne,theme:g}),(0,d.jsx)(ma,{theme:g,value:y,onChange:e=>j(e.target.value),placeholder:"Escribe tu respuesta aqu\xed... Procura ser espec\xedfico y usar evidencias del texto.",disabled:w,"aria-label":"Tu respuesta a la pregunta de evaluaci\xf3n","aria-required":"true","aria-describedby":"respuesta-hint","aria-invalid":y.length>0&&y.length<50}),(0,d.jsx)("span",{id:"respuesta-hint",style:{position:"absolute",left:"-10000px"},children:"Escribe una respuesta de al menos 50 caracteres para ser evaluada."}),(0,d.jsxs)(ua,{children:[(0,d.jsxs)(xa,{theme:g,children:[y.length," caracteres"]}),(0,d.jsxs)("div",{style:{display:"flex",gap:"1rem"},children:[(0,d.jsx)(ga,{theme:g,onClick:re,disabled:w,children:"\ud83d\udd04 Nueva Pregunta"}),(0,d.jsx)(pa,{theme:g,onClick:Z,disabled:!y.trim()||y.length<50||w,children:w?"\u23f3 Evaluando...":"\u2705 Evaluar con IA Dual"})]})]})]}),(0,d.jsx)(o.N,{children:$&&!w&&(0,d.jsxs)(ba,{theme:g,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},children:[(0,d.jsxs)(va,{children:[(0,d.jsxs)("div",{children:[(0,d.jsx)("h3",{style:{margin:"0 0 0.5rem 0",color:g.text},children:"\ud83d\udcca Evaluaci\xf3n Criterial (IA Dual)"}),(0,d.jsx)(da,{theme:g,children:$.dimensionLabel})]}),(0,d.jsxs)(fa,{children:[(0,d.jsx)("div",{children:(0,d.jsxs)(ya,{$score:$.score,children:[$.score,"/10"]})}),(0,d.jsxs)(ja,{$nivel:$.nivel,children:["Nivel ",$.nivel,"/4"]})]})]}),(0,d.jsxs)(wa,{theme:g,children:[(0,d.jsxs)(Sa,{children:[(0,d.jsx)(Fa,{theme:g,children:"Claridad"}),(0,d.jsxs)(za,{theme:g,children:[$.detalles.claridad,"/4"]})]}),(0,d.jsxs)(Sa,{children:[(0,d.jsx)(Fa,{theme:g,children:"Anclaje"}),(0,d.jsxs)(za,{theme:g,children:[$.detalles.anclaje,"/4"]})]}),(0,d.jsxs)(Sa,{children:[(0,d.jsx)(Fa,{theme:g,children:"Completitud"}),(0,d.jsxs)(za,{theme:g,children:[$.detalles.completitud,"/4"]})]}),(0,d.jsxs)(Sa,{children:[(0,d.jsx)(Fa,{theme:g,children:"Profundidad"}),(0,d.jsxs)(za,{theme:g,children:[$.detalles.profundidad,"/4"]})]}),(0,d.jsxs)(Sa,{children:[(0,d.jsx)(Fa,{theme:g,children:"Comprensi\xf3n"}),(0,d.jsxs)(za,{theme:g,children:[$.detalles.comprension,"/4"]})]}),(0,d.jsxs)(Sa,{children:[(0,d.jsx)(Fa,{theme:g,children:"Originalidad"}),(0,d.jsxs)(za,{theme:g,children:[$.detalles.originalidad,"/4"]})]})]}),(null===(n=$.fortalezas)||void 0===n?void 0:n.length)>0&&(0,d.jsxs)($a,{children:[(0,d.jsx)(Aa,{theme:g,children:"\u2705 Fortalezas"}),(0,d.jsx)(Ea,{children:$.fortalezas.map(((e,r)=>(0,d.jsx)(ka,{theme:g,$icon:"\u2713",children:e},r)))})]}),(null===(a=$.mejoras)||void 0===a?void 0:a.length)>0&&(0,d.jsxs)($a,{children:[(0,d.jsx)(Aa,{theme:g,children:"\ud83d\udca1 Oportunidades de mejora"}),(0,d.jsx)(Ea,{children:$.mejoras.map(((e,r)=>(0,d.jsx)(ka,{theme:g,$icon:"\u2192",children:e},r)))})]}),$.comentarioCritico&&(0,d.jsxs)($a,{children:[(0,d.jsx)(Aa,{theme:g,children:"\ud83d\udcdd Comentario Cr\xedtico"}),(0,d.jsx)("p",{style:{color:g.textSecondary,fontSize:"0.95rem",lineHeight:1.6,margin:0},children:$.comentarioCritico})]}),$.feedback_combined&&$.practiceMode&&(0,d.jsxs)($a,{children:[(0,d.jsxs)(Aa,{theme:g,children:["\ud83c\udfaf Feedback del Modo Pr\xe1ctica (",$.practiceMode.level,")"]}),(0,d.jsx)("p",{style:{color:g.textSecondary,fontSize:"0.95rem",lineHeight:1.6,margin:0,whiteSpace:"pre-wrap"},children:$.feedback_combined}),$.practiceMode.hintsUsed>0&&(0,d.jsxs)("p",{style:{color:g.textMuted,fontSize:"0.85rem",marginTop:"0.75rem"},children:["\ud83d\udca1 Utilizaste ",$.practiceMode.hintsUsed," hint(s) durante esta pr\xe1ctica."]})]}),(0,d.jsx)(ua,{children:(0,d.jsx)(ga,{theme:g,onClick:re,children:"\ud83d\udd04 Nueva Pregunta"})})]})}),I.length>0&&(0,d.jsxs)(Ia,{theme:g,children:[(0,d.jsx)("h4",{style:{margin:"0 0 1rem 0",color:g.text},children:"\ud83d\udca1 Artefactos sugeridos para mejorar"}),I.map(((e,r)=>(0,d.jsxs)(Ta,{theme:g,children:[(0,d.jsxs)(Ca,{theme:g,children:[e.icono," ",e.nombre]}),(0,d.jsx)(Pa,{theme:g,children:e.razon})]},r)))]}),(y||$)&&(0,d.jsxs)("div",{style:{display:"flex",gap:"0.75rem",justifyContent:"center",marginTop:"1rem",flexWrap:"wrap"},children:[(0,d.jsx)(ga,{theme:g,onClick:()=>{J(),alert("\u2705 Progreso guardado manualmente")},style:{fontSize:"0.9rem"},children:"\ud83d\udcbe Guardar Progreso"}),(0,d.jsx)(ga,{theme:g,onClick:()=>{window.confirm("\xbfEst\xe1s seguro de que quieres borrar tu progreso en esta dimensi\xf3n?")&&(K(),j(""),A(null),T([]),alert("\ud83d\uddd1\ufe0f Progreso eliminado"))},style:{fontSize:"0.9rem",opacity:.7},children:"\ud83d\uddd1\ufe0f Limpiar Progreso"})]}),F&&(0,d.jsx)("div",{style:{marginTop:"1rem"},children:(0,d.jsx)(Wn.A,{type:"error",message:F instanceof Error?F.message:F.message||String(F)})}),(0,d.jsx)(Jn.A,{icon:"\ud83d\udcda",title:"Practica con Artefactos Formativos",description:"La evaluaci\xf3n criterial te muestra tu nivel actual. Para mejorar, ve a la pesta\xf1a Actividades y practica con los artefactos pedag\xf3gicos que reciben feedback formativo detallado.",actionLabel:"Ir a Actividades \u2192",onAction:()=>{window.dispatchEvent(new CustomEvent("app-change-tab",{detail:{tabId:"actividades"}}))},theme:g,variant:"primary"})]}):(0,d.jsxs)(Kn,{children:[(0,d.jsxs)(Qn,{children:[(0,d.jsx)(Xn,{children:"\ud83d\udcdd Evaluaci\xf3n Criterial Integral"}),(0,d.jsx)(Zn,{children:"Eval\xfaa tu literacidad cr\xedtica en las 5 dimensiones pedag\xf3gicas"})]}),(0,d.jsx)(Wn.A,{type:"info",message:"Carga un texto para comenzar la evaluaci\xf3n."})]})}},6735:(e,r,t)=>{t.d(r,{HQ:()=>s,x8:()=>o});var i=t(5803),n=t(1382);const a={openai:"gpt-3.5-turbo",deepseek:"deepseek-chat",gemini:"gemini-pro"};async function o(e){let{messages:r,provider:t="deepseek",model:o,apiKey:s,temperature:l=.7,max_tokens:d=800,signal:c,timeoutMs:m=45e3}=e;const u=`${(0,n.wE)()}/api/chat/completion`,h={provider:t,model:o||a[t]||a.openai,messages:r,temperature:l,max_tokens:d,...s?{apiKey:s}:{}},p=await(0,i.u9)(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(h),signal:c},m);if(!p.ok){const e=await p.text().catch((()=>""));throw new Error(e||`HTTP ${p.status}`)}return p.json()}function s(e){var r,t,i;return null!==e&&void 0!==e&&null!==(r=e.choices)&&void 0!==r&&null!==(t=r[0])&&void 0!==t&&null!==(i=t.message)&&void 0!==i&&i.content?e.choices[0].message.content:null!==e&&void 0!==e&&e.content?e.content:null!==e&&void 0!==e&&e.message?e.message:null!==e&&void 0!==e&&e.result?e.result:void 0}},7653:(e,r,t)=>{t.d(r,{A:()=>o});t(9950);var i=t(4752),n=t(1132),a=t(4414);const o=e=>{let{icon:r,title:t,description:i,actionLabel:o,onAction:p,theme:g,variant:x="primary"}=e;const b={primary:{bgGradient:`linear-gradient(135deg, ${g.primary}10, ${g.success}10)`,borderColor:`${g.primary}40`,iconColor:g.primary,buttonBg:g.primary},success:{bgGradient:`linear-gradient(135deg, ${g.success}10, ${g.primary}10)`,borderColor:`${g.success}40`,iconColor:g.success,buttonBg:g.success},warning:{bgGradient:`linear-gradient(135deg, ${g.warning}10, ${g.primary}10)`,borderColor:`${g.warning}40`,iconColor:g.warning,buttonBg:g.warning}},v=b[x]||b.primary;return(0,a.jsxs)(s,{as:n.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.4,ease:"easeOut"},$bgGradient:v.bgGradient,$borderColor:v.borderColor,children:[(0,a.jsxs)(l,{children:[(0,a.jsx)(d,{$iconColor:v.iconColor,children:r}),(0,a.jsxs)(c,{children:[(0,a.jsx)(m,{theme:g,children:t}),(0,a.jsx)(u,{theme:g,children:i})]})]}),p&&o&&(0,a.jsx)(h,{onClick:p,$buttonBg:v.buttonBg,whileHover:{scale:1.02,y:-2},whileTap:{scale:.98},children:o})]})},s=i.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: ${e=>e.$bgGradient};
  border: 2px solid ${e=>e.$borderColor};
  border-radius: 12px;
  margin-top: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  }
`,l=i.Ay.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`,d=i.Ay.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${e=>e.$iconColor}15;
  border-radius: 50%;
  font-size: 1.5rem;
  flex-shrink: 0;
`,c=i.Ay.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,m=i.Ay.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${e=>e.theme.text||e.theme.textPrimary};
`,u=i.Ay.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${e=>e.theme.textSecondary||e.theme.textMuted};
`,h=(0,i.Ay)(n.P.button)`
  align-self: flex-start;
  padding: 0.75rem 1.5rem;
  background: ${e=>e.$buttonBg};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 2px 8px ${e=>e.$buttonBg}40;
  
  &:hover {
    box-shadow: 0 4px 12px ${e=>e.$buttonBg}50;
  }
`},8114:(e,r,t)=>{t.r(r),t.d(r,{DIFFICULTY_LEVELS:()=>i,DIFFICULTY_PROMPTS:()=>n,HINTS_LIBRARY:()=>a,adaptFeedbackToDifficulty:()=>d,calculateProgressionStats:()=>c,default:()=>p,determineDifficultyLevel:()=>o,generateDifficultyAdaptedPrompt:()=>l,generatePracticePlan:()=>h,getHintsForDimension:()=>s,recommendNextPractice:()=>m});const i={EASY:{id:"easy",label:"\ud83d\udfe2 F\xe1cil",description:"Preguntas introductorias con apoyo completo",scoreThreshold:0,hintsAvailable:3,timeGuide:"5-7 minutos",characteristics:["Conceptos b\xe1sicos","Texto guiado paso a paso","M\xfaltiples hints disponibles","Feedback detallado"]},MEDIUM:{id:"medium",label:"\ud83d\udfe1 Intermedio",description:"Preguntas de aplicaci\xf3n con apoyo moderado",scoreThreshold:6,hintsAvailable:2,timeGuide:"8-12 minutos",characteristics:["Aplicaci\xf3n de conceptos","An\xe1lisis m\xe1s profundo","Hints limitados","Feedback enfocado"]},HARD:{id:"hard",label:"\ud83d\udd34 Dif\xedcil",description:"Preguntas de an\xe1lisis cr\xedtico con apoyo m\xednimo",scoreThreshold:8,hintsAvailable:1,timeGuide:"12-20 minutos",characteristics:["Pensamiento cr\xedtico avanzado","An\xe1lisis multidimensional","Hints estrat\xe9gicos \xfanicos","Feedback experto"]}},n={easy:{questionPrefix:"Para empezar de manera sencilla",evaluationFocus:"conceptos b\xe1sicos y comprensi\xf3n inicial",feedbackStyle:"detallado y alentador, enfocado en reforzar lo positivo",scoreAdjustment:.5},medium:{questionPrefix:"Ahora apliquemos estos conceptos",evaluationFocus:"aplicaci\xf3n pr\xe1ctica y conexiones entre ideas",feedbackStyle:"equilibrado entre fortalezas y \xe1reas de mejora",scoreAdjustment:0},hard:{questionPrefix:"Para un an\xe1lisis cr\xedtico avanzado",evaluationFocus:"pensamiento cr\xedtico, argumentaci\xf3n y s\xedntesis",feedbackStyle:"experto y exigente, con expectativas elevadas",scoreAdjustment:-.3}},a={rubrica1:{easy:["\ud83d\udca1 Busca las ideas principales en los primeros p\xe1rrafos del texto","\ud83d\udcdd Identifica las palabras clave que se repiten","\ud83c\udfaf \xbfQu\xe9 informaci\xf3n responde a qui\xe9n, qu\xe9, cu\xe1ndo, d\xf3nde?"],medium:["\ud83d\udca1 Relaciona las ideas principales con los ejemplos espec\xedficos","\ud83c\udfaf Identifica la estructura del texto: \xbfc\xf3mo organiza el autor las ideas?"],hard:["\ud83d\udca1 Analiza c\xf3mo las conexiones impl\xedcitas entre p\xe1rrafos construyen el argumento"]},rubrica2:{easy:["\ud83d\udca1 \xbfQu\xe9 informaci\xf3n NO est\xe1 expl\xedcita pero se puede deducir?","\ud83d\udd0d Busca pistas en el contexto de las palabras","\ud83c\udfaf Piensa: \xbfqu\xe9 supondr\xeda el autor que ya sabemos?"],medium:["\ud83d\udca1 Conecta informaci\xf3n de diferentes partes del texto","\ud83c\udfaf \xbfQu\xe9 consecuencias l\xf3gicas surgen de las premisas presentadas?"],hard:["\ud83d\udca1 Identifica las asunciones culturales o te\xf3ricas subyacentes"]},rubrica3:{easy:["\ud83d\udca1 \xbfEst\xe1s de acuerdo con el autor? \xbfPor qu\xe9 s\xed o por qu\xe9 no?","\ud83e\udd14 \xbfEl autor presenta evidencia para sus afirmaciones?","\ud83c\udfaf Identifica al menos una fortaleza y una debilidad del argumento"],medium:["\ud83d\udca1 Eval\xfaa la calidad de las fuentes y evidencias presentadas","\ud83c\udfaf \xbfQu\xe9 perspectivas alternativas no est\xe1n representadas?"],hard:["\ud83d\udca1 Analiza c\xf3mo los sesgos del autor influyen en la presentaci\xf3n del argumento"]},rubrica4:{easy:["\ud83d\udca1 \xbfEn qu\xe9 \xe9poca o lugar se escribi\xf3 este texto?","\ud83c\udf0d \xbfA qu\xe9 audiencia se dirige el autor?","\ud83c\udfaf \xbfQu\xe9 valores culturales se reflejan en el texto?"],medium:["\ud83d\udca1 \xbfC\xf3mo influye el contexto hist\xf3rico en el mensaje del texto?","\ud83c\udfaf Compara este texto con perspectivas de otras culturas"],hard:["\ud83d\udca1 Analiza las din\xe1micas de poder y hegemon\xeda presentes en el discurso"]},rubrica5:{easy:["\ud83d\udca1 \xbfQu\xe9 estrategias usaste para leer este texto?","\ud83e\udde0 \xbfQu\xe9 partes te resultaron m\xe1s dif\xedciles de entender?","\ud83c\udfaf \xbfQu\xe9 har\xedas diferente en una segunda lectura?"],medium:["\ud83d\udca1 Eval\xfaa tu propio proceso de comprensi\xf3n: \xbfd\xf3nde tuviste dudas?","\ud83c\udfaf \xbfC\xf3mo monitoreaste tu entendimiento mientras le\xedas?"],hard:["\ud83d\udca1 Reflexiona sobre c\xf3mo tus propios sesgos afectan tu interpretaci\xf3n"]}},o=(e,r)=>{const t=e[{1:"rubrica1",2:"rubrica2",3:"rubrica3",4:"rubrica4",5:"rubrica5",comprension_analitica:"rubrica1",acd:"rubrica2",contextualizacion:"rubrica3",argumentacion:"rubrica4",metacognicion_etica_ia:"rubrica5"}[r]||r];if(!t||!t.scores||0===t.scores.length)return i.EASY;const n=t.average||0;return n>=i.HARD.scoreThreshold?i.HARD:n>=i.MEDIUM.scoreThreshold?i.MEDIUM:i.EASY},s=(e,r)=>{const t=a[{1:"rubrica1",2:"rubrica2",3:"rubrica3",4:"rubrica4",5:"rubrica5",comprension_analitica:"rubrica1",acd:"rubrica2",contextualizacion:"rubrica3",argumentacion:"rubrica4",metacognicion_etica_ia:"rubrica5"}[e]||e];return t&&t[r]?t[r]:[]},l=(e,r,t)=>{const a=n[r];return`\n${a.questionPrefix}, responde a la siguiente pregunta sobre ${t}:\n\n${e}\n\nNivel de dificultad: ${i[r.toUpperCase()].label}\nEnf\xf3cate en: ${a.evaluationFocus}\n\nTiempo sugerido: ${i[r.toUpperCase()].timeGuide}\n`.trim()},d=(e,r,t)=>{const a=n[r];let o=`**Nivel ${i[r.toUpperCase()].label}** - ${a.feedbackStyle}\n\n`;return o+=e,"easy"===r&&t>=7?o+="\n\n\ud83c\udfaf **\xa1Excelente!** Est\xe1s listo para intentar el nivel Intermedio.":"medium"===r&&t>=8.5?o+="\n\n\ud83d\ude80 **\xa1Impresionante!** Considera probar el nivel Dif\xedcil para desafiarte m\xe1s.":"hard"===r&&t>=9?o+="\n\n\u2b50 **\xa1Excepcional!** Has demostrado dominio experto en esta dimensi\xf3n.":t<5&&"easy"!==r&&(o+="\n\n\ud83d\udcaa **Sugerencia:** Practica m\xe1s en el nivel anterior para fortalecer los fundamentos."),o},c=e=>{const r={easy:{completed:0,avgScore:0,total:0},medium:{completed:0,avgScore:0,total:0},hard:{completed:0,avgScore:0,total:0}};return e&&"object"===typeof e?(Object.entries(e).forEach((t=>{let[i,n]=t;const a=i.replace("rubrica",""),s=o(e,a).id;n.scores&&n.scores.length>0&&(r[s].completed++,r[s].avgScore+=Number(n.average||0),r[s].total++)})),Object.keys(r).forEach((e=>{r[e].total>0&&(r[e].avgScore=r[e].avgScore/r[e].total)})),r):r},m=e=>{const r=c(e);return 0===r.easy.total?{level:i.EASY,reason:"Comienza con el nivel b\xe1sico para familiarizarte con el sistema",dimensions:[1,2,3,4,5]}:r.easy.avgScore>=7&&r.medium.total<3?{level:i.MEDIUM,reason:"\xa1Buen progreso! Es hora de desafiarte con el nivel intermedio",dimensions:u(e,"medium")}:r.medium.avgScore>=8&&r.hard.total<3?{level:i.HARD,reason:"\xa1Excelente trabajo! Est\xe1s listo para el nivel avanzado",dimensions:u(e,"hard")}:{level:i.MEDIUM,reason:"Contin\xfaa practicando para consolidar tu aprendizaje",dimensions:u(e,"medium")}},u=(e,r)=>{const t=[];for(let i=1;i<=5;i++){const r=e[`rubrica${i}`];r&&r.scores&&r.scores.length>0?t.push({id:i,score:Number(r.average||0)}):t.push({id:i,score:0})}return t.sort(((e,r)=>e.score-r.score)).slice(0,3).map((e=>e.id))},h=e=>{const r=m(e),t=c(e);return{currentLevel:r.level,suggestedDimensions:r.dimensions,reason:r.reason,statistics:t,estimatedTime:`${10*r.dimensions.length}-${15*r.dimensions.length} minutos`,steps:[{step:1,title:"Selecciona una dimensi\xf3n",description:`Te recomendamos: ${r.dimensions.map((e=>`Dimensi\xf3n ${e}`)).join(", ")}`},{step:2,title:"Lee el texto cuidadosamente",description:"T\xf3mate tu tiempo, puedes usar los hints si necesitas ayuda"},{step:3,title:"Responde con profundidad",description:`Para el nivel ${r.level.label}, desarrolla tus ideas completamente`},{step:4,title:"Revisa el feedback",description:"Presta atenci\xf3n a las sugerencias para mejorar"}]}},p={DIFFICULTY_LEVELS:i,DIFFICULTY_PROMPTS:n,HINTS_LIBRARY:a,determineDifficultyLevel:o,getHintsForDimension:s,generateDifficultyAdaptedPrompt:l,adaptFeedbackToDifficulty:d,calculateProgressionStats:c,recommendNextPractice:m,generatePracticePlan:h}}}]);