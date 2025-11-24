"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[305],{2305:(e,r,t)=>{t.r(r),t.d(r,{default:()=>Xr});var a=t(9950),i=t(4752),o=t(3291),s=t(1132),n=t(387),c=t(4414);const l=i.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,d=i.Ay.h3`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,m=i.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`,p=(0,i.Ay)(s.P.div)`
  background: ${e=>e.theme.background};
  border: 2px solid ${e=>{const r=e.$average;return 0===r?e.theme.border:r>=8.6?"#8b5cf6":r>=5.6?e.theme.success:r>=2.6?"#f59e0b":"#ef4444"}};
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px ${e=>{const r=e.$average;return 0===r?"rgba(0,0,0,0.1)":r>=8.6?"rgba(139, 92, 246, 0.3)":r>=5.6?"rgba(16, 185, 129, 0.3)":r>=2.6?"rgba(245, 158, 11, 0.3)":"rgba(239, 68, 68, 0.3)"}};
  }
`,h=i.Ay.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  text-align: center;
`,u=i.Ay.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${e=>e.theme.text};
  text-align: center;
  margin-bottom: 0.75rem;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`,x=i.Ay.div`
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  color: ${e=>{const r=e.$average;return 0===r?e.theme.textMuted:r>=8.6?"#8b5cf6":r>=5.6?"#10b981":r>=2.6?"#f59e0b":"#ef4444"}};
  margin-bottom: 0.25rem;
`,g=i.Ay.div`
  font-size: 0.7rem;
  text-align: center;
  color: ${e=>e.theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,b=i.Ay.div`
  font-size: 0.7rem;
  text-align: center;
  color: ${e=>e.theme.textMuted};
  margin-top: 0.5rem;
  font-style: italic;
`,y=i.Ay.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, ${e=>e.theme.primary}15, ${e=>e.theme.secondary}15);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`,f=i.Ay.span`
  font-weight: 600;
  color: ${e=>e.theme.text};
  font-size: 1rem;
`,v=i.Ay.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${e=>{const r=e.$value;return r>=8.6?"#8b5cf6":r>=5.6?"#10b981":r>=2.6?"#f59e0b":"#ef4444"}};
`,j=i.Ay.div`
  text-align: center;
  padding: 2rem;
  color: ${e=>e.theme.textMuted};
`,$=i.Ay.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`,A=i.Ay.p`
  margin: 0;
  font-size: 0.95rem;
`,w={rubrica1:{nombre:"Comprensi\xf3n Anal\xedtica",icono:"\ud83d\udcda",descripcion:"S\xedntesis con evidencias textuales"},rubrica2:{nombre:"An\xe1lisis Ideol\xf3gico-Discursivo",icono:"\ud83d\udd0d",descripcion:"Marcos ideol\xf3gicos y estrategias ret\xf3ricas"},rubrica3:{nombre:"Contextualizaci\xf3n Socio-Hist\xf3rica",icono:"\ud83d\uddfa\ufe0f",descripcion:"Actores, relaciones de poder y consecuencias"},rubrica4:{nombre:"Argumentaci\xf3n y Contraargumento",icono:"\ud83d\udcad",descripcion:"Tesis, evidencias y refutaci\xf3n dial\xf3gica"},rubrica5:{nombre:"Metacognici\xf3n \xc9tica del Uso de IA",icono:"\ud83e\udd16",descripcion:"Reflexi\xf3n transparente y responsable"}};function k(e){let{theme:r,onSelectRubric:t}=e;const{rubricProgress:i}=(0,a.useContext)(n.BR),{promedioGlobal:o,dimensionesEvaluadas:s}=(0,a.useMemo)((()=>{const e=Object.values(i||{}).filter((e=>e.average>0));if(0===e.length)return{promedioGlobal:0,dimensionesEvaluadas:0};const r=e.reduce(((e,r)=>e+r.average),0);return{promedioGlobal:Math.round(r/e.length*10)/10,dimensionesEvaluadas:e.length}}),[i]);return(0,a.useMemo)((()=>Object.values(i||{}).some((e=>e&&e.scores&&e.scores.length>0))),[i])?(0,c.jsxs)(l,{theme:r,children:[(0,c.jsx)(d,{theme:r,children:"\ud83d\udcca Tu Progreso en las 5 Dimensiones de Literacidad Cr\xedtica"}),(0,c.jsx)(m,{children:Object.entries(w).map((e=>{let[a,o]=e;const s=i[a]||{scores:[],average:0},n=s.scores.length;return(0,c.jsxs)(p,{$average:s.average,theme:r,onClick:()=>null===t||void 0===t?void 0:t(a),initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.1*parseInt(a.replace("rubrica",""))},whileHover:{scale:1.02},whileTap:{scale:.98},children:[(0,c.jsx)(h,{children:o.icono}),(0,c.jsx)(u,{theme:r,children:o.nombre}),(0,c.jsx)(x,{$average:s.average,theme:r,children:s.average>0?`${s.average}/10`:"\u2014"}),(0,c.jsx)(g,{theme:r,children:0===s.average?"Sin evaluar":s.average>=8.6?"Experto":s.average>=5.6?"Competente":s.average>=2.6?"Aprendiz":"Novato"}),n>0&&(0,c.jsxs)(b,{theme:r,children:[n," ",1===n?"intento":"intentos"]})]},a)}))}),o>0&&(0,c.jsxs)(y,{theme:r,children:[(0,c.jsxs)(f,{theme:r,children:["\ud83c\udfaf Promedio Global de Literacidad Cr\xedtica",(0,c.jsxs)("span",{style:{fontSize:"0.85rem",fontWeight:400,marginLeft:"0.5rem",opacity:.8},children:["(",s,"/5 dimensiones)"]})]}),(0,c.jsxs)(v,{$value:o,theme:r,children:[o,"/10"]})]})]}):(0,c.jsxs)(l,{theme:r,children:[(0,c.jsx)(d,{theme:r,children:"\ud83d\udcca Tu Progreso en las 5 Dimensiones de Literacidad Cr\xedtica"}),(0,c.jsxs)(j,{theme:r,children:[(0,c.jsx)($,{children:"\ud83d\udced"}),(0,c.jsxs)(A,{children:["A\xfan no has completado ning\xfan artefacto. Ve a la pesta\xf1a ",(0,c.jsx)("strong",{children:"Actividades"})," para empezar a practicar."]})]})]})}var C=t(7653),z=t(8313);const P=i.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.surface)||"#f8f9fa"}};
  border: 2px solid ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.danger)||"#ef4444"}};
  border-radius: 12px;
  margin: 20px 0;
`,S=i.Ay.div`
  font-size: 64px;
  margin-bottom: 16px;
`,E=i.Ay.h2`
  margin: 0 0 12px 0;
  font-size: 1.5rem;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.danger)||"#ef4444"}};
  font-weight: 700;
`,N=i.Ay.p`
  margin: 0 0 24px 0;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.textSecondary)||"#666"}};
  font-size: 1rem;
  line-height: 1.6;
  max-width: 500px;
`,R=(i.Ay.details`
  margin-top: 16px;
  padding: 12px 16px;
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.background)||"#fff"}};
  border: 1px solid ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.border)||"#e0e0e0"}};
  border-radius: 8px;
  max-width: 600px;
  width: 100%;
  font-size: 0.85rem;
  color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.textSecondary)||"#666"}};
  text-align: left;
  
  summary {
    cursor: pointer;
    font-weight: 600;
    user-select: none;
    
    &:hover {
      color: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.primary)||"#2196F3"}};
    }
  }
  
  pre {
    margin-top: 8px;
    padding: 8px;
    background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.surface)||"#f5f5f5"}};
    border-radius: 4px;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    line-height: 1.4;
  }
`,i.Ay.button`
  padding: 12px 24px;
  background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.primary)||"#2196F3"}};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>{var r;return(null===(r=e.theme)||void 0===r?void 0:r.primaryDark)||"#1976D2"}};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`);class F extends a.Component{constructor(e){super(e),this.handleReset=()=>{this.setState({hasError:!1,error:null,errorInfo:null}),this.props.onReset&&this.props.onReset()},this.state={hasError:!1,error:null,errorInfo:null}}static getDerivedStateFromError(e){return{hasError:!0}}componentDidCatch(e,r){console.error("\ud83d\udd34 ErrorBoundary captur\xf3 un error:",e),console.error("\ud83d\udccd Component stack:",r.componentStack),this.setState({error:e,errorInfo:r}),this.props.onError&&this.props.onError(e,r)}render(){if(this.state.hasError){if(this.props.fallback)return this.props.fallback;const{error:e,errorInfo:r}=this.state,t=this.props.theme||{};return(0,c.jsxs)(P,{theme:t,children:[(0,c.jsx)(S,{children:"\u26a0\ufe0f"}),(0,c.jsx)(E,{theme:t,children:"Algo sali\xf3 mal"}),(0,c.jsxs)(N,{theme:t,children:["Este componente encontr\xf3 un error inesperado.",this.props.componentName&&` El problema ocurri\xf3 en: ${this.props.componentName}.`," ","Puedes intentar recargar o continuar con otras actividades."]}),(0,c.jsx)(R,{theme:t,onClick:this.handleReset,children:"\ud83d\udd04 Intentar de nuevo"}),!1]})}return this.props.children}}const M=F,I=i.Ay.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: ${e=>e.$compact?"0.15rem 0.4rem":"0.25rem 0.6rem"};
  background: ${e=>e.theme.warning}15 || '#fff3cd';
  color: ${e=>e.theme.warning||"#f59e0b"};
  border-radius: 12px;
  font-size: ${e=>e.$compact?"0.7rem":"0.75rem"};
  font-weight: 600;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 0.65rem;
    padding: 0.15rem 0.35rem;
  }
`,B=e=>{let{minutes:r,theme:t,compact:a=!1}=e;return r?(0,c.jsxs)(I,{theme:t,$compact:a,title:`Tiempo estimado: ${r} minutos`,children:["\u23f1\ufe0f ",a?`${r}m`:`~${r} min`]}):null},D=i.Ay.div`
  max-width: 800px;
  margin: 0 auto;
`,L=i.Ay.div`
  background: linear-gradient(135deg, #3190FC 0%, #1E40AF 100%);
  border-radius: 12px;
  padding: 2rem;
  color: white;
  text-align: center;
  margin-bottom: 2rem;
`,T=i.Ay.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`,q=i.Ay.p`
  margin: 0;
  font-size: 1rem;
  opacity: 0.95;
`,H=i.Ay.div`
  background: ${e=>e.theme.surface};
  border-radius: 8px;
  height: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid ${e=>e.theme.border};
`,O=(0,i.Ay)(s.P.div)`
  background: linear-gradient(90deg, #3190FC 0%, #10b981 100%);
  height: 100%;
  border-radius: 8px;
`,_=(0,i.Ay)(s.P.div)`
  background: ${e=>e.theme.cardBg};
  border: 2px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
`,G=i.Ay.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`,Y=i.Ay.div`
  background: ${e=>e.theme.primary};
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
`,U=i.Ay.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${e=>e.$color||"#gray"}20;
  color: ${e=>e.$color||"#666"};
  border: 1px solid ${e=>e.$color||"#gray"};
`,V=i.Ay.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${e=>e.theme.textPrimary};
  line-height: 1.6;
`,Q=i.Ay.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`,J=(0,i.Ay)(s.P.button)`
  background: ${e=>e.$answered?e.$isCorrect?"#10b98120":e.$selected&&!e.$isCorrect?"#f4433620":e.theme.surface:e.$selected?e.theme.primary+"20":e.theme.surface};
  border: 2px solid ${e=>e.$answered?e.$isCorrect?"#10b981":e.$selected&&!e.$isCorrect?"#f44336":e.theme.border:e.$selected?e.theme.primary:e.theme.border};
  border-radius: 8px;
  padding: 1rem 1.25rem;
  text-align: left;
  cursor: ${e=>e.$answered?"default":"pointer"};
  transition: all 0.2s ease;
  color: ${e=>e.theme.textPrimary};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  &:hover {
    ${e=>!e.$answered&&`\n      border-color: ${e.theme.primary};\n      transform: translateX(4px);\n    `}
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`,W=i.Ay.span`
  background: ${e=>e.$answered&&e.$isCorrect?"#10b981":e.$answered&&e.$selected&&!e.$isCorrect?"#f44336":e.theme.primary};
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
`,X=(0,i.Ay)(s.P.div)`
  background: ${e=>e.$correct?"#10b98110":"#ff980810"};
  border: 2px solid ${e=>e.$correct?"#10b981":"#ff9808"};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`,K=i.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: ${e=>e.$correct?"#10b981":"#ff9808"};
`,Z=i.Ay.p`
  margin: 0;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.6;
`,ee=i.Ay.button`
  background: ${e=>"primary"===e.$variant?e.theme.primary:"transparent"};
  color: ${e=>"primary"===e.$variant?"white":e.theme.primary};
  border: 2px solid ${e=>e.theme.primary};
  border-radius: 8px;
  padding: 0.75rem 2rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${e=>"primary"===e.$variant?e.theme.primaryHover:e.theme.primary+"10"};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,re=i.Ay.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`,te=(0,i.Ay)(s.P.div)`
  background: ${e=>e.theme.cardBg};
  border: 2px solid ${e=>e.$passed?"#10b981":"#ff9808"};
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
`,ae=i.Ay.h3`
  margin: 0 0 1rem 0;
  font-size: 2rem;
  color: ${e=>e.$passed?"#10b981":"#ff9808"};
`,ie=i.Ay.div`
  font-size: 3rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary};
  margin: 1rem 0;
`,oe=i.Ay.p`
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.6;
`,se=e=>{let{questions:r=[],onComplete:t,theme:i}=e;const[s,n]=(0,a.useState)(0),[l,d]=(0,a.useState)({}),[m,p]=(0,a.useState)({}),[h,u]=(0,a.useState)(!1),x=r[s],g=m[s],b=l[s],y=(0,a.useCallback)((e=>{g||d((r=>({...r,[s]:e})))}),[s,g]),f=(0,a.useCallback)((()=>{p((e=>({...e,[s]:!0})))}),[s]),v=(0,a.useCallback)((()=>{s<r.length-1?n((e=>e+1)):u(!0)}),[s,r.length]),j=(0,a.useCallback)((()=>{s>0&&n((e=>e-1))}),[s]),$=(0,a.useCallback)((()=>{d({}),p({}),u(!1),n(0)}),[]),A=(0,a.useMemo)((()=>{const e=r.length,t=r.filter(((e,r)=>l[r]===e.respuesta_correcta)).length,a=e>0?Math.round(t/e*100):0;return{total:e,correct:t,percentage:a,passed:a>=60}}),[r,l]);return r&&0!==r.length?h?(0,c.jsx)(D,{children:(0,c.jsxs)(te,{initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},$passed:A.passed,theme:i,children:[(0,c.jsx)(ae,{$passed:A.passed,children:A.passed?"\ud83c\udf89 \xa1Excelente trabajo!":"\ud83d\udcda Sigue practicando"}),(0,c.jsxs)(ie,{theme:i,children:[A.correct,"/",A.total]}),(0,c.jsxs)(oe,{theme:i,children:["Obtuviste ",A.percentage,"% de respuestas correctas"]}),A.passed?(0,c.jsxs)(Z,{theme:i,children:["\u2705 Has demostrado comprensi\xf3n b\xe1sica del texto. ",(0,c.jsx)("br",{}),(0,c.jsx)("strong",{children:"Ahora puedes continuar con las preguntas de s\xedntesis."})]}):(0,c.jsxs)(Z,{theme:i,children:["\u26a0\ufe0f Necesitas al menos 60% para continuar. ",(0,c.jsx)("br",{}),"Te recomendamos revisar el texto nuevamente."]}),(0,c.jsxs)(re,{style:{justifyContent:"center",marginTop:"2rem"},children:[(0,c.jsx)(ee,{$variant:"outline",onClick:$,theme:i,children:"\ud83d\udd04 Reintentar"}),A.passed&&(0,c.jsx)(ee,{$variant:"primary",onClick:()=>t&&t(A),theme:i,children:"Continuar \u2192"})]})]})}):(0,c.jsxs)(D,{children:[(0,c.jsxs)(L,{children:[(0,c.jsx)(T,{children:"\ud83d\udccb Autoevaluaci\xf3n R\xe1pida"}),(0,c.jsxs)(q,{children:["Responde ",r.length," preguntas para validar tu comprensi\xf3n del texto"]})]}),(0,c.jsx)(H,{theme:i,children:(0,c.jsx)(O,{initial:{width:0},animate:{width:(s+1)/r.length*100+"%"},transition:{duration:.3}})}),(0,c.jsx)(o.N,{mode:"wait",children:(0,c.jsxs)(_,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},transition:{duration:.3},theme:i,children:[(0,c.jsxs)(G,{children:[(0,c.jsx)(Y,{theme:i,children:s+1}),(0,c.jsx)(U,{$color:(w=x.nivel,1===w?"#3190FC":2===w?"#ff9808":"#9c27b0"),children:(e=>1===e?"\ud83d\udcd6 Comprensi\xf3n":2===e?"\ud83d\udd0d An\xe1lisis":"\u2696\ufe0f Evaluaci\xf3n")(x.nivel)})]}),(0,c.jsx)(V,{theme:i,children:x.pregunta}),(0,c.jsx)(Q,{children:x.opciones.map(((e,r)=>{const t=r===x.respuesta_correcta,a=b===r;return(0,c.jsxs)(J,{onClick:()=>y(r),$selected:a,$answered:g,$isCorrect:t,disabled:g,theme:i,whileHover:g?{}:{scale:1.02},whileTap:g?{}:{scale:.98},children:[(0,c.jsx)(W,{$selected:a,$answered:g,$isCorrect:t,theme:i,children:String.fromCharCode(65+r)}),e]},r)}))}),g&&(0,c.jsxs)(X,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},$correct:b===x.respuesta_correcta,children:[(0,c.jsx)(K,{$correct:b===x.respuesta_correcta,children:b===x.respuesta_correcta?(0,c.jsx)(c.Fragment,{children:"\u2705 \xa1Correcto!"}):(0,c.jsx)(c.Fragment,{children:"\u274c Incorrecto"})}),(0,c.jsx)(Z,{theme:i,children:x.explicacion})]}),(0,c.jsxs)(re,{children:[s>0&&(0,c.jsx)(ee,{$variant:"outline",onClick:j,theme:i,children:"\u2190 Anterior"}),g?(0,c.jsx)(ee,{$variant:"primary",onClick:v,theme:i,children:s<r.length-1?"Siguiente \u2192":"Ver resultados"}):(0,c.jsx)(ee,{$variant:"primary",onClick:f,disabled:void 0===b,theme:i,children:"Confirmar respuesta"})]})]},s)})]}):(0,c.jsx)(D,{children:(0,c.jsxs)(_,{children:[(0,c.jsx)(V,{children:"No hay preguntas disponibles"}),(0,c.jsx)(Z,{theme:i,children:"Las preguntas se generar\xe1n autom\xe1ticamente cuando se complete el an\xe1lisis del texto."})]})});var w},ne=a.memo(se),ce=i.Ay.div`
  max-width: 800px;
  margin: 0 auto;
`,le=i.Ay.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  padding: 2rem;
  color: white;
  text-align: center;
  margin-bottom: 2rem;
`,de=i.Ay.h2`
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`,me=i.Ay.p`
  margin: 0;
  font-size: 1rem;
  opacity: 0.95;
  line-height: 1.5;
`,pe=i.Ay.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
`,he=i.Ay.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${e=>e.$active?e.theme.primary:e.theme.border};
  transition: all 0.3s ease;
`,ue=(0,i.Ay)(s.P.div)`
  background: ${e=>e.theme.cardBg};
  border: 2px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
`,xe=i.Ay.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
`,ge=i.Ay.div`
  font-size: 2rem;
  flex-shrink: 0;
`,be=i.Ay.div`
  flex: 1;
`,ye=i.Ay.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary};
`,fe=i.Ay.p`
  margin: 0 0 0.75rem 0;
  font-size: 1.05rem;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.6;
`,ve=i.Ay.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${e=>e.theme.textTertiary};
  background: ${e=>e.theme.surface};
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border-left: 3px solid ${e=>e.theme.primary};
`,je=i.Ay.div`
  position: relative;
  margin-bottom: 1rem;
`,$e=i.Ay.textarea`
  width: 100%;
  min-height: 180px;
  padding: 1rem;
  border: 2px solid ${e=>e.$hasError?"#f44336":e.theme.border};
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  color: ${e=>e.theme.textPrimary};
  background: ${e=>e.theme.surface};
  resize: vertical;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${e=>e.$hasError?"#f44336":e.theme.primary};
  }
  
  &::placeholder {
    color: ${e=>e.theme.textTertiary};
  }
`,Ae=i.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
`,we=i.Ay.span`
  color: ${e=>e.$count<e.$min?"#ff9808":e.$count>e.$max?"#f44336":"#10b981"};
  font-weight: 600;
`,ke=i.Ay.span`
  color: ${e=>e.theme.textTertiary};
  font-size: 0.85rem;
`,Ce=(0,i.Ay)(s.P.div)`
  background: ${e=>"error"===e.$type?"#f4433620":"#ff980820"};
  border: 1px solid ${e=>"error"===e.$type?"#f44336":"#ff9808"};
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  color: ${e=>"error"===e.$type?"#f44336":"#ff9808"};
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,ze=i.Ay.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`,Pe=i.Ay.button`
  background: ${e=>"primary"===e.$variant?e.theme.primary:"transparent"};
  color: ${e=>"primary"===e.$variant?"white":e.theme.primary};
  border: 2px solid ${e=>e.theme.primary};
  border-radius: 8px;
  padding: 0.75rem 2rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${e=>"primary"===e.$variant?e.theme.primaryHover:e.theme.primary+"10"};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,Se=(0,i.Ay)(s.P.div)`
  background: ${e=>e.theme.cardBg};
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
`,Ee=i.Ay.h3`
  margin: 0 0 1rem 0;
  font-size: 2rem;
  color: #10b981;
`,Ne=i.Ay.p`
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.6;
`,Re=e=>{let{questions:r=[],onComplete:t,theme:i}=e;const[s,n]=(0,a.useState)(0),[l,d]=(0,a.useState)({}),[m,p]=(0,a.useState)(!1),h=r[s],u=l[s]||"",x=(0,a.useMemo)((()=>u.trim().split(/\s+/).filter(Boolean).length),[u]),g=(0,a.useMemo)((()=>u.trim()?x<50?{valid:!1,message:"\u26a0\ufe0f La respuesta es muy corta. Desarrolla m\xe1s tus ideas.",type:"warning"}:x>200?{valid:!1,message:"\u274c La respuesta excede el l\xedmite. S\xe9 m\xe1s conciso.",type:"error"}:{valid:!0,message:"",type:""}:{valid:!1,message:"\u26a0\ufe0f Por favor escribe una respuesta",type:"warning"}),[u,x]),b=(0,a.useCallback)((e=>{d((r=>({...r,[s]:e.target.value})))}),[s]),y=(0,a.useCallback)((()=>{g.valid&&(s<r.length-1?n((e=>e+1)):p(!0))}),[s,r.length,g.valid]),f=(0,a.useCallback)((()=>{s>0&&n((e=>e-1))}),[s]),v=(0,a.useCallback)((()=>{t&&t({answers:l,totalQuestions:r.length})}),[l,r.length,t]);if(!r||0===r.length)return(0,c.jsx)(ce,{children:(0,c.jsx)(ue,{theme:i,children:(0,c.jsx)(fe,{theme:i,children:"No hay preguntas de s\xedntesis disponibles"})})});if(m)return(0,c.jsx)(ce,{children:(0,c.jsxs)(Se,{initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},theme:i,children:[(0,c.jsx)(Ee,{children:"\u2705 \xa1Preparaci\xf3n completada!"}),(0,c.jsxs)(Ne,{theme:i,children:["Has respondido las preguntas de s\xedntesis. ",(0,c.jsx)("br",{}),(0,c.jsx)("strong",{children:"Ahora est\xe1s listo para crear tus artefactos acad\xe9micos formales."})]}),(0,c.jsx)(Pe,{$variant:"primary",onClick:v,theme:i,children:"Ir a Artefactos \u2192"})]})});return(0,c.jsxs)(ce,{children:[(0,c.jsxs)(le,{children:[(0,c.jsx)(de,{children:"\ud83d\udcad Preguntas de S\xedntesis"}),(0,c.jsx)(me,{children:"Reflexiona sobre el texto en 100-150 palabras por pregunta"})]}),(0,c.jsx)(pe,{children:r.map(((e,r)=>(0,c.jsx)(he,{$active:r===s,theme:i},r)))}),(0,c.jsx)(o.N,{mode:"wait",children:(0,c.jsxs)(ue,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},transition:{duration:.3},theme:i,children:[(0,c.jsxs)(xe,{children:[(0,c.jsx)(ge,{children:(j=h.tipo,"sintesis_principal"===j?"\ud83d\udcdd":"conexion_personal"===j?"\ud83d\udcad":"\u2753")}),(0,c.jsxs)(be,{children:[(0,c.jsx)(ye,{theme:i,children:(e=>"sintesis_principal"===e?"S\xedntesis Principal":"conexion_personal"===e?"Conexi\xf3n Personal":"Reflexi\xf3n")(h.tipo)}),(0,c.jsx)(fe,{theme:i,children:h.pregunta}),(0,c.jsxs)(ve,{theme:i,children:["\ud83d\udca1 ",h.guia]})]})]}),(0,c.jsxs)(je,{children:[(0,c.jsx)($e,{value:u,onChange:b,placeholder:"Escribe tu respuesta aqu\xed...",theme:i,$hasError:!g.valid&&x>0}),(0,c.jsxs)(Ae,{children:[(0,c.jsxs)(we,{$count:x,$min:50,$max:200,children:[x," palabras"]}),(0,c.jsxs)(ke,{theme:i,children:["Objetivo: ",h.palabras_objetivo||150," palabras"]})]})]}),!g.valid&&u.trim()&&(0,c.jsx)(Ce,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},$type:g.type,children:g.message}),(0,c.jsxs)(ze,{children:[s>0&&(0,c.jsx)(Pe,{$variant:"outline",onClick:f,theme:i,children:"\u2190 Anterior"}),(0,c.jsx)(Pe,{$variant:"primary",onClick:y,disabled:!g.valid,theme:i,children:s<r.length-1?"Siguiente \u2192":"Finalizar"})]})]},s)})]});var j},Fe=a.memo(Re),Me=i.Ay.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
`,Ie=i.Ay.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid ${e=>e.theme.border};
  padding-bottom: 0.5rem;
`,Be=i.Ay.button`
  padding: 0.75rem 1.5rem;
  background: ${e=>e.$active?e.theme.primary:"transparent"};
  color: ${e=>e.$active?"white":e.theme.textPrimary};
  border: none;
  border-bottom: 3px solid ${e=>e.$active?e.theme.primary:"transparent"};
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: ${e=>e.$locked?.4:1};
  cursor: ${e=>e.$locked?"not-allowed":"pointer"};
  
  &:hover:not(:disabled) {
    background: ${e=>e.$active?e.theme.primary:e.theme.surface};
  }
  
  &:disabled {
    cursor: not-allowed;
  }
`,De=i.Ay.span`
  font-size: 0.9rem;
`,Le=i.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`,Te=i.Ay.div`
  font-size: 64px;
  margin-bottom: 16px;
`,qe=i.Ay.h2`
  font-size: 28px;
  margin-bottom: 8px;
  color: ${e=>e.theme.textPrimary};
`,He=i.Ay.p`
  font-size: 16px;
  color: ${e=>e.theme.textSecondary};
  max-width: 500px;
  line-height: 1.6;
`,Oe=(0,i.Ay)(s.P.div)`
  background: ${e=>e.theme.surface};
  border: 2px solid ${e=>e.theme.primary};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`,_e=i.Ay.div`
  font-size: 1.5rem;
  flex-shrink: 0;
`,Ge=i.Ay.div`
  flex: 1;
`,Ye=i.Ay.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary};
`,Ue=i.Ay.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.5;
`,Ve=(0,i.Ay)(s.P.div)`
  background: linear-gradient(135deg, #10b98115, #3b82f615);
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  margin: 2rem 0;
`,Qe=i.Ay.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`,Je=i.Ay.h2`
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary};
`,We=i.Ay.p`
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.6;
`,Xe=i.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
`,Ke=i.Ay.div`
  background: ${e=>e.theme.cardBg||"#ffffff"};
  border: 1px solid ${e=>e.theme.border||"#e0e0e0"};
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`,Ze=i.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted||"#666"};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,er=i.Ay.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${e=>e.$success?"#10b981":e.theme.textPrimary};
`,rr=(i.Ay.button`
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`,e=>{var r,t,i;let{theme:l}=e;const{texto:d,completeAnalysis:m,setError:p,activitiesProgress:h,markPreparationProgress:u}=(0,a.useContext)(n.BR),[x,g]=(0,a.useState)("mcq"),b=(null===m||void 0===m||null===(r=m.metadata)||void 0===r?void 0:r.document_id)||null,y=(null===m||void 0===m||null===(t=m.critical)||void 0===t?void 0:t.mcqQuestions)||[],f=(null===m||void 0===m||null===(i=m.critical)||void 0===i?void 0:i.synthesisQuestions)||[],v=(0,a.useMemo)((()=>{var e;return(null===h||void 0===h||null===(e=h[b])||void 0===e?void 0:e.preparation)||{}}),[h,b]),[j,$]=(0,a.useState)(!1),[A,w]=(0,a.useState)(null),[k,C]=(0,a.useState)(!1),[z,P]=(0,a.useState)(null);(0,a.useEffect)((()=>{b&&v?(console.log("\ud83d\udd04 [PreguntasPersonalizadas] Sincronizando con contexto:",v),$(v.mcqPassed||!1),w(v.mcqResults||null),C(v.completed||!1),P(v.synthesisAnswers||null),v.completed&&console.log("\u2705 [PreguntasPersonalizadas] Preparaci\xf3n COMPLETADA restaurada desde contexto")):($(!1),w(null),C(!1),P(null),console.log("\ud83c\udd95 [PreguntasPersonalizadas] Nueva preparaci\xf3n inicializada"))}),[b,v]);const S=(0,a.useCallback)((e=>{console.log("\u2705 [EjerciciosGuiados] MCQ completado:",e),w(e),$(e.passed),b&&u&&(u(b,{mcqPassed:e.passed,mcqResults:e}),console.log("\ud83d\udcbe [PreguntasPersonalizadas] Resultados MCQ guardados en contexto")),e.passed&&g("synthesis")}),[b,u]),E=(0,a.useCallback)((e=>{console.log("\u2705 [EjerciciosGuiados] S\xedntesis completada, desbloqueando artefactos..."),P(e),C(!0),b&&u&&(u(b,{completed:!0,mcqPassed:(null===A||void 0===A?void 0:A.passed)||!1,mcqResults:A,synthesisAnswers:e}),console.log("\ud83d\udcbe [PreguntasPersonalizadas] Preparaci\xf3n y respuestas guardadas en contexto")),window.dispatchEvent(new CustomEvent("exercises-completed",{detail:{mcqResults:A,synthesisAnswers:e}}))}),[b,u,A]);if(!d)return(0,c.jsx)(Me,{children:(0,c.jsxs)(Le,{children:[(0,c.jsx)(Te,{children:"\ud83d\udcda"}),(0,c.jsx)(qe,{theme:l,children:"No hay texto cargado"}),(0,c.jsxs)(He,{theme:l,children:["Para comenzar la preparaci\xf3n, primero necesitas cargar un texto.",(0,c.jsx)("br",{}),(0,c.jsx)("br",{}),(0,c.jsx)("strong",{children:'Ve a la pesta\xf1a "Lectura Guiada"'})," y carga un texto para comenzar."]})]})});if(!m||!m.critical)return(0,c.jsx)(Me,{children:(0,c.jsxs)(Le,{children:[(0,c.jsx)(Te,{children:"\u23f3"}),(0,c.jsx)(qe,{theme:l,children:"An\xe1lisis en proceso..."}),(0,c.jsxs)(He,{theme:l,children:["El an\xe1lisis del texto est\xe1 en curso. La preparaci\xf3n se habilitar\xe1 autom\xe1ticamente cuando termine.",(0,c.jsx)("br",{}),(0,c.jsx)("br",{}),(0,c.jsx)("strong",{children:"Tiempo estimado:"})," 30-60 segundos"]})]})});if(0===y.length||0===f.length)return(0,c.jsx)(Me,{children:(0,c.jsxs)(Le,{children:[(0,c.jsx)(Te,{children:"\u26a0\ufe0f"}),(0,c.jsx)(qe,{theme:l,children:"No se generaron preguntas de preparaci\xf3n"}),(0,c.jsxs)(He,{theme:l,children:["El an\xe1lisis se complet\xf3 pero no se generaron las preguntas de preparaci\xf3n.",(0,c.jsx)("br",{}),(0,c.jsx)("br",{}),(0,c.jsx)("strong",{children:"Esto puede suceder si:"}),(0,c.jsx)("br",{}),"\u2022 El texto es muy corto",(0,c.jsx)("br",{}),"\u2022 Hubo un error en la generaci\xf3n",(0,c.jsx)("br",{}),(0,c.jsx)("br",{}),(0,c.jsx)("strong",{children:"Soluci\xf3n:"})," Recarga el texto para forzar un nuevo an\xe1lisis."]})]})});if(k){const e=A?`${A.correct}/${A.total}`:"N/A",r=A?Math.round(A.correct/A.total*100):0;return(0,c.jsx)(Me,{children:(0,c.jsxs)(Ve,{initial:{opacity:0,scale:.95},animate:{opacity:1,scale:1},theme:l,children:[(0,c.jsx)(Qe,{children:"\ud83c\udf93"}),(0,c.jsx)(Je,{theme:l,children:"\xa1Preparaci\xf3n Completada Exitosamente!"}),(0,c.jsx)(We,{theme:l,children:"Has demostrado comprensi\xf3n del texto y completado las reflexiones de s\xedntesis. Los 5 artefactos acad\xe9micos ya est\xe1n desbloqueados para que puedas crear y recibir evaluaci\xf3n formativa."}),(0,c.jsxs)(Xe,{children:[(0,c.jsxs)(Ke,{theme:l,children:[(0,c.jsx)(Ze,{theme:l,children:"Autoevaluaci\xf3n MCQ"}),(0,c.jsx)(er,{$success:r>=70,theme:l,children:e}),(0,c.jsxs)("div",{style:{fontSize:"0.85rem",color:r>=70?"#10b981":"#f59e0b",marginTop:"0.5rem"},children:[r,"% ",r>=70?"\u2705 Aprobado":"\u26a0\ufe0f Aprobado"]})]}),(0,c.jsxs)(Ke,{theme:l,children:[(0,c.jsx)(Ze,{theme:l,children:"Preguntas de S\xedntesis"}),(0,c.jsx)(er,{$success:!0,theme:l,children:"2/2"}),(0,c.jsx)("div",{style:{fontSize:"0.85rem",color:"#10b981",marginTop:"0.5rem"},children:"\u2705 Completadas"})]})]}),(0,c.jsxs)(We,{theme:l,style:{marginTop:"1.5rem",fontSize:"0.95rem"},children:["\ud83d\udca1 ",(0,c.jsx)("strong",{children:"Siguiente paso:"})," Ve a las pesta\xf1as de artefactos (Resumen Acad\xe9mico, An\xe1lisis del Discurso, etc.) para crear tus trabajos y recibir evaluaci\xf3n criterial con feedback dual de IA."]}),(0,c.jsx)("div",{style:{marginTop:"1.5rem",padding:"1rem",background:"#3b82f615",borderRadius:"8px"},children:(0,c.jsxs)("div",{style:{fontSize:"0.9rem",color:l.textSecondary},children:["\ud83d\udd12 ",(0,c.jsx)("strong",{children:"Nota:"})," La preparaci\xf3n es un checkpoint \xfanico. Una vez completada, no necesitas volver a hacerla. Enf\xf3cate ahora en crear y mejorar tus artefactos acad\xe9micos."]})})]})})}return(0,c.jsxs)(Me,{children:[!k&&(0,c.jsxs)(Oe,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},theme:l,children:[(0,c.jsx)(_e,{children:"\ud83d\udca1"}),(0,c.jsxs)(Ge,{children:[(0,c.jsx)(Ye,{theme:l,children:"Preparaci\xf3n Obligatoria"}),(0,c.jsxs)(Ue,{theme:l,children:["Completa esta preparaci\xf3n para desbloquear los artefactos acad\xe9micos formales.",(0,c.jsx)("strong",{children:" Paso 1:"})," Autoevaluaci\xf3n r\xe1pida (5 MCQ) \xb7",(0,c.jsx)("strong",{children:" Paso 2:"})," Preguntas de s\xedntesis (2 reflexiones) \xb7",(0,c.jsx)("strong",{children:" Resultado:"})," Acceso a los 5 artefactos evaluados"]})]})]}),(0,c.jsxs)(Ie,{theme:l,children:[(0,c.jsxs)(Be,{$active:"mcq"===x,onClick:()=>g("mcq"),theme:l,children:["\ud83d\udccb Autoevaluaci\xf3n R\xe1pida",j&&" \u2705"]}),(0,c.jsxs)(Be,{$active:"synthesis"===x,$locked:!j,onClick:()=>j&&g("synthesis"),disabled:!j,theme:l,children:["\ud83d\udcad Preguntas de S\xedntesis",!j&&(0,c.jsx)(De,{children:"\ud83d\udd12"}),k&&" \u2705"]})]}),(0,c.jsxs)(o.N,{mode:"wait",children:["mcq"===x&&(0,c.jsx)(s.P.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},exit:{opacity:0,x:20},transition:{duration:.3},children:(0,c.jsx)(ne,{questions:y,onComplete:S,theme:l})},"mcq"),"synthesis"===x&&j&&(0,c.jsx)(s.P.div,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},exit:{opacity:0,x:20},transition:{duration:.3},children:(0,c.jsx)(Fe,{questions:f,onComplete:E,theme:l})},"synthesis")]}),k&&(0,c.jsxs)(Oe,{initial:{opacity:0,scale:.95},animate:{opacity:1,scale:1},theme:l,style:{marginTop:"2rem",borderColor:"#10b981",background:"#10b98110"},children:[(0,c.jsx)(_e,{children:"\ud83c\udf89"}),(0,c.jsxs)(Ge,{children:[(0,c.jsx)(Ye,{theme:l,children:"\u2705 \xa1Preparaci\xf3n completada exitosamente!"}),(0,c.jsxs)(Ue,{theme:l,children:["Has demostrado comprensi\xf3n b\xe1sica del texto y completado las reflexiones de s\xedntesis. Los artefactos acad\xe9micos ya est\xe1n desbloqueados.",(0,c.jsx)("br",{}),(0,c.jsx)("br",{}),(0,c.jsx)("strong",{children:"Siguiente paso:"})," Navega a las otras pesta\xf1as (Resumen Acad\xe9mico, An\xe1lisis del Discurso, Mapa de Actores, etc.) para crear tus producciones formales con evaluaci\xf3n criterial."]})]})]})]})}),tr=a.memo(rr),ar=i.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`,ir=i.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  h3 {
    margin: 0;
    font-size: 1.3rem;
    color: ${e=>e.theme.textPrimary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`,or=i.Ay.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${e=>e.theme.primary}10;
  border: 1px solid ${e=>e.theme.primary}30;
  border-radius: 8px;
  
  .icon {
    font-size: 2.5rem;
  }
  
  .info {
    flex: 1;
  }
  
  .label {
    font-size: 0.85rem;
    color: ${e=>e.theme.textSecondary};
    font-weight: 500;
    margin-bottom: 0.3rem;
  }
  
  .progress-bar {
    height: 24px;
    background: ${e=>e.theme.background};
    border: 1px solid ${e=>e.theme.border};
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    margin-bottom: 0.3rem;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, ${e=>e.theme.primary}, ${e=>e.theme.success});
    transition: width 0.5s ease;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.5rem;
    color: white;
    font-weight: 700;
    font-size: 0.85rem;
  }
  
  .stats {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: ${e=>e.theme.textSecondary};
  }
`,sr=i.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
`,nr=(0,i.Ay)(s.P.div)`
  background: ${e=>e.theme.background};
  border: 2px solid ${e=>e.$completed?e.theme.success:e.theme.border};
  border-radius: 12px;
  padding: 1.25rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${e=>e.$color||e.theme.primary};
  }
`,cr=i.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  
  .icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .title {
    flex: 1;
    
    h4 {
      margin: 0 0 0.2rem 0;
      font-size: 1.05rem;
      color: ${e=>e.theme.textPrimary};
    }
    
    p {
      margin: 0;
      font-size: 0.8rem;
      color: ${e=>e.theme.textSecondary};
    }
  }
  
  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
    background: ${e=>e.$badgeColor}20;
    color: ${e=>e.$badgeColor};
    border: 1px solid ${e=>e.$badgeColor};
  }
`,lr=i.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: ${e=>e.theme.surface};
    border-radius: 6px;
    font-size: 0.85rem;
  }
  
  .stat-label {
    color: ${e=>e.theme.textSecondary};
    font-weight: 500;
  }
  
  .stat-value {
    font-weight: 700;
    color: ${e=>e.theme.textPrimary};
    
    &.highlight {
      color: ${e=>e.theme.success};
      font-size: 1.1em;
    }
  }
  
  .nivel-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.85rem;
    background: ${e=>e.$levelColor}20;
    color: ${e=>e.$levelColor};
    border: 1px solid ${e=>e.$levelColor};
  }
`,dr=i.Ay.div`
  text-align: center;
  padding: 2rem;
  color: ${e=>e.theme.textSecondary};
  
  .icon {
    font-size: 3rem;
    opacity: 0.3;
    margin-bottom: 0.5rem;
  }
  
  p {
    margin: 0;
    font-size: 0.95rem;
  }
`,mr={rubrica1:{name:"Resumen Acad\xe9mico",icon:"\ud83d\udcdd",color:"#3190FC"},rubrica2:{name:"Tabla ACD",icon:"\ud83d\udcca",color:"#009688"},rubrica3:{name:"Mapa de Actores",icon:"\ud83d\uddfa\ufe0f",color:"#FF9800"},rubrica4:{name:"Respuesta Argumentativa",icon:"\ud83d\udcad",color:"#E91E63"}},pr={1:{label:"Inicial",color:"#607D8B"},2:{label:"B\xe1sico",color:"#03A9F4"},3:{label:"Competente",color:"#4CAF50"},4:{label:"Avanzado",color:"#9C27B0"}};function hr(e){let{rubricProgress:r}=e;const t=(0,a.useMemo)((()=>{if(!r)return null;const e=[];let t=0,a=0,i=0;Object.entries(mr).forEach((o=>{let[s,n]=o;const c=r[s];if(c&&c.scores&&c.scores.length>0){const r=c.scores[c.scores.length-1],o=Math.max(...c.scores.map((e=>e.score))),l=c.scores.length,d=r.nivel||Math.ceil(r.score/2.5),m=d>=3;e.push({rubricId:s,...n,lastScore:r.score,highestScore:o,nivel:d,attempts:l,isCompleted:m,lastAttempt:r.timestamp}),m&&t++,a+=r.score,i+=l}else e.push({rubricId:s,...n,lastScore:0,highestScore:0,nivel:0,attempts:0,isCompleted:!1,lastAttempt:null})}));const o=t/4*100,s=i>0?a/e.filter((e=>e.attempts>0)).length:0;return{artefactos:e,overallProgress:o,totalCompleted:t,averageScore:s.toFixed(1),totalAttempts:i}}),[r]);return t&&0!==t.totalAttempts?(0,c.jsxs)(ar,{children:[(0,c.jsx)(ir,{children:(0,c.jsx)("h3",{children:"\ud83d\udcca Mi Progreso en Literacidad Cr\xedtica"})}),(0,c.jsxs)(or,{children:[(0,c.jsx)("div",{className:"icon",children:100===t.overallProgress?"\ud83c\udf93":t.overallProgress>=75?"\ud83d\udd25":t.overallProgress>=50?"\ud83d\udcc8":"\ud83c\udf31"}),(0,c.jsxs)("div",{className:"info",children:[(0,c.jsx)("div",{className:"label",children:"Progreso General"}),(0,c.jsx)("div",{className:"progress-bar",children:(0,c.jsx)("div",{className:"progress-fill",style:{width:`${t.overallProgress}%`},children:t.overallProgress>15&&`${t.overallProgress.toFixed(0)}%`})}),(0,c.jsxs)("div",{className:"stats",children:[(0,c.jsxs)("span",{children:["\u2705 ",t.totalCompleted,"/4 dimensiones completadas"]}),(0,c.jsxs)("span",{children:["\ud83d\udcca Promedio: ",t.averageScore,"/10"]}),(0,c.jsxs)("span",{children:["\ud83d\udd04 ",t.totalAttempts," intentos totales"]})]})]})]}),(0,c.jsx)(sr,{children:t.artefactos.map((e=>(0,c.jsxs)(nr,{$completed:e.isCompleted,$color:e.color,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.3},children:[(0,c.jsxs)(cr,{$badgeColor:e.nivel>0?pr[e.nivel].color:"#ccc",children:[(0,c.jsx)("div",{className:"icon",children:e.icon}),(0,c.jsxs)("div",{className:"title",children:[(0,c.jsx)("h4",{children:e.name}),(0,c.jsx)("p",{children:e.rubricId})]}),e.nivel>0&&(0,c.jsx)("div",{className:"badge",children:pr[e.nivel].label})]}),(0,c.jsx)(lr,{children:e.attempts>0?(0,c.jsxs)(c.Fragment,{children:[(0,c.jsxs)("div",{className:"stat-row",children:[(0,c.jsx)("span",{className:"stat-label",children:"\xdaltima puntuaci\xf3n:"}),(0,c.jsxs)("span",{className:"stat-value highlight",children:[e.lastScore.toFixed(1),"/10"]})]}),(0,c.jsxs)("div",{className:"stat-row",children:[(0,c.jsx)("span",{className:"stat-label",children:"Puntuaci\xf3n m\xe1s alta:"}),(0,c.jsxs)("span",{className:"stat-value",children:[e.highestScore.toFixed(1),"/10"]})]}),(0,c.jsxs)("div",{className:"stat-row",children:[(0,c.jsx)("span",{className:"stat-label",children:"Nivel alcanzado:"}),(0,c.jsxs)("span",{className:"nivel-badge",style:{background:`${pr[e.nivel].color}20`,color:pr[e.nivel].color,border:`1px solid ${pr[e.nivel].color}`},children:["Nivel ",e.nivel," - ",pr[e.nivel].label]})]}),(0,c.jsxs)("div",{className:"stat-row",children:[(0,c.jsx)("span",{className:"stat-label",children:"Intentos:"}),(0,c.jsx)("span",{className:"stat-value",children:e.attempts})]}),e.lastAttempt&&(0,c.jsxs)("div",{className:"stat-row",children:[(0,c.jsx)("span",{className:"stat-label",children:"\xdaltimo intento:"}),(0,c.jsx)("span",{className:"stat-value",style:{fontSize:"0.75rem"},children:new Date(e.lastAttempt).toLocaleDateString("es-ES",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})})]})]}):(0,c.jsxs)(dr,{style:{padding:"1rem"},children:[(0,c.jsx)("div",{className:"icon",style:{fontSize:"2rem"},children:"\ud83d\udcdd"}),(0,c.jsx)("p",{style:{fontSize:"0.85rem"},children:"No completado"})]})})]},e.rubricId)))})]}):(0,c.jsxs)(ar,{children:[(0,c.jsx)(ir,{children:(0,c.jsx)("h3",{children:"\ud83d\udcca Mi Progreso"})}),(0,c.jsxs)(dr,{children:[(0,c.jsx)("div",{className:"icon",children:"\ud83d\udced"}),(0,c.jsx)("p",{children:"A\xfan no has completado ninguna evaluaci\xf3n."}),(0,c.jsx)("p",{style:{fontSize:"0.85rem",marginTop:"0.5rem",opacity:.8},children:"Comienza con la Preparaci\xf3n y luego completa los artefactos."})]})]})}const ur=i.Ay.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`,xr=(0,i.Ay)(s.P.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: ${e=>"csv"===e.$format?e.theme.success:e.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .icon {
    font-size: 1.2em;
  }
`,gr=(0,i.Ay)(s.P.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(4px);
`,br=(0,i.Ay)(s.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  padding: 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  
  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    color: ${e=>e.theme.textPrimary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  p {
    margin: 0 0 1.5rem 0;
    color: ${e=>e.theme.textSecondary};
    line-height: 1.6;
  }
  
  .buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
`,yr=i.Ay.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  &.primary {
    background: ${e=>e.theme.success};
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 150, 136, 0.3);
    }
  }
  
  &.secondary {
    background: transparent;
    color: ${e=>e.theme.textPrimary};
    border: 2px solid ${e=>e.theme.border};
    
    &:hover {
      background: ${e=>e.theme.background};
    }
  }
`,fr={rubrica1:"Resumen Acad\xe9mico",rubrica2:"Tabla ACD",rubrica3:"Mapa de Actores",rubrica4:"Respuesta Argumentativa"};function vr(e){let{rubricProgress:r,studentName:t="estudiante",documentId:i="documento"}=e;const[s,n]=(0,a.useState)(!1),[l,d]=(0,a.useState)("csv"),m=r&&Object.values(r).some((e=>{var r;return(null===e||void 0===e||null===(r=e.scores)||void 0===r?void 0:r.length)>0})),p=()=>{const e=[],t={1:"Inicial - Requiere desarrollo",2:"B\xe1sico - En progreso",3:"Competente - Satisfactorio",4:"Avanzado - Excelente"};Object.entries(r).forEach((r=>{let[a,o]=r;null!==o&&void 0!==o&&o.scores&&o.scores.forEach(((r,o)=>{const s=r.nivel||Math.ceil(r.score/2.5);e.push([new Date(r.timestamp).toLocaleString("es-ES",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}),fr[a]||a,r.score.toFixed(2),s,t[s]||"Sin clasificar",o+1,i,a])}))})),e.sort(((e,r)=>new Date(r[0])-new Date(e[0])));const a=[["Fecha y Hora","Artefacto","Puntuaci\xf3n sobre 10","Nivel Alcanzado","Descripci\xf3n del Nivel","N\xfamero de Intento","Documento ID","R\xfabrica ID"],...e].map((e=>e.map((e=>`"${e}"`)).join(","))).join("\n");u("\ufeff"+a,`progreso_${i}_${(new Date).toISOString().split("T")[0]}.csv`,"text/csv;charset=utf-8")},h=()=>{const e={metadata:{fechaExportacion:(new Date).toLocaleString("es-ES"),documentoID:i,totalEvaluaciones:Object.values(r).reduce(((e,r)=>{var t;return e+((null===r||void 0===r||null===(t=r.scores)||void 0===t?void 0:t.length)||0)}),0),version:"1.0"},resumen:{dimensionesCompletadas:0,promedioGeneral:0,nivelPromedioAlcanzado:0},artefactos:{}};let t=0,a=0,o=0;Object.entries(r).forEach((r=>{let[i,s]=r;if(null!==s&&void 0!==s&&s.scores&&s.scores.length>0){const r=s.scores[s.scores.length-1],n=Math.max(...s.scores.map((e=>e.score))),c=r.nivel||Math.ceil(r.score/2.5);o++,t+=r.score,a+=c,c>=3&&e.resumen.dimensionesCompletadas++,e.artefactos[i]={nombre:fr[i],estado:c>=3?"Completado":"En Progreso",intentos:s.scores.length,ultimaPuntuacion:r.score.toFixed(2),puntuacionMasAlta:n.toFixed(2),nivelActual:c,descripcionNivel:{1:"Inicial - Requiere desarrollo",2:"B\xe1sico - En progreso",3:"Competente - Satisfactorio",4:"Avanzado - Excelente"}[c],historial:s.scores.map(((e,r)=>{const t=e.nivel||Math.ceil(e.score/2.5);return{intento:r+1,fecha:new Date(e.timestamp).toLocaleString("es-ES"),puntuacion:e.score.toFixed(2),nivel:t,descripcionNivel:{1:"Inicial",2:"B\xe1sico",3:"Competente",4:"Avanzado"}[t],criterios:e.criterios||{}}}))}}})),o>0&&(e.resumen.promedioGeneral=(t/o).toFixed(2),e.resumen.nivelPromedioAlcanzado=Math.round(a/o));const s=JSON.stringify(e,null,2);u(s,`progreso_${i}_${(new Date).toISOString().split("T")[0]}.json`,"application/json")},u=(e,r,t)=>{const a=new Blob([e],{type:`${t};charset=utf-8;`}),i=document.createElement("a"),o=URL.createObjectURL(a);i.setAttribute("href",o),i.setAttribute("download",r),i.style.visibility="hidden",document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(o)};return(0,c.jsxs)(c.Fragment,{children:[(0,c.jsxs)(ur,{children:[(0,c.jsxs)(xr,{$format:"csv",onClick:()=>{d("csv"),n(!0)},disabled:!m,whileHover:{scale:m?1.05:1},whileTap:{scale:m?.95:1},children:[(0,c.jsx)("span",{className:"icon",children:"\ud83d\udcca"}),"Exportar CSV"]}),(0,c.jsxs)(xr,{$format:"json",onClick:()=>{d("json"),n(!0)},disabled:!m,whileHover:{scale:m?1.05:1},whileTap:{scale:m?.95:1},children:[(0,c.jsx)("span",{className:"icon",children:"\ud83d\udce6"}),"Exportar JSON"]})]}),(0,c.jsx)(o.N,{children:s&&(0,c.jsx)(gr,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:()=>n(!1),children:(0,c.jsxs)(br,{initial:{opacity:0,scale:.9,y:20},animate:{opacity:1,scale:1,y:0},exit:{opacity:0,scale:.9,y:20},onClick:e=>e.stopPropagation(),children:[(0,c.jsxs)("h3",{children:[(0,c.jsx)("span",{children:"csv"===l?"\ud83d\udcca":"\ud83d\udce6"}),"Exportar Progreso en ",l.toUpperCase()]}),(0,c.jsxs)("p",{children:["Se descargar\xe1 un archivo ",l.toUpperCase()," con toda tu informaci\xf3n de progreso:"]}),(0,c.jsx)("ul",{style:{marginLeft:"1.5rem",marginBottom:"1.5rem",color:"var(--text-secondary)",lineHeight:1.8},children:"csv"===l?(0,c.jsxs)(c.Fragment,{children:[(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"Fecha y hora"})," de cada evaluaci\xf3n"]}),(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"Nombre del artefacto"})," evaluado"]}),(0,c.jsx)("li",{children:(0,c.jsx)("strong",{children:"Puntuaci\xf3n sobre 10"})}),(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"Nivel alcanzado"})," (Inicial, B\xe1sico, Competente, Avanzado)"]}),(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"N\xfamero de intento"})," (1, 2, 3...)"]}),(0,c.jsx)("li",{children:"Ordenado por fecha (m\xe1s reciente primero)"})]}):(0,c.jsxs)(c.Fragment,{children:[(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"Resumen general:"})," dimensiones completadas, promedio, nivel alcanzado"]}),(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"Por cada artefacto:"})," estado, intentos, puntuaciones, historial completo"]}),(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"Historial detallado:"})," cada intento con fecha, puntuaci\xf3n y nivel"]}),(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"Criterios evaluados:"})," desglose de cada evaluaci\xf3n"]}),(0,c.jsx)("li",{children:"Formato estructurado para an\xe1lisis program\xe1tico"})]})}),(0,c.jsx)("p",{style:{fontSize:"0.85rem",fontStyle:"italic"},children:"csv"===l?"\ud83d\udcca Archivo CSV listo para abrir en Excel, Google Sheets o cualquier hoja de c\xe1lculo. Ideal para gr\xe1ficos y an\xe1lisis visual.":"\ud83d\udce6 Archivo JSON estructurado para programadores e investigadores. Incluye metadatos completos y estructura jer\xe1rquica."}),(0,c.jsxs)("div",{className:"buttons",children:[(0,c.jsx)(yr,{className:"secondary",onClick:()=>n(!1),children:"Cancelar"}),(0,c.jsxs)(yr,{className:"primary",onClick:()=>{return e=l,void(r&&("csv"===e?p():h(),n(!1)));var e},children:[(0,c.jsx)("span",{style:{marginRight:"0.5rem"},children:"\ud83d\udce5"}),"Descargar ",l.toUpperCase()]})]})]})})})]})}const jr=(0,a.lazy)((()=>Promise.all([t.e(221),t.e(315)]).then(t.bind(t,7315)))),$r=(0,a.lazy)((()=>Promise.all([t.e(221),t.e(526)]).then(t.bind(t,6526)))),Ar=(0,a.lazy)((()=>Promise.all([t.e(221),t.e(465)]).then(t.bind(t,6465)))),wr=(0,a.lazy)((()=>Promise.all([t.e(221),t.e(933)]).then(t.bind(t,8933)))),kr=(0,a.lazy)((()=>Promise.all([t.e(221),t.e(562)]).then(t.bind(t,6562)))),Cr=i.Ay.div`
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  background: ${e=>e.theme.background||"#f8f9fa"};
  min-height: calc(100vh - 120px);
`,zr=i.Ay.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${e=>e.theme.primary||"#3190FC"};
`,Pr=i.Ay.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary||"#333"};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,Sr=i.Ay.p`
  margin: 0;
  color: ${e=>e.theme.textSecondary||"#666"};
  font-size: 1rem;
  line-height: 1.5;
`,Er=i.Ay.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`,Nr=i.Ay.button`
  padding: 0.75rem 1.5rem;
  background: ${e=>e.$active?e.theme.primary:"transparent"};
  color: ${e=>e.$active?"white":e.theme.textPrimary};
  border: 2px solid ${e=>e.$active?e.theme.primary:e.theme.border};
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: ${e=>e.disabled?"not-allowed":"pointer"};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: ${e=>e.disabled?.5:1};
  pointer-events: ${e=>e.disabled?"none":"auto"};
  
  &:hover:not(:disabled) {
    background: ${e=>e.$active?e.theme.primary:e.theme.surface};
    transform: translateY(-2px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`,Rr=i.Ay.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 0.25rem;
  font-weight: 700;
  background: ${e=>e.$color?`${e.$color}20`:"transparent"};
  color: ${e=>e.$color||"inherit"};
  border: 1px solid ${e=>e.$color?`${e.$color}60`:"transparent"};
  white-space: nowrap;
  animation: ${e=>"excellent"===e.$status?"pulse 2s infinite":"none"};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`,Fr=i.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`,Mr=i.Ay.div`
  font-size: 64px;
  margin-bottom: 16px;
`,Ir=i.Ay.h2`
  font-size: 28px;
  margin-bottom: 8px;
  color: ${e=>e.theme.textPrimary||"#333"};
`,Br=i.Ay.p`
  font-size: 16px;
  color: ${e=>e.theme.textSecondary||"#666"};
  max-width: 500px;
  line-height: 1.6;
`,Dr=i.Ay.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 992px) {
    grid-template-columns: ${e=>"full"===e.$layout?"1fr":"2fr 1fr"};
  }
`,Lr=i.Ay.section`
  background: ${e=>e.theme.cardBg||"#ffffff"};
  border: 1px solid ${e=>e.theme.border||"#e0e0e0"};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`,Tr=i.Ay.h3`
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary||"#333"};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,qr=i.Ay.button`
  background: ${e=>"danger"===e.$variant?"#ef4444":e.theme.error||"#dc3545"};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>"danger"===e.$variant?"#dc2626":"#c82333"};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,Hr=i.Ay.button`
  background: transparent;
  color: ${e=>e.theme.textSecondary||"#666"};
  border: 1px solid ${e=>e.theme.border||"#ddd"};
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${e=>e.theme.hoverBg||"#f5f5f5"};
    border-color: ${e=>e.theme.textSecondary||"#999"};
  }
`,Or=i.Ay.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`,_r=i.Ay.div`
  background: ${e=>e.theme.cardBg||"white"};
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`,Gr=i.Ay.h3`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.textPrimary||"#333"};
  font-size: 1.3rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Yr=i.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textSecondary||"#666"};
  line-height: 1.6;
`,Ur=i.Ay.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`,Vr=i.Ay.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${e=>e.theme.border||"#e0e0e0"};
  flex-wrap: wrap;
`,Qr=i.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 1rem;
`,Jr=i.Ay.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${e=>e.theme.border||"#e0e0e0"};
  border-top-color: ${e=>e.theme.primary||"#2196F3"};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`,Wr=i.Ay.p`
  margin: 0;
  color: ${e=>e.theme.textSecondary||"#666"};
  font-size: 0.95rem;
`;function Xr(){var e,r,t;const{texto:i,completeAnalysis:l,modoOscuro:d,rubricProgress:m,clearRubricProgress:p,resetAllProgress:h,activitiesProgress:u,markPreparationProgress:x}=(0,a.useContext)(n.BR),[g,b]=(0,a.useState)("preparacion"),[y,f]=(0,a.useState)(!1),v=(null===l||void 0===l||null===(e=l.metadata)||void 0===e?void 0:e.document_id)||null,j=v&&(null===u||void 0===u||null===(r=u[v])||void 0===r||null===(t=r.preparation)||void 0===t?void 0:t.completed)||!1;a.useEffect((()=>{v&&(j?console.log("\u2705 [Actividades] Preparaci\xf3n completada para documento:",v):console.log("\ud83c\udd95 [Actividades] Preparaci\xf3n pendiente para documento:",v))}),[v,j]),a.useEffect((()=>{const e=()=>{console.log("\ud83d\udd14 [Actividades] Progreso actualizado desde otro dispositivo, recalculando...")};return window.addEventListener("progress-synced-from-cloud",e),()=>window.removeEventListener("progress-synced-from-cloud",e)}),[]),a.useEffect((()=>{!j&&["resumen","tabla-acd","mapa-actores","respuesta","bitacora"].includes(g)&&(console.log("\ud83d\udeab [Actividades] Acceso denegado a artefacto sin preparaci\xf3n, redirigiendo..."),b("preparacion"))}),[j,g]),a.useEffect((()=>{const e=()=>{console.log("\u2705 [Actividades] Preparaci\xf3n completada, desbloqueando artefactos"),v&&x&&x(v,{completed:!0})};return window.addEventListener("exercises-completed",e),()=>window.removeEventListener("exercises-completed",e)}),[v,x]);const $=(0,a.useCallback)((e=>{const r=null===m||void 0===m?void 0:m[e];if(!r||!r.scores||0===r.scores.length)return{status:"empty",icon:"",label:"",color:""};const t=r.scores[r.scores.length-1].score;return t>=8.6?{status:"excellent",icon:"\ud83c\udf1f",label:t.toFixed(1),color:"#10b981"}:t>=5.6?{status:"good",icon:"\u2705",label:t.toFixed(1),color:"#4CAF50"}:{status:"needs-work",icon:"\u23f3",label:t.toFixed(1),color:"#FF9800"}}),[m]);if(!i)return(0,c.jsx)(Cr,{theme:{background:d?"#1a1a1a":"#f8f9fa"},children:(0,c.jsxs)(Fr,{children:[(0,c.jsx)(Mr,{children:"\ud83d\udcdd"}),(0,c.jsx)(Ir,{theme:{textPrimary:d?"#fff":"#333"},children:"No hay texto cargado"}),(0,c.jsx)(Br,{theme:{textSecondary:d?"#aaa":"#666"},children:'Carga un texto en la secci\xf3n "Lectura Guiada" para comenzar con las actividades interactivas de literacidad cr\xedtica.'})]})});if(!l||!l.critical)return(0,c.jsx)(Cr,{theme:{background:d?"#1a1a1a":"#f8f9fa"},children:(0,c.jsxs)(Fr,{children:[(0,c.jsx)(Mr,{children:"\u23f3"}),(0,c.jsx)(Ir,{theme:{textPrimary:d?"#fff":"#333"},children:"An\xe1lisis en proceso"}),(0,c.jsx)(Br,{theme:{textSecondary:d?"#aaa":"#666"},children:'Espera a que se complete el an\xe1lisis del texto en la pesta\xf1a "An\xe1lisis de Texto" para acceder a las actividades personalizadas.'})]})});const A={background:d?"#1a1a1a":"#f8f9fa",cardBg:d?"#2a2a2a":"#ffffff",surface:d?"#333":"#f5f5f5",border:d?"#444":"#e0e0e0",textPrimary:d?"#fff":"#333",textSecondary:d?"#aaa":"#666",primary:"#2196F3",success:"#4CAF50",warning:"#FF9800",danger:"#F44336"},w=["rubrica1","rubrica2","rubrica3","rubrica4","rubrica5"].filter((e=>""!==$(e).icon)).length,P=Math.round(w/5*100);return(0,c.jsxs)(Cr,{theme:A,children:[(0,c.jsxs)(zr,{theme:A,children:[(0,c.jsxs)(Pr,{theme:A,children:[(0,c.jsx)("span",{children:"\ud83d\udcdd"}),"Actividades de Literacidad Cr\xedtica",w>0&&(0,c.jsxs)("span",{style:{fontSize:"0.85rem",fontWeight:500,marginLeft:"0.75rem",color:A.success,opacity:.9},children:["(",w,"/5 completados \u2022 ",P,"%)"]})]}),(0,c.jsx)(Sr,{theme:A,children:j?(0,c.jsx)(c.Fragment,{children:"Preparaci\xf3n completada \u2705 \u2022 Ahora puedes crear tus artefactos de an\xe1lisis cr\xedtico con evaluaci\xf3n formativa."}):(0,c.jsxs)(c.Fragment,{children:["\u2705 ",(0,c.jsx)("strong",{children:"Primero completa la Preparaci\xf3n"})," (autoevaluaci\xf3n + s\xedntesis) para desbloquear los artefactos acad\xe9micos formales."]})})]}),(0,c.jsx)(z.A,{theme:A}),(0,c.jsxs)(Er,{children:[(0,c.jsxs)(Nr,{$active:"preparacion"===g,onClick:()=>b("preparacion"),theme:A,children:[(0,c.jsx)("span",{children:"\ufffd"}),"Preparaci\xf3n",j&&" \u2705"]}),(0,c.jsxs)(Nr,{$active:"resumen"===g,onClick:()=>j&&b("resumen"),disabled:!j,theme:A,style:{opacity:j?1:.5,cursor:j?"pointer":"not-allowed"},children:[(0,c.jsx)("span",{children:"\ud83d\udcda"}),"Resumen Acad\xe9mico",(0,c.jsx)(B,{minutes:15,theme:A,compact:!0}),!j&&" \ud83d\udd12",$("rubrica1").icon&&j&&(0,c.jsxs)(Rr,{$status:$("rubrica1").status,$color:$("rubrica1").color,children:[$("rubrica1").icon," ",$("rubrica1").label]})]}),(0,c.jsxs)(Nr,{$active:"tabla-acd"===g,onClick:()=>j&&b("tabla-acd"),disabled:!j,theme:A,style:{opacity:j?1:.5,cursor:j?"pointer":"not-allowed"},children:[(0,c.jsx)("span",{children:"\ud83d\udd0d"}),"An\xe1lisis del Discurso",(0,c.jsx)(B,{minutes:18,theme:A,compact:!0}),!j&&" \ud83d\udd12","}",$("rubrica2").icon&&j&&(0,c.jsxs)(Rr,{$status:$("rubrica2").status,$color:$("rubrica2").color,children:[$("rubrica2").icon," ",$("rubrica2").label]})]}),(0,c.jsxs)(Nr,{$active:"mapa-actores"===g,onClick:()=>j&&b("mapa-actores"),disabled:!j,theme:A,style:{opacity:j?1:.5,cursor:j?"pointer":"not-allowed"},children:[(0,c.jsx)("span",{children:"\ud83d\uddfa\ufe0f"}),"Mapa de Actores",(0,c.jsx)(B,{minutes:12,theme:A,compact:!0}),!j&&" \ud83d\udd12","}",$("rubrica3").icon&&j&&(0,c.jsxs)(Rr,{$status:$("rubrica3").status,$color:$("rubrica3").color,children:[$("rubrica3").icon," ",$("rubrica3").label]})]}),(0,c.jsxs)(Nr,{$active:"respuesta-argumentativa"===g,onClick:()=>j&&b("respuesta-argumentativa"),disabled:!j,theme:A,style:{opacity:j?1:.5,cursor:j?"pointer":"not-allowed"},children:[(0,c.jsx)("span",{children:"\ud83d\udcad"}),"Respuesta Argumentativa",(0,c.jsx)(B,{minutes:20,theme:A,compact:!0}),!j&&" \ud83d\udd12","}",$("rubrica4").icon&&j&&(0,c.jsxs)(Rr,{$status:$("rubrica4").status,$color:$("rubrica4").color,children:[$("rubrica4").icon," ",$("rubrica4").label]})]}),(0,c.jsxs)(Nr,{$active:"bitacora-etica"===g,onClick:()=>j&&b("bitacora-etica"),disabled:!j,theme:A,style:{opacity:j?1:.5,cursor:j?"pointer":"not-allowed"},children:[(0,c.jsx)("span",{children:"\ud83e\udd16"}),"Bit\xe1cora \xc9tica IA",(0,c.jsx)(B,{minutes:10,theme:A,compact:!0}),!j&&" \ud83d\udd12","}",$("rubrica5").icon&&j&&(0,c.jsxs)(Rr,{$status:$("rubrica5").status,$color:$("rubrica5").color,children:[$("rubrica5").icon," ",$("rubrica5").label]})]}),(0,c.jsxs)(Nr,{$active:"progreso"===g,onClick:()=>b("progreso"),theme:A,children:[(0,c.jsx)("span",{children:"\ud83d\udcca"}),"Mi Progreso"]})]}),(0,c.jsxs)(o.N,{mode:"wait",children:["resumen"===g&&(0,c.jsxs)(s.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[(0,c.jsx)(a.Suspense,{fallback:(0,c.jsxs)(Qr,{theme:A,children:[(0,c.jsx)(Jr,{theme:A}),(0,c.jsx)(Wr,{theme:A,children:"\ud83d\udcda Cargando Resumen Acad\xe9mico..."})]}),children:(0,c.jsx)(M,{theme:A,componentName:"Resumen Acad\xe9mico",onReset:()=>console.log("\ud83d\udd04 Reseteando Resumen Acad\xe9mico"),children:(0,c.jsx)(jr,{theme:A})})}),(0,c.jsx)(C.A,{icon:"\ud83d\udd0d",title:"Siguiente Paso: An\xe1lisis Cr\xedtico del Discurso",description:"Has creado tu resumen acad\xe9mico. Ahora profundiza identificando marcos ideol\xf3gicos, estrategias ret\xf3ricas y voces presentes/silenciadas.",actionLabel:"Ir a An\xe1lisis del Discurso \u2192",onAction:()=>b("tabla-acd"),theme:A,variant:"primary"})]},"resumen"),"tabla-acd"===g&&(0,c.jsxs)(s.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[(0,c.jsx)(a.Suspense,{fallback:(0,c.jsxs)(Qr,{theme:A,children:[(0,c.jsx)(Jr,{theme:A}),(0,c.jsx)(Wr,{theme:A,children:"\ud83d\udd0d Cargando Tabla ACD..."})]}),children:(0,c.jsx)(M,{theme:A,componentName:"Tabla ACD",onReset:()=>console.log("\ud83d\udd04 Reseteando Tabla ACD"),children:(0,c.jsx)($r,{theme:A})})}),(0,c.jsx)(C.A,{icon:"\ud83d\uddfa\ufe0f",title:"Siguiente Paso: Mapa de Actores y Consecuencias",description:"Has completado tu Tabla ACD. Ahora contextualiza el texto identificando actores sociales, conexiones e impacto.",actionLabel:"Ir a Mapa de Actores \u2192",onAction:()=>b("mapa-actores"),theme:A,variant:"primary"})]},"tabla-acd"),"mapa-actores"===g&&(0,c.jsxs)(s.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[(0,c.jsx)(a.Suspense,{fallback:(0,c.jsxs)(Qr,{theme:A,children:[(0,c.jsx)(Jr,{theme:A}),(0,c.jsx)(Wr,{theme:A,children:"\ud83d\uddfa\ufe0f Cargando Mapa de Actores..."})]}),children:(0,c.jsx)(M,{theme:A,componentName:"Mapa de Actores",onReset:()=>console.log("\ud83d\udd04 Reseteando Mapa de Actores"),children:(0,c.jsx)(Ar,{theme:A})})}),(0,c.jsx)(C.A,{icon:"\ud83d\udcad",title:"Siguiente Paso: Respuesta Argumentativa",description:"Has completado el Mapa de Actores. Ahora construye tu propia postura fundamentada con tesis, evidencias y contraargumentos.",actionLabel:"Ir a Respuesta Argumentativa \u2192",onAction:()=>b("respuesta-argumentativa"),theme:A,variant:"primary"})]},"mapa-actores"),"respuesta-argumentativa"===g&&(0,c.jsxs)(s.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[(0,c.jsx)(a.Suspense,{fallback:(0,c.jsxs)(Qr,{theme:A,children:[(0,c.jsx)(Jr,{theme:A}),(0,c.jsx)(Wr,{theme:A,children:"\ud83d\udcad Cargando Respuesta Argumentativa..."})]}),children:(0,c.jsx)(M,{theme:A,componentName:"Respuesta Argumentativa",onReset:()=>console.log("\ud83d\udd04 Reseteando Respuesta Argumentativa"),children:(0,c.jsx)(wr,{theme:A})})}),(0,c.jsx)(C.A,{icon:"\ud83e\udd16",title:"Siguiente Paso: Bit\xe1cora \xc9tica del Uso de IA",description:"Has completado tu Respuesta Argumentativa. Ahora reflexiona sobre el uso \xe9tico y responsable de IA en tu aprendizaje.",actionLabel:"Ir a Bit\xe1cora \xc9tica \u2192",onAction:()=>b("bitacora-etica"),theme:A,variant:"primary"})]},"respuesta-argumentativa"),"bitacora-etica"===g&&(0,c.jsxs)(s.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[(0,c.jsx)(a.Suspense,{fallback:(0,c.jsxs)(Qr,{theme:A,children:[(0,c.jsx)(Jr,{theme:A}),(0,c.jsx)(Wr,{theme:A,children:"\ud83e\udd16 Cargando Bit\xe1cora \xc9tica IA..."})]}),children:(0,c.jsx)(M,{theme:A,componentName:"Bit\xe1cora \xc9tica IA",onReset:()=>console.log("\ud83d\udd04 Reseteando Bit\xe1cora \xc9tica"),children:(0,c.jsx)(kr,{})})}),(0,c.jsx)(C.A,{icon:"\ufffd",title:"Siguiente Paso: Revisa tu Progreso",description:"Has completado las 5 r\xfabricas de literacidad cr\xedtica. Ahora visualiza tu progreso y reflexiona sobre tu evoluci\xf3n en las diferentes dimensiones del an\xe1lisis cr\xedtico.",actionLabel:"Ver Mi Progreso \u2192",onAction:()=>b("progreso"),theme:A,variant:"primary"})]},"bitacora-etica"),"preparacion"===g&&(0,c.jsxs)(s.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:[(0,c.jsx)(tr,{theme:A}),j&&(0,c.jsx)(C.A,{icon:"\ud83d\udcda",title:"\xa1Preparaci\xf3n Completada! Siguiente: Resumen Acad\xe9mico",description:"Has validado tu comprensi\xf3n del texto. Ahora crea tu primer artefacto formal: un resumen acad\xe9mico estructurado con evaluaci\xf3n criterial.",actionLabel:"Ir a Resumen Acad\xe9mico \u2192",onAction:()=>b("resumen"),theme:A,variant:"primary"})]},"preparacion"),"progreso"===g&&(0,c.jsx)(s.P.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:(0,c.jsxs)(Dr,{$layout:"sidebar",theme:A,children:[(0,c.jsxs)(Lr,{theme:A,children:[(0,c.jsxs)(Tr,{theme:A,children:[(0,c.jsx)("span",{children:"\ud83d\udcca"}),"Progresi\xf3n de Literacidad Cr\xedtica"]}),(0,c.jsx)(k,{theme:A,onSelectRubric:e=>{const r={rubrica1:"resumen",rubrica2:"tabla-acd",rubrica3:"mapa-actores",rubrica4:"respuesta-argumentativa",rubrica5:"bitacora-etica"}[e];r&&(console.log(`\ud83d\udccd Navegando a artefacto: ${r}`),b(r))}}),(0,c.jsxs)("p",{style:{marginTop:"1rem",padding:"0.75rem 1rem",background:A.primary+"10",border:`1px solid ${A.primary}40`,borderRadius:"8px",color:A.textSecondary,fontSize:"0.85rem",lineHeight:1.5,display:"flex",alignItems:"center",gap:"0.5rem"},children:[(0,c.jsx)("span",{style:{fontSize:"1.2rem"},children:"\ud83d\udca1"}),(0,c.jsxs)("span",{children:[(0,c.jsx)("strong",{children:"Tip:"})," Haz clic en cualquier tarjeta de r\xfabrica para ir directamente al artefacto correspondiente y revisarlo o mejorarlo."]})]}),(0,c.jsx)(Vr,{theme:A,children:(0,c.jsxs)(qr,{$variant:"danger",onClick:()=>f(!0),disabled:!m||Object.values(m).every((e=>0===e.scores.length)),title:"Resetear todo el progreso",children:[(0,c.jsx)("span",{children:"\ud83d\uddd1\ufe0f"}),"Resetear Todo el Progreso"]})})]}),(0,c.jsxs)(Lr,{theme:A,children:[(0,c.jsxs)(Tr,{theme:A,children:[(0,c.jsx)("span",{children:"\ud83d\udcca"}),"Mi Progreso Detallado"]}),(0,c.jsx)(hr,{rubricProgress:m}),(0,c.jsxs)("div",{style:{marginTop:"1.5rem",padding:"1.25rem",background:A.surface,border:`1px solid ${A.border}`,borderRadius:"12px"},children:[(0,c.jsxs)("h4",{style:{margin:"0 0 0.75rem 0",fontSize:"1.1rem",color:A.textPrimary,display:"flex",alignItems:"center",gap:"0.5rem"},children:[(0,c.jsx)("span",{children:"\ud83d\udce5"}),"Exportar Datos de Progreso"]}),(0,c.jsx)("p",{style:{margin:"0 0 1rem 0",color:A.textSecondary,fontSize:"0.9rem",lineHeight:1.6},children:"Descarga tu progreso completo en formato estructurado:"}),(0,c.jsxs)("ul",{style:{margin:"0 0 1rem 1.5rem",color:A.textSecondary,fontSize:"0.85rem",lineHeight:1.7},children:[(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"CSV:"})," Ideal para Excel, an\xe1lisis estad\xedstico y gr\xe1ficos. Cada fila es una evaluaci\xf3n con fecha, puntuaci\xf3n y nivel."]}),(0,c.jsxs)("li",{children:[(0,c.jsx)("strong",{children:"JSON:"})," Formato estructurado con resumen general, historial completo y criterios detallados por artefacto."]})]}),(0,c.jsx)("p",{style:{margin:"0 0 1rem 0",color:A.textSecondary,fontSize:"0.8rem",fontStyle:"italic"},children:"\ud83d\udca1 \xdatil para portafolios acad\xe9micos, seguimiento docente o an\xe1lisis de progreso personal."}),(0,c.jsx)(vr,{rubricProgress:m,documentId:v,studentName:"estudiante"})]})]})]})},"progreso")]}),y&&(0,c.jsx)(Or,{onClick:()=>f(!1),children:(0,c.jsxs)(_r,{theme:A,onClick:e=>e.stopPropagation(),children:[(0,c.jsxs)(Gr,{theme:A,children:[(0,c.jsx)("span",{children:"\u26a0\ufe0f"}),"\xbfResetear todo el progreso?"]}),(0,c.jsxs)(Yr,{theme:A,children:["Esta acci\xf3n eliminar\xe1 ",(0,c.jsx)("strong",{children:"todas las evaluaciones y puntuaciones"})," de las 5 r\xfabricas de literacidad cr\xedtica. Los artefactos creados (textos, tablas, mapas, etc.) ",(0,c.jsx)("strong",{children:"no se borrar\xe1n"}),", pero sus puntuaciones s\xed.",(0,c.jsx)("br",{}),(0,c.jsx)("br",{}),"Esta acci\xf3n ",(0,c.jsx)("strong",{children:"no se puede deshacer"}),"."]}),(0,c.jsxs)(Ur,{children:[(0,c.jsx)(Hr,{onClick:()=>f(!1),theme:A,children:"Cancelar"}),(0,c.jsxs)(qr,{$variant:"danger",onClick:()=>{h(),f(!1)},children:[(0,c.jsx)("span",{children:"\ud83d\uddd1\ufe0f"}),"S\xed, Resetear Todo"]})]})]})})]})}},7653:(e,r,t)=>{t.d(r,{A:()=>s});t(9950);var a=t(4752),i=t(1132),o=t(4414);const s=e=>{let{icon:r,title:t,description:a,actionLabel:s,onAction:u,theme:x,variant:g="primary"}=e;const b={primary:{bgGradient:`linear-gradient(135deg, ${x.primary}10, ${x.success}10)`,borderColor:`${x.primary}40`,iconColor:x.primary,buttonBg:x.primary},success:{bgGradient:`linear-gradient(135deg, ${x.success}10, ${x.primary}10)`,borderColor:`${x.success}40`,iconColor:x.success,buttonBg:x.success},warning:{bgGradient:`linear-gradient(135deg, ${x.warning}10, ${x.primary}10)`,borderColor:`${x.warning}40`,iconColor:x.warning,buttonBg:x.warning}},y=b[g]||b.primary;return(0,o.jsxs)(n,{as:i.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.4,ease:"easeOut"},$bgGradient:y.bgGradient,$borderColor:y.borderColor,children:[(0,o.jsxs)(c,{children:[(0,o.jsx)(l,{$iconColor:y.iconColor,children:r}),(0,o.jsxs)(d,{children:[(0,o.jsx)(m,{theme:x,children:t}),(0,o.jsx)(p,{theme:x,children:a})]})]}),u&&s&&(0,o.jsx)(h,{onClick:u,$buttonBg:y.buttonBg,whileHover:{scale:1.02,y:-2},whileTap:{scale:.98},children:s})]})},n=a.Ay.div`
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
`,c=a.Ay.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`,l=a.Ay.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${e=>e.$iconColor}15;
  border-radius: 50%;
  font-size: 1.5rem;
  flex-shrink: 0;
`,d=a.Ay.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,m=a.Ay.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${e=>e.theme.text||e.theme.textPrimary};
`,p=a.Ay.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${e=>e.theme.textSecondary||e.theme.textMuted};
`,h=(0,a.Ay)(i.P.button)`
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
`},8313:(e,r,t)=>{t.d(r,{A:()=>y});var a=t(9950),i=t(4752),o=t(3291),s=t(1132),n=t(7085),c=t(4414);const l=(0,i.Ay)(s.P.div)`
  background: linear-gradient(135deg, ${e=>e.theme.error||"#dc2626"}15, ${e=>e.theme.warning||"#f59e0b"}15);
  border: 2px solid ${e=>e.theme.error||"#dc2626"};
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
  position: relative;
  box-shadow: 0 4px 12px ${e=>e.theme.error||"#dc2626"}20;
`,d=i.Ay.div`
  font-size: 2rem;
  flex-shrink: 0;
`,m=i.Ay.div`
  flex: 1;
`,p=i.Ay.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${e=>e.theme.error||"#dc2626"};
`,h=i.Ay.p`
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${e=>e.theme.text||"#232B33"};
  
  strong {
    color: ${e=>e.theme.error||"#dc2626"};
    font-weight: 600;
  }
`,u=i.Ay.div`
  background: ${e=>e.theme.surface||"#FFFFFF"};
  border: 1px solid ${e=>e.theme.border||"#E4EAF1"};
  border-radius: 8px;
  padding: 0.75rem;
  margin: 0.75rem 0;
`,x=i.Ay.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  color: ${e=>e.theme.text||"#232B33"};
  margin: 0.5rem 0;
  
  strong {
    font-weight: 600;
    color: ${e=>e.theme.text||"#232B33"};
  }
  
  span:last-child {
    color: ${e=>e.theme.textMuted||"#607D8B"};
    font-size: 0.85rem;
  }
`,g=i.Ay.div`
  font-size: 0.9rem;
  color: ${e=>e.theme.text||"#232B33"};
  padding: 0.75rem;
  background: ${e=>e.theme.success||"#009688"}15;
  border-left: 3px solid ${e=>e.theme.success||"#009688"};
  border-radius: 4px;
  margin-top: 0.75rem;
  
  strong {
    color: ${e=>e.theme.success||"#009688"};
  }
`,b=i.Ay.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${e=>e.theme.textMuted||"#607D8B"};
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  
  &:hover {
    background: ${e=>e.theme.border||"#E4EAF1"};
    color: ${e=>e.theme.text||"#232B33"};
  }
`,y=e=>{let{theme:r}=e;const[t,i]=(0,a.useState)(!1),[s,y]=(0,a.useState)([]),[f,v]=(0,a.useState)(!0);return(0,a.useEffect)((()=>{const e=()=>{const e=(0,n.x)();i(e.hasDrafts),y(e.details),e.hasDrafts||v(!0)};e();const r=setInterval(e,2e3),t=r=>{var t,a,i,o;("rubricProgress"===r.key||null!==(t=r.key)&&void 0!==t&&t.includes("_draft")||null!==(a=r.key)&&void 0!==a&&a.includes("ACD_")||null!==(i=r.key)&&void 0!==i&&i.includes("Actores_")||null!==(o=r.key)&&void 0!==o&&o.includes("Argumentativa_"))&&e()},a=()=>{console.log("\u2705 [DraftWarning] Evaluaci\xf3n completada, re-verificando borradores..."),e()};return window.addEventListener("storage",t),window.addEventListener("evaluation-complete",a),()=>{clearInterval(r),window.removeEventListener("storage",t),window.removeEventListener("evaluation-complete",a)}}),[]),t&&f?(0,c.jsx)(o.N,{children:(0,c.jsxs)(l,{theme:r,initial:{opacity:0,y:-20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},children:[(0,c.jsx)(d,{children:"\u26a0\ufe0f"}),(0,c.jsxs)(m,{theme:r,children:[(0,c.jsx)(p,{theme:r,children:"Advertencia: Borradores sin Evaluar"}),(0,c.jsxs)(h,{theme:r,children:["Tienes borradores sin evaluar en los siguientes artefactos.",(0,c.jsx)("strong",{children:" Si cambias de sesi\xf3n o cargas un nuevo documento, estos borradores se perder\xe1n permanentemente."})]}),(0,c.jsx)(u,{theme:r,children:s.map(((e,t)=>(0,c.jsxs)(x,{theme:r,children:[(0,c.jsx)("span",{children:"\u2022"}),(0,c.jsx)("strong",{children:e.artefacto}),(0,c.jsxs)("span",{children:["\u2192 ",e.ubicacion]})]},t)))}),(0,c.jsxs)(g,{theme:r,children:["\ud83d\udca1 ",(0,c.jsx)("strong",{children:"Recomendaci\xf3n:"})," Eval\xfaa estos artefactos antes de cambiar de sesi\xf3n para guardar tu progreso."]})]}),(0,c.jsx)(b,{theme:r,onClick:()=>v(!1),title:"Cerrar advertencia",children:"\xd7"})]})}):null}}}]);