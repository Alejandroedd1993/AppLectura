"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[654],{654:(e,i,o)=>{o.r(i),o.d(i,{default:()=>ii});var n=o(9950),t=o(1132),r=o(4752),a=o(387),s=o(3291),d=o(4414);const c=(0,r.Ay)(t.P.div)`
  background-color: ${e=>e.theme.surface};
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  border: 1px solid ${e=>e.theme.border};
  box-shadow: 0 2px 8px ${e=>e.theme.shadow};
`,l=r.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
  user-select: none;
`,p=r.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.text};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
`,x=(0,r.Ay)(t.P.span)`
  font-size: 1rem;
  color: ${e=>e.theme.textMuted};
`,h=r.Ay.span`
  background-color: ${e=>e.theme.primary}20;
  color: ${e=>e.theme.primary};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`,m=r.Ay.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`,g=r.Ay.input`
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  background-color: ${e=>e.theme.background};
  color: ${e=>e.theme.text};
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: ${e=>e.theme.primary};
  }
  
  &::placeholder {
    color: ${e=>e.theme.textMuted};
  }
`,u=r.Ay.button`
  padding: 8px 12px;
  background-color: ${e=>e.$primary?e.theme.primary:e.theme.surface};
  color: ${e=>e.$primary?"white":e.theme.text};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px ${e=>e.theme.shadow};
  }
  
  &:active {
    transform: translateY(0);
  }
`,f=r.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
  
  /* Scrollbar personalizado */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${e=>e.theme.surface};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${e=>e.theme.border};
    border-radius: 4px;
    
    &:hover {
      background: ${e=>e.theme.primary}50;
    }
  }
`,y=(0,r.Ay)(t.P.div)`
  background-color: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${e=>e.theme.primary}50;
    box-shadow: 0 2px 6px ${e=>e.theme.shadow};
  }
`,j=r.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`,b=r.Ay.h5`
  margin: 0;
  color: ${e=>e.theme.primary};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 6px;
`,v=r.Ay.span`
  background-color: ${e=>function(e){const i={Concepto:"#8b5cf6","T\xe9cnico":"#0ea5e9","Acad\xe9mico":"#f59e0b",Cultural:"#ec4899",Otro:"#6b7280"};return i[e]||i.Otro}(e.$category,e.theme)};
  color: white;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
`,$=r.Ay.p`
  margin: 0 0 8px 0;
  color: ${e=>e.theme.text};
  font-size: 0.9rem;
  line-height: 1.5;
`,_=r.Ay.p`
  margin: 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  font-style: italic;
  line-height: 1.4;
`,w=r.Ay.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
`,k=r.Ay.div`
  text-align: center;
  padding: 40px 20px;
  color: ${e=>e.theme.textMuted};
`,A=r.Ay.div`
  text-align: center;
  padding: 40px 20px;
  color: ${e=>e.theme.textMuted};
`;const z=e=>{let{glossary:i=[],loading:o=!1,onExport:r,onTermClick:a,theme:z}=e;const[C,M]=(0,n.useState)(!1),[S,T]=(0,n.useState)(""),[P,E]=(0,n.useState)("relevance"),F=(0,n.useMemo)((()=>{let e=i.map(((e,i)=>({...e,id:e.id||`term_${i}_${Date.now()}`})));if(S.trim()){const i=S.toLowerCase();e=e.filter((e=>e.termino.toLowerCase().includes(i)||e.definicion.toLowerCase().includes(i)||e.categoria.toLowerCase().includes(i)))}return"alphabetical"===P?e.sort(((e,i)=>e.termino.localeCompare(i.termino))):"category"===P&&e.sort(((e,i)=>{const o=e.categoria.localeCompare(i.categoria);return 0!==o?o:e.termino.localeCompare(i.termino)})),e}),[i,S,P]);return(0,d.jsxs)(c,{theme:z,initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.3},children:[(0,d.jsxs)(l,{onClick:()=>M(!C),children:[(0,d.jsxs)(p,{theme:z,children:["\ud83d\udcda Glosario Din\xe1mico",i.length>0&&(0,d.jsxs)(h,{theme:z,children:[i.length," t\xe9rminos"]})]}),(0,d.jsx)(x,{theme:z,animate:{rotate:C?180:0},transition:{duration:.2},children:"\u25bc"})]}),(0,d.jsx)(s.N,{children:C&&(0,d.jsx)(t.P.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.3},style:{overflow:"hidden"},children:o?(0,d.jsxs)(A,{theme:z,children:[(0,d.jsx)("div",{style:{fontSize:"2rem",marginBottom:"8px"},children:"\u23f3"}),(0,d.jsx)("div",{children:"Generando glosario con IA..."})]}):0===i.length?(0,d.jsxs)(k,{theme:z,children:[(0,d.jsx)("div",{style:{fontSize:"2rem",marginBottom:"8px"},children:"\ud83d\udcd6"}),(0,d.jsx)("div",{children:"No hay t\xe9rminos en el glosario"}),(0,d.jsx)("div",{style:{fontSize:"0.85rem",marginTop:"4px"},children:"El glosario se genera autom\xe1ticamente al analizar el texto"})]}):(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)(m,{children:[(0,d.jsx)(g,{theme:z,type:"text",placeholder:"\ud83d\udd0d Buscar en el glosario...",value:S,onChange:e=>T(e.target.value)}),(0,d.jsx)(u,{theme:z,onClick:()=>E("alphabetical"===P?"relevance":"alphabetical"),title:"Ordenar",children:"alphabetical"===P?"\ud83d\udd24 A-Z":"\u2b50 Relevancia"}),(0,d.jsx)(u,{theme:z,$primary:!0,onClick:()=>{r&&r(i)},title:"Exportar glosario en PDF",children:"\ufffd Exportar PDF"})]}),0===F.length?(0,d.jsxs)(k,{theme:z,children:[(0,d.jsx)("div",{style:{fontSize:"1.5rem",marginBottom:"8px"},children:"\ud83d\udd0d"}),(0,d.jsxs)("div",{children:['No se encontraron t\xe9rminos que coincidan con "',S,'"']})]}):(0,d.jsx)(f,{theme:z,children:F.map(((e,i)=>(0,d.jsxs)(y,{theme:z,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{duration:.2,delay:.05*i},children:[(0,d.jsxs)(j,{children:[(0,d.jsxs)(b,{theme:z,onClick:()=>a&&a(e.termino),style:{cursor:a?"pointer":"default"},title:a?"Click para ver definici\xf3n completa":"",children:[e.termino,a&&(0,d.jsx)("span",{style:{fontSize:"0.8rem",opacity:.7},children:"\ud83d\udd0d"})]}),(0,d.jsx)(v,{$category:e.categoria,theme:z,children:e.categoria})]}),(0,d.jsx)($,{theme:z,children:e.definicion}),e.contexto&&"Contexto no especificado"!==e.contexto&&(0,d.jsxs)(_,{theme:z,children:["\ud83d\udca1 En este texto: ",e.contexto]}),(0,d.jsxs)(w,{theme:z,children:[(0,d.jsxs)("span",{children:["\ud83d\udcca ",e.nivel_complejidad]}),e.agregado_manualmente&&(0,d.jsx)("span",{children:"\u270f\ufe0f Agregado manualmente"})]})]},e.id)))})]})})})]})},C=(0,r.Ay)(t.P.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`,M=(0,r.Ay)(t.P.div)`
  background-color: ${e=>e.theme.background};
  border-radius: 16px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid ${e=>e.theme.border};
`,S=r.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
`,T=r.Ay.h3`
  margin: 0;
  color: ${e=>e.theme.text};
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 8px;
`,P=r.Ay.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${e=>e.theme.textMuted};
  transition: color 0.2s;
  padding: 4px;
  line-height: 1;
  
  &:hover {
    color: ${e=>e.theme.text};
  }
`,E=r.Ay.div`
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`,F=r.Ay.h4`
  margin: 0 0 8px 0;
  color: ${e=>e.theme.textMuted};
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,O=r.Ay.div`
  color: ${e=>e.theme.text};
  line-height: 1.6;
  font-size: 0.95rem;
`,I=r.Ay.button`
  padding: 10px 16px;
  background-color: ${e=>e.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${e=>e.theme.primary}dd;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`,N=r.Ay.div`
  text-align: center;
  padding: 40px 20px;
  color: ${e=>e.theme.textMuted};
`,D=r.Ay.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
`,B=r.Ay.span`
  padding: 4px 8px;
  background-color: ${e=>e.theme.surface};
  color: ${e=>e.theme.textMuted};
  border-radius: 6px;
  font-size: 0.8rem;
  border: 1px solid ${e=>e.theme.border};
`,L=e=>{let{term:i,definition:o,isOpen:n,onClose:t,onWebSearch:r,loading:a,theme:c}=e;return(0,d.jsx)(s.N,{children:n&&(0,d.jsx)(C,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:t,children:(0,d.jsxs)(M,{theme:c,initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:[(0,d.jsxs)(S,{children:[(0,d.jsxs)(T,{theme:c,children:["\ud83d\udcd6 ",i]}),(0,d.jsx)(P,{theme:c,onClick:t,children:"\xd7"})]}),a?(0,d.jsxs)(N,{theme:c,children:[(0,d.jsx)("div",{style:{fontSize:"2rem",marginBottom:"8px"},children:"\u23f3"}),(0,d.jsx)("div",{children:"Generando definici\xf3n contextual..."})]}):o?(0,d.jsxs)(d.Fragment,{children:[o.definicion&&(0,d.jsxs)(E,{children:[(0,d.jsx)(F,{theme:c,children:"\ud83d\udca1 Definici\xf3n"}),(0,d.jsx)(O,{theme:c,children:o.definicion})]}),o.contexto_en_texto&&(0,d.jsxs)(E,{children:[(0,d.jsx)(F,{theme:c,children:"\ud83d\udcc4 En este texto"}),(0,d.jsx)(O,{theme:c,children:o.contexto_en_texto})]}),o.conceptos_relacionados&&o.conceptos_relacionados.length>0&&(0,d.jsxs)(E,{children:[(0,d.jsx)(F,{theme:c,children:"\ud83d\udd17 Conceptos relacionados"}),(0,d.jsx)(D,{children:o.conceptos_relacionados.map(((e,i)=>(0,d.jsx)(B,{theme:c,children:e},i)))})]}),o.nivel_complejidad&&(0,d.jsxs)(E,{children:[(0,d.jsx)(F,{theme:c,children:"\ud83d\udcca Nivel de complejidad"}),(0,d.jsx)(O,{theme:c,children:o.nivel_complejidad})]}),(0,d.jsx)(E,{style:{marginTop:"20px"},children:(0,d.jsx)(I,{theme:c,onClick:()=>r(i),children:"\ud83c\udf10 Buscar m\xe1s informaci\xf3n en web"})})]}):(0,d.jsx)(O,{theme:c,children:"No se pudo cargar la definici\xf3n."})]})})})};var G=o(7653),R=o(6735);var J=o(1797);var H=o(6393);const q=r.Ay.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: ${e=>e.$darkMode?"#1a1a1a":"#f8f9fa"};
  min-height: calc(100vh - 120px);
`,W=r.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
`,V=r.Ay.div`
  font-size: 64px;
  margin-bottom: 16px;
`,Y=r.Ay.h2`
  font-size: 28px;
  margin-bottom: 8px;
  color: #333;
`,U=r.Ay.p`
  font-size: 16px;
  color: #666;
  max-width: 400px;
`,Q=r.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  min-height: 400px;
`,X=r.Ay.div`
  font-size: 72px;
  margin-bottom: 24px;
`,K=r.Ay.h2`
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
`,Z=r.Ay.p`
  font-size: 16px;
  color: #666;
  margin-bottom: 32px;
`,ee=r.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
  width: 100%;
  max-width: 400px;
`,ie=r.Ay.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(74, 144, 226, 0.1);
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  text-align: left;
`,oe=r.Ay.span`
  font-size: 20px;
`,ne=r.Ay.div`
  width: 100%;
  max-width: 400px;
  height: 4px;
  background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
  border-radius: 2px;
`,te=r.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
`,re=r.Ay.h1`
  font-size: 32px;
  font-weight: 700;
  color: ${e=>{var i;return(null===(i=e.theme)||void 0===i?void 0:i.text)||"#333"}};
  margin: 0;
`,ae=r.Ay.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  
  span {
    font-size: 18px;
  }
`,se=r.Ay.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`,de=r.Ay.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
`,ce=r.Ay.span`
  font-size: 28px;
`,le=r.Ay.h2`
  font-size: 22px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
`,pe=r.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`,xe=r.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
`,he=r.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`,me=r.Ay.span`
  font-size: 13px;
  font-weight: 600;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,ge=r.Ay.span`
  font-size: 16px;
  color: #2c3e50;
  font-weight: 500;
`,ue=r.Ay.div`
  background: ${e=>e.$darkMode?"#2d3748":"#f0f4f8"};
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #4a90e2;
`,fe=r.Ay.div`
  font-size: 14px;
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`,ye=r.Ay.p`
  font-size: 17px;
  line-height: 1.6;
  color: #2c3e50;
  margin: 0;
  font-weight: 500;
`,je=r.Ay.div`
  margin-top: 16px;
`,be=r.Ay.h4`
  font-size: 15px;
  font-weight: 600;
  color: #34495e;
  margin-bottom: 12px;
`,ve=r.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`,$e=r.Ay.li`
  padding: 10px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 15px;
  color: #2c3e50;
  border-left: 3px solid #3498db;
`,_e=r.Ay.div`
  background: ${e=>e.$darkMode?"#2d3748":"#f8f9fa"};
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 3px solid #9b59b6;
`,we=r.Ay.p`
  font-size: 15px;
  line-height: 1.6;
  color: #2c3e50;
  margin: 0 0 12px 0;
`,ke=r.Ay.div`
  font-size: 13px;
  line-height: 1.5;
  color: ${e=>e.$darkMode?"#94a3b8":"#64748b"};
  font-style: italic;
  margin: 8px 0;
  padding: 8px;
  background: ${e=>e.$darkMode?"#1e293b":"#f1f5f9"};
  border-radius: 4px;
  border-left: 2px solid ${e=>e.$darkMode?"#475569":"#cbd5e1"};
`,Ae=r.Ay.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`,ze=r.Ay.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  
  ${e=>{switch(e.$type){case"success":return"background: #d4edda; color: #155724;";case"warning":return"background: #fff3cd; color: #856404;";case"info":return"background: #d1ecf1; color: #0c5460;";default:return"background: #e2e3e5; color: #383d41;"}}}
`,Ce=r.Ay.div`
  background: ${e=>e.$darkMode?"#2d3748":"#f8f9fa"};
  padding: 16px;
  border-radius: 8px;
  
  p {
    margin: 8px 0 0 0;
    font-size: 15px;
    line-height: 1.6;
    color: #2c3e50;
  }
`,Me=r.Ay.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`,Se=r.Ay.span`
  padding: 6px 14px;
  background: #e8f4f8;
  color: #2980b9;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
`,Te=r.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`,Pe=r.Ay.div`
  padding: 12px 16px;
  background: ${e=>e.$darkMode?"#2d3748":"#f0f8ff"};
  border-radius: 8px;
  border-left: 3px solid #3498db;
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.15);
  }
`,Ee=r.Ay.div`
  font-weight: 600;
  color: ${e=>e.$darkMode?"#63b3ed":"#2980b9"};
  font-size: 14px;
  margin-bottom: 6px;
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 8px;
`,Fe=r.Ay.span`
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: ${e=>{const i=e.$level||0;return i>=.9?"rgba(76,175,80,0.2)":i>=.7?"rgba(255,193,7,0.2)":"rgba(158,158,158,0.2)"}};
  color: ${e=>{const i=e.$level||0;return i>=.9?"#4CAF50":i>=.7?"#FFA000":"#757575"}};
`,Oe=r.Ay.div`
  color: ${e=>e.$darkMode?"#cbd5e0":"#4a5568"};
  font-size: 13px;
  font-style: italic;
  line-height: 1.5;
  padding-left: 12px;
  border-left: 2px solid ${e=>e.$darkMode?"#4a5568":"#cbd5e0"};
`,Ie=r.Ay.div`
  font-size: 12px;
  color: ${e=>e.$darkMode?"rgba(255,255,255,0.6)":"rgba(0,0,0,0.5)"};
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${e=>e.$darkMode?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"};
  line-height: 1.4;
`,Ne=r.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`,De=r.Ay.div`
  display: flex;
  gap: 16px;
  padding: 16px;
  background: ${e=>e.$darkMode?"#2d3748":"#f8f9fa"};
  border-radius: 8px;
  border-left: 3px solid #27ae60;
`,Be=r.Ay.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #27ae60;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
`,Le=r.Ay.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`,Ge=r.Ay.h5`
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
`,Re=r.Ay.p`
  font-size: 13px;
  color: #7f8c8d;
  margin: 0;
  line-height: 1.5;
`,Je=r.Ay.a`
  font-size: 13px;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`,He=r.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  margin-top: 32px;
  flex-wrap: wrap;
  gap: 12px;
`,qe=r.Ay.span`
  font-size: 13px;
  color: #7f8c8d;
`,We=r.Ay.div`
  display: flex;
  justify-content: center;
  margin: 32px 0;
`,Ve=r.Ay.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${e=>e.theme.success||"#27ae60"};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);

  &:hover {
    background: ${e=>e.theme.successHover||"#229954"};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`,Ye=r.Ay.div`
  background: ${e=>"ideology"===e.$variant?e.$darkMode?"#312e81":"#eef2ff":"represented"===e.$variant?e.$darkMode?"#064e3b":"#d1fae5":"silenced"===e.$variant?e.$darkMode?"#7f1d1d":"#fee2e2":"web"===e.$variant?e.$darkMode?"#1e3a8a":"#dbeafe":e.$darkMode?"#2d3748":"#f8f9fa"};
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  border-left: 4px solid ${e=>"ideology"===e.$variant?"#6366f1":"represented"===e.$variant?"#10b981":"silenced"===e.$variant?"#ef4444":"web"===e.$variant?"#3b82f6":"#9ca3af"};
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
`,Ue=r.Ay.div`
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${e=>{var i;return(null===(i=e.theme)||void 0===i?void 0:i.primary)||"#2563eb"}};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`,Qe=r.Ay.span`
  font-size: 18px;
`,Xe=r.Ay.p`
  font-size: 15px;
  line-height: 1.7;
  color: ${e=>{var i;return(null===(i=e.theme)||void 0===i?void 0:i.text)||"#1f2937"}};
  margin: 0;
  font-weight: 500;
`,Ke=r.Ay.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
`,Ze=r.Ay.span`
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;

  ${e=>"represented"===e.$type?`\n    background: ${e.$darkMode?"#065f46":"#a7f3d0"};\n    color: ${e.$darkMode?"#d1fae5":"#064e3b"};\n    border: 2px solid ${e.$darkMode?"#10b981":"#059669"};\n  `:`\n    background: ${e.$darkMode?"#991b1b":"#fecaca"};\n    color: ${e.$darkMode?"#fee2e2":"#7f1d1d"};\n    border: 2px solid ${e.$darkMode?"#ef4444":"#dc2626"};\n  `}

  &:hover {
    transform: scale(1.05);
  }
`,ei=r.Ay.div`
  margin-top: 16px;
  padding: 12px 16px;
  background: ${e=>e.$darkMode?"#451a03":"#fef3c7"};
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
  font-size: 13px;
  line-height: 1.6;
  color: ${e=>e.$darkMode?"#fde68a":"#78350f"};
  font-style: italic;
`,ii=()=>{var e,i,o,r,s,c,l,p,x,h,m,g,u,f;const{completeAnalysis:y,modoOscuro:j,loading:b,texto:v}=(0,n.useContext)(a.BR),[$,_]=(0,n.useState)([]),[w,k]=(0,n.useState)(!1),[A,C]=(0,n.useState)(null),[M,S]=(0,n.useState)(null),[T,P]=(0,n.useState)(!1),E=j?H.a5:H._k,F=b||v&&!y,O=(0,n.useCallback)((async()=>{if(!v||v.length<200)return;const e=`glossary_cache_${btoa(encodeURIComponent(v.substring(0,500))).substring(0,32)}`;try{const i=localStorage.getItem(e);if(i){const{data:e,timestamp:o}=JSON.parse(i),n=Date.now()-o;if(n<864e5)return console.log("\u2705 Glosario recuperado del cach\xe9"),void _(e||[])}}catch(i){console.log("\u26a0\ufe0f Error leyendo cach\xe9 de glosario:",i)}k(!0);try{const i=await async function(e){try{console.log("\ud83d\udcda [GlossaryService] Generando glosario desde backend...");const i="https://applectura-backend.onrender.com",o=await fetch(`${i}/api/analysis/glossary`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e,maxTerms:8})});if(!o.ok){const e=await o.json();throw new Error(e.message||`HTTP ${o.status}`)}const n=await o.json();console.log(`\u2705 [GlossaryService] ${n.terms.length} t\xe9rminos generados`);const t=n.terms.map((e=>({termino:e.term,definicion:e.definition,contexto:e.usage||"Ver texto completo",nivel_complejidad:e.difficulty||"Intermedio",categoria:"Acad\xe9mico"})));return console.log(`\u2705 Glosario generado exitosamente con ${t.length} t\xe9rminos`),t}catch(i){return console.error("\u274c Error generando glosario:",i.message),[]}}(v);_(i||[]);try{localStorage.setItem(e,JSON.stringify({data:i,timestamp:Date.now()})),console.log("\ud83d\udcbe Glosario guardado en cach\xe9")}catch(o){console.log("\u26a0\ufe0f No se pudo guardar en cach\xe9:",o)}}catch(n){console.error("Error generando glosario:",n)}finally{k(!1)}}),[v]),I=(0,n.useCallback)((async()=>{if(0!==$.length)try{await function(e){let i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"glosario_lectura";try{console.log("\ud83d\udcc4 Generando PDF del glosario...");const o=new J.uE({orientation:"portrait",unit:"mm",format:"a4"}),n=o.internal.pageSize.getWidth(),t=o.internal.pageSize.getHeight(),r=20,a=n-2*r;let s=r;const d={primary:[74,144,226],secondary:[99,102,241],text:[51,65,85],textMuted:[100,116,139],accent:[251,191,36],background:[248,250,252],success:[34,197,94]},c=e=>s+e>t-r&&(o.addPage(),s=r,!0);o.setFillColor(74,144,226),o.rect(0,0,n,40,"F"),o.setTextColor(255,255,255),o.setFontSize(24),o.setFont("helvetica","bold"),o.text("GLOSARIO DE TERMINOS",n/2,18,{align:"center"}),o.setFontSize(11),o.setFont("helvetica","normal"),o.text("Generado con AppLectura",n/2,28,{align:"center"}),s=50,o.setTextColor(51,65,85),o.setFontSize(10),o.setFont("helvetica","normal");const l=(new Date).toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"});o.text(`Total de terminos: ${e.length}`,r,s),o.text(`Fecha: ${l}`,r,s+6),s+=16,e.forEach(((i,t)=>{c(40),o.setTextColor(74,144,226),o.setFontSize(14),o.setFont("helvetica","bold"),o.text(`${t+1}. ${i.termino.toUpperCase()}`,r,s),s+=8,o.setTextColor(100,116,139),o.setFontSize(9),o.setFont("helvetica","normal"),o.text(`[${i.categoria}] [${i.nivel_complejidad}]`,r,s),s+=8,o.setTextColor(...d.text),o.setFontSize(10),o.setFont("helvetica","bold"),o.text("Definici\xf3n:",r,s),s+=5,o.setFont("helvetica","normal"),o.setTextColor(...d.text),o.setFontSize(10),o.splitTextToSize(i.definicion,a-5).forEach((e=>{c(6),o.text(e,r+2,s),s+=5})),s+=3,i.contexto&&"Aparece en el texto analizado."!==i.contexto&&(c(30),o.setTextColor(100,116,139),o.setFontSize(9),o.setFont("helvetica","bold"),o.text("En este texto:",r,s),s+=6,o.setFont("helvetica","italic"),o.setTextColor(71,85,105),o.splitTextToSize(i.contexto,a-2).forEach((e=>{c(5),o.text(e,r+3,s),s+=4.5})),s+=6),t<e.length-1&&(c(10),o.setDrawColor(...d.textMuted),o.setLineWidth(.3),o.line(r,s,n-r,s),s+=8)}));const p=o.internal.getNumberOfPages();for(let e=1;e<=p;e++)o.setPage(e),o.setDrawColor(...d.textMuted),o.setLineWidth(.3),o.line(r,t-15,n-r,t-15),o.setTextColor(...d.textMuted),o.setFontSize(8),o.setFont("helvetica","normal"),o.text("Generado por AppLectura - Sistema de Lectura Inteligente",r,t-10),o.text(`P\xe1gina ${e} de ${p}`,n-r,t-10,{align:"right"});const x=`${i}_${Date.now()}.pdf`;return o.save(x),console.log(`\u2705 PDF generado exitosamente: ${x}`),x}catch(o){throw console.error("\u274c Error generando PDF:",o),o}}($,v.slice(0,100))}catch(e){console.error("Error exportando glosario:",e)}}),[$,v]),N=(0,n.useCallback)((async e=>{C(e),P(!0),S(null);try{const i=await async function(e,i){try{console.log(`\ud83d\udd0d Obteniendo definici\xf3n contextual para: "${e}"`);const n=`Eres un asistente educativo especializado en explicar conceptos de manera clara y contextual.\n\nT\xc9RMINO A DEFINIR: "${e}"\n\nCONTEXTO (extracto del texto donde aparece):\n${i.substring(0,1e3)}...\n\nTAREA: Proporciona una definici\xf3n educativa del t\xe9rmino "${e}" considerando su uso espec\xedfico en este contexto.\n\nResponde \xdaNICAMENTE con un objeto JSON v\xe1lido (sin markdown, sin \`\`\`json) con esta estructura exacta:\n{\n  "definicion": "Definici\xf3n clara y concisa del t\xe9rmino (2-3 oraciones m\xe1ximo)",\n  "contexto_en_texto": "C\xf3mo se usa espec\xedficamente este t\xe9rmino en el texto analizado",\n  "conceptos_relacionados": ["concepto1", "concepto2", "concepto3"],\n  "nivel_complejidad": "B\xe1sico|Intermedio|Avanzado - con explicaci\xf3n breve"\n}\n\nIMPORTANTE: \n- NO uses markdown\n- NO incluyas explicaciones adicionales\n- SOLO el objeto JSON\n- La definici\xf3n debe ser educativa y accesible para estudiantes`,t=await(0,R.x8)({provider:"deepseek",model:"deepseek-chat",messages:[{role:"user",content:n}],temperature:.3,max_tokens:400}),r=(0,R.HQ)(t);if(!r)throw new Error("No se recibi\xf3 respuesta del servicio de IA");let a;console.log("\ud83d\udce6 Respuesta raw:",r.substring(0,200));try{const e=r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();a=JSON.parse(e)}catch(o){console.error("\u274c Error parseando JSON:",o),console.error("Contenido recibido:",r),a={definicion:r.substring(0,200)+"...",contexto_en_texto:"No disponible",conceptos_relacionados:[],nivel_complejidad:"Intermedio"}}return a.definicion||(a.definicion=`T\xe9rmino: ${e}. Informaci\xf3n no disponible.`),a.contexto_en_texto||(a.contexto_en_texto="Contexto espec\xedfico no identificado."),Array.isArray(a.conceptos_relacionados)||(a.conceptos_relacionados=[]),a.nivel_complejidad||(a.nivel_complejidad="Intermedio"),console.log("\u2705 Definici\xf3n generada exitosamente"),a}catch(n){return console.error("\u274c Error obteniendo definici\xf3n del t\xe9rmino:",n),{definicion:`"${e}" es un concepto relacionado con el contenido del texto. Para m\xe1s informaci\xf3n, utiliza el bot\xf3n de b\xfasqueda web.`,contexto_en_texto:"No se pudo determinar el contexto espec\xedfico debido a un error t\xe9cnico.",conceptos_relacionados:[],nivel_complejidad:"Intermedio - requiere investigaci\xf3n adicional"}}}(e,v);S(i)}catch(i){console.error("Error obteniendo definici\xf3n:",i),S({error:"No se pudo obtener la definici\xf3n"})}finally{P(!1)}}),[v]),D=(0,n.useCallback)((e=>{const i="string"===typeof e?e:e.termino||e.term||e;N(i)}),[N]),B=(0,n.useCallback)((()=>{C(null),S(null)}),[]),ii=(0,n.useCallback)((()=>{y&&function(e){let i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(!e)return{success:!1,error:"No hay datos de an\xe1lisis para exportar."};try{const o={analisis:e,metadata:{fechaAnalisis:(new Date).toISOString(),...i}},n=JSON.stringify(o,null,2),t="data:application/json;charset=utf-8,"+encodeURIComponent(n),r=`analisis_${(new Date).toISOString().slice(0,10)}.json`,a=document.createElement("a");return a.setAttribute("href",t),a.setAttribute("download",r),document.body.appendChild(a),a.click(),document.body.removeChild(a),{success:!0,message:"Exportaci\xf3n iniciada."}}catch(o){return console.error("Error al exportar an\xe1lisis como JSON:",o),{success:!1,error:"No se pudo generar el archivo de exportaci\xf3n."}}}(y,"prelectura")}),[y]);if((0,n.useEffect)((()=>{y&&v.length>200&&O()}),[y,O]),F)return(0,d.jsx)(q,{$darkMode:j,children:(0,d.jsxs)(Q,{as:t.P.div,initial:{opacity:0},animate:{opacity:1},transition:{duration:.3},children:[(0,d.jsx)(X,{as:t.P.div,animate:{rotate:360},transition:{duration:2,repeat:1/0,ease:"linear"},children:"\ud83d\udcca"}),(0,d.jsx)(K,{children:"Analizando documento..."}),(0,d.jsx)(Z,{children:"Realizando an\xe1lisis acad\xe9mico profundo"}),(0,d.jsxs)(ee,{children:[(0,d.jsxs)(ie,{as:t.P.div,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.2},children:[(0,d.jsx)(oe,{children:"\ud83d\udd0d"})," Detectando necesidad de contexto web"]}),(0,d.jsxs)(ie,{as:t.P.div,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.5},children:[(0,d.jsx)(oe,{children:"\ud83e\udd16"})," Analizando estructura y argumentaci\xf3n"]}),(0,d.jsxs)(ie,{as:t.P.div,initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{delay:.8},children:[(0,d.jsx)(oe,{children:"\ud83d\udcdd"})," Generando an\xe1lisis acad\xe9mico"]})]}),(0,d.jsx)(ne,{as:t.P.div,initial:{width:"0%"},animate:{width:"100%"},transition:{duration:60,ease:"easeOut"}})]})});if(!v||!y||!y.prelecture)return(0,d.jsx)(q,{$darkMode:j,children:(0,d.jsxs)(W,{children:[(0,d.jsx)(V,{children:"\ud83d\udccb"}),(0,d.jsx)(Y,{children:"Pre-lectura"}),(0,d.jsx)(U,{children:"Carga un texto para ver el an\xe1lisis acad\xe9mico estructurado"})]})});const{prelecture:oi,critical:ni,metadata:ti}=y,{metadata:ri,argumentation:ai,linguistics:si,web_sources:di,web_summary:ci}=oi,li=(null===ni||void 0===ni?void 0:ni.contexto_critico)||{};return(0,d.jsxs)(q,{$darkMode:j,children:[(0,d.jsxs)(te,{children:[(0,d.jsx)(re,{children:"\ud83d\udccb Pre-lectura: An\xe1lisis Acad\xe9mico"}),ti.web_enriched&&(0,d.jsxs)(ae,{children:[(0,d.jsx)("span",{children:"\ud83c\udf10"}),"Enriquecido con ",ti.web_sources_count," fuentes web"]})]}),(0,d.jsxs)(se,{as:t.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.4},children:[(0,d.jsxs)(de,{children:[(0,d.jsx)(ce,{children:"\ud83c\udfaf"}),(0,d.jsx)(le,{children:"Fase I: Contextualizaci\xf3n"})]}),(0,d.jsxs)(pe,{children:[(0,d.jsxs)(xe,{children:[(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"G\xe9nero Textual"}),(0,d.jsx)(ge,{children:ri.genero_textual})]}),(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Prop\xf3sito Comunicativo"}),(0,d.jsx)(ge,{children:ri.proposito_comunicativo})]}),(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Tipolog\xeda Textual"}),(0,d.jsx)(ge,{children:ri.tipologia_textual})]}),ri.autor&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Autor"}),(0,d.jsx)(ge,{children:ri.autor})]}),ri.audiencia_objetivo&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Audiencia Objetivo"}),(0,d.jsx)(ge,{children:ri.audiencia_objetivo})]})]}),ri.contexto_historico&&(0,d.jsxs)(Ce,{$darkMode:j,children:[(0,d.jsx)(me,{children:"Contexto Hist\xf3rico:"}),(0,d.jsx)("p",{children:ri.contexto_historico})]})]})]}),(0,d.jsxs)(se,{as:t.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.4,delay:.1},children:[(0,d.jsxs)(de,{children:[(0,d.jsx)(ce,{children:"\ud83d\udca1"}),(0,d.jsx)(le,{children:"Fase II: Contenido y Argumentaci\xf3n"})]}),(0,d.jsxs)(pe,{children:[ai.tesis_central&&(0,d.jsxs)(ue,{$darkMode:j,children:[(0,d.jsx)(fe,{children:"Tesis Central"}),(0,d.jsx)(ye,{children:ai.tesis_central})]}),(0,d.jsxs)(xe,{children:[(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Tipo de Argumentaci\xf3n"}),(0,d.jsx)(ge,{children:ai.tipo_argumentacion})]}),ai.tipo_razonamiento&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Tipo de Razonamiento"}),(0,d.jsx)(ge,{children:ai.tipo_razonamiento})]})]}),(null===(e=ai.hipotesis_secundarias)||void 0===e?void 0:e.length)>0&&(0,d.jsxs)(je,{children:[(0,d.jsx)(be,{children:"Hip\xf3tesis Secundarias:"}),(0,d.jsx)(ve,{children:ai.hipotesis_secundarias.map(((e,i)=>(0,d.jsx)($e,{children:e},i)))})]}),(null===(i=ai.argumentos_principales)||void 0===i?void 0:i.length)>0&&(0,d.jsxs)(je,{children:[(0,d.jsx)(be,{children:"Argumentos Principales:"}),ai.argumentos_principales.map(((e,i)=>(0,d.jsxs)(_e,{$darkMode:j,children:[(0,d.jsx)(we,{children:e.argumento||e}),e.evidencia&&(0,d.jsxs)(ke,{$darkMode:j,children:[(0,d.jsx)("strong",{children:"Evidencia:"})," ",e.evidencia]}),e.tipo&&(0,d.jsxs)(Ae,{children:[(0,d.jsxs)(ze,{$type:"info",children:["Tipo: ",e.tipo]}),e.solidez&&(0,d.jsxs)(ze,{$type:"alta"===e.solidez?"success":"media"===e.solidez?"warning":"neutral",children:["Solidez: ",e.solidez]})]})]},i)))]}),ai.estructura_logica&&(0,d.jsxs)(je,{children:[(0,d.jsx)(be,{children:"Estructura L\xf3gica:"}),(null===(o=ai.estructura_logica.premisas_principales)||void 0===o?void 0:o.length)>0&&(0,d.jsxs)("div",{style:{marginBottom:"16px"},children:[(0,d.jsx)(me,{style:{marginBottom:"8px",display:"block"},children:"Premisas Principales:"}),(0,d.jsx)(ve,{children:ai.estructura_logica.premisas_principales.map(((e,i)=>(0,d.jsx)($e,{children:e},i)))})]}),(null===(r=ai.estructura_logica.conclusiones)||void 0===r?void 0:r.length)>0&&(0,d.jsxs)("div",{style:{marginBottom:"16px"},children:[(0,d.jsx)(me,{style:{marginBottom:"8px",display:"block"},children:"Conclusiones:"}),(0,d.jsx)(ve,{children:ai.estructura_logica.conclusiones.map(((e,i)=>(0,d.jsx)($e,{children:e},i)))})]}),ai.estructura_logica.cadena_argumentativa&&(0,d.jsxs)(Ce,{$darkMode:j,children:[(0,d.jsx)(me,{children:"Cadena Argumentativa:"}),(0,d.jsx)("p",{children:ai.estructura_logica.cadena_argumentativa})]})]}),ai.fortalezas_argumentativas&&(0,d.jsxs)(Ce,{$darkMode:j,style:{borderLeftColor:"#10b981"},children:[(0,d.jsx)(me,{children:"Fortalezas Argumentativas:"}),(0,d.jsx)("p",{children:ai.fortalezas_argumentativas})]}),ai.limitaciones_o_fallos&&(0,d.jsxs)(Ce,{$darkMode:j,style:{borderLeftColor:"#f59e0b"},children:[(0,d.jsx)(me,{children:"Limitaciones o Posibles Fallos:"}),(0,d.jsx)("p",{children:ai.limitaciones_o_fallos})]})]})]}),(0,d.jsxs)(se,{as:t.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.4,delay:.2},children:[(0,d.jsxs)(de,{children:[(0,d.jsx)(ce,{children:"\ud83d\udcd6"}),(0,d.jsx)(le,{children:"Fase III: An\xe1lisis Formal y Ling\xfc\xedstico"})]}),(0,d.jsxs)(pe,{children:[(0,d.jsxs)(xe,{children:[(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Tipo de Estructura"}),(0,d.jsx)(ge,{children:si.tipo_estructura})]}),(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Registro Ling\xfc\xedstico"}),(0,d.jsx)(ge,{children:si.registro_linguistico})]}),(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Nivel de Complejidad"}),(0,d.jsx)(ze,{$type:"B\xe1sico"===si.nivel_complejidad?"success":"Intermedio"===si.nivel_complejidad?"warning":"info",children:si.nivel_complejidad})]})]}),si.coherencia_cohesion&&(0,d.jsxs)(Ce,{$darkMode:j,children:[(0,d.jsx)(me,{children:"Coherencia y Cohesi\xf3n:"}),(0,d.jsx)("p",{children:si.coherencia_cohesion})]}),si.analisis_sintactico&&(0,d.jsxs)(je,{children:[(0,d.jsx)(be,{children:"An\xe1lisis Sint\xe1ctico:"}),(0,d.jsxs)(xe,{children:[si.analisis_sintactico.tipo_oraciones&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Tipo de Oraciones"}),(0,d.jsx)(ge,{children:si.analisis_sintactico.tipo_oraciones})]}),si.analisis_sintactico.longitud_promedio&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Longitud Promedio"}),(0,d.jsx)(ge,{children:si.analisis_sintactico.longitud_promedio})]}),si.analisis_sintactico.complejidad_sintactica&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Complejidad Sint\xe1ctica"}),(0,d.jsx)(ge,{children:si.analisis_sintactico.complejidad_sintactica})]})]})]}),si.conectores_discursivos&&(0,d.jsxs)(je,{children:[(0,d.jsx)(be,{children:"Conectores Discursivos:"}),(null===(s=si.conectores_discursivos.causales)||void 0===s?void 0:s.length)>0&&(0,d.jsxs)("div",{style:{marginBottom:"12px"},children:[(0,d.jsx)(me,{style:{fontSize:"13px",marginBottom:"4px",display:"block"},children:"Causales:"}),(0,d.jsx)(Me,{children:si.conectores_discursivos.causales.map(((e,i)=>(0,d.jsx)(Se,{children:e},i)))})]}),(null===(c=si.conectores_discursivos.concesivos)||void 0===c?void 0:c.length)>0&&(0,d.jsxs)("div",{style:{marginBottom:"12px"},children:[(0,d.jsx)(me,{style:{fontSize:"13px",marginBottom:"4px",display:"block"},children:"Concesivos:"}),(0,d.jsx)(Me,{children:si.conectores_discursivos.concesivos.map(((e,i)=>(0,d.jsx)(Se,{children:e},i)))})]}),(null===(l=si.conectores_discursivos.temporales)||void 0===l?void 0:l.length)>0&&(0,d.jsxs)("div",{style:{marginBottom:"12px"},children:[(0,d.jsx)(me,{style:{fontSize:"13px",marginBottom:"4px",display:"block"},children:"Temporales:"}),(0,d.jsx)(Me,{children:si.conectores_discursivos.temporales.map(((e,i)=>(0,d.jsx)(Se,{children:e},i)))})]}),(null===(p=si.conectores_discursivos.comparativos)||void 0===p?void 0:p.length)>0&&(0,d.jsxs)("div",{style:{marginBottom:"12px"},children:[(0,d.jsx)(me,{style:{fontSize:"13px",marginBottom:"4px",display:"block"},children:"Comparativos:"}),(0,d.jsx)(Me,{children:si.conectores_discursivos.comparativos.map(((e,i)=>(0,d.jsx)(Se,{children:e},i)))})]}),si.conectores_discursivos.funcion&&(0,d.jsxs)(Ce,{$darkMode:j,style:{marginTop:"12px"},children:[(0,d.jsx)(me,{children:"Funci\xf3n de los Conectores:"}),(0,d.jsx)("p",{children:si.conectores_discursivos.funcion})]})]}),si.lexico_especializado&&(0,d.jsxs)(je,{children:[(0,d.jsx)(be,{children:"L\xe9xico Especializado:"}),(0,d.jsxs)(xe,{children:[si.lexico_especializado.campo_semantico&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Campo Sem\xe1ntico"}),(0,d.jsx)(ge,{children:si.lexico_especializado.campo_semantico})]}),si.lexico_especializado.densidad_conceptual&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Densidad Conceptual"}),(0,d.jsx)(ge,{children:si.lexico_especializado.densidad_conceptual})]})]}),(null===(x=si.lexico_especializado.terminos_tecnicos)||void 0===x?void 0:x.length)>0&&(0,d.jsxs)("div",{style:{marginTop:"12px"},children:[(0,d.jsx)(me,{style:{fontSize:"13px",marginBottom:"8px",display:"block"},children:"T\xe9rminos T\xe9cnicos:"}),(0,d.jsx)(Me,{children:si.lexico_especializado.terminos_tecnicos.map(((e,i)=>(0,d.jsx)(Se,{children:e},i)))})]})]}),si.tono_y_modalidad&&(0,d.jsxs)(je,{children:[(0,d.jsx)(be,{children:"Tono y Modalidad:"}),(0,d.jsxs)(xe,{children:[si.tono_y_modalidad.tono&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Tono"}),(0,d.jsx)(ge,{children:si.tono_y_modalidad.tono})]}),si.tono_y_modalidad.modalidad&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Modalidad"}),(0,d.jsx)(ge,{children:si.tono_y_modalidad.modalidad})]}),si.tono_y_modalidad.distancia_epistemica&&(0,d.jsxs)(he,{children:[(0,d.jsx)(me,{children:"Distancia Epist\xe9mica"}),(0,d.jsx)(ge,{children:si.tono_y_modalidad.distancia_epistemica})]})]})]}),(null===(h=si.figuras_retoricas)||void 0===h?void 0:h.length)>0&&(0,d.jsxs)(je,{children:[(0,d.jsx)(be,{children:"Figuras Ret\xf3ricas Detectadas:"}),(0,d.jsx)(Te,{children:si.figuras_retoricas.map(((e,i)=>{const o="string"===typeof e?{tipo:e,ejemplo:null}:e;return(0,d.jsxs)(Pe,{$darkMode:j,children:[(0,d.jsxs)(Ee,{$darkMode:j,children:[o.tipo,o.confidence&&(0,d.jsxs)(Fe,{$level:o.confidence,children:[(100*o.confidence).toFixed(0),"%"]})]}),o.ejemplo&&(0,d.jsxs)(Oe,{$darkMode:j,children:['"',o.ejemplo,'"']}),o.justificacion&&(0,d.jsxs)(Ie,{$darkMode:j,children:["\ud83d\udca1 ",o.justificacion]})]},i)}))})]})]})]}),((null===(m=li.voces_representadas)||void 0===m?void 0:m.length)>0||(null===(g=li.voces_silenciadas)||void 0===g?void 0:g.length)>0||li.ideologia_subyacente)&&(0,d.jsxs)(se,{as:t.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.4,delay:.25},children:[(0,d.jsxs)(de,{children:[(0,d.jsx)(ce,{children:"\ud83d\udd0d"}),(0,d.jsx)(le,{children:"Fase IV: An\xe1lisis Ideol\xf3gico-Discursivo (ACD)"})]}),(0,d.jsxs)(pe,{children:[li.ideologia_subyacente&&(0,d.jsxs)(Ye,{$darkMode:j,$variant:"ideology",children:[(0,d.jsxs)(Ue,{children:[(0,d.jsx)(Qe,{children:"\ud83c\udfad"}),"Marco Ideol\xf3gico Subyacente"]}),(0,d.jsx)(Xe,{children:li.ideologia_subyacente})]}),(null===(u=li.voces_representadas)||void 0===u?void 0:u.length)>0&&(0,d.jsxs)(Ye,{$darkMode:j,$variant:"represented",children:[(0,d.jsxs)(Ue,{children:[(0,d.jsx)(Qe,{children:"\ud83d\udce2"}),"Voces Representadas (legitimadas en el discurso)"]}),(0,d.jsx)(Ke,{children:li.voces_representadas.map(((e,i)=>(0,d.jsxs)(Ze,{$type:"represented",$darkMode:j,children:["\u2713 ",e]},i)))})]}),(null===(f=li.voces_silenciadas)||void 0===f?void 0:f.length)>0&&(0,d.jsxs)(Ye,{$darkMode:j,$variant:"silenced",children:[(0,d.jsxs)(Ue,{children:[(0,d.jsx)(Qe,{children:"\ud83d\udd07"}),"Voces Silenciadas (ausentes o marginadas)"]}),(0,d.jsx)(Ke,{children:li.voces_silenciadas.map(((e,i)=>(0,d.jsxs)(Ze,{$type:"silenced",$darkMode:j,children:["\u2717 ",e]},i)))}),(0,d.jsx)(ei,{$darkMode:j,children:"\u26a0\ufe0f Pregunta cr\xedtica: \xbfPor qu\xe9 estas perspectivas est\xe1n ausentes? \xbfQu\xe9 implicaciones tiene su exclusi\xf3n?"})]}),li.contraste_web&&(0,d.jsxs)(Ye,{$darkMode:j,$variant:"web",children:[(0,d.jsxs)(Ue,{children:[(0,d.jsx)(Qe,{children:"\ud83c\udf10"}),"Contraste con Contexto Web Actual"]}),li.contraste_web.texto_actualizado&&(0,d.jsxs)(Ce,{$darkMode:j,children:[(0,d.jsx)(me,{children:"Actualizaci\xf3n del Contexto:"}),(0,d.jsx)("p",{children:li.contraste_web.texto_actualizado})]}),li.contraste_web.datos_verificados&&(0,d.jsxs)(Ce,{$darkMode:j,children:[(0,d.jsx)(me,{children:"Verificaci\xf3n de Datos:"}),(0,d.jsx)("p",{children:li.contraste_web.datos_verificados})]})]})]})]}),(null===di||void 0===di?void 0:di.length)>0&&(0,d.jsxs)(se,{as:t.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.4,delay:.3},children:[(0,d.jsxs)(de,{children:[(0,d.jsx)(ce,{children:"\ud83c\udf10"}),(0,d.jsx)(le,{children:"Fuentes Web Consultadas"})]}),(0,d.jsxs)(pe,{children:[ci&&(0,d.jsx)(Ce,{$darkMode:j,children:(0,d.jsx)("p",{children:ci})}),(0,d.jsx)(Ne,{children:di.map(((e,i)=>(0,d.jsxs)(De,{$darkMode:j,children:[(0,d.jsx)(Be,{children:i+1}),(0,d.jsxs)(Le,{children:[(0,d.jsx)(Ge,{children:e.title}),e.snippet&&(0,d.jsxs)(Re,{children:[e.snippet.substring(0,150),"..."]}),(0,d.jsx)(Je,{href:e.url,target:"_blank",rel:"noopener noreferrer",children:"\ud83d\udd17 Ver fuente completa"})]})]},i)))})]})]}),(0,d.jsx)(z,{glossary:$,loading:w,onExport:I,onTermClick:D,theme:E}),(0,d.jsx)(We,{children:(0,d.jsx)(Ve,{onClick:ii,theme:E,children:"\ud83d\udce5 Exportar An\xe1lisis Completo"})}),(0,d.jsxs)(He,{children:[(0,d.jsxs)(qe,{children:["\u23f1\ufe0f An\xe1lisis generado: ",new Date(ti.analysis_timestamp).toLocaleString("es-ES")]}),(0,d.jsxs)(qe,{children:["\ud83d\udcca Tiempo de procesamiento: ",ti.processing_time_ms,"ms"]})]}),(0,d.jsx)(G.A,{icon:"\ud83c\udfaf",title:"Siguiente Paso: Practica con Actividades",description:"Ahora que has analizado el texto cr\xedticamente (marco ideol\xf3gico, voces representadas/silenciadas), ve a la pesta\xf1a Actividades para practicar la identificaci\xf3n de dimensiones cr\xedticas con feedback formativo.",actionLabel:"Ir a Actividades \u2192",onAction:()=>{window.dispatchEvent(new CustomEvent("app-change-tab",{detail:{tabId:"actividades"}}))},theme:E,variant:"success"}),(0,d.jsx)(L,{term:A,definition:M,isOpen:!!A,loading:T,onClose:B,onWebSearch:e=>{const i=encodeURIComponent(e+" definici\xf3n educativa");window.open(`https://www.google.com/search?q=${i}`,"_blank","noopener,noreferrer")},theme:E})]})}},6735:(e,i,o)=>{o.d(i,{HQ:()=>s,x8:()=>a});var n=o(5803),t=o(1382);const r={openai:"gpt-3.5-turbo",deepseek:"deepseek-chat",gemini:"gemini-pro"};async function a(e){let{messages:i,provider:o="deepseek",model:a,apiKey:s,temperature:d=.7,max_tokens:c=800,signal:l,timeoutMs:p=45e3}=e;const x=`${(0,t.wE)()}/api/chat/completion`,h={provider:o,model:a||r[o]||r.openai,messages:i,temperature:d,max_tokens:c,...s?{apiKey:s}:{}},m=await(0,n.u9)(x,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(h),signal:l},p);if(!m.ok){const e=await m.text().catch((()=>""));throw new Error(e||`HTTP ${m.status}`)}return m.json()}function s(e){var i,o,n;return null!==e&&void 0!==e&&null!==(i=e.choices)&&void 0!==i&&null!==(o=i[0])&&void 0!==o&&null!==(n=o.message)&&void 0!==n&&n.content?e.choices[0].message.content:null!==e&&void 0!==e&&e.content?e.content:null!==e&&void 0!==e&&e.message?e.message:null!==e&&void 0!==e&&e.result?e.result:void 0}},7653:(e,i,o)=>{o.d(i,{A:()=>a});o(9950);var n=o(4752),t=o(1132),r=o(4414);const a=e=>{let{icon:i,title:o,description:n,actionLabel:a,onAction:m,theme:g,variant:u="primary"}=e;const f={primary:{bgGradient:`linear-gradient(135deg, ${g.primary}10, ${g.success}10)`,borderColor:`${g.primary}40`,iconColor:g.primary,buttonBg:g.primary},success:{bgGradient:`linear-gradient(135deg, ${g.success}10, ${g.primary}10)`,borderColor:`${g.success}40`,iconColor:g.success,buttonBg:g.success},warning:{bgGradient:`linear-gradient(135deg, ${g.warning}10, ${g.primary}10)`,borderColor:`${g.warning}40`,iconColor:g.warning,buttonBg:g.warning}},y=f[u]||f.primary;return(0,r.jsxs)(s,{as:t.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.4,ease:"easeOut"},$bgGradient:y.bgGradient,$borderColor:y.borderColor,children:[(0,r.jsxs)(d,{children:[(0,r.jsx)(c,{$iconColor:y.iconColor,children:i}),(0,r.jsxs)(l,{children:[(0,r.jsx)(p,{theme:g,children:o}),(0,r.jsx)(x,{theme:g,children:n})]})]}),m&&a&&(0,r.jsx)(h,{onClick:m,$buttonBg:y.buttonBg,whileHover:{scale:1.02,y:-2},whileTap:{scale:.98},children:a})]})},s=n.Ay.div`
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
`,d=n.Ay.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`,c=n.Ay.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${e=>e.$iconColor}15;
  border-radius: 50%;
  font-size: 1.5rem;
  flex-shrink: 0;
`,l=n.Ay.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,p=n.Ay.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${e=>e.theme.text||e.theme.textPrimary};
`,x=n.Ay.p`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${e=>e.theme.textSecondary||e.theme.textMuted};
`,h=(0,n.Ay)(t.P.button)`
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
`}}]);