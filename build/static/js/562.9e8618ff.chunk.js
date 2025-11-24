"use strict";(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[562],{6562:(e,a,r)=>{r.r(a),r.d(a,{default:()=>j});var i=r(9950),n=r(4752),t=r(1132),o=r(3291),s=r(387),c=r(7424),l=r(6735),d=r(8864);const m="metacognicion_etica_ia";function u(e){let a=e.trim();a=a.replace(/```json\s*/g,""),a=a.replace(/```\s*/g,"");const r=a.match(/\{[\s\S]*\}/);return r&&(a=r[0]),a}async function p(e,a,r,i,n){const t=function(e,a,r,i,n){return`Eres un evaluador experto en \xe9tica del uso de IA en educaci\xf3n.\n\nREGISTRO DE USO DE IA DEL ESTUDIANTE:\n\n**Interacciones con IA:**\n${e.length>0?`Total de interacciones: ${e.length}\nEjemplos:\n${e.slice(0,3).map(((e,a)=>`${a+1}. ${e.question}`)).join("\n")}`:"No hay interacciones registradas"}\n\n**Verificaci\xf3n de fuentes:**\n${a||"(No proporcionado)"}\n\n**Proceso de uso de IA:**\n${r||"(No proporcionado)"}\n\n**Reflexi\xf3n \xe9tica:**\n${i||"(No proporcionado)"}\n\n**Declaraciones completadas:**\n${Object.entries(n).map((e=>{let[a,r]=e;return`- ${a}: ${r?"\u2713 S\xed":"\u2717 No"}`})).join("\n")}\n\n---\n\nTAREA: Eval\xfaa la TRANSPARENCIA Y REGISTRO seg\xfan estos 3 criterios:\n\n**Criterio 1: Registro y Transparencia (registro_transparencia)**\n- \xbfDocumenta interacciones con IA?\n- \xbfDescribe el proceso de uso con claridad?\n- \xbfEs trazable su uso de IA?\n- Nivel (1-4): 1=Registro inexistente/incompleto, 2=Parcial e inconsistente, 3=Documenta interacciones clave, 4=Trazabilidad detallada y autoconsciente\n\n**Criterio 2: Evaluaci\xf3n Cr\xedtica de la Herramienta (evaluacion_critica_herramienta)**\n- \xbfVerifica informaci\xf3n con otras fuentes?\n- \xbfDescribe pasos de verificaci\xf3n?\n- \xbfIdentifica limitaciones de la IA?\n- Nivel (1-4): 1=Acepta como verdad absoluta, 2=Reconoce necesidad sin pasos claros, 3=Describe verificaci\xf3n e identifica limitaciones, 4=Analiza sesgos y c\xf3mo influyeron\n\n**Criterio 3: Agencia y Responsabilidad (agencia_responsabilidad)**\n- \xbfDeclara responsabilidad sobre su trabajo?\n- \xbfDiferencia entre su pensamiento y el de la IA?\n- \xbfDemuestra agencia intelectual?\n- Nivel (1-4): 1=Dependencia alta sin reflexi\xf3n, 2=Declara responsabilidad con reflexi\xf3n limitada, 3=Diferencia decisiones propias y andamiaje, 4=Profunda reflexi\xf3n sobre influencia e agencia\n\nIMPORTANTE: Responde SOLO con JSON v\xe1lido, sin explicaciones adicionales.\n\nFormato de respuesta JSON:\n{\n  "criterios_evaluados": {\n    "registro_transparencia": {\n      "nivel": 1-4,\n      "tiene_registro_completo": true/false,\n      "describe_proceso_claramente": true/false,\n      "es_trazable": true/false\n    },\n    "evaluacion_critica_herramienta": {\n      "nivel": 1-4,\n      "verifica_fuentes": true/false,\n      "describe_pasos_verificacion": true/false,\n      "identifica_limitaciones": true/false\n    },\n    "agencia_responsabilidad": {\n      "nivel": 1-4,\n      "declara_responsabilidad": true/false,\n      "diferencia_pensamiento_propio": true/false,\n      "demuestra_agencia": true/false\n    }\n  },\n  "fortalezas_registro": ["fortaleza 1", "fortaleza 2"],\n  "mejoras_registro": ["mejora 1", "mejora 2"]\n}`}(e,a,r,i,n);try{const e=await(0,l.x8)({provider:"deepseek",model:"deepseek-chat",messages:[{role:"user",content:t}],temperature:.2,max_tokens:1500,response_format:{type:"json_object"},timeoutMs:3e4}),a=(0,l.HQ)(e);console.log("\ud83d\udd0d [DeepSeek BitacoraEticaIA] Respuesta cruda:",a.slice(0,200));const r=u(a);console.log("\u2705 [DeepSeek BitacoraEticaIA] Respuesta limpia:",r.slice(0,200));const i=JSON.parse(r);if(!i.criterios_evaluados)throw new Error("Respuesta sin criterios_evaluados");return i}catch(o){return console.error("\u274c Error en evaluaci\xf3n DeepSeek (BitacoraEticaIA):",o),{criterios_evaluados:{registro_transparencia:{nivel:3,documenta_interacciones:!0,describe_proceso:!0},evaluacion_critica_herramienta:{nivel:3,identifica_limitaciones:!0,verifica_informacion:!0},agencia_responsabilidad:{nivel:3,asume_responsabilidad:!0,demuestra_agencia:!0}},fortalezas_registro:["An\xe1lisis en proceso"],mejoras_transparencia:["Error en evaluaci\xf3n autom\xe1tica"],_error:o.message}}}async function h(e,a,r,i,n,t){const o=function(e,a,r,i,n,t){return`Eres un evaluador experto en metacognici\xf3n y \xe9tica del uso de IA en educaci\xf3n.\n\nREFLEXI\xd3N \xc9TICA DEL ESTUDIANTE:\n\n**Verificaci\xf3n de fuentes:**\n${a||"(No proporcionado)"}\n\n**Proceso de uso de IA:**\n${r||"(No proporcionado)"}\n\n**Reflexi\xf3n \xe9tica:**\n${i||"(No proporcionado)"}\n\n**Evaluaci\xf3n estructural previa (DeepSeek):**\n${JSON.stringify(t.criterios_evaluados,null,2)}\n\n---\n\nTAREA: Eval\xfaa la PROFUNDIDAD METACOGNITIVA de la reflexi\xf3n \xe9tica. No repitas la evaluaci\xf3n estructural.\n\nEnf\xf3cate en:\n\n1. **Conciencia Cr\xedtica**: \xbfDemuestra comprensi\xf3n profunda de los dilemas \xe9ticos del uso de IA?\n2. **Reflexi\xf3n Aut\xe9ntica**: \xbfEs reflexi\xf3n genuina o solo cumple con el requisito?\n3. **Reconocimiento de Complejidad**: \xbfReconoce tensiones entre autonom\xeda y ayuda de IA?\n\nEjemplos de reflexi\xf3n B\xc1SICA vs AVANZADA:\n\nB\xc1SICO:\n- Verificaci\xf3n: "Busqu\xe9 en Google algunas cosas."\n- Proceso: "Us\xe9 la IA para entender mejor."\n- Reflexi\xf3n: "Aprend\xed que no debo confiar en la IA."\n\nAVANZADO:\n- Verificaci\xf3n: "Contrat\xe9 la definici\xf3n de 'hegemon\xeda' que me dio la IA con el Diccionario de la RAE y con el art\xedculo de Gramsci (1971). Encontr\xe9 que la IA simplific\xf3 excesivamente el concepto omitiendo su dimensi\xf3n cultural."\n- Proceso: "Us\xe9 la IA como andamiaje para conceptos complejos, pero procur\xe9 reformular las explicaciones con mis propias palabras tras comprender. Por ejemplo, ped\xed que me explicara 'an\xe1lisis cr\xedtico del discurso', pero luego lo apliqu\xe9 yo mismo al texto sin depender de la IA para el an\xe1lisis."\n- Reflexi\xf3n: "Me di cuenta de que existe una tensi\xf3n entre aprovechar la IA como herramienta y mantener mi agencia intelectual. Si conf\xedo ciegamente, pierdo la oportunidad de desarrollar pensamiento cr\xedtico propio. Pero rechazarla completamente tambi\xe9n ser\xeda ingenuo. La clave est\xe1 en usarla cr\xedticamente: verificar, contrastar, y siempre mantener mi criterio como filtro final."\n\nIMPORTANTE: Responde SOLO con JSON v\xe1lido.\n\nFormato de respuesta JSON:\n{\n  "profundidad_metacognitiva": {\n    "registro_transparencia": {\n      "demuestra_autoconsciencia": true/false,\n      "reflexiona_sobre_proceso": true/false,\n      "comentario": "Breve an\xe1lisis"\n    },\n    "evaluacion_critica_herramienta": {\n      "identifica_sesgos_ia": true/false,\n      "comprende_limitaciones": true/false,\n      "comentario": "Breve an\xe1lisis"\n    },\n    "agencia_responsabilidad": {\n      "reconoce_tension_autonomia_ayuda": true/false,\n      "demuestra_postura_etica_madura": true/false,\n      "comentario": "Breve an\xe1lisis"\n    }\n  },\n  "fortalezas_metacognitivas": ["insight 1", "insight 2"],\n  "oportunidades_profundizacion": ["sugerencia 1", "sugerencia 2"],\n  "nivel_reflexion_etica": 1-4\n}`}(0,a,r,i,0,t);try{const e=await(0,l.x8)({provider:"openai",model:"gpt-4o-mini",messages:[{role:"user",content:o}],temperature:.3,max_tokens:1800,response_format:{type:"json_object"},timeoutMs:45e3}),a=(0,l.HQ)(e);console.log("\ud83d\udd0d [OpenAI BitacoraEticaIA] Respuesta cruda:",a.slice(0,200));const r=u(a);console.log("\u2705 [OpenAI BitacoraEticaIA] Respuesta limpia:",r.slice(0,200));const i=JSON.parse(r);if(!i.profundidad_metacognitiva||!i.nivel_reflexion_etica)throw new Error("Respuesta sin profundidad_metacognitiva");return i}catch(s){return console.error("\u274c Error en evaluaci\xf3n OpenAI (BitacoraEticaIA):",s),{profundidad_metacognitiva:{registro_transparencia:{demuestra_autoconsciencia:!0,reflexiona_sobre_proceso:!0,comentario:"An\xe1lisis b\xe1sico"},evaluacion_critica_herramienta:{identifica_sesgos_ia:!0,comprende_limitaciones:!0,comentario:"An\xe1lisis b\xe1sico"},agencia_responsabilidad:{mantiene_agencia:!0,critica_sobre_dependencia:!0,comentario:"An\xe1lisis b\xe1sico"}},fortalezas_profundidad:["An\xe1lisis en proceso"],oportunidades_profundizacion:["Error en evaluaci\xf3n autom\xe1tica"],nivel_reflexion_etica:3,_error:s.message}}}function g(e){const a=e.toLowerCase();return a.includes("registro")||a.includes("transparencia")||a.includes("documenta")?"registro_transparencia":a.includes("verific")||a.includes("cr\xedtica")||a.includes("fuente")||a.includes("sesgo")?"evaluacion_critica_herramienta":a.includes("agencia")||a.includes("responsabilidad")||a.includes("autor\xeda")||a.includes("autonom\xeda")?"agencia_responsabilidad":null}async function f(e){let{tutorInteractions:a,verificacionFuentes:r,procesoUsoIA:i,reflexionEtica:n,declaraciones:t}=e;console.log("\ud83e\udd16 [BitacoraEticaIA] Iniciando evaluaci\xf3n dual...");const o=Date.now();try{console.log("\ud83d\udcca Evaluando transparencia y registro (DeepSeek)...");const e=await p(a,r,i,n,t);console.log("\ud83e\udde0 Evaluando profundidad metacognitiva (OpenAI)...");const s=await h(0,r,i,n,0,e);console.log("\ud83d\udd27 Combinando feedback dual...");const c=function(e,a){const r={registro_transparencia:{nivel:e.criterios_evaluados.registro_transparencia.nivel,fortalezas:[],mejoras:[]},evaluacion_critica_herramienta:{nivel:e.criterios_evaluados.evaluacion_critica_herramienta.nivel,fortalezas:[],mejoras:[]},agencia_responsabilidad:{nivel:e.criterios_evaluados.agencia_responsabilidad.nivel,fortalezas:[],mejoras:[]}};a.profundidad_metacognitiva.registro_transparencia.demuestra_autoconsciencia?r.registro_transparencia.fortalezas.push("Demuestra autoconciencia sobre el proceso de uso de IA"):r.registro_transparencia.mejoras.push("Desarrolla mayor autoconciencia sobre c\xf3mo usas la IA en tu aprendizaje"),a.profundidad_metacognitiva.registro_transparencia.reflexiona_sobre_proceso?r.registro_transparencia.fortalezas.push("Reflexiona cr\xedticamente sobre el proceso"):r.registro_transparencia.mejoras.push("Reflexiona m\xe1s profundamente sobre tu proceso de uso de IA"),a.profundidad_metacognitiva.evaluacion_critica_herramienta.identifica_sesgos_ia?r.evaluacion_critica_herramienta.fortalezas.push("Identifica sesgos o limitaciones de la IA"):r.evaluacion_critica_herramienta.mejoras.push("Intenta identificar posibles sesgos o limitaciones de la IA que usaste"),a.profundidad_metacognitiva.evaluacion_critica_herramienta.comprende_limitaciones?r.evaluacion_critica_herramienta.fortalezas.push("Comprende las limitaciones de la herramienta"):r.evaluacion_critica_herramienta.mejoras.push("Profundiza en las limitaciones espec\xedficas de la IA como herramienta educativa"),a.profundidad_metacognitiva.agencia_responsabilidad.reconoce_tension_autonomia_ayuda?r.agencia_responsabilidad.fortalezas.push("Reconoce la tensi\xf3n entre autonom\xeda intelectual y ayuda de IA"):r.agencia_responsabilidad.mejoras.push("Reflexiona sobre la tensi\xf3n entre usar IA como herramienta y mantener tu autonom\xeda intelectual"),a.profundidad_metacognitiva.agencia_responsabilidad.demuestra_postura_etica_madura?r.agencia_responsabilidad.fortalezas.push("Demuestra postura \xe9tica madura sobre el uso de IA"):r.agencia_responsabilidad.mejoras.push("Desarrolla una postura \xe9tica m\xe1s clara sobre tu responsabilidad al usar IA"),e.fortalezas_registro.forEach((e=>{const a=g(e);a&&r[a]&&r[a].fortalezas.push(e)})),e.mejoras_registro.forEach((e=>{const a=g(e);a&&r[a]&&r[a].mejoras.push(e)})),a.fortalezas_metacognitivas.forEach((e=>r.registro_transparencia.fortalezas.push(e))),a.oportunidades_profundizacion.forEach((e=>r.registro_transparencia.mejoras.push(e)));const i=(r.registro_transparencia.nivel+r.evaluacion_critica_herramienta.nivel+r.agencia_responsabilidad.nivel)/3,n=Math.min(4,Math.round(i+.3*(a.nivel_reflexion_etica-i)));return{dimension:m,nivel_global:n,criterios:r,evidencias_deepseek:e.criterios_evaluados,profundidad_openai:a.profundidad_metacognitiva,fuentes:["DeepSeek (transparencia y registro)","OpenAI (profundidad metacognitiva)"]}}(e,s),l=(0,d.getDimension)(m),u=(0,d.scoreToLevelDescriptor)(m,c.nivel_global),f={...c,dimension_label:(null===l||void 0===l?void 0:l.nombre)||"Metacognici\xf3n \xc9tica del Uso de IA",dimension_description:(null===l||void 0===l?void 0:l.descripcion)||"",nivel_descriptor:u.descriptor,duracion_ms:Date.now()-o};return console.log(`\u2705 Evaluaci\xf3n completada en ${f.duracion_ms}ms`),console.log(`\ud83d\udcca Nivel global: ${c.nivel_global}/4`),f}catch(s){throw console.error("\u274c Error en evaluaci\xf3n dual de BitacoraEticaIA:",s),s}}var x=r(5361),v=r(7525),b=r(539),y=r(4414);const j=()=>{var e,a,r,n,l,d,m;const{modoOscuro:u,completeAnalysis:p,setError:h,updateRubricScore:g}=(0,i.useContext)(s.BR),{progression:j}=(0,c.usePedagogy)(),[Le,Ge]=(0,i.useState)(""),[Je,He]=(0,i.useState)(""),[Ve,Qe]=(0,i.useState)(""),[Ye,Ze]=(0,i.useState)({respuestasPropias:!1,verificacionRealizada:!1,usoTransparente:!1,contrasteMultifuente:!1}),[Xe,Ke]=(0,i.useState)(null),[We,ea]=(0,i.useState)(!1),[aa,ra]=(0,i.useState)(null),[ia,na]=(0,i.useState)([]);(0,i.useEffect)((()=>{(()=>{try{const e=JSON.parse(localStorage.getItem("tutorInteractionsLog")||"[]");na(e)}catch(e){console.error("Error cargando log del tutor:",e),na([])}})();const e=JSON.parse(localStorage.getItem("ethicalReflections")||"{}");e.verificacionFuentes&&Ge(e.verificacionFuentes),e.procesoUsoIA&&He(e.procesoUsoIA),e.reflexionEtica&&Qe(e.reflexionEtica),e.declaraciones&&Ze(e.declaraciones);const a=e=>{console.log("\ud83c\udfaf [BitacoraEticaIA] Evento recibido:",e.detail);const a=e.detail;na((e=>{const r=[...e,a];return console.log("\ud83d\udcdd [BitacoraEticaIA] Guardando en localStorage:",r),localStorage.setItem("tutorInteractionsLog",JSON.stringify(r)),r}))};return console.log("\ud83d\udc42 [BitacoraEticaIA] Registrando listener para tutor-interaction-logged"),window.addEventListener("tutor-interaction-logged",a),()=>{console.log("\ud83d\udd0c [BitacoraEticaIA] Removiendo listener"),window.removeEventListener("tutor-interaction-logged",a)}}),[]);const ta=`bitacora_etica_ia_${(null===p||void 0===p||null===(e=p.metadata)||void 0===e?void 0:e.document_id)||"global"}`;(0,x.Ay)(ta,{enabled:!0,studentAnswers:{verificacionFuentes:Le,procesoUsoIA:Je,reflexionEtica:Ve,declaraciones:Ye},aiFeedbacks:{bitacora:Xe},onRehydrate:e=>{var a,r,i,n,t;null!==(a=e.student_answers)&&void 0!==a&&a.verificacionFuentes&&Ge(e.student_answers.verificacionFuentes),null!==(r=e.student_answers)&&void 0!==r&&r.procesoUsoIA&&He(e.student_answers.procesoUsoIA),null!==(i=e.student_answers)&&void 0!==i&&i.reflexionEtica&&Qe(e.student_answers.reflexionEtica),null!==(n=e.student_answers)&&void 0!==n&&n.declaraciones&&Ze(e.student_answers.declaraciones),null!==(t=e.ai_feedbacks)&&void 0!==t&&t.bitacora&&Ke(e.ai_feedbacks.bitacora)}}),(0,i.useEffect)((()=>{const e={verificacionFuentes:Le,procesoUsoIA:Je,reflexionEtica:Ve,declaraciones:Ye};localStorage.setItem("ethicalReflections",JSON.stringify(e))}),[Le,Je,Ve,Ye]);const oa=e=>{Ze((a=>({...a,[e]:!a[e]})))},sa=(0,i.useCallback)((()=>{window.confirm("\xbfEst\xe1s seguro de que quieres borrar todo el historial de interacciones con el tutor IA?")&&(localStorage.removeItem("tutorInteractionsLog"),na([]))}),[]),ca=(0,i.useCallback)((()=>{const e={timestamp:(new Date).toISOString(),interaccionesTutor:ia,reflexiones:{verificacionFuentes:Le,procesoUsoIA:Je,reflexionEtica:Ve},declaraciones:Ye,evaluacion:la()},a=new Blob([JSON.stringify(e,null,2)],{type:"application/json"}),r=URL.createObjectURL(a),i=document.createElement("a");i.href=r,i.download=`bitacora-etica-ia-${(new Date).toISOString().split("T")[0]}.json`,i.click(),URL.revokeObjectURL(r)}),[ia,Le,Je,Ve,Ye]),la=(0,i.useCallback)((()=>{let e=0,a=0,r=0;ia.length>0&&(e+=3),ia.length>=5&&(e+=2),Je.length>100&&(e+=3),Je.length>300&&(e+=2),Le.length>100&&(a+=3),Le.length>300&&(a+=2),Ye.contrasteMultifuente&&(a+=3),(Le.includes("fuente")||Le.includes("verificar"))&&(a+=2);return r=2.5*Object.values(Ye).filter(Boolean).length,Ve.length>100&&(r=Math.min(10,r+2)),{dimensiones:{registro:Math.min(10,e),evaluacionCritica:Math.min(10,a),agencia:Math.min(10,r)},promedio:((Math.min(10,e)+Math.min(10,a)+Math.min(10,r))/3).toFixed(1)}}),[ia,Le,Je,Ve,Ye]),da=la(),ma=Le.length>=50&&Je.length>=50&&Ve.length>=50&&Object.values(Ye).filter(Boolean).length>=2,ua=(0,i.useCallback)((async()=>{if(!ma)return;ea(!0),h(null),ra({label:"Iniciando evaluaci\xf3n \xe9tica...",icon:"\ud83d\udd0d",duration:2});const e=[setTimeout((()=>ra({label:"Analizando transparencia...",icon:"\ud83d\udcdd",duration:5})),1e3),setTimeout((()=>ra({label:"Evaluando con DeepSeek...",icon:"\ud83e\udd16",duration:12})),3500),setTimeout((()=>ra({label:"Evaluando con OpenAI...",icon:"\ud83e\udde0",duration:12})),15500),setTimeout((()=>ra({label:"Combinando feedback...",icon:"\ud83d\udd27",duration:4})),27500)];try{const a=await f({tutorInteractions:ia,verificacionFuentes:Le,procesoUsoIA:Je,reflexionEtica:Ve,declaraciones:Ye});e.forEach(clearTimeout),Ke(a),g("rubrica5",{score:2.5*a.nivel_global,nivel:a.nivel_global,artefacto:"BitacoraEticaIA",criterios:a.criterios})}catch(a){console.error("Error evaluando Bit\xe1cora \xc9tica de IA:",a),h(a.message||"Error al evaluar la bit\xe1cora"),e.forEach(clearTimeout)}finally{ea(!1),ra(null)}}),[ma,ia,Le,Je,Ve,Ye,h,g]),pa={background:u?"#1a1a1a":"#f8f9fa",cardBg:u?"#2a2a2a":"#ffffff",surface:u?"#333":"#f5f5f5",border:u?"#444":"#e0e0e0",textPrimary:u?"#fff":"#333",textSecondary:u?"#aaa":"#666",textMuted:u?"#888":"#999",primary:"#2196F3",success:"#4CAF50",warning:"#FF9800",danger:"#F44336",purple:"#9C27B0"};return(0,y.jsxs)(_,{theme:pa,children:[(0,y.jsxs)(A,{theme:pa,children:[(0,y.jsxs)($,{theme:pa,children:[(0,y.jsx)("span",{children:"\ud83e\udd16"}),"Bit\xe1cora \xc9tica del Uso de IA"]}),(0,y.jsx)(I,{theme:pa,children:"R\xfabrica 5: Metacognici\xf3n sobre el uso responsable y \xe9tico de herramientas de inteligencia artificial en tu proceso de aprendizaje."})]}),(0,y.jsxs)(w,{theme:pa,children:[(0,y.jsx)(E,{theme:pa,children:"\ud83d\udcca Tu Evaluaci\xf3n Actual - R\xfabrica 5"}),(0,y.jsxs)(z,{children:[(0,y.jsxs)(k,{theme:pa,$color:pa.primary,children:[(0,y.jsx)(S,{children:"\ud83d\udcdd"}),(0,y.jsx)(R,{children:"Registro y Transparencia"}),(0,y.jsxs)(D,{children:[da.dimensiones.registro,"/10"]}),(0,y.jsx)(C,{children:"\xbfDocumentas el uso de IA?"})]}),(0,y.jsxs)(k,{theme:pa,$color:pa.warning,children:[(0,y.jsx)(S,{children:"\ud83d\udd0d"}),(0,y.jsx)(R,{children:"Evaluaci\xf3n Cr\xedtica"}),(0,y.jsxs)(D,{children:[da.dimensiones.evaluacionCritica,"/10"]}),(0,y.jsx)(C,{children:"\xbfContrastas con otras fuentes?"})]}),(0,y.jsxs)(k,{theme:pa,$color:pa.success,children:[(0,y.jsx)(S,{children:"\u270d\ufe0f"}),(0,y.jsx)(R,{children:"Agencia y Responsabilidad"}),(0,y.jsxs)(D,{children:[da.dimensiones.agencia,"/10"]}),(0,y.jsx)(C,{children:"\xbfAsumes autor\xeda clara?"})]})]}),(0,y.jsxs)(N,{theme:pa,children:[(0,y.jsx)("span",{children:"Promedio R\xfabrica 5:"}),(0,y.jsxs)(O,{$score:parseFloat(da.promedio),children:[da.promedio,"/10"]})]})]}),(0,y.jsxs)(T,{theme:pa,children:[(0,y.jsxs)(P,{children:[(0,y.jsxs)(B,{theme:pa,children:[(0,y.jsx)("span",{children:"\ud83e\udd16"}),"1. Registro de Interacciones con el Tutor IA"]}),(0,y.jsx)(F,{children:(0,y.jsx)(U,{onClick:sa,theme:pa,$variant:"danger",children:"\ud83d\uddd1\ufe0f Limpiar Historial"})})]}),(0,y.jsx)(M,{theme:pa,children:"Este es el registro autom\xe1tico de todas tus consultas al tutor IA durante la lectura. La transparencia en el uso de IA es fundamental para un aprendizaje \xe9tico."}),0===ia.length?(0,y.jsxs)(re,{theme:pa,children:[(0,y.jsx)(ie,{children:"\ud83d\udced"}),(0,y.jsx)(ne,{children:"No hay interacciones registradas todav\xeda"}),(0,y.jsx)(te,{children:'Usa el tutor IA en la pesta\xf1a "Lectura Guiada" para que se registren aqu\xed autom\xe1ticamente'})]}):(0,y.jsx)(q,{children:ia.slice().reverse().map(((e,a)=>(0,y.jsxs)(L,{as:t.P.div,initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{delay:.05*a},theme:pa,children:[(0,y.jsxs)(G,{children:[(0,y.jsxs)(J,{theme:pa,children:["\ud83d\udd52 ",new Date(e.timestamp).toLocaleString("es-ES")]}),e.bloomLevel&&(0,y.jsxs)(H,{theme:pa,children:["Bloom: ",e.bloomLevel]})]}),(0,y.jsx)(V,{theme:pa,children:"Pregunta al tutor:"}),(0,y.jsx)(Q,{theme:pa,children:e.question}),e.context&&(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(Y,{theme:pa,children:"Contexto:"}),(0,y.jsx)(Z,{theme:pa,children:e.context})]}),e.tutorMode&&(0,y.jsx)(X,{theme:pa,children:e.tutorMode})]},a)))}),(0,y.jsx)(K,{theme:pa,children:(0,y.jsxs)(W,{children:[(0,y.jsx)(ee,{children:"Total de consultas:"}),(0,y.jsx)(ae,{children:ia.length})]})})]}),(0,y.jsxs)(T,{theme:pa,children:[(0,y.jsxs)(B,{theme:pa,children:[(0,y.jsx)("span",{children:"\ud83e\udde0"}),"2. Reflexi\xf3n Metacognitiva sobre el Uso de IA"]}),(0,y.jsx)(M,{theme:pa,children:"Reflexiona cr\xedticamente sobre c\xf3mo has usado la inteligencia artificial en tu proceso de aprendizaje."}),(0,y.jsxs)(oe,{theme:pa,children:[(0,y.jsx)(se,{children:"\ud83d\udd0d"}),(0,y.jsx)(ce,{children:"\xbfQu\xe9 informaci\xf3n de la IA verificaste en otras fuentes?"}),(0,y.jsx)(le,{children:"Describe qu\xe9 fuentes consultaste (libros, art\xedculos acad\xe9micos, expertos) y qu\xe9 informaci\xf3n contrastaste."}),(0,y.jsx)(de,{value:Le,onChange:e=>Ge(e.target.value),placeholder:"Ej: Verifiqu\xe9 la definici\xf3n de 'hegemon\xeda' consultando el diccionario de la RAE y compar\xe1ndola con la definici\xf3n que me dio la IA. Tambi\xe9n contrat\xe9 el contexto hist\xf3rico mencionado con mi libro de texto...",rows:5,theme:pa}),(0,y.jsxs)(me,{theme:pa,children:[Le.length," caracteres"]})]}),(0,y.jsxs)(oe,{theme:pa,children:[(0,y.jsx)(se,{children:"\ud83e\udd14"}),(0,y.jsx)(ce,{children:"\xbfC\xf3mo usaste la IA? (gu\xeda vs. respuestas directas)"}),(0,y.jsx)(le,{children:"Explica si usaste la IA como gu\xeda para explorar conceptos o si buscaste respuestas directas. \xbfProcesaste la informaci\xf3n cr\xedticamente?"}),(0,y.jsx)(de,{value:Je,onChange:e=>He(e.target.value),placeholder:"Ej: Us\xe9 el tutor principalmente para aclarar conceptos complejos como 'an\xe1lisis cr\xedtico del discurso'. No copi\xe9 las respuestas directamente, sino que las us\xe9 como punto de partida para mi propia investigaci\xf3n...",rows:5,theme:pa}),(0,y.jsxs)(me,{theme:pa,children:[Je.length," caracteres"]})]}),(0,y.jsxs)(oe,{theme:pa,children:[(0,y.jsx)(se,{children:"\ud83d\udcad"}),(0,y.jsx)(ce,{children:"Reflexi\xf3n \xe9tica: \xbfQu\xe9 aprendiste sobre el uso responsable de IA?"}),(0,y.jsx)(le,{children:"\xbfQu\xe9 desaf\xedos \xe9ticos identificaste? \xbfC\xf3mo garantizaste que tu aprendizaje sea aut\xe9ntico y no dependiente de la IA?"}),(0,y.jsx)(de,{value:Ve,onChange:e=>Qe(e.target.value),placeholder:"Ej: Aprend\xed que es importante no confiar ciegamente en la IA. Debo ser cr\xedtico y verificar la informaci\xf3n. Tambi\xe9n me di cuenta de que la IA puede ayudarme a explorar ideas, pero el pensamiento cr\xedtico final debe ser m\xedo...",rows:5,theme:pa}),(0,y.jsxs)(me,{theme:pa,children:[Ve.length," caracteres"]})]})]}),(0,y.jsxs)(T,{theme:pa,children:[(0,y.jsxs)(B,{theme:pa,children:[(0,y.jsx)("span",{children:"\u270d\ufe0f"}),"3. Declaraci\xf3n de Autor\xeda y Uso \xc9tico"]}),(0,y.jsx)(M,{theme:pa,children:"Declara de manera transparente c\xf3mo has usado la IA y asume responsabilidad sobre tu trabajo."}),(0,y.jsxs)(ue,{children:[(0,y.jsxs)(pe,{onClick:()=>oa("respuestasPropias"),theme:pa,$checked:Ye.respuestasPropias,children:[(0,y.jsx)(he,{$checked:Ye.respuestasPropias,children:Ye.respuestasPropias&&"\u2713"}),(0,y.jsxs)(ge,{children:[(0,y.jsx)("strong",{children:"Confirmo que las respuestas reflejan mi comprensi\xf3n personal"}),(0,y.jsx)(fe,{children:"He procesado la informaci\xf3n de la IA y generado mis propias conclusiones."})]})]}),(0,y.jsxs)(pe,{onClick:()=>oa("verificacionRealizada"),theme:pa,$checked:Ye.verificacionRealizada,children:[(0,y.jsx)(he,{$checked:Ye.verificacionRealizada,children:Ye.verificacionRealizada&&"\u2713"}),(0,y.jsxs)(ge,{children:[(0,y.jsx)("strong",{children:"He verificado la informaci\xf3n de la IA con otras fuentes"}),(0,y.jsx)(fe,{children:"No he aceptado la informaci\xf3n de la IA sin contrastarla."})]})]}),(0,y.jsxs)(pe,{onClick:()=>oa("usoTransparente"),theme:pa,$checked:Ye.usoTransparente,children:[(0,y.jsx)(he,{$checked:Ye.usoTransparente,children:Ye.usoTransparente&&"\u2713"}),(0,y.jsxs)(ge,{children:[(0,y.jsx)("strong",{children:"Declaro transparentemente el uso de asistencia IA"}),(0,y.jsx)(fe,{children:"He registrado y documentado c\xf3mo he usado la IA en mi proceso de aprendizaje."})]})]}),(0,y.jsxs)(pe,{onClick:()=>oa("contrasteMultifuente"),theme:pa,$checked:Ye.contrasteMultifuente,children:[(0,y.jsx)(he,{$checked:Ye.contrasteMultifuente,children:Ye.contrasteMultifuente&&"\u2713"}),(0,y.jsxs)(ge,{children:[(0,y.jsx)("strong",{children:"He contrastado con m\xfaltiples fuentes (acad\xe9micas, primarias)"}),(0,y.jsx)(fe,{children:"No me he limitado a una sola fuente de informaci\xf3n (incluida la IA)."})]})]})]}),(0,y.jsxs)(xe,{theme:pa,children:[(0,y.jsx)(ve,{children:"Declaraciones completadas:"}),(0,y.jsx)(be,{children:(0,y.jsx)(ye,{$percentage:Object.values(Ye).filter(Boolean).length/4*100,theme:pa})}),(0,y.jsxs)(je,{children:[Object.values(Ye).filter(Boolean).length," de 4"]})]})]}),!Xe&&(0,y.jsxs)(Ie,{children:[(0,y.jsx)(we,{theme:pa,$valid:ma,children:ma?"\u2705 Bit\xe1cora completa. Solicita evaluaci\xf3n criterial con IA dual.":"\u26a0\ufe0f Completa al menos 50 caracteres en cada reflexi\xf3n y 2 declaraciones para evaluar."}),(0,y.jsx)(Ee,{onClick:ua,disabled:!ma||We,theme:pa,children:We?"\u23f3 Evaluando con IA Dual...":"\ud83e\udd16 Solicitar Evaluaci\xf3n Criterial"})]}),We&&(0,y.jsx)(b.A,{theme:pa,isEvaluating:We,currentStep:aa}),(0,y.jsx)(o.N,{children:Xe&&!We&&(0,y.jsxs)(ze,{as:t.P.div,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},theme:pa,children:[(0,y.jsx)(ke,{theme:pa,children:(0,y.jsxs)("div",{children:[(0,y.jsx)("h3",{style:{margin:"0 0 0.5rem 0",color:pa.textPrimary},children:"\ud83d\udcca Evaluaci\xf3n Criterial (IA Dual)"}),(0,y.jsxs)(Se,{$nivel:Xe.nivel_global,theme:pa,children:["Nivel ",Xe.nivel_global,"/4"]})]})}),(0,y.jsxs)(Re,{theme:pa,children:[(0,y.jsxs)("strong",{children:[Xe.dimension_label,":"]})," ",Xe.dimension_description]}),(0,y.jsxs)(De,{children:[(0,y.jsxs)(Ce,{theme:pa,children:[(0,y.jsxs)(Ne,{children:[(0,y.jsx)(Oe,{theme:pa,children:"Registro y Transparencia"}),(0,y.jsxs)(Te,{$nivel:Xe.criterios.registro_transparencia.nivel,theme:pa,children:["Nivel ",Xe.criterios.registro_transparencia.nivel,"/4"]})]}),(null===(a=Xe.criterios.registro_transparencia.fortalezas)||void 0===a?void 0:a.length)>0&&(0,y.jsxs)(Pe,{children:[(0,y.jsx)(Be,{theme:pa,children:"\u2705 Fortalezas:"}),(0,y.jsx)(Me,{children:Xe.criterios.registro_transparencia.fortalezas.map(((e,a)=>(0,y.jsxs)(Fe,{theme:pa,children:["\u2713 ",(0,v.Gc)(e)]},a)))})]}),(null===(r=Xe.criterios.registro_transparencia.mejoras)||void 0===r?void 0:r.length)>0&&(0,y.jsxs)(Pe,{children:[(0,y.jsx)(Be,{theme:pa,children:"\ud83d\udca1 Oportunidades:"}),(0,y.jsx)(Me,{children:Xe.criterios.registro_transparencia.mejoras.map(((e,a)=>(0,y.jsxs)(Fe,{theme:pa,children:["\u2192 ",(0,v.Gc)(e)]},a)))})]})]}),(0,y.jsxs)(Ce,{theme:pa,children:[(0,y.jsxs)(Ne,{children:[(0,y.jsx)(Oe,{theme:pa,children:"Evaluaci\xf3n Cr\xedtica de la Herramienta"}),(0,y.jsxs)(Te,{$nivel:Xe.criterios.evaluacion_critica_herramienta.nivel,theme:pa,children:["Nivel ",Xe.criterios.evaluacion_critica_herramienta.nivel,"/4"]})]}),(null===(n=Xe.criterios.evaluacion_critica_herramienta.fortalezas)||void 0===n?void 0:n.length)>0&&(0,y.jsxs)(Pe,{children:[(0,y.jsx)(Be,{theme:pa,children:"\u2705 Fortalezas:"}),(0,y.jsx)(Me,{children:Xe.criterios.evaluacion_critica_herramienta.fortalezas.map(((e,a)=>(0,y.jsxs)(Fe,{theme:pa,children:["\u2713 ",(0,v.Gc)(e)]},a)))})]}),(null===(l=Xe.criterios.evaluacion_critica_herramienta.mejoras)||void 0===l?void 0:l.length)>0&&(0,y.jsxs)(Pe,{children:[(0,y.jsx)(Be,{theme:pa,children:"\ud83d\udca1 Oportunidades:"}),(0,y.jsx)(Me,{children:Xe.criterios.evaluacion_critica_herramienta.mejoras.map(((e,a)=>(0,y.jsxs)(Fe,{theme:pa,children:["\u2192 ",(0,v.Gc)(e)]},a)))})]})]}),(0,y.jsxs)(Ce,{theme:pa,children:[(0,y.jsxs)(Ne,{children:[(0,y.jsx)(Oe,{theme:pa,children:"Agencia y Responsabilidad"}),(0,y.jsxs)(Te,{$nivel:Xe.criterios.agencia_responsabilidad.nivel,theme:pa,children:["Nivel ",Xe.criterios.agencia_responsabilidad.nivel,"/4"]})]}),(null===(d=Xe.criterios.agencia_responsabilidad.fortalezas)||void 0===d?void 0:d.length)>0&&(0,y.jsxs)(Pe,{children:[(0,y.jsx)(Be,{theme:pa,children:"\u2705 Fortalezas:"}),(0,y.jsx)(Me,{children:Xe.criterios.agencia_responsabilidad.fortalezas.map(((e,a)=>(0,y.jsxs)(Fe,{theme:pa,children:["\u2713 ",(0,v.Gc)(e)]},a)))})]}),(null===(m=Xe.criterios.agencia_responsabilidad.mejoras)||void 0===m?void 0:m.length)>0&&(0,y.jsxs)(Pe,{children:[(0,y.jsx)(Be,{theme:pa,children:"\ud83d\udca1 Oportunidades:"}),(0,y.jsx)(Me,{children:Xe.criterios.agencia_responsabilidad.mejoras.map(((e,a)=>(0,y.jsxs)(Fe,{theme:pa,children:["\u2192 ",(0,v.Gc)(e)]},a)))})]})]})]}),(0,y.jsx)(Ue,{children:(0,y.jsx)(qe,{onClick:()=>Ke(null),theme:pa,children:"\ud83d\udd04 Revisar y Mejorar Reflexiones"})})]})}),(0,y.jsxs)(_e,{children:[(0,y.jsx)(Ae,{onClick:ca,theme:pa,children:"\ud83d\udce5 Exportar Bit\xe1cora Completa (JSON)"}),(0,y.jsx)($e,{theme:pa,children:"Descarga un registro completo de tu uso \xe9tico de IA para incluir en tu portafolio de aprendizaje."})]})]})},_=n.Ay.div`
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  background: ${e=>e.theme.background};
  min-height: calc(100vh - 120px);
`,A=n.Ay.div`
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 3px solid ${e=>e.theme.purple};
`,$=n.Ay.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,I=n.Ay.p`
  margin: 0;
  color: ${e=>e.theme.textSecondary};
  font-size: 1rem;
  line-height: 1.6;
`,w=n.Ay.div`
  background: linear-gradient(135deg, ${e=>e.theme.purple}15, ${e=>e.theme.primary}15);
  border: 2px solid ${e=>e.theme.purple}40;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`,E=n.Ay.h3`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textPrimary};
  font-size: 1.25rem;
  font-weight: 700;
`,z=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`,k=n.Ay.div`
  background: ${e=>e.theme.cardBg};
  border: 2px solid ${e=>e.$color}40;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 20px ${e=>e.$color}30;
  }
`,S=n.Ay.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`,R=n.Ay.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${e=>e.theme.textPrimary};
  margin-bottom: 0.5rem;
`,D=n.Ay.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${e=>e.theme.primary};
  margin-bottom: 0.25rem;
`,C=n.Ay.div`
  font-size: 0.75rem;
  color: ${e=>e.theme.textSecondary};
  font-style: italic;
`,N=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${e=>e.theme.cardBg};
  border-radius: 8px;
  font-weight: 600;
  color: ${e=>e.theme.textPrimary};
`,O=n.Ay.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${e=>{const a=e.$score;return a>=8.6?"#4CAF50":a>=5.6?"#2196F3":a>=2.6?"#FF9800":"#F44336"}};
`,T=n.Ay.section`
  background: ${e=>e.theme.cardBg};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`,P=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`,B=n.Ay.h2`
  margin: 0 0 1rem 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: ${e=>e.theme.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,M=n.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.6;
  font-size: 0.95rem;
`,F=n.Ay.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`,U=n.Ay.button`
  padding: 0.5rem 1rem;
  background: ${e=>"danger"===e.$variant?e.theme.danger:e.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${e=>"danger"===e.$variant?e.theme.danger:e.theme.primary}40;
  }
`,q=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
  margin-bottom: 1rem;
`,L=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`,G=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`,J=n.Ay.span`
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted};
  font-weight: 500;
`,H=n.Ay.span`
  padding: 0.25rem 0.6rem;
  background: ${e=>e.theme.primary}20;
  color: ${e=>e.theme.primary};
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`,V=n.Ay.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${e=>e.theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`,Q=n.Ay.div`
  color: ${e=>e.theme.textPrimary};
  line-height: 1.5;
  margin-bottom: 0.75rem;
`,Y=n.Ay.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${e=>e.theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
`,Z=n.Ay.div`
  color: ${e=>e.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.4;
  font-style: italic;
`,X=n.Ay.span`
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.25rem 0.6rem;
  background: ${e=>e.theme.success}20;
  color: ${e=>e.theme.success};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
`,K=n.Ay.div`
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  background: ${e=>e.theme.surface};
  border-radius: 8px;
  flex-wrap: wrap;
`,W=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,ee=n.Ay.span`
  color: ${e=>e.theme.textSecondary};
  font-size: 0.9rem;
`,ae=n.Ay.span`
  color: ${e=>e.theme.primary};
  font-weight: 700;
  font-size: 1.1rem;
`,re=n.Ay.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${e=>e.theme.textSecondary};
`,ie=n.Ay.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`,ne=n.Ay.div`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${e=>e.theme.textPrimary};
`,te=n.Ay.div`
  font-size: 0.9rem;
  font-style: italic;
`,oe=n.Ay.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${e=>e.theme.surface};
  border-radius: 10px;
  border-left: 4px solid ${e=>e.theme.primary};
`,se=n.Ay.div`
  font-size: 2rem;
  margin-bottom: 0.75rem;
`,ce=n.Ay.h3`
  margin: 0 0 0.5rem 0;
  color: ${e=>e.theme.textPrimary};
  font-size: 1.1rem;
  font-weight: 600;
`,le=n.Ay.p`
  margin: 0 0 1rem 0;
  color: ${e=>e.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.5;
  font-style: italic;
`,de=n.Ay.textarea`
  width: 100%;
  padding: 1rem;
  border: 2px solid ${e=>e.theme.border};
  border-radius: 8px;
  background: ${e=>e.theme.background};
  color: ${e=>e.theme.textPrimary};
  font-size: 0.95rem;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${e=>e.theme.primary};
    box-shadow: 0 0 0 3px ${e=>e.theme.primary}20;
  }
  
  &::placeholder {
    color: ${e=>e.theme.textMuted};
    font-style: italic;
  }
`,me=n.Ay.div`
  margin-top: 0.5rem;
  text-align: right;
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted};
`,ue=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
`,pe=n.Ay.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: ${e=>e.$checked?e.theme.success+"10":e.theme.surface};
  border: 2px solid ${e=>e.$checked?e.theme.success:e.theme.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${e=>e.$checked?e.theme.success+"15":e.theme.primary+"05"};
    border-color: ${e=>e.$checked?e.theme.success:e.theme.primary};
  }
`,he=n.Ay.div`
  width: 24px;
  height: 24px;
  min-width: 24px;
  border: 2px solid ${e=>e.$checked?e.theme.success:e.theme.border};
  border-radius: 6px;
  background: ${e=>e.$checked?e.theme.success:"transparent"};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  transition: all 0.2s ease;
`,ge=n.Ay.div`
  flex: 1;
`,fe=n.Ay.div`
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: ${e=>e.theme.textSecondary};
  line-height: 1.4;
`,xe=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${e=>e.theme.surface};
  border-radius: 8px;
`,ve=n.Ay.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${e=>e.theme.textPrimary};
  white-space: nowrap;
`,be=n.Ay.div`
  flex: 1;
  height: 12px;
  background: ${e=>e.theme.border};
  border-radius: 6px;
  overflow: hidden;
`,ye=n.Ay.div`
  height: 100%;
  width: ${e=>e.$percentage}%;
  background: linear-gradient(90deg, ${e=>e.theme.success}, ${e=>e.theme.primary});
  transition: width 0.5s ease;
`,je=n.Ay.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${e=>e.theme.primary};
  white-space: nowrap;
`,_e=n.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  background: ${e=>e.theme.surface};
  border-radius: 12px;
  border: 2px dashed ${e=>e.theme.border};
`,Ae=n.Ay.button`
  padding: 1rem 2rem;
  background: ${e=>e.theme.purple};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px ${e=>e.theme.purple}40;
  
  &:hover {
    background: ${e=>e.theme.purple}dd;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${e=>e.theme.purple}50;
  }
`,$e=n.Ay.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${e=>e.theme.textSecondary};
  text-align: center;
  font-style: italic;
`,Ie=n.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`,we=n.Ay.div`
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background: ${e=>e.$valid?"#dcfce7":"#fee2e2"};
  border: 1px solid ${e=>e.$valid?"#86efac":"#fca5a5"};
  color: ${e=>e.$valid?"#166534":"#991b1b"};
  font-size: 0.9rem;
  text-align: center;
  width: 100%;
  max-width: 600px;
`,Ee=n.Ay.button`
  padding: 1rem 2rem;
  background: ${e=>e.theme.purple};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px ${e=>e.theme.purple}40;
  
  &:hover:not(:disabled) {
    background: ${e=>e.theme.purple}dd;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${e=>e.theme.purple}50;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,ze=n.Ay.div`
  background: ${e=>e.theme.cardBg};
  border: 2px solid ${e=>e.theme.purple};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px ${e=>e.theme.purple}20;
`,ke=n.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`,Se=n.Ay.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${e=>{switch(e.$nivel){case 1:return"#fee2e2";case 2:return"#fed7aa";case 3:return"#dcfce7";case 4:return"#e9d5ff";default:return"#f3f4f6"}}};
  color: ${e=>{switch(e.$nivel){case 1:return"#991b1b";case 2:return"#c2410c";case 3:return"#166534";case 4:return"#6b21a8";default:return"#374151"}}};
  font-weight: 700;
  font-size: 1rem;
`,Re=n.Ay.p`
  margin: 0 0 1.5rem 0;
  color: ${e=>e.theme.textSecondary};
  font-size: 0.9rem;
  line-height: 1.5;
`,De=n.Ay.div`
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`,Ce=n.Ay.div`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  padding: 1rem;
`,Ne=n.Ay.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`,Oe=n.Ay.h4`
  margin: 0;
  color: ${e=>e.theme.textPrimary};
  font-size: 0.95rem;
`,Te=n.Ay.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${e=>{switch(e.$nivel){case 1:return"#fee2e2";case 2:return"#fed7aa";case 3:return"#dcfce7";case 4:return"#e9d5ff";default:return"#f3f4f6"}}};
  color: ${e=>{switch(e.$nivel){case 1:return"#991b1b";case 2:return"#c2410c";case 3:return"#166534";case 4:return"#6b21a8";default:return"#374151"}}};
`,Pe=n.Ay.div`
  margin-top: 0.75rem;
`,Be=n.Ay.p`
  margin: 0 0 0.5rem 0;
  color: ${e=>e.theme.textPrimary};
  font-weight: 600;
  font-size: 0.85rem;
`,Me=n.Ay.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,Fe=n.Ay.li`
  color: ${e=>e.theme.textSecondary};
  font-size: 0.85rem;
  line-height: 1.4;
`,Ue=n.Ay.div`
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
`,qe=n.Ay.button`
  padding: 0.75rem 1.5rem;
  background: ${e=>e.theme.surface};
  color: ${e=>e.theme.textPrimary};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${e=>e.theme.border};
  }
`}}]);