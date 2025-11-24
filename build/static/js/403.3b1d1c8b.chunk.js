(self.webpackChunkmi_app_lectura=self.webpackChunkmi_app_lectura||[]).push([[403],{326:(e,t,i)=>{"use strict";new Set(["el","la","los","las","un","una","unos","unas","de","del","al","a","ante","bajo","cabe","con","contra","desde","en","entre","hacia","hasta","para","por","seg\xfan","sin","so","sobre","tras","y","e","ni","o","u","pero","sino","mas","que","si","como","cuando","donde","ya","muy"])},777:e=>{const t=["comprensionAnalitica","acd","contextualizacion","argumentacion"],i={comprensionAnalitica:{minScore:6,minEvidence:2,minAttempts:1},acd:{minScore:6.5,minEvidence:2,minAttempts:1},contextualizacion:{minScore:7,minEvidence:2,minAttempts:1},argumentacion:{minScore:7.5,minEvidence:3,minAttempts:1}};function a(){return{current:t[0],unlocked:new Set([t[0]]),completed:{},sequence:t.slice()}}function r(e,t){try{const i={...e,unlocked:Array.from(e.unlocked)};null===t||void 0===t||t.setItem("criticalProgression",JSON.stringify(i))}catch{}}function o(e){var t;let a=arguments.length>1&&void 0!==arguments[1]?arguments[1]:[],r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:[];const o=i[e]||i.comprensionAnalitica;if(!a.length)return!1;const n=a[a.length-1],s=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:2;if(!Array.isArray(e)||!e.length)return 0;const i=e.slice(-t);return i.reduce(((e,t)=>e+t),0)/i.length}(a,2),l=null!==(t=r[r.length-1])&&void 0!==t?t:0;return(n>=o.minScore&&l>=o.minEvidence||s>=o.minScore)&&a.length>=o.minAttempts}function n(e){return{current:e.current,unlocked:Array.from(e.unlocked),sequence:e.sequence.slice(),completed:e.completed}}e.exports={createProgressionEngine:function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"undefined"!==typeof window?window.localStorage:null,s=function(e){try{const t=null===e||void 0===e?void 0:e.getItem("criticalProgression");if(!t)return a();const i=JSON.parse(t);return i.unlocked&&(i.unlocked=new Set(i.unlocked)),i}catch{return a()}}(e);return{getState:()=>n(s),recordEvaluation:function(i){let{dimension:a,score:l,evidenceCount:c=0}=i;if(!a||!t.includes(a))return n(s);if("number"!==typeof l||Number.isNaN(l))return n(s);const d=s.completed[a]||{attempts:0,scores:[],evidence:[],lastUpdated:null};if(d.attempts+=1,d.scores.push(l),d.evidence.push(c),d.lastUpdated=Date.now(),s.completed[a]=d,o(a,d.scores,d.evidence)){const e=function(e){const i=t.indexOf(e);return-1===i?null:t[i+1]||null}(a);e&&!s.unlocked.has(e)&&(s.unlocked.add(e),s.current===a&&(s.current=e))}return r(s,e),n(s)},setCurrent:function(i){return t.includes(i)&&s.unlocked.has(i)&&(s.current=i,r(s,e)),n(s)},resetProgress:function(){return s=a(),r(s,e),n(s)},getDimensionStatus:function(e){const t=s.completed[e];return{dimension:e,unlocked:s.unlocked.has(e),...t}},sequence:t.slice(),criteria:{...i}}},CRITERIA:i,SEQUENCE:t}},1187:(e,t,i)=>{"use strict";i.r(t),i.d(t,{buildEvaluatorPrompt:()=>n,buildTutorPrompt:()=>r,createPromptWithTimeout:()=>c,default:()=>d,getEvaluationSchema:()=>o,validateEvaluatorInput:()=>l,validateTutorInput:()=>s});var a=i(8864);function r(e){let{pregunta:t,texto:i,anchors:r=[],dimension:o=null,idioma:n="es"}=e;if(!t||"string"!==typeof t)throw new Error("Pregunta es requerida y debe ser string");if(!i||"string"!==typeof i)throw new Error("Texto es requerido y debe ser string");const s=Array.isArray(r)?r.slice(0,5).map(((e,t)=>`\u2022 "${String(e.cita||"").slice(0,200)}" (p\xe1rrafo ${Number(e.parrafo)||t+1})`)).join("\n"):"";return[`Act\xfaa como tutor amigable en ${n}.`,"IMPORTANTE: No eval\xfaes ni punt\xfaes. Evita juicio; gu\xeda con preguntas socr\xe1ticas.",o&&a.RUBRIC.dimensiones[o]?`Enfoca tu gu\xeda en la dimensi\xf3n: ${a.RUBRIC.dimensiones[o].nombre}.`:"Enf\xf3cate en comprensi\xf3n y clarificaci\xf3n progresiva.","Ancla tus preguntas al texto mediante citas breves y referencia de p\xe1rrafo.",s?`Evidencias ancla sugeridas:\n${s}`:"",`Pregunta del estudiante: ${t.slice(0,1e3)}`,"Texto de referencia (fragmento):",i.slice(0,3e3)].filter(Boolean).join("\n\n")}function o(){return{type:"object",properties:{dimension:{type:"string",enum:Object.keys(a.RUBRIC.dimensiones)},score:{type:"number",minimum:a.RUBRIC.escala.min,maximum:a.RUBRIC.escala.max},strengths:{type:"array",items:{type:"string",maxLength:200},maxItems:10},improvements:{type:"array",items:{type:"string",maxLength:200},maxItems:10},evidence:{type:"array",items:{type:"string",maxLength:300},maxItems:10,minItems:1},summary:{type:"string",maxLength:1e3}},required:["dimension","score","strengths","improvements","evidence","summary"]}}function n(e){let{respuesta:t,texto:i,dimension:r,idioma:o="es"}=e;if(!t||"string"!==typeof t)throw new Error("Respuesta del estudiante es requerida");if(!i||"string"!==typeof i)throw new Error("Texto de referencia es requerido");if(!r||!a.RUBRIC.dimensiones[r])throw new Error(`Dimensi\xf3n inv\xe1lida: ${r}`);const n=a.RUBRIC.dimensiones[r],s=n.criterios.map((e=>`- ${e}`)).join("\n"),l=Object.entries(n.niveles).map((e=>{let[t,i]=e;return`Nivel ${t}: ${i}`})).join("\n");return[`Eres un evaluador acad\xe9mico especializado en literacidad cr\xedtica (${o}).`,"TAREA: Eval\xfaa la respuesta del estudiante usando la r\xfabrica espec\xedfica.","FORMATO: Responde \xdaNICAMENTE con un JSON v\xe1lido con las claves exactas del schema.","",`DIMENSI\xd3N A EVALUAR: ${n.nombre}`,"","CRITERIOS DE EVALUACI\xd3N:",s,"","DESCRIPTORES DE NIVEL:",l,"","INSTRUCCIONES ESPEC\xcdFICAS:","- Asigna score entre 1-10 basado en los descriptores","- En evidence[], cita fragmentos EXACTOS del texto como evidencia","- En strengths[], destaca lo bien logrado seg\xfan criterios","- En improvements[], da feedback espec\xedfico y accionable","- summary debe ser conciso pero completo","","RESPUESTA DEL ESTUDIANTE:",t.slice(0,3e3),"","TEXTO DE REFERENCIA:",i.slice(0,4e3)].join("\n")}function s(e){let{pregunta:t,texto:i,anchors:r,dimension:o}=e;const n=[];return(!t||t.trim().length<5)&&n.push("Pregunta debe tener al menos 5 caracteres"),(!i||i.trim().length<50)&&n.push("Texto debe tener al menos 50 caracteres"),o&&!a.RUBRIC.dimensiones[o]&&n.push(`Dimensi\xf3n inv\xe1lida: ${o}`),r&&!Array.isArray(r)&&n.push("Anchors debe ser un array"),n}function l(e){let{respuesta:t,texto:i,dimension:r}=e;const o=[];return(!t||t.trim().length<20)&&o.push("Respuesta debe tener al menos 20 caracteres"),(!i||i.trim().length<50)&&o.push("Texto debe tener al menos 50 caracteres"),r&&a.RUBRIC.dimensiones[r]||o.push(`Dimensi\xf3n requerida y v\xe1lida: ${r}`),o}function c(e,t){let i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:3e4;return new Promise(((a,r)=>{const o=new AbortController,n=setTimeout((()=>{o.abort(),r(new Error(`Timeout despu\xe9s de ${i}ms`))}),i);try{const i=e(t);clearTimeout(n),a({prompt:i,controller:o})}catch(s){clearTimeout(n),r(s)}}))}const d={buildTutorPrompt:r,buildEvaluatorPrompt:n,getEvaluationSchema:o,validateTutorInput:s,validateEvaluatorInput:l,createPromptWithTimeout:c}},1382:(e,t,i)=>{"use strict";i.d(t,{SI:()=>n,WR:()=>o,wE:()=>s});var a=i(5803);const r="https://applectura-backend.onrender.com",o=async()=>{console.log("\ud83d\udd0d Verificando disponibilidad del backend en:",r);try{const e=await(0,a.u9)(`${r}/api/health`,{method:"GET",headers:{"Content-Type":"application/json"}},5e3);return console.log("\u2705 Respuesta del backend:",e.status,e.ok),e.ok}catch(e){return console.error("\u274c Backend no disponible:",e.message),!1}},n=async e=>{console.log("\ud83d\udd04 Iniciando procesamiento de PDF:",e.name,"Tama\xf1o:",e.size,"bytes");const t=new FormData;t.append("pdfFile",e);const i=await(0,a.u9)(`${r}/api/process-pdf`,{method:"POST",body:t},6e4);if(!i.ok){const e=await i.json().catch((()=>({})));throw new Error(e.error||`Error del servidor: ${i.status}`)}const o=await i.json(),n=o.text||o.content||"";return console.log("\u2705 Texto recibido del backend, longitud:",n.length,"caracteres"),console.log("\ud83d\udcd6 Primeros 200 caracteres:",n.substring(0,200)+"..."),console.log("\ud83d\udcda \xdaltimos 200 caracteres:",n.length>200?"..."+n.substring(n.length-200):n),n},s=()=>r},1893:(e,t,i)=>{"use strict";i.d(t,{EM:()=>r,UX:()=>a});i(326);const a=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:200;if(!e)return 0;const i=e.split(/\s+/).filter(Boolean).length;return Math.ceil(i/t)},r=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};const{texto:t,"tama\xf1oArchivo":i,api:a}=e,r={};if(i){const e=i/1048576;r.archivo=Math.max(1,Math.ceil(e/5))}if(t){const e=t.length;let i;switch(a){case"openai":i=2e4;break;case"gemini":i=15e3;break;default:i=5e5}r.analisis=Math.max(1,Math.ceil(e/i))}return r}},2303:e=>{const t=[{id:1,name:"Recordar",label:"\ud83d\udcd6 Literal",description:"Identifica informaci\xf3n expl\xedcita del texto",keywords:["qu\xe9 dice","qu\xe9 es","qui\xe9n","cu\xe1ndo","d\xf3nde","define","identifica","lista","nombra","menciona"],color:"#10b981",icon:"\ud83d\udcd6"},{id:2,name:"Comprender",label:"\ud83d\udca1 Inferencial",description:"Interpreta significados impl\xedcitos",keywords:["significa","quiere decir","implica","sugiere","explica","resume","parafrasea","interpreta","deduce"],color:"#3b82f6",icon:"\ud83d\udca1"},{id:3,name:"Aplicar",label:"\ud83c\udf0d Aplicaci\xf3n",description:"Conecta texto con realidad/experiencia",keywords:["ejemplo","caso","situaci\xf3n","relaciona","compara con","usa","aplica","demuestra","ilustra","contexto real"],color:"#f59e0b",icon:"\ud83c\udf0d"},{id:4,name:"Analizar",label:"\ud83d\udd0d An\xe1lisis",description:"Descompone estructura, identifica supuestos",keywords:["estructura","argumento","supuesto","premisa","evidencia","analiza","compara","contrasta","categoriza","diferencia","por qu\xe9","c\xf3mo","relaci\xf3n entre"],color:"#8b5cf6",icon:"\ud83d\udd0d"},{id:5,name:"Evaluar",label:"\u2696\ufe0f Cr\xedtico (ACD)",description:"Eval\xfaa ideolog\xeda, poder, marcos discursivos",keywords:["ideolog\xeda","poder","hegemon\xeda","discurso","marco","critica","eval\xfaa","juzga","posici\xf3n","inter\xe9s","naturaliza","silencia","reproduce","legitima","sesgo","perspectiva","qui\xe9n gana","qui\xe9n pierde"],color:"#ef4444",icon:"\u2696\ufe0f"},{id:6,name:"Crear",label:"\u2728 Propositivo",description:"Crea contra-argumentos, propone alternativas",keywords:["alternativa","propuesta","contra-argumento","reescribe","dise\xf1a","construye","planea","imagina","propone","diferente","cambiar\xeda","mejorar\xeda","transformar\xeda"],color:"#ec4899",icon:"\u2728"}];class i{constructor(){this.levels=t,this.history=[]}detectLevel(e){if(!e||"string"!==typeof e)return this._createResponse(this.levels[0],this.levels[1],!0,0,[]);const t=e.toLowerCase().trim(),i=this.levels.map((e=>{const i=e.keywords.filter((e=>t.includes(e.toLowerCase())));return{level:e,score:i.length,matchedKeywords:i}}));if(i.sort(((e,t)=>t.score-e.score)),0===i[0].score)return this._createResponse(this.levels[0],this.levels[1],!0,.3,[]);const a=i[0],r=a.level,o=this.levels.findIndex((e=>e.id===r.id)),n=this.levels[Math.min(o+1,this.levels.length-1)],s=Math.min(a.score/3,1);return this.history.push({text:e,level:r.id,timestamp:Date.now()}),this._createResponse(r,n,o<this.levels.length-1,s,a.matchedKeywords)}generateZDPQuestion(e,t){const{current:i,zdp:a,shouldScaffold:r}=e;if(!r)return this._generateMaxLevelResponse(t);const o={1:["Comencemos identificando: \xbfQu\xe9 dice EXPL\xcdCITAMENTE el texto sobre este tema?","\xbfPuedes se\xf1alar las PARTES ESPEC\xcdFICAS del texto donde se menciona esto?"],2:["Has identificado lo que el texto dice. Ahora, \xbfpuedes explicar con tus propias palabras QU\xc9 SIGNIFICA esto?",'Entiendo que el texto menciona "{fragment}". Pero, \xbfqu\xe9 IMPLICA realmente esta afirmaci\xf3n? \xbfQu\xe9 nos quiere decir el autor?',"\xbfPor qu\xe9 crees que el autor eligi\xf3 expresarlo de ESA manera espec\xedfica?"],3:["Entiendes el significado. Ahora, \xbfpuedes dar un EJEMPLO CONCRETO de tu realidad donde esto se manifieste?","\xbfC\xf3mo se RELACIONA esta idea con situaciones que hayas vivido o presenciado?","Si tuvieras que explicar esto a alguien de tu comunidad, \xbfqu\xe9 ejemplo usar\xedas?"],4:["Has conectado con ejemplos reales. Ahora profundicemos: \xbfCu\xe1l es la ESTRUCTURA del argumento del autor?","\xbfQu\xe9 SUPUESTOS IMPL\xcdCITOS sostienen este razonamiento? \xbfQu\xe9 da por sentado el autor?","\xbfQu\xe9 EVIDENCIAS presenta? \xbfSon suficientes y confiables?","Compara este argumento con otros sobre el mismo tema. \xbfEn qu\xe9 DIFIEREN y por qu\xe9?"],5:["Has analizado la estructura. Ahora evaluemos CR\xcdTICAMENTE: \xbfQu\xe9 MARCOS IDEOL\xd3GICOS est\xe1n operando aqu\xed?","\xbfQu\xe9 RELACIONES DE PODER se reproducen o desaf\xedan en este discurso?","\xbfQu\xe9 voces est\xe1n PRESENTES en este texto y cu\xe1les est\xe1n SILENCIADAS?",'\xbfQu\xe9 se NATURALIZA como "normal" o "inevitable"? \xbfQu\xe9 alternativas quedan fuera del marco?',"\xbfA QUI\xc9N BENEFICIA esta forma de presentar el tema? \xbfQui\xe9n tiene inter\xe9s en este discurso?"],6:["Has evaluado cr\xedticamente. Ahora, \xbfpuedes PROPONER una perspectiva alternativa?","\xbfC\xf3mo REESCRIBIR\xcdAS este argumento desde una posici\xf3n contra-hegem\xf3nica?","\xbfQu\xe9 CONTRA-ARGUMENTOS podr\xedan plantearse? Construye uno s\xf3lido.","Imagina que eres un activista que desaf\xeda este discurso. \xbfQu\xe9 PROPUESTA har\xedas?"]},n=o[a.id]||o[2];return n[Math.floor(Math.random()*n.length)].replace("{fragment}",t.slice(0,100))}buildTutorPrompt(e,t,i){const{current:a,zdp:r,shouldScaffold:o,confidence:n}=e;return`# CONTEXTO PEDAG\xd3GICO (ZDP - Vygotsky)\n\n**Nivel actual del estudiante**: ${a.name} (${a.label})\n- Descripci\xf3n: ${a.description}\n- Confianza: ${Math.round(100*n)}%\n\n**Zona de Desarrollo Pr\xf3ximo (ZDP)**: ${r.name} (${r.label})\n- Objetivo: ${r.description}\n\n**Texto en an\xe1lisis**:\n"${i.slice(0,500)}..."\n\n**Pregunta del estudiante**:\n"${t}"\n\n---\n\n## TU ROL COMO TUTOR SOCR\xc1TICO\n\n**IMPORTANTE**: NO des respuestas directas. Tu objetivo es **andamiar** (scaffold) hacia el nivel ZDP.\n\n**Estrategia**:\n1. ${o?"Reconoce brevemente su nivel actual (m\xe1x 1 frase)":"Felicita por alcanzar nivel cr\xedtico"}\n2. ${o?"Haz 1-2 preguntas que empujen hacia "+r.label:"Desaf\xeda a pensar propositivamente"}\n3. ${o?"Se\xf1ala aspectos del texto que ayuden a alcanzar "+r.name:"Pide alternativas o contra-argumentos"}\n4. Usa lenguaje cercano pero acad\xe9mico\n5. M\xe1ximo 120 palabras\n\n**Ejemplo de respuesta** (${o?"para empujar de "+a.name+" a "+r.name:"nivel m\xe1ximo"}):\n${this.generateZDPQuestion(e,t)}\n\n**Responde AHORA en espa\xf1ol:**`}analyzeProgression(){if(0===this.history.length)return{avgLevel:0,trend:"neutral",levelCounts:{},progression:[],recommendation:"A\xfan no hay interacciones suficientes para analizar progresi\xf3n."};const e=this.history.reduce(((e,t)=>e+t.level),0)/this.history.length,t=this.history.reduce(((e,t)=>(e[t.level]=(e[t.level]||0)+1,e)),{}),i=Math.floor(this.history.length/2),a=this.history.slice(0,i).reduce(((e,t)=>e+t.level),0)/i,r=this.history.slice(i).reduce(((e,t)=>e+t.level),0)/(this.history.length-i);let o="neutral";r>a+.5?o="ascending":r<a-.5&&(o="descending");const n=this.history.map((e=>({level:e.level,levelName:this.levels[e.level-1].name,timestamp:e.timestamp})));let s="";const l=this.history.slice(-3).map((e=>e.level)),c=Math.max(...l);return c<=2?s='\ud83d\udca1 Intenta hacer preguntas m\xe1s profundas. No solo "qu\xe9 dice", sino "qu\xe9 significa" o "por qu\xe9".':3===c?s="\ud83c\udfaf Buen progreso. Ahora busca analizar la estructura del argumento y los supuestos.":4===c?s="\ud83d\udd25 Excelente an\xe1lisis. Puedes dar el salto cr\xedtico: \xbfqu\xe9 ideolog\xedas operan aqu\xed?":c>=5&&(s="\ud83c\udf1f \xa1Pensamiento cr\xedtico avanzado! Sigue cuestionando relaciones de poder."),{avgLevel:Math.round(10*e)/10,trend:o,levelCounts:t,progression:n,recommendation:s,totalInteractions:this.history.length}}calculatePoints(e){return{1:5,2:10,3:20,4:35,5:60,6:100}[e]||5}reset(){this.history=[]}_createResponse(e,t,i,a,r){return{current:e,zdp:t,shouldScaffold:i,confidence:a,matchedKeywords:r,points:this.calculatePoints(e.id)}}_generateMaxLevelResponse(e){const t=["Excelente pregunta de nivel cr\xedtico. Continuemos profundizando en las implicaciones de poder.","Muy buen an\xe1lisis. \xbfQu\xe9 otras dimensiones de esta problem\xe1tica podr\xedamos explorar?","Interesante perspectiva cr\xedtica. \xbfC\xf3mo se conecta esto con otros textos o contextos que conozcas?"];return t[Math.floor(Math.random()*t.length)]}exportLevels(){return{levels:this.levels.map((e=>({id:e.id,name:e.name,description:e.description,keywords:e.keywords}))),framework:"Bloom + Literacidad Cr\xedtica",version:"1.0.0"}}}e.exports={ZDPDetector:i,BLOOM_LEVELS:t},"undefined"!==typeof window&&(window.ZDPDetector=i)},2551:(e,t,i)=>{"use strict";i.d(t,{gS:()=>a});function a(e,t){if(!t||!t.sections||!t.elements)return[{type:"paragraph",text:e,metadata:{}}];const i=[],a=[...t.sections.map((e=>({...e,isSection:!0}))),...t.elements].sort(((e,t)=>(e.startIndex||0)-(t.startIndex||0)));let r=0;for(const o of a){const t=o.startIndex||r,a=o.endIndex||t+o.text.length;if(t>r){const a=e.substring(r,t).trim();a&&i.push({type:"paragraph",text:a,metadata:{}})}i.push({type:o.type,text:o.text||e.substring(t,a),metadata:{level:o.level,category:o.category,isSection:o.isSection,...o.metadata}}),r=a}if(r<e.length){const t=e.substring(r).trim();t&&i.push({type:"paragraph",text:t,metadata:{}})}return i}},3158:e=>{function t(e){if("number"!==typeof e||Number.isNaN(e)||e<0||e>5)throw new Error("Quality debe estar entre 0-5")}function i(e,i){let{interval:a=0,repetition:r=0,ef:o=2.5}=e;t(i);let n=o+(.1-(5-i)*(.08+.02*(5-i)));n<1.3&&(n=1.3);let s,l=i<3?0:r+1;return s=i<3||1===l?1:2===l?6:Math.round(a*n),{interval:s,repetition:l,ef:n}}let a=0;e.exports={scheduleNext:function(e,a){t(a);const{interval:r,repetition:o,ef:n}=i(e,a),s=new Date,l=new Date(s.getTime()+24*r*60*60*1e3);return{...e,interval:r,repetition:o,ef:n,dueDate:l.toISOString(),quality:a}},nextIntervalDays:i,createStudyItem:function(){let{content:e="",dimension:t="comprensionAnalitica",anchor:i=null}=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};const r=new Date;return{itemId:"itm_"+(++a).toString(36),content:e,dimension:t,anchor:i,interval:0,repetition:0,ef:2.5,dueDate:r.toISOString(),isActive:!0,reviewCount:0,averageQuality:0,lastQuality:null}},getDueItems:function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[],t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:new Date;const i=new Date(t).getTime();return e.filter((e=>!1!==e.isActive&&e.dueDate&&new Date(e.dueDate).getTime()<=i))},updateStudyItem:function(e,i){let a=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};t(i);const r=(e.reviewCount||0)+1,o=((e.averageQuality||0)*(r-1)+i)/r;return{...e,reviewCount:r,averageQuality:o,lastQuality:i,...a}},validateQuality:t}},4403:(e,t,i)=>{"use strict";i.r(t),i.d(t,{default:()=>Ia});var a=i(9950),r=i(1132),o=i(3291),n=i(4752),s=i(387),l=i(4414);const c=n.Ay.button`
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.error)||"#dc2626"}}15;
  border: 2px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.error)||"#dc2626"}}40;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.3s ease;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.error)||"#dc2626"}};
  
  &:hover {
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.error)||"#dc2626"}}25;
    border-color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.error)||"#dc2626"}}60;
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1em;
  }
`,d=(0,n.Ay)(r.P.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`,u=(0,n.Ay)(r.P.div)`
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#FFFFFF"}};
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#E4EAF1"}};
`,m=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#E4EAF1"}};
`,p=n.Ay.span`
  font-size: 2rem;
`,h=n.Ay.h3`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#232B33"}};
`,g=n.Ay.div`
  margin-bottom: 24px;
`,x=n.Ay.p`
  font-size: 1rem;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#232B33"}};
  margin-bottom: 16px;
  line-height: 1.6;
`,v=n.Ay.div`
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#F6F8FA"}};
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
`,f=n.Ay.div`
  font-size: 0.9rem;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.textMuted)||"#607D8B"}};
  margin: 6px 0;
  line-height: 1.5;
`,b=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.success)||"#009688"}};
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.success)||"#009688"}}15;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.success)||"#009688"}};
  margin-top: 12px;
`,y=n.Ay.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#E4EAF1"}};
`,w=n.Ay.button`
  padding: 10px 20px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#FFFFFF"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#232B33"}};
  border: 2px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#E4EAF1"}};
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.background)||"#F6F8FA"}};
    border-color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.textMuted)||"#607D8B"}};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,A=n.Ay.button`
  padding: 10px 20px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.error)||"#dc2626"}};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.error)||"#dc2626"}}dd;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.error)||"#dc2626"}}40;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`,E=e=>{let{theme:t}=e;const{clearAllHistory:i}=(0,a.useContext)(s.BR),[r,n]=(0,a.useState)(!1),[E,j]=(0,a.useState)(!1),C=()=>{n(!1)};return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(c,{onClick:()=>{n(!0)},theme:t,title:"Eliminar todo el historial de la aplicaci\xf3n","aria-label":"Eliminar historial",children:"\ud83d\uddd1\ufe0f"}),(0,l.jsx)(o.N,{children:r&&(0,l.jsx)(d,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:C,children:(0,l.jsxs)(u,{theme:t,initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:[(0,l.jsxs)(m,{theme:t,children:[(0,l.jsx)(p,{children:"\u26a0\ufe0f"}),(0,l.jsx)(h,{theme:t,children:"Eliminar Historial"})]}),(0,l.jsxs)(g,{theme:t,children:[(0,l.jsx)(x,{theme:t,children:"\xbfEst\xe1s seguro de que quieres eliminar todo el historial?"}),(0,l.jsxs)(v,{theme:t,children:[(0,l.jsx)(f,{children:"\u2022 Conversaciones con el tutor"}),(0,l.jsx)(f,{children:"\u2022 Resultados de actividades"}),(0,l.jsx)(f,{children:"\u2022 Resaltados y anotaciones"}),(0,l.jsx)(f,{children:"\u2022 Progreso de r\xfabricas"}),(0,l.jsx)(f,{children:"\u2022 Citas guardadas"}),(0,l.jsx)(f,{children:"\u2022 Cach\xe9 de an\xe1lisis"})]}),(0,l.jsx)(b,{theme:t,children:"\u2705 Se conservar\xe1n: Modo oscuro, tama\xf1o del tutor, temperatura, y otras preferencias"})]}),(0,l.jsxs)(y,{theme:t,children:[(0,l.jsx)(w,{theme:t,onClick:C,disabled:E,children:"Cancelar"}),(0,l.jsx)(A,{theme:t,onClick:async()=>{j(!0);try{const e=i();e.success?setTimeout((()=>{n(!1),j(!1)}),1e3):(alert("Error al limpiar el historial: "+e.message),j(!1))}catch(e){console.error("Error al limpiar historial:",e),alert("Error inesperado al limpiar el historial"),j(!1)}},disabled:E,children:E?"Eliminando...":"\ud83d\uddd1\ufe0f Eliminar Todo"})]})]})})})]})};var j=i(6393),C=i(5532),S=i(8853);const $=n.Ay.header`
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#FFFFFF"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#232B33"}};
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#E4EAF1"}};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
`,k=n.Ay.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(45deg, #3190FC, #009688);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`,F=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`,I=n.Ay.button`
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1em;
  }
`,z=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surfaceVariant)||"rgba(0, 0, 0, 0.05)"}};
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    padding: 0.35rem;
  }
`,D=n.Ay.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#3190FC"}};
  
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
  }
`,P=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`,T=n.Ay.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#232B33"}};
`,N=n.Ay.span`
  font-size: 0.75rem;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.textSecondary)||"#6B7280"}};
  text-transform: capitalize;
`,L=n.Ay.button`
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
  
  &:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(239, 68, 68, 0.2);
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    
    span {
      display: none;
    }
  }
`,O=e=>{let{titulo:t="Mi App de Lectura",modoOscuro:i=!1,onToggleModo:a,children:r}=e;const o=i?j.a5:j._k,{currentUser:n,userData:s}=(0,C.As)();return(0,l.jsxs)($,{children:[(0,l.jsx)(k,{children:t}),(0,l.jsxs)(F,{children:[n&&(0,l.jsxs)(z,{children:[(null===s||void 0===s?void 0:s.photoURL)&&(0,l.jsx)(D,{src:s.photoURL,alt:s.nombre||"Usuario"}),(0,l.jsxs)(P,{children:[(0,l.jsx)(T,{children:(null===s||void 0===s?void 0:s.nombre)||n.displayName||"Usuario"}),(0,l.jsx)(N,{children:"docente"===(null===s||void 0===s?void 0:s.role)?"\ud83d\udc68\u200d\ud83c\udfeb Docente":"\ud83d\udc68\u200d\ud83c\udf93 Estudiante"})]})]}),r,(0,l.jsx)(E,{theme:o}),a&&(0,l.jsx)(I,{onClick:a,"aria-label":"Cambiar a modo "+(i?"claro":"oscuro"),title:"Cambiar a modo "+(i?"claro":"oscuro"),children:i?"\u2600\ufe0f":"\ud83c\udf19"}),n&&(0,l.jsx)(L,{onClick:async()=>{if(window.confirm("\xbfEst\xe1s seguro que deseas cerrar sesi\xf3n?"))try{await(0,S.ri)(),console.log("\ud83d\udc4b Sesi\xf3n cerrada exitosamente")}catch(e){console.error("\u274c Error cerrando sesi\xf3n:",e),alert("Error al cerrar sesi\xf3n. Intenta de nuevo.")}},title:"Cerrar sesi\xf3n","aria-label":"Cerrar sesi\xf3n",children:"\ud83d\udeaa Salir"})]})]})},R=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    gap: 0.25rem;
    padding: 0.25rem 0;
  }
`,M=(0,n.Ay)(r.P.button).withConfig({shouldForwardProp:e=>!["active","compact","layout"].includes(e)})`
  padding: ${e=>e.compact?"8px 12px":"12px 20px"};
  cursor: pointer;
  background: ${e=>e.active?e.theme.primary:"transparent"};
  color: ${e=>e.active?"white":e.theme.text};
  border: 1px solid ${e=>e.active?e.theme.primary:e.theme.border};
  border-radius: 8px;
  font-weight: ${e=>e.active?"600":"500"};
  font-size: ${e=>e.compact?"0.8rem":"0.9rem"};
  display: flex;
  align-items: center;
  gap: ${e=>e.compact?"4px":"8px"};
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: fit-content;
  
  &:hover:not(:disabled) {
    background: ${e=>e.active?e.theme.primary:e.theme.surfaceHover};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:disabled {
    color: ${e=>e.theme.textMuted};
    cursor: not-allowed;
    opacity: 0.5;
    background: transparent;
  }
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.8rem;
    gap: 4px;
    
    span:last-child {
      display: ${e=>e.compact?"none":"inline"};
    }
  }
  
  @media (max-width: 480px) {
    padding: 6px 8px;
    
    span:last-child {
      display: none;
    }
  }
`,B=n.Ay.span`
  font-size: 1rem;
  line-height: 1;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`,_=n.Ay.span`
  line-height: 1;
  
  @media (max-width: 480px) {
    display: none;
  }
`,q=n.Ay.div`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${e=>e.$completed?e.theme.success:e.$active?e.theme.primary:e.theme.border};
  margin-left: 4px;
  
  @media (max-width: 768px) {
    width: 3px;
    height: 3px;
  }
`,Q=n.Ay.span`
  background: ${e=>e.theme.primary};
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: bold;
  min-width: 16px;
  text-align: center;
  margin-left: 4px;
  
  @media (max-width: 768px) {
    font-size: 0.6rem;
    padding: 1px 4px;
  }
`;function U(e){let{tabs:t=[],activeTab:i,onTabChange:r,disabled:o=!1,compact:n=!1,showProgress:s=!1,tabProgress:c={},tabCounters:d={}}=e;const u=a.useCallback((e=>{o&&"lectura"!==e||r(e)}),[o,r]),m=a.useMemo((()=>t.map((e=>{const t=i===e.id,a=o&&"lectura"!==e.id,r=c[e.id],m=d[e.id];return(0,l.jsxs)(M,{active:t,compact:n,disabled:a,onClick:()=>u(e.id),whileHover:{scale:a?1:1.02},whileTap:{scale:a?1:.98},layout:!0,children:[(0,l.jsx)(B,{children:e.icon}),(0,l.jsx)(_,{children:e.label}),s&&(0,l.jsx)(q,{$completed:"completed"===r,$active:"active"===r}),m>0&&(0,l.jsx)(Q,{children:m})]},e.id)}))),[t,i,o,n,s,c,d,u]);return(0,l.jsx)(R,{children:m})}const H=a.memo(U),V=n.i7`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`,G=(0,n.Ay)(r.P.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  color: white;
`,W=n.Ay.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid ${e=>e.theme.primary||"#fff"};
  border-radius: 50%;
  ${n.AH`animation: ${V} 1s linear infinite;`}
`,X=n.Ay.p`
  margin-top: 20px;
  font-size: 1.2rem;
  font-weight: 500;
`,J=e=>{let{message:t,progress:i}=e;return(0,l.jsxs)(G,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,l.jsx)(W,{}),(0,l.jsxs)(X,{children:[t||"Cargando...",i>0&&` (${i}%)`]})]})};var K=i(3759),Y=i(7424),Z=i(9769);const ee=(0,n.Ay)(r.P.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(4px);
`,te=(0,n.Ay)(r.P.div)`
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 16px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    max-width: 95vw;
    max-height: 95vh;
  }
`,ie=n.Ay.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${e=>e.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, ${e=>e.theme.primary}, ${e=>e.theme.success});
  color: white;
  border-radius: 16px 16px 0 0;
  
  h2 {
    margin: 0;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`,ae=n.Ay.button`
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`,re=n.Ay.div`
  padding: 1.5rem;
`,oe=n.Ay.div`
  margin-bottom: 2rem;
  
  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.2rem;
    color: ${e=>e.theme.textPrimary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`,ne=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`,se=n.Ay.div`
  background: ${e=>e.$highlight?`${e.theme.primary}15`:`${e.theme.background}`};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  .icon {
    font-size: 2rem;
  }
  
  .label {
    font-size: 0.85rem;
    color: ${e=>e.theme.textSecondary};
    font-weight: 500;
  }
  
  .value {
    font-size: 1.8rem;
    font-weight: 800;
    color: ${e=>e.theme.primary};
  }
  
  .sub {
    font-size: 0.75rem;
    color: ${e=>e.theme.textSecondary};
  }
`,le=n.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`,ce=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  
  .label {
    min-width: 140px;
    font-size: 0.85rem;
    color: ${e=>e.theme.textSecondary};
    font-weight: 500;
  }
  
  .bar-container {
    flex: 1;
    height: 24px;
    background: ${e=>e.theme.surface};
    border: 1px solid ${e=>e.theme.border};
    border-radius: 12px;
    overflow: hidden;
    position: relative;
  }
  
  .bar-fill {
    height: 100%;
    background: ${e=>e.$color};
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.5rem;
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    transition: width 0.5s ease;
  }
  
  .count {
    min-width: 40px;
    text-align: right;
    font-weight: 700;
    color: ${e=>e.theme.textPrimary};
  }
`,de=n.Ay.div`
  background: ${e=>e.theme.background};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 12px;
  overflow: hidden;
  max-height: 400px;
  overflow-y: auto;
`,ue=n.Ay.div`
  display: grid;
  grid-template-columns: 140px 1fr 100px;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid ${e=>e.theme.border};
  font-size: 0.85rem;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: ${e=>e.theme.surface};
  }
  
  .timestamp {
    color: ${e=>e.theme.textSecondary};
    font-size: 0.8rem;
  }
  
  .event {
    color: ${e=>e.theme.textPrimary};
    font-weight: 500;
  }
  
  .points {
    text-align: right;
    font-weight: 700;
    color: ${e=>e.$earned>0?e.theme.success:e.theme.error};
  }
`,me=n.Ay.button`
  background: ${e=>e.theme.success};
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 150, 136, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 150, 136, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  .icon {
    font-size: 1.2em;
  }
`,pe=n.Ay.div`
  text-align: center;
  padding: 3rem;
  color: ${e=>e.theme.textSecondary};
  
  .icon {
    font-size: 4rem;
    opacity: 0.3;
    margin-bottom: 1rem;
  }
  
  .message {
    font-size: 1.1rem;
    font-weight: 500;
  }
`,he={1:"#607D8B",2:"#03A9F4",3:"#4CAF50",4:"#FF9800",5:"#E91E63",6:"#9C27B0"},ge={1:"\ud83d\udcd6 Recordar",2:"\ud83d\udca1 Comprender",3:"\ud83c\udf0d Aplicar",4:"\ud83d\udd0d Analizar",5:"\u2696\ufe0f Evaluar (ACD)",6:"\u2728 Crear"};function xe(e){let{isOpen:t,onClose:i}=e;const r=(0,Y.useRewards)(),n=(0,a.useMemo)((()=>r?r.getAnalytics():null),[r]);if(!r||!n)return null;const{engagement:s,quality:c,gamification:d,history:u}=n,m=Math.max(...Object.values(c.bloomLevelDistribution||{}),1),p=u.slice(-20).reverse();return(0,l.jsx)(o.N,{children:t&&(0,l.jsx)(ee,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:i,children:(0,l.jsxs)(te,{initial:{opacity:0,scale:.9,y:20},animate:{opacity:1,scale:1,y:0},exit:{opacity:0,scale:.9,y:20},onClick:e=>e.stopPropagation(),children:[(0,l.jsxs)(ie,{children:[(0,l.jsxs)("h2",{children:[(0,l.jsx)("span",{children:"\ud83d\udcca"}),"Estad\xedsticas y Analytics"]}),(0,l.jsx)(ae,{onClick:i,children:"\u2715 Cerrar"})]}),(0,l.jsxs)(re,{children:[(0,l.jsxs)(oe,{children:[(0,l.jsx)("h3",{children:"\ud83d\udcc8 M\xe9tricas de Engagement"}),(0,l.jsxs)(ne,{children:[(0,l.jsxs)(se,{$highlight:!0,children:[(0,l.jsx)("div",{className:"icon",children:"\u2b50"}),(0,l.jsx)("div",{className:"label",children:"Puntos Totales"}),(0,l.jsx)("div",{className:"value",children:d.totalPoints}),(0,l.jsxs)("div",{className:"sub",children:[d.availablePoints," disponibles"]})]}),(0,l.jsxs)(se,{children:[(0,l.jsx)("div",{className:"icon",children:"\ud83d\udd25"}),(0,l.jsx)("div",{className:"label",children:"Racha Actual"}),(0,l.jsx)("div",{className:"value",children:s.streak}),(0,l.jsx)("div",{className:"sub",children:"d\xedas consecutivos"})]}),(0,l.jsxs)(se,{children:[(0,l.jsx)("div",{className:"icon",children:"\ud83d\udcac"}),(0,l.jsx)("div",{className:"label",children:"Interacciones"}),(0,l.jsx)("div",{className:"value",children:s.totalInteractions}),(0,l.jsx)("div",{className:"sub",children:"actividades realizadas"})]}),(0,l.jsxs)(se,{children:[(0,l.jsx)("div",{className:"icon",children:"\ud83c\udfc6"}),(0,l.jsx)("div",{className:"label",children:"Achievements"}),(0,l.jsx)("div",{className:"value",children:d.achievements}),(0,l.jsx)("div",{className:"sub",children:"logros desbloqueados"})]})]})]}),(0,l.jsxs)(oe,{children:[(0,l.jsx)("h3",{children:"\ud83e\udde0 Calidad Cognitiva"}),(0,l.jsxs)(ne,{children:[(0,l.jsxs)(se,{children:[(0,l.jsx)("div",{className:"icon",children:"\ud83d\udcca"}),(0,l.jsx)("div",{className:"label",children:"Nivel Bloom Promedio"}),(0,l.jsx)("div",{className:"value",children:s.avgBloomLevel.toFixed(1)}),(0,l.jsx)("div",{className:"sub",children:"de 6 niveles"})]}),(0,l.jsxs)(se,{children:[(0,l.jsx)("div",{className:"icon",children:"\ud83c\udfad"}),(0,l.jsx)("div",{className:"label",children:"Marcos ACD"}),(0,l.jsx)("div",{className:"value",children:c.acdFramesIdentified}),(0,l.jsx)("div",{className:"sub",children:"an\xe1lisis cr\xedtico"})]}),(0,l.jsxs)(se,{children:[(0,l.jsx)("div",{className:"icon",children:"\ud83d\udcce"}),(0,l.jsx)("div",{className:"label",children:"Citas por Evaluaci\xf3n"}),(0,l.jsx)("div",{className:"value",children:c.quotesPerEvaluation}),(0,l.jsx)("div",{className:"sub",children:"promedio de evidencia"})]})]})]}),(0,l.jsxs)(oe,{children:[(0,l.jsx)("h3",{children:"\ud83d\udcca Distribuci\xf3n de Niveles Bloom"}),(0,l.jsx)(le,{children:[1,2,3,4,5,6].map((e=>{var t;const i=(null===(t=c.bloomLevelDistribution)||void 0===t?void 0:t[e])||0,a=m>0?i/m*100:0;return(0,l.jsxs)(ce,{$color:he[e],children:[(0,l.jsx)("div",{className:"label",children:ge[e]}),(0,l.jsx)("div",{className:"bar-container",children:(0,l.jsx)("div",{className:"bar-fill",style:{width:`${a}%`},children:i>0&&i})}),(0,l.jsx)("div",{className:"count",children:i})]},e)}))})]}),(0,l.jsxs)(oe,{children:[(0,l.jsx)("h3",{children:"\ud83d\udcdc Historial Reciente (\xfaltimos 20 eventos)"}),0===p.length?(0,l.jsxs)(pe,{children:[(0,l.jsx)("div",{className:"icon",children:"\ud83d\udced"}),(0,l.jsx)("div",{className:"message",children:"A\xfan no hay eventos registrados"})]}):(0,l.jsx)(de,{children:p.map(((e,t)=>(0,l.jsxs)(ue,{$earned:e.earnedPoints,children:[(0,l.jsx)("div",{className:"timestamp",children:new Date(e.timestamp).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}),(0,l.jsx)("div",{className:"event",children:e.label}),(0,l.jsxs)("div",{className:"points",children:[e.earnedPoints>0?"+":"",e.earnedPoints," pts",e.multiplier>1&&(0,l.jsxs)("span",{style:{fontSize:"0.8em",opacity:.7},children:[" ","(x",e.multiplier,")"]})]})]},t)))})]}),d.achievementsList.length>0&&(0,l.jsxs)(oe,{children:[(0,l.jsx)("h3",{children:"\ud83c\udfc6 Achievements Desbloqueados"}),(0,l.jsx)("div",{style:{display:"flex",flexWrap:"wrap",gap:"0.5rem"},children:d.achievementsList.map(((e,t)=>(0,l.jsx)("div",{style:{background:`${he[3]}20`,border:`1px solid ${he[3]}`,borderRadius:"20px",padding:"0.5rem 1rem",fontSize:"0.9rem",fontWeight:600,color:he[3]},children:e},t)))})]}),(0,l.jsxs)(oe,{children:[(0,l.jsxs)(me,{onClick:()=>{if(!r)return;const e=r.exportCSV(),t=new Blob([e],{type:"text/csv;charset=utf-8;"}),i=document.createElement("a"),a=URL.createObjectURL(t);i.setAttribute("href",a),i.setAttribute("download",`recompensas_${(new Date).toISOString().split("T")[0]}.csv`),i.style.visibility="hidden",document.body.appendChild(i),i.click(),document.body.removeChild(i)},children:[(0,l.jsx)("span",{className:"icon",children:"\ud83d\udce5"}),"Exportar CSV de Recompensas"]}),(0,l.jsx)("p",{style:{fontSize:"0.85rem",color:"var(--text-secondary)",marginTop:"0.5rem",marginBottom:0,lineHeight:1.6},children:"Descarga el historial completo de tu sistema de recompensas en formato CSV. Incluye: fecha y hora de cada evento, tipo de acci\xf3n, descripci\xf3n, puntos ganados, multiplicador de racha, nivel Bloom y artefacto asociado. Ideal para Excel y an\xe1lisis estad\xedstico."})]})]})]})})})}const ve=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: ${e=>e.theme.surface};
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  font-size: 0.9rem;
  user-select: none;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
`,fe=(0,n.Ay)(r.P.div)`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: ${e=>e.theme.success};
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 150, 136, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  .icon {
    font-size: 1.1em;
  }
  
  .value {
    font-size: 1.1em;
  }
`,be=(0,n.Ay)(r.P.div)`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: ${e=>{return(t=e.$streak)>=30?"#dc2626":t>=7?"#f59e0b":t>=3?"#009688":"#607D8B";var t}};
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-weight: 600;
  border: 1px solid ${e=>e.theme.border};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  .icon {
    font-size: 1.1em;
    animation: ${e=>e.$streak>=3?"pulse 2s ease-in-out infinite":"none"};
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
`,ye=(0,n.Ay)(r.P.div)`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: ${e=>e.theme.primary};
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(49, 144, 252, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  .icon {
    font-size: 1.1em;
  }
`,we=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: ${e=>e.theme.textSecondary};
  font-size: 0.85em;
  
  .level-icon {
    font-size: 1em;
  }
`,Ae=(0,n.Ay)(r.P.div)`
  position: fixed;
  top: 80px;
  right: 20px;
  background: ${e=>e.theme.success};
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 150, 136, 0.4);
  z-index: 10000;
  font-weight: 700;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  
  .icon {
    font-size: 2em;
  }
  
  .content {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .points {
    font-size: 1.3em;
  }
  
  .reason {
    font-size: 0.75em;
    opacity: 0.9;
  }
`,Ee=(0,n.Ay)(r.P.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${e=>e.theme.primary};
  color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(49, 144, 252, 0.5);
  z-index: 10001;
  text-align: center;
  max-width: 400px;
  
  .title {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
  }
  
  .icon {
    font-size: 4rem;
    margin: 1rem 0;
    animation: bounce 1s ease-in-out;
  }
  
  .description {
    font-size: 0.9rem;
    opacity: 0.95;
    margin-top: 0.5rem;
  }
  
  .points {
    font-size: 1.2rem;
    font-weight: 700;
    margin-top: 1rem;
    color: #FBBF24;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
`;function je(e){return e>=30?"\ud83d\udd25\ud83d\udd25\ud83d\udd25":e>=7?"\ud83d\udd25\ud83d\udd25":e>=3?"\ud83d\udd25":"\ud83d\udcc5"}function Ce(e){var t,i,r,n;let{onClickDetails:s}=e;const c=(0,Y.useRewards)(),[d,u]=(0,a.useState)((()=>(null===c||void 0===c?void 0:c.getState())||{totalPoints:0,streak:0,achievements:[]})),[m,p]=(0,a.useState)(null),[h,g]=(0,a.useState)(null),[x,v]=(0,a.useState)(!1);if((0,a.useEffect)((()=>{if(!c)return;const e=e=>{const t=c.getState();u((e=>{var i,a;const r=e.totalPoints,o=t.totalPoints;if(console.log("\ud83c\udfae [RewardsHeader] rewards-state-changed:",{prevPoints:r,newPoints:o}),o>r){p({points:o-r,reason:"Acci\xf3n completada",multiplier:t.lastMultiplier||1}),setTimeout((()=>p(null)),4e3)}const n=(null===(i=e.achievements)||void 0===i?void 0:i.length)||0,s=(null===(a=t.achievements)||void 0===a?void 0:a.length)||0;if(s>n){const e=t.achievements[s-1],i=Z.ACHIEVEMENTS[e.toUpperCase()];i&&(g({achievement:i}),setTimeout((()=>g(null)),6e3))}return t}))};window.addEventListener("rewards-state-changed",e);const t=c.getState();return u(t),()=>window.removeEventListener("rewards-state-changed",e)}),[c]),(0,a.useEffect)((()=>{if(!c)return;const e=e=>{console.log("\ud83d\udd04 [RewardsHeader] Evento progress-synced-from-cloud recibido:",e.detail),setTimeout((()=>{const e=c.getState();console.log("\ud83d\udcca [RewardsHeader] Estado actualizado desde rewards:",{totalPoints:e.totalPoints,availablePoints:e.availablePoints}),u(e)}),0)};return window.addEventListener("progress-synced-from-cloud",e),()=>{window.removeEventListener("progress-synced-from-cloud",e)}}),[c]),!c)return null;const{totalPoints:f,availablePoints:b,streak:y,achievements:w}=d,A=(null===w||void 0===w?void 0:w.length)||0,E=Math.floor(f/500)+1,j=()=>{v(!0),s&&s()};return(0,l.jsxs)(l.Fragment,{children:[(0,l.jsxs)(ve,{children:[(0,l.jsxs)(fe,{onClick:j,title:`Puntos totales: ${f} (${b} disponibles)`,whileHover:{scale:1.05},whileTap:{scale:.95},children:[(0,l.jsx)("span",{className:"icon",children:"\u2b50"}),(0,l.jsx)("span",{className:"value",children:f}),(0,l.jsx)("span",{style:{fontSize:"0.8em",opacity:.9},children:"pts"})]}),(0,l.jsxs)(be,{$streak:y,title:`Racha: ${y} d\xedas consecutivos`,children:[(0,l.jsx)("span",{className:"icon",children:je(y)}),(0,l.jsxs)("span",{children:[y," d\xedas"]})]}),(0,l.jsxs)(ye,{onClick:j,title:`Achievements desbloqueados: ${A}`,whileHover:{scale:1.05},whileTap:{scale:.95},children:[(0,l.jsx)("span",{className:"icon",children:"\ud83c\udfc6"}),(0,l.jsx)("span",{children:A})]}),(0,l.jsxs)(we,{title:`Nivel ${E} (${f} pts)`,children:[(0,l.jsx)("span",{className:"level-icon",children:"\ud83c\udf93"}),(0,l.jsxs)("span",{children:["Nivel ",E]})]})]}),(0,l.jsx)(o.N,{children:m&&(0,l.jsxs)(Ae,{initial:{opacity:0,y:-20,scale:.8},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:-20,scale:.8},transition:{type:"spring",stiffness:300,damping:20},children:[(0,l.jsx)("div",{className:"icon",children:"\ud83c\udf89"}),(0,l.jsxs)("div",{className:"content",children:[(0,l.jsxs)("div",{className:"points",children:["+",m.points," pts",m.multiplier>1&&(0,l.jsxs)("span",{style:{fontSize:"0.7em",marginLeft:"0.3rem"},children:["(x",m.multiplier.toFixed(1),")"]})]}),(0,l.jsx)("div",{className:"reason",children:m.reason})]})]})}),(0,l.jsx)(o.N,{children:h&&(0,l.jsxs)(Ee,{initial:{opacity:0,scale:.5,rotate:-10},animate:{opacity:1,scale:1,rotate:0},exit:{opacity:0,scale:.5,rotate:10},transition:{type:"spring",stiffness:200,damping:15},onClick:()=>g(null),children:[(0,l.jsx)("div",{className:"title",children:"\ud83c\udf8a Achievement Desbloqueado!"}),(0,l.jsx)("div",{className:"icon",children:(null===(t=h.achievement)||void 0===t?void 0:t.icon)||"\ud83c\udfc6"}),(0,l.jsx)("div",{style:{fontSize:"1.3rem",fontWeight:700,marginTop:"0.5rem"},children:(null===(i=h.achievement)||void 0===i?void 0:i.name)||"Logro Especial"}),(0,l.jsx)("div",{className:"description",children:(null===(r=h.achievement)||void 0===r?void 0:r.description)||"Has alcanzado un hito importante"}),(0,l.jsxs)("div",{className:"points",children:["+",(null===(n=h.achievement)||void 0===n?void 0:n.points)||0," pts"]}),(0,l.jsx)("div",{style:{fontSize:"0.75rem",marginTop:"1rem",opacity:.8},children:"Click para cerrar"})]})}),(0,l.jsx)(xe,{isOpen:x,onClose:()=>v(!1)})]})}const Se=e=>{let{modoOscuro:t}=e;const[i,n]=(0,a.useState)(!0);return i?(0,l.jsx)(o.N,{children:(0,l.jsx)($e,{as:r.P.div,initial:{opacity:0,y:-50},animate:{opacity:1,y:0},exit:{opacity:0,y:-50},transition:{duration:.4},$darkMode:t,children:(0,l.jsxs)(ke,{children:[(0,l.jsx)(Fe,{children:"\u26a0\ufe0f"}),(0,l.jsxs)(Ie,{children:[(0,l.jsx)(ze,{children:"Importante:"})," Las respuestas de esta aplicaci\xf3n son generadas por IA y pueden contener errores. Como usuario, es su responsabilidad ",(0,l.jsx)(De,{children:"verificar los datos y analizar \xedntegramente la informaci\xf3n"}),". Esta herramienta pedag\xf3gica ha sido desarrollada para acompa\xf1ar el proceso de entendimiento profundo de un texto, en ning\xfan caso sustituye el trabajo humano que es central en todo el proceso."]}),(0,l.jsx)(Pe,{onClick:()=>n(!1),title:"Cerrar advertencia",children:"\xd7"})]})})}):null},$e=n.Ay.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${e=>e.$darkMode?"linear-gradient(135deg, #2c3e50 0%, #34495e 100%)":"linear-gradient(135deg, #fff8e1 0%, #ffe082 100%)"};
  border-top: 3px solid #ff9800;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 16px 24px;
`,ke=n.Ay.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
`,Fe=n.Ay.div`
  font-size: 32px;
  flex-shrink: 0;
`,Ie=n.Ay.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#333"}};
  flex: 1;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`,ze=n.Ay.strong`
  font-weight: 700;
  color: #d84315;
`,De=n.Ay.span`
  font-weight: 600;
  color: #f57c00;
  text-decoration: underline;
  text-decoration-color: #ff9800;
  text-decoration-thickness: 2px;
`,Pe=n.Ay.button`
  background: rgba(0, 0, 0, 0.1);
  border: none;
  color: #666;
  font-size: 32px;
  font-weight: 300;
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.2);
    color: #333;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`,Te=(0,n.Ay)(r.P.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
`,Ne=(0,n.Ay)(r.P.div)`
  background: ${e=>e.theme.surface};
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 2px solid ${e=>e.theme.warning||"#ff9800"};
`,Le=n.Ay.div`
  font-size: 4rem;
  text-align: center;
  margin-bottom: 1rem;
`,Oe=n.Ay.h2`
  color: ${e=>e.theme.text};
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin: 0 0 1rem 0;
`,Re=n.Ay.p`
  color: ${e=>e.theme.textSecondary};
  font-size: 1rem;
  text-align: center;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
`,Me=n.Ay.div`
  background: ${e=>e.theme.background};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  
  p {
    margin: 0.5rem 0;
    color: ${e=>e.theme.textSecondary};
    
    strong {
      color: ${e=>e.theme.text};
    }
  }
`,Be=n.Ay.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`,_e=n.Ay.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.primary {
    background: ${e=>e.theme.primary};
    color: white;
    
    &:hover {
      background: ${e=>e.theme.primaryDark||e.theme.primary};
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(49, 144, 252, 0.3);
    }
  }
  
  &.secondary {
    background: ${e=>e.theme.border};
    color: ${e=>e.theme.text};
    
    &:hover {
      background: ${e=>e.theme.borderDark||e.theme.border};
    }
  }
`;function qe(e){let{isOpen:t,sessionInfo:i,onReload:a,onLogout:r}=e;if(!t)return null;return(0,l.jsx)(o.N,{children:(0,l.jsx)(Te,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,l.jsxs)(Ne,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},children:[(0,l.jsx)(Le,{children:"\ud83d\udd12"}),(0,l.jsx)(Oe,{children:"Sesi\xf3n Activa en Otro Dispositivo"}),(0,l.jsx)(Re,{children:"Se detect\xf3 que tu cuenta est\xe1 siendo usada en otro dispositivo. Solo puedes tener una sesi\xf3n activa a la vez."}),i&&(0,l.jsxs)(Me,{children:[(0,l.jsxs)("p",{children:[(0,l.jsx)("strong",{children:"Navegador:"})," ",(n=i.browser,n?n.includes("Chrome")?"Chrome":n.includes("Firefox")?"Firefox":n.includes("Safari")&&!n.includes("Chrome")?"Safari":n.includes("Edge")?"Edge":"Otro navegador":"Navegador desconocido")]}),(0,l.jsxs)("p",{children:[(0,l.jsx)("strong",{children:"Iniciada:"})," ",(e=>{if(!e)return"Desconocido";try{return new Date(e).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short"})}catch{return"Desconocido"}})(i.createdAt)]})]}),(0,l.jsx)(Re,{style:{fontSize:"0.9rem",marginBottom:"1rem"},children:"\xbfQuieres cerrar la otra sesi\xf3n y continuar aqu\xed?"}),(0,l.jsxs)(Be,{children:[(0,l.jsx)(_e,{className:"secondary",onClick:r,children:"Cerrar Sesi\xf3n"}),(0,l.jsx)(_e,{className:"primary",onClick:a,children:"Continuar Aqu\xed"})]})]})})});var n}var Qe=i(5485);i(326);i(1893);var Ue=i(9312),He=i(1382);i(2551);const Ve=async function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const{onProgress:i,analyzeStructure:a=!0}=t,r=e.name.toLowerCase(),o=e.type;let n="";if("text/plain"===o||r.endsWith(".txt"))n=await async function(e){return new Promise(((t,i)=>{const a=new FileReader;a.onload=e=>t(e.target.result),a.onerror=e=>i(new Error(`Error al leer el archivo TXT: ${e.message||"Error desconocido"}`)),a.readAsText(e)}))}(e);else if("application/vnd.openxmlformats-officedocument.wordprocessingml.document"===o||r.endsWith(".docx"))n=await async function(e){try{const t=await e.arrayBuffer();return(await Ue.extractRawText({arrayBuffer:t})).value}catch(t){throw new Error(`Error al procesar archivo DOCX: ${t.message||"Error desconocido"}`)}}(e);else{if("application/pdf"!==o&&!r.endsWith(".pdf"))throw new Error("Formato de archivo no soportado");n=await async function(e,t){(new FormData).append("pdfFile",e);try{if(!await(0,He.WR)())throw new Error("Backend no disponible");return await(0,He.SI)(e)}catch(i){console.warn("\ud83d\udd04 Backend no disponible, usando procesamiento local del PDF:",i.message),t&&t(.1);const a=`\ud83d\udcc4 **Archivo PDF procesado localmente**\n\n**Nombre del archivo:** ${e.name}\n**Tama\xf1o:** ${(e.size/1024/1024).toFixed(2)} MB\n**Fecha de carga:** ${(new Date).toLocaleString()}\n\n---\n\n**\ud83d\udd27 Modo de demostraci\xf3n activo**\n\nEste es contenido simulado ya que el servidor backend no est\xe1 disponible. \n\n**Para activar el procesamiento completo de PDFs:**\n1. Inicia el servidor backend en puerto 3001\n2. O usa archivos TXT/DOCX que se procesan localmente\n\n**Mientras tanto, puedes:**\n- \u2705 Probar la lectura interactiva \n- \u2705 Explorar las opciones de configuraci\xf3n centralizada\n- \u2705 Cargar archivos TXT o DOCX para procesamiento completo\n\n\xa1Inicia el servidor backend para experimentar el procesamiento completo de PDFs!`;return t&&t(1),a}}(e,i)}return console.log("\ud83d\udcd6 Usando procesamiento local sin IA (m\xe1s r\xe1pido y confiable)"),n},Ge=864e5,We="file_cache_",Xe=50,Je=1e5,Ke=()=>{const[e,t]=(0,a.useState)({entryCount:0,totalSize:0,hitCount:0,missCount:0}),i=(0,a.useRef)(null),r=(0,a.useRef)(0),o=(0,a.useMemo)((()=>e=>{if(e.length>Je)try{return e.replace(/\s+/g," ").trim()}catch(t){return console.warn("Error comprimiendo texto:",t),e}return e}),[]),n=(0,a.useCallback)((()=>{i.current&&clearTimeout(i.current),i.current=setTimeout((()=>{const e=Date.now();if(!(e-r.current<1e3))try{let i=0,a=0;for(let e=0;e<localStorage.length;e++){const t=localStorage.key(e);if(null!==t&&void 0!==t&&t.startsWith(We)){i++;const e=localStorage.getItem(t);e&&(a+=e.length)}}t((e=>e.entryCount!==i||Math.abs(e.totalSize-a)>1e3?{...e,entryCount:i,totalSize:a}:e)),r.current=e}catch(i){console.warn("Error actualizando estad\xedsticas de cach\xe9:",i)}}),250)}),[]),s=(0,a.useCallback)(((e,i)=>{try{const a=`${We}${(0,Qe.f$)(e+i)}`,r=localStorage.getItem(a);if(!r)return t((e=>({...e,missCount:e.missCount+1}))),null;const o=JSON.parse(r);return Date.now()-o.timestamp>Ge?(localStorage.removeItem(a),t((e=>({...e,missCount:e.missCount+1}))),null):(t((e=>({...e,hitCount:e.hitCount+1}))),o.data)}catch(a){return console.warn("Error obteniendo de cach\xe9:",a),t((e=>({...e,missCount:e.missCount+1}))),null}}),[]),l=(0,a.useCallback)(((e,t,i)=>{try{const a=`${We}${(0,Qe.f$)(e+t)}`,r={...i,content:o(i.content||""),timestamp:Date.now()},s=JSON.stringify(r);return s.length>1024*Xe*1024*.1?(console.warn("Archivo muy grande para cach\xe9:",e),!1):(localStorage.setItem(a,s),n(),!0)}catch(a){if("QuotaExceededError"===a.name){console.warn("Cuota de localStorage excedida, limpiando cach\xe9..."),c();try{return localStorage.setItem(cacheKey,JSON.stringify(compressedData)),n(),!0}catch(r){return console.error("Error guardando en cach\xe9 despu\xe9s de limpieza:",r),!1}}return console.warn("Error guardando en cach\xe9:",a),!1}}),[o,n]),c=(0,a.useCallback)((()=>{try{const t=[];for(let a=0;a<localStorage.length;a++){const i=localStorage.key(a);if(null!==i&&void 0!==i&&i.startsWith(We))try{const e=localStorage.getItem(i),a=JSON.parse(e);t.push({key:i,timestamp:a.timestamp,size:e.length})}catch(e){localStorage.removeItem(i)}}t.sort(((e,t)=>e.timestamp-t.timestamp));const i=Math.ceil(.3*t.length);for(let e=0;e<i;e++)localStorage.removeItem(t[e].key);n(),console.log(`Cach\xe9 limpiada: ${i} entradas removidas`)}catch(t){console.warn("Error limpiando cach\xe9:",t)}}),[n]),d=(0,a.useCallback)(((e,t)=>{try{const i=`${We}${(0,Qe.f$)(e+t)}`,a=null!==localStorage.getItem(i);return localStorage.removeItem(i),a&&n(),a}catch(i){return console.warn("Error invalidando cach\xe9:",i),!1}}),[n]),u=(0,a.useCallback)((()=>{try{const e=[];for(let t=0;t<localStorage.length;t++){const i=localStorage.key(t);null!==i&&void 0!==i&&i.startsWith(We)&&e.push(i)}e.forEach((e=>localStorage.removeItem(e))),t({entryCount:0,totalSize:0,hitCount:0,missCount:0}),console.log(`Cach\xe9 completamente limpiada: ${e.length} entradas removidas`)}catch(e){console.warn("Error limpiando cach\xe9 completa:",e)}}),[]);return(0,a.useEffect)((()=>(n(),()=>{i.current&&clearTimeout(i.current)})),[n]),(0,a.useMemo)((()=>({obtenerDeCache:s,guardarEnCache:l,invalidarCache:d,limpiarCache:u,limpiarCacheAntiguo:c,cacheStats:e})),[s,l,d,u,c,e])};var Ye=i(7085);var Ze=i(7337),et=i(7927);const tt=(0,n.Ay)(r.P.div)`
  background: ${e=>e.theme.surface||"#FFFFFF"};
  border: 1px solid ${e=>e.theme.border||"#E4EAF1"};
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${e=>e.theme.primary||"#3190FC"};
    box-shadow: 0 4px 12px ${e=>e.theme.primary||"#3190FC"}20;
  }
`,it=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
  gap: 1rem;
`,at=n.Ay.div`
  flex: 1;
  min-width: 0;
`,rt=n.Ay.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${e=>e.theme.text};
  line-height: 1.3;
`,ot=n.Ay.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`,nt=n.Ay.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.7rem;
  background: ${e=>"firestore"===e.$source?e.theme.info||"#3B82F6":"local"===e.$source?e.theme.warning||"#F59E0B":e.theme.success||"#10B981"};
  color: white;
  flex-shrink: 0;
`,st=n.Ay.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${e=>"success"===e.$type?e.theme.success||"#10B981":"info"===e.$type?e.theme.info||"#3B82F6":e.theme.textMuted||"#6B7280"};
  color: white;
`,lt=n.Ay.span`
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted};
  transform: ${e=>e.$expanded?"rotate(180deg)":"rotate(0deg)"};
  transition: transform 0.3s;
`,ct=n.Ay.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
`,dt=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: ${e=>e.theme.textMuted};
`,ut=n.Ay.span`
  font-size: 1rem;
`,mt=n.Ay.div`
  width: 100%;
  height: 6px;
  background: ${e=>e.theme.border||"#E4EAF1"};
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.75rem;
`,pt=(0,n.Ay)(r.P.div)`
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #10B981);
  border-radius: 3px;
  width: ${e=>e.$percentage}%;
`,ht=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted};
  font-style: italic;
  line-height: 1.5;
  padding: 0.75rem;
  background: ${e=>e.theme.background||"#F6F8FA"};
  border-radius: 8px;
  margin-bottom: 0.75rem;
`,gt=(0,n.Ay)(r.P.div)`
  overflow: hidden;
  border-top: 1px solid ${e=>e.theme.border};
  padding-top: 1rem;
  margin-top: 1rem;
`,xt=n.Ay.div`
  margin-bottom: 1rem;
`,vt=n.Ay.h4`
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${e=>e.theme.text};
`,ft=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,bt=n.Ay.div`
  padding: 0.75rem;
  background: ${e=>e.theme.background||"#F6F8FA"};
  border-radius: 8px;
`,yt=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`,wt=n.Ay.span`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${e=>e.theme.text};
`,At=n.Ay.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${e=>e.$empty?e.theme.textMuted:e.$color};
`,Et=n.Ay.div`
  width: 100%;
  height: 4px;
  background: ${e=>e.theme.border};
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.35rem;
`,jt=n.Ay.div`
  height: 100%;
  width: ${e=>e.$percentage}%;
  background: ${e=>e.$color};
  border-radius: 2px;
  transition: width 0.5s ease;
`,Ct=n.Ay.div`
  font-size: 0.75rem;
  color: ${e=>e.theme.textMuted};
`,St=n.Ay.div`
  margin-bottom: 1rem;
`,$t=n.Ay.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`,kt=n.Ay.span`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.65rem;
  background: ${e=>e.theme.primary||"#3190FC"}20;
  color: ${e=>e.theme.primary||"#3190FC"};
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
`,Ft=n.Ay.div`
  margin-bottom: 1rem;
`,It=n.Ay.div`
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted};
`,zt=n.Ay.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
`,Dt=(0,n.Ay)(r.P.button)`
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${e=>e.$primary&&`\n    background: ${e.theme.primary||"#3190FC"};\n    color: white;\n\n    &:hover {\n      background: ${e.theme.primary||"#3190FC"}dd;\n    }\n  `}

  ${e=>e.$danger&&`\n    background: ${e.theme.danger||"#EF4444"}20;\n    color: ${e.theme.danger||"#EF4444"};\n\n    &:hover {\n      background: ${e.theme.danger||"#EF4444"}30;\n    }\n  `}

  ${e=>!e.$primary&&!e.$danger&&`\n    background: ${e.theme.surface||"#FFFFFF"};\n    color: ${e.theme.text};\n    border: 1px solid ${e.theme.border||"#E4EAF1"};\n\n    &:hover {\n      background: ${e.theme.background||"#F6F8FA"};\n    }\n  `}
`,Pt=e=>{var t,i,r,n,s,c,d;let{session:u,theme:m,onRestore:p,onDelete:h,onExport:g}=e;const[x,v]=(0,a.useState)(!1),f=(()=>{const e=u.rubricProgress||{},t=Object.keys(e).filter((e=>e.startsWith("rubrica")));if(0===t.length)return 0;const i=t.reduce(((t,i)=>{var a;return t+((null===(a=e[i])||void 0===a?void 0:a.average)||0)}),0);return Math.round(i/t.length*10)})(),b=(()=>{const e=u.rubricProgress||{};return[{id:"rubrica1",name:"Comprensi\xf3n",color:"#3B82F6"},{id:"rubrica2",name:"ACD",color:"#8B5CF6"},{id:"rubrica3",name:"Contextualizaci\xf3n",color:"#10B981"},{id:"rubrica4",name:"Argumentaci\xf3n",color:"#F59E0B"},{id:"rubrica5",name:"Metacognici\xf3n",color:"#EF4444"}].map((t=>{var i,a,r,o;return{...t,average:(null===(i=e[t.id])||void 0===i?void 0:i.average)||0,scores:(null===(a=e[t.id])||void 0===a?void 0:a.scores)||[],hasData:(null===(r=e[t.id])||void 0===r||null===(o=r.scores)||void 0===o?void 0:o.length)>0}}))})(),y=b.filter((e=>e.hasData)).length;return(0,l.jsxs)(tt,{theme:m,layout:!0,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},whileHover:{scale:1.01},onClick:e=>{e.target.closest("button")||p(u)},style:{cursor:"pointer"},children:[(0,l.jsxs)(it,{theme:m,children:[(0,l.jsxs)(at,{children:[(0,l.jsx)(rt,{theme:m,children:u.title}),(0,l.jsxs)(ot,{children:[(0,l.jsx)(nt,{theme:m,$source:u.source,title:"firestore"===u.source?"Solo en la nube":"local"===u.source?"Solo en este dispositivo":"synced"===u.syncStatus?"Sincronizado":"En ambos lugares",children:"firestore"===u.source?"\u2601\ufe0f":"local"===u.source?"\ud83d\udcf1":"synced"===u.syncStatus?"\u2713":"\u27f3"}),u.hasCompleteAnalysis&&(0,l.jsx)(st,{theme:m,$type:"success",children:"\u2705 An\xe1lisis"}),y>0&&(0,l.jsxs)(st,{theme:m,$type:"info",children:[y,"/5 r\xfabricas"]})]})]}),(0,l.jsx)(lt,{$expanded:x,onClick:e=>{e.stopPropagation(),v(!x)},children:"\u25bc"})]}),(0,l.jsxs)(ct,{theme:m,children:[(0,l.jsxs)(dt,{theme:m,children:[(0,l.jsx)(ut,{children:"\ud83d\udcc5"}),(e=>{if(!e)return"Sin fecha";return new Date(e).toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})})(u.lastModified||u.createdAt)]}),(0,l.jsxs)(dt,{theme:m,children:[(0,l.jsx)(ut,{children:"\ud83d\udcc4"}),(null===(t=u.textMetadata)||void 0===t?void 0:t.words)||(null===(i=u.text)||void 0===i||null===(r=i.metadata)||void 0===r?void 0:r.words)||0," palabras"]}),f>0&&(0,l.jsxs)(dt,{theme:m,children:[(0,l.jsx)(ut,{children:"\ud83c\udfaf"}),"Progreso: ",f,"%"]})]}),f>0&&(0,l.jsx)(mt,{theme:m,children:(0,l.jsx)(pt,{theme:m,$percentage:f,initial:{width:0},animate:{width:`${f}%`},transition:{duration:.5}})}),(0,l.jsx)(ht,{theme:m,children:(()=>{var e;if(null!==(e=u.text)&&void 0!==e&&e.content){const e=u.text.content.substring(0,120);return e.length<u.text.content.length?e+"...":e}return"Sin texto disponible"})()}),(0,l.jsx)(o.N,{children:x&&(0,l.jsxs)(gt,{theme:m,initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.3},children:[(0,l.jsxs)(xt,{theme:m,children:[(0,l.jsx)(vt,{theme:m,children:"\ud83d\udcca Progreso por R\xfabrica"}),(0,l.jsx)(ft,{children:b.map((e=>(0,l.jsxs)(bt,{theme:m,children:[(0,l.jsxs)(yt,{children:[(0,l.jsx)(wt,{theme:m,children:e.name}),e.hasData?(0,l.jsxs)(At,{theme:m,$color:e.color,children:[e.average.toFixed(1),"/10"]}):(0,l.jsx)(At,{theme:m,$empty:!0,children:"Sin datos"})]}),e.hasData&&(0,l.jsx)(Et,{theme:m,children:(0,l.jsx)(jt,{$color:e.color,$percentage:e.average/10*100})}),e.scores.length>0&&(0,l.jsxs)(Ct,{theme:m,children:[e.scores.length," evaluaci\xf3n",e.scores.length>1?"es":""]})]},e.id)))})]}),u.artifactsDrafts&&Object.keys(u.artifactsDrafts).some((e=>{const t=u.artifactsDrafts[e];return t&&(t.draft||Object.keys(t).length>0)}))&&(0,l.jsxs)(St,{theme:m,children:[(0,l.jsx)(vt,{theme:m,children:"\ud83d\udcdd Artefactos Creados"}),(0,l.jsxs)($t,{children:[(null===(n=u.artifactsDrafts.resumenAcademico)||void 0===n?void 0:n.draft)&&(0,l.jsx)(kt,{theme:m,children:"\ud83d\udccb Resumen Acad\xe9mico"}),(null===(s=u.artifactsDrafts.tablaACD)||void 0===s?void 0:s.marcoIdeologico)&&(0,l.jsx)(kt,{theme:m,children:"\ud83d\udd0d Tabla ACD"}),(null===(c=u.artifactsDrafts.mapaActores)||void 0===c?void 0:c.actores)&&(0,l.jsx)(kt,{theme:m,children:"\ud83d\uddfa\ufe0f Mapa de Actores"}),(null===(d=u.artifactsDrafts.respuestaArgumentativa)||void 0===d?void 0:d.tesis)&&(0,l.jsx)(kt,{theme:m,children:"\ud83d\udcac Respuesta Argumentativa"})]})]}),u.savedCitations&&Object.keys(u.savedCitations).length>0&&(0,l.jsxs)(Ft,{theme:m,children:[(0,l.jsx)(vt,{theme:m,children:"\ud83d\udccc Citas Guardadas"}),(0,l.jsxs)(It,{theme:m,children:[Object.keys(u.savedCitations).length," cita",Object.keys(u.savedCitations).length>1?"s":""]})]})]})}),(0,l.jsxs)(zt,{theme:m,children:[g&&(0,l.jsx)(Dt,{theme:m,onClick:e=>{e.stopPropagation(),g(u)},whileHover:{scale:1.05},whileTap:{scale:.95},children:"\ud83d\udce5 Exportar"}),(0,l.jsx)(Dt,{theme:m,$danger:!0,onClick:e=>{e.stopPropagation(),h(u)},whileHover:{scale:1.05},whileTap:{scale:.95},children:"\ud83d\uddd1\ufe0f"})]})]})},Tt=n.Ay.div`
  background: ${e=>e.theme.surface||"#FFFFFF"};
  border: 1px solid ${e=>e.theme.border||"#E4EAF1"};
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
`,Nt=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  cursor: pointer;
  background: ${e=>e.theme.surface};
  transition: background 0.2s;

  &:hover {
    background: ${e=>e.theme.background||"#F6F8FA"};
  }
`,Lt=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,Ot=n.Ay.span`
  font-size: 1.2rem;
`,Rt=n.Ay.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${e=>e.theme.text};
`,Mt=n.Ay.span`
  padding: 0.25rem 0.5rem;
  background: ${e=>e.theme.primary||"#3190FC"}20;
  color: ${e=>e.theme.primary||"#3190FC"};
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
`,Bt=n.Ay.span`
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted};
  transform: ${e=>e.$expanded?"rotate(180deg)":"rotate(0deg)"};
  transition: transform 0.3s;
`,_t=(0,n.Ay)(r.P.div)`
  padding: 0 1.25rem 1rem 1.25rem;
  overflow: hidden;
`,qt=n.Ay.div`
  margin-bottom: 1rem;
`,Qt=n.Ay.label`
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: ${e=>e.theme.text};
`,Ut=n.Ay.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${e=>e.theme.border||"#E4EAF1"};
  border-radius: 8px;
  font-size: 0.9rem;
  color: ${e=>e.theme.text};
  background: ${e=>e.theme.surface};
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${e=>e.theme.primary||"#3190FC"};
    box-shadow: 0 0 0 3px ${e=>e.theme.primary||"#3190FC"}20;
  }

  &::placeholder {
    color: ${e=>e.theme.textMuted};
  }
`,Ht=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`,Vt=n.Ay.select`
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid ${e=>e.theme.border||"#E4EAF1"};
  border-radius: 8px;
  font-size: 0.85rem;
  color: ${e=>e.theme.text};
  background: ${e=>e.theme.surface};
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${e=>e.theme.primary||"#3190FC"};
    box-shadow: 0 0 0 3px ${e=>e.theme.primary||"#3190FC"}20;
  }
`,Gt=n.Ay.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
`,Wt=(0,n.Ay)(r.P.button)`
  padding: 0.65rem 1rem;
  border: 1px solid ${e=>e.$active?e.theme.primary||"#3190FC":e.theme.border||"#E4EAF1"};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  background: ${e=>e.$active?e.theme.primary||"#3190FC":e.theme.surface};
  color: ${e=>e.$active?"white":e.theme.text};
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${e=>e.theme.primary||"#3190FC"}30;
  }
`,Xt=(0,n.Ay)(r.P.button)`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${e=>e.theme.border};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  background: ${e=>e.theme.surface};
  color: ${e=>e.theme.textMuted};
  margin-top: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: ${e=>e.theme.background};
    color: ${e=>e.theme.text};
  }
`,Jt=n.Ay.div`
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${e=>e.theme.border};
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted};
  background: ${e=>e.theme.background||"#F6F8FA"};

  strong {
    color: ${e=>e.theme.text};
    font-weight: 600;
  }
`,Kt=e=>{let{onFiltersChange:t,totalSessions:i,theme:r}=e;const[n,s]=(0,a.useState)(!1),[c,d]=(0,a.useState)({searchQuery:"",dateRange:"all",hasAnalysis:"all",hasProgress:"all",sortBy:"recent",syncStatus:"all"}),u=(0,a.useCallback)(((e,i)=>{const a={...c,[e]:i};d(a),t(a)}),[c,t]),m=(()=>{let e=0;return c.searchQuery&&e++,"all"!==c.dateRange&&e++,"all"!==c.hasAnalysis&&e++,"all"!==c.hasProgress&&e++,"all"!==c.syncStatus&&e++,e})();return(0,l.jsxs)(Tt,{theme:r,children:[(0,l.jsxs)(Nt,{theme:r,onClick:()=>s(!n),children:[(0,l.jsxs)(Lt,{children:[(0,l.jsx)(Ot,{children:"\ud83d\udd0d"}),(0,l.jsx)(Rt,{theme:r,children:"Filtros y Ordenamiento"}),m>0&&(0,l.jsxs)(Mt,{theme:r,children:[m," activo",m>1?"s":""]})]}),(0,l.jsx)(Bt,{$expanded:n,children:"\u25bc"})]}),(0,l.jsx)(o.N,{children:n&&(0,l.jsxs)(_t,{theme:r,initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.3},children:[(0,l.jsxs)(qt,{theme:r,children:[(0,l.jsx)(Qt,{theme:r,children:"\ud83d\udd0e Buscar por t\xedtulo o contenido"}),(0,l.jsx)(Ut,{theme:r,type:"text",placeholder:"Escribe para buscar...",value:c.searchQuery,onChange:e=>u("searchQuery",e.target.value)})]}),(0,l.jsxs)(Ht,{children:[(0,l.jsxs)(qt,{theme:r,children:[(0,l.jsx)(Qt,{theme:r,children:"\ud83d\udcc5 Fecha"}),(0,l.jsxs)(Vt,{theme:r,value:c.dateRange,onChange:e=>u("dateRange",e.target.value),children:[(0,l.jsx)("option",{value:"all",children:"Todas"}),(0,l.jsx)("option",{value:"today",children:"Hoy"}),(0,l.jsx)("option",{value:"week",children:"\xdaltima semana"}),(0,l.jsx)("option",{value:"month",children:"\xdaltimo mes"}),(0,l.jsx)("option",{value:"custom",children:"Personalizado"})]})]}),(0,l.jsxs)(qt,{theme:r,children:[(0,l.jsx)(Qt,{theme:r,children:"\u2601\ufe0f Sincronizaci\xf3n"}),(0,l.jsxs)(Vt,{theme:r,value:c.syncStatus,onChange:e=>u("syncStatus",e.target.value),children:[(0,l.jsx)("option",{value:"all",children:"Todas"}),(0,l.jsx)("option",{value:"synced",children:"Sincronizadas"}),(0,l.jsx)("option",{value:"local",children:"Solo local"}),(0,l.jsx)("option",{value:"cloud",children:"Solo nube"})]})]}),(0,l.jsxs)(qt,{theme:r,children:[(0,l.jsx)(Qt,{theme:r,children:"\u2705 An\xe1lisis"}),(0,l.jsxs)(Vt,{theme:r,value:c.hasAnalysis,onChange:e=>u("hasAnalysis",e.target.value),children:[(0,l.jsx)("option",{value:"all",children:"Todas"}),(0,l.jsx)("option",{value:"yes",children:"Con an\xe1lisis"}),(0,l.jsx)("option",{value:"no",children:"Sin an\xe1lisis"})]})]}),(0,l.jsxs)(qt,{theme:r,children:[(0,l.jsx)(Qt,{theme:r,children:"\ud83d\udcca Progreso"}),(0,l.jsxs)(Vt,{theme:r,value:c.hasProgress,onChange:e=>u("hasProgress",e.target.value),children:[(0,l.jsx)("option",{value:"all",children:"Todas"}),(0,l.jsx)("option",{value:"yes",children:"Con progreso"}),(0,l.jsx)("option",{value:"no",children:"Sin progreso"})]})]})]}),(0,l.jsxs)(qt,{theme:r,children:[(0,l.jsx)(Qt,{theme:r,children:"\ud83d\udd04 Ordenar por"}),(0,l.jsxs)(Gt,{theme:r,children:[(0,l.jsx)(Wt,{theme:r,$active:"recent"===c.sortBy,onClick:()=>u("sortBy","recent"),whileHover:{scale:1.05},whileTap:{scale:.95},children:"\ud83d\udcc5 M\xe1s reciente"}),(0,l.jsx)(Wt,{theme:r,$active:"oldest"===c.sortBy,onClick:()=>u("sortBy","oldest"),whileHover:{scale:1.05},whileTap:{scale:.95},children:"\ud83d\udd52 M\xe1s antiguo"}),(0,l.jsx)(Wt,{theme:r,$active:"progress"===c.sortBy,onClick:()=>u("sortBy","progress"),whileHover:{scale:1.05},whileTap:{scale:.95},children:"\ud83d\udcc8 Mayor progreso"}),(0,l.jsx)(Wt,{theme:r,$active:"words"===c.sortBy,onClick:()=>u("sortBy","words"),whileHover:{scale:1.05},whileTap:{scale:.95},children:"\ud83d\udcc4 M\xe1s palabras"})]})]}),m>0&&(0,l.jsx)(Xt,{theme:r,onClick:()=>{const e={searchQuery:"",dateRange:"all",hasAnalysis:"all",hasProgress:"all",sortBy:"recent",syncStatus:"all"};d(e),t(e)},whileHover:{scale:1.05},whileTap:{scale:.95},children:"\ud83d\udd04 Restablecer filtros"})]})}),(0,l.jsxs)(Jt,{theme:r,children:["Mostrando ",(0,l.jsx)("strong",{children:i})," sesi\xf3n",1!==i?"es":""]})]})},Yt=n.Ay.div`
  margin-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
  padding-top: 1rem;
`,Zt=n.Ay.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
  
  &:hover {
    background: ${e=>e.theme.background||"#F6F8FA"};
  }
`,ei=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${e=>e.theme.text};
`,ti=n.Ay.span`
  font-size: 1.2rem;
`,ii=n.Ay.span`
  font-size: 0.85rem;
  font-weight: 400;
  color: ${e=>e.theme.textMuted||"#607D8B"};
  margin-left: 0.25rem;
`,ai=n.Ay.span`
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted||"#607D8B"};
  transform: ${e=>e.$expanded?"rotate(180deg)":"rotate(0deg)"};
  transition: transform 0.3s;
`,ri=(0,n.Ay)(r.P.div)`
  overflow: hidden;
  padding: 0.75rem 0;
`,oi=(0,n.Ay)(r.P.button)`
  flex: 1;
  padding: 0.75rem;
  background: ${e=>e.theme.primary||"#3190FC"};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: ${e=>e.theme.primary||"#3190FC"}dd;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,ni=(0,n.Ay)(r.P.button)`
  flex: 1;
  padding: 0.75rem;
  background: linear-gradient(135deg, #10B981, #059669);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,si=n.Ay.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`,li=(0,n.Ay)(r.P.button)`
  flex: 1;
  padding: 0.65rem;
  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: linear-gradient(135deg, #2563EB, #1E40AF);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,ci=(0,n.Ay)(r.P.button)`
  flex: 1;
  padding: 0.65rem;
  background: ${e=>e.theme.surface||"#FFFFFF"};
  color: ${e=>e.theme.danger||"#C62828"};
  border: 1px solid ${e=>e.theme.border||"#E4EAF1"};
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${e=>e.theme.border||"#E4EAF1"};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`,di=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 500px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${e=>e.theme.background||"#F6F8FA"};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${e=>e.theme.border||"#E4EAF1"};
    border-radius: 3px;
    
    &:hover {
      background: ${e=>e.theme.textMuted||"#607D8B"};
    }
  }
`,ui=n.Ay.div`
  text-align: center;
  padding: 2rem 1rem;
  color: ${e=>e.theme.textMuted||"#607D8B"};
`,mi=n.Ay.div`
  font-size: 3rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
`,pi=n.Ay.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: ${e=>e.theme.text||"#232B33"};
`,hi=n.Ay.div`
  font-size: 0.85rem;
`,gi=n.Ay.span`
  font-size: 0.9rem;
  margin-left: 0.5rem;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`,xi=n.Ay.div`
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: ${e=>e.theme.surfaceVariant||"#F6F8FA"};
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid ${e=>e.theme.border||"#E4EAF1"};
  font-size: 0.85rem;
  flex-wrap: wrap;
`,vi=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: ${e=>e.warning?e.theme.warning||"#F59E0B":e.theme.text};
  font-weight: ${e=>e.warning?"600":"400"};
`,fi=n.Ay.span`
  font-size: 1rem;
`,bi=n.Ay.span`
  font-size: 0.8rem;
`,yi=n.Ay.div`
  padding: 0.875rem;
  background: ${e=>e.$warning?e.theme.warningLight||"#FEF3C7":e.theme.surfaceVariant||"#F6F8FA"};
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid ${e=>e.$warning?e.theme.warning||"#F59E0B":e.theme.border||"#E4EAF1"};
  transition: all 0.3s ease;
`,wi=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`,Ai=n.Ay.span`
  font-size: 1.2rem;
`,Ei=n.Ay.div`
  font-size: 0.9rem;
  color: ${e=>e.theme.text||"#232B33"};
  
  strong {
    font-weight: 600;
  }
`,ji=n.Ay.span`
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted||"#607D8B"};
  margin-left: 0.25rem;
`,Ci=n.Ay.div`
  height: 6px;
  background: ${e=>e.theme.border||"#E4EAF1"};
  border-radius: 3px;
  overflow: hidden;
  position: relative;
`,Si=n.Ay.div`
  height: 100%;
  width: ${e=>e.$percent}%;
  background: ${e=>e.$warning?e.theme.warning||"#F59E0B":e.theme.primary||"#4A90E2"};
  transition: width 0.5s ease, background 0.3s ease;
  border-radius: 3px;
`,$i=n.Ay.div`
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: ${e=>e.theme.background||"#FFFFFF"};
  border-radius: 6px;
  font-size: 0.8rem;
  color: ${e=>e.theme.textMuted||"#607D8B"};
  line-height: 1.4;
`,ki=e=>{let{theme:t}=e;const{texto:i,modoOscuro:r,restoreSession:n,createSession:c,updateCurrentSessionFromState:d,currentUser:u}=(0,a.useContext)(s.BR),[m,p]=(0,a.useState)([]),[h,g]=(0,a.useState)(!1),[x,v]=(0,a.useState)(null),[f,b]=(0,a.useState)(null),[y,w]=(0,a.useState)(!1),[A,E]=(0,a.useState)(null),[j,C]=(0,a.useState)({searchQuery:"",dateRange:"all",hasAnalysis:"all",hasProgress:"all",sortBy:"recent",syncStatus:"all"});(0,a.useEffect)((()=>{S();const e=()=>S();return window.addEventListener("session-updated",e),()=>{window.removeEventListener("session-updated",e)}}),[u]);const S=(0,a.useCallback)((async()=>{try{if(w(!0),u){const e=await(0,et.L2)();p(e);const t=await(0,et.KZ)();b(t);const i=(0,et.jX)();E(i),console.log("\ud83d\udcca [SessionsHistory] Sesiones cargadas:",{total:e.length,limit:i.max,remaining:i.remaining,percentUsed:i.percentUsed+"%",isNearLimit:i.isNearLimit})}else{const e=(0,et.Dq)();p(e.map((e=>({...e,source:"local",inCloud:!1,inLocal:!0})))),b(null)}}catch(e){console.error("\u274c Error cargando sesiones:",e);const t=(0,et.Dq)();p(t)}finally{w(!1)}}),[u]),$=(0,a.useCallback)((async e=>{if(console.log("\ud83d\uddb1\ufe0f [SessionsHistory] Click en sesi\xf3n:",{id:e.id,timestamp:e.timestamp,hasText:!!e.text,restoreSessionAvailable:!!n}),!n)return void console.error("\u274c restoreSession no disponible en contexto");const{hasDrafts:t}=(0,Ye.x)();if(t){const e=(0,Ye.m)();if(!window.confirm(e))return void console.log("\u274c [SessionsHistory] Cambio de sesi\xf3n cancelado por el usuario")}console.log("\ud83d\udcc2 [SessionsHistory] Restaurando sesi\xf3n:",e.id);const i=await n(e);console.log("\ud83d\udd04 [SessionsHistory] Resultado restauraci\xf3n:",i?"\u2705 \xc9xito":"\u274c Error"),i?(g(!1),setTimeout((()=>{console.log('\ud83d\udd00 [SessionsHistory] Cambiando a tab "lectura-guiada"'),window.dispatchEvent(new CustomEvent("app-change-tab",{detail:{tabId:"lectura-guiada"}}))}),300)):console.error("\u274c [SessionsHistory] No se pudo restaurar la sesi\xf3n")}),[n]),k=(0,a.useCallback)((async(e,t)=>{if(t.stopPropagation(),!window.confirm("\xbfEst\xe1s seguro de que quieres eliminar esta sesi\xf3n? Esta acci\xf3n no se puede deshacer."))return;v(e);(0,et.ME)(e)&&(S(),setTimeout((()=>v(null)),300))}),[S]),F=(0,a.useCallback)((()=>{if(!m.length)return;if(!window.confirm("\xbfEliminar todas las sesiones guardadas? Esta acci\xf3n borrar\xe1 el historial completo."))return;(0,et.mw)()&&(S(),window.dispatchEvent(new CustomEvent("session-updated")))}),[m.length,S]),I=(0,a.useCallback)((async()=>{if(!i||!c)return void console.warn("\u26a0\ufe0f No hay texto cargado para crear sesi\xf3n");await c()&&(S(),g(!1))}),[i,c,S]),z=(0,a.useCallback)((async()=>{if(!i)return void console.warn("\u26a0\ufe0f [SessionsHistory] No hay texto para guardar");if((0,et.dC)())if(d){w(!0);const e=await d();w(!1),e?(S(),alert("\u2705 Sesi\xf3n guardada exitosamente")):alert("\u274c Error guardando sesi\xf3n")}else console.error("\u274c updateCurrentSessionFromState no disponible");else alert("\u26a0\ufe0f No hay sesi\xf3n activa. Crea una nueva sesi\xf3n primero.")}),[i,d,S]),D=(0,a.useCallback)((async()=>{if(u){if(window.confirm("\xbfSincronizar todas las sesiones locales con Firebase?"))try{w(!0);const e=await(0,et.eh)();alert(`\u2705 Sincronizaci\xf3n completada:\n${e.synced} sesiones sincronizadas\n${e.errors} errores`),S()}catch(e){console.error("\u274c Error sincronizando:",e),alert("Error sincronizando sesiones. Revisa la consola.")}finally{w(!1)}}else alert("Debes iniciar sesi\xf3n para sincronizar con la nube")}),[u,S]),P=(0,a.useMemo)((()=>{let e=[...m];if(j.searchQuery){const t=j.searchQuery.toLowerCase();e=e.filter((e=>{var i,a,r,o;const n=(null===(i=e.title)||void 0===i?void 0:i.toLowerCase())||"",s=(null===(a=e.text)||void 0===a||null===(r=a.content)||void 0===r?void 0:r.toLowerCase())||"",l=(null===(o=e.textPreview)||void 0===o?void 0:o.toLowerCase())||"";return n.includes(t)||s.includes(t)||l.includes(t)}))}if("all"!==j.dateRange){const t=Date.now(),i=864e5,a=7*i,r=30*i;e=e.filter((e=>{const o=new Date(e.lastModified||e.createdAt).getTime(),n=t-o;switch(j.dateRange){case"today":return n<=i;case"week":return n<=a;case"month":return n<=r;default:return!0}}))}return"all"!==j.hasAnalysis&&(e=e.filter((e=>{const t=e.hasCompleteAnalysis||!1;return"yes"===j.hasAnalysis?t:!t}))),"all"!==j.hasProgress&&(e=e.filter((e=>{const t=e.rubricProgress||{},i=Object.keys(t).some((e=>{var i,a;return e.startsWith("rubrica")&&(null===(i=t[e])||void 0===i||null===(a=i.scores)||void 0===a?void 0:a.length)>0}));return"yes"===j.hasProgress?i:!i}))),"all"!==j.syncStatus&&(e=e.filter((e=>{switch(j.syncStatus){case"synced":return"synced"===e.syncStatus||e.inCloud&&e.inLocal;case"local":return"local"===e.source&&!e.inCloud;case"cloud":return"firestore"===e.source&&!e.inLocal;default:return!0}}))),e.sort(((e,t)=>{switch(j.sortBy){case"recent":return(t.lastModified||t.createdAt)-(e.lastModified||e.createdAt);case"oldest":return(e.lastModified||e.createdAt)-(t.lastModified||t.createdAt);case"progress":{const i=e=>{const t=e.rubricProgress||{},i=Object.keys(t).filter((e=>e.startsWith("rubrica")));if(0===i.length)return 0;return i.reduce(((e,i)=>{var a;return e+((null===(a=t[i])||void 0===a?void 0:a.average)||0)}),0)/i.length};return i(t)-i(e)}case"words":{const i=e=>{var t,i,a;return(null===(t=e.textMetadata)||void 0===t?void 0:t.words)||(null===(i=e.text)||void 0===i||null===(a=i.metadata)||void 0===a?void 0:a.words)||0};return i(t)-i(e)}default:return 0}})),e}),[m,j]),T=(0,a.useCallback)((e=>{C(e)}),[]),N=(0,a.useCallback)((e=>{try{const t=JSON.stringify(e,null,2),i="data:application/json;charset=utf-8,"+encodeURIComponent(t),a=`session-${e.id}.json`,r=document.createElement("a");r.setAttribute("href",i),r.setAttribute("download",a),r.click(),console.log("\u2705 Sesi\xf3n exportada:",e.id)}catch(t){console.error("\u274c Error exportando sesi\xf3n:",t),alert("Error exportando la sesi\xf3n")}}),[]);return 0!==m.length||i?(0,l.jsxs)(Yt,{theme:t,children:[(0,l.jsxs)(Zt,{onClick:()=>g(!h),children:[(0,l.jsxs)(ei,{theme:t,children:[(0,l.jsx)(ti,{children:"\ud83d\udcda"}),"Historial de Sesiones",m.length>0&&(0,l.jsxs)(ii,{theme:t,children:["(",m.length,")"]}),y&&(0,l.jsx)(gi,{children:"\u23f3"})]}),(0,l.jsx)(ai,{$expanded:h,children:"\u25bc"})]}),(0,l.jsx)(o.N,{children:h&&(0,l.jsxs)(ri,{theme:t,initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.3},children:[f&&u&&(0,l.jsxs)(xi,{theme:t,children:[(0,l.jsxs)(vi,{children:[(0,l.jsx)(fi,{children:"\u2601\ufe0f"}),(0,l.jsxs)(bi,{children:[f.synced," sincronizadas"]})]}),f.localOnly>0&&(0,l.jsxs)(vi,{children:[(0,l.jsx)(fi,{children:"\ud83d\udcf1"}),(0,l.jsxs)(bi,{children:[f.localOnly," solo locales"]})]}),f.needsSync>0&&(0,l.jsxs)(vi,{warning:!0,children:[(0,l.jsx)(fi,{children:"\u26a0\ufe0f"}),(0,l.jsxs)(bi,{children:[f.needsSync," pendientes"]})]})]}),A&&(0,l.jsxs)(yi,{theme:t,$warning:A.isNearLimit,children:[(0,l.jsxs)(wi,{children:[(0,l.jsx)(Ai,{children:A.isFull?"\ud83d\udd34":A.isNearLimit?"\u26a0\ufe0f":"\ud83d\udcbe"}),(0,l.jsxs)(Ei,{children:[(0,l.jsx)("strong",{children:A.current})," de ",(0,l.jsx)("strong",{children:A.max})," sesiones",A.remaining>0&&(0,l.jsxs)(ji,{children:[" (",A.remaining," disponibles)"]})]})]}),(0,l.jsx)(Ci,{$percent:A.percentUsed,theme:t,children:(0,l.jsx)(Si,{$percent:A.percentUsed,$warning:A.isNearLimit})}),A.isNearLimit&&(0,l.jsx)($i,{children:"\ud83d\udca1 Las sesiones m\xe1s antiguas se eliminan autom\xe1ticamente al alcanzar el l\xedmite"})]}),(0,l.jsxs)(si,{children:[i&&(0,et.dC)()&&(0,l.jsxs)(ni,{theme:t,onClick:z,whileHover:{scale:1.02},whileTap:{scale:.98},disabled:y,children:[(0,l.jsx)("span",{children:"\ud83d\udcbe"}),"Guardar Sesi\xf3n"]}),i&&(0,l.jsxs)(oi,{theme:t,onClick:I,whileHover:{scale:1.02},whileTap:{scale:.98},disabled:y,children:[(0,l.jsx)("span",{children:"\u2795"}),"Crear Nueva Sesi\xf3n"]}),u&&f&&f.localOnly>0&&(0,l.jsxs)(li,{theme:t,onClick:D,whileHover:{scale:1.01},whileTap:{scale:.99},disabled:y,children:["\u2601\ufe0f Sincronizar ",f.localOnly]}),m.length>0&&(0,l.jsx)(ci,{theme:t,onClick:F,whileHover:{scale:1.01},whileTap:{scale:.99},disabled:y,children:"\ud83e\uddf9 Eliminar todas"})]}),m.length>0&&(0,l.jsx)(Kt,{onFiltersChange:T,totalSessions:P.length,theme:t}),0===P.length?(0,l.jsx)(ui,{theme:t,children:0===m.length?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(mi,{children:"\ud83d\udced"}),(0,l.jsx)(pi,{children:"No hay sesiones guardadas"}),(0,l.jsx)(hi,{children:"Carga un texto y trabaja con \xe9l para crear tu primera sesi\xf3n"})]}):(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(mi,{children:"\ud83d\udd0d"}),(0,l.jsx)(pi,{children:"No se encontraron sesiones"}),(0,l.jsx)(hi,{children:"Intenta ajustar los filtros de b\xfasqueda"})]})}):(0,l.jsx)(di,{children:P.map((e=>(0,l.jsx)(Pt,{session:e,theme:t,onRestore:$,onDelete:e=>k(e.id,{stopPropagation:()=>{}}),onExport:N},e.id)))})]})})]}):null},Fi=(0,n.Ay)(r.P.div)`
  background: ${e=>e.theme.surface};
  color: ${e=>e.theme.text};
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
`,Ii=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${e=>e.theme.border};
`,zi=n.Ay.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${e=>e.theme.text};
`,Di=n.Ay.span`
  font-size: 1.5rem;
`,Pi=n.Ay.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
`,Ti=(0,n.Ay)(r.P.div)`
  border: 2px dashed ${e=>e.$isDragActive?e.theme.primary:e.theme.border};
  border-radius: 8px;
  padding: 1.5rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${e=>e.$isDragActive?e.theme.primary+"10":"transparent"};
  
  &:hover {
    border-color: ${e=>e.theme.primary};
    background: ${e=>e.theme.surfaceHover};
  }
`,Ni=n.Ay.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: ${e=>e.theme.textMuted};
  font-size: 0.9rem;
`,Li=n.Ay.span`
  font-size: 2rem;
  color: ${e=>e.theme.primary};
`,Oi=n.Ay.textarea`
  width: 100%;
  min-height: 120px;
  max-height: 200px;
  padding: 0.75rem;
  border: 1px solid ${e=>e.theme.border};
  border-radius: 6px;
  background: ${e=>e.theme.background};
  color: ${e=>e.theme.text};
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: ${e=>e.theme.primary};
    box-shadow: 0 0 0 2px ${e=>e.theme.primary}20;
  }
  
  &::placeholder {
    color: ${e=>e.theme.textMuted};
  }
`,Ri=(0,n.Ay)(r.P.button)`
  background: ${e=>e.theme.success};
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`,Mi=(0,n.Ay)(r.P.div)`
  background: ${e=>e.theme.success}15;
  border: 1px solid ${e=>e.theme.success}50;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`,Bi=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`,_i=n.Ay.span`
  font-weight: 600;
  color: ${e=>e.theme.text};
`,qi=n.Ay.span`
  color: ${e=>e.theme.textMuted};
  font-size: 0.8rem;
`,Qi=n.Ay.button`
  background: none;
  border: none;
  color: ${e=>e.theme.error};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 1.2rem;
  
  &:hover {
    background: ${e=>e.theme.error}20;
  }
`,Ui=(0,n.Ay)(r.P.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: ${e=>e.theme.primary};
  font-size: 0.9rem;
`,Hi=n.Ay.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${e=>e.theme.border};
  border-top: 2px solid ${e=>e.theme.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`,Vi=n.Ay.div`
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid ${e=>e.theme.border};
`,Gi=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.85rem;
  color: ${e=>e.theme.textMuted};
`;const Wi=function(){const{setTexto:e,texto:t,loading:r,setLoading:n,error:c,setError:d,modoOscuro:u,archivoActual:m,setArchivoActual:p,setTextStructure:h,analyzeDocument:g,setCompleteAnalysis:x,createSession:v}=(0,a.useContext)(s.BR),f=u?j.a5:j._k,[b,y]=(0,a.useState)(null),[w,A]=(0,a.useState)(null),[E,C]=(0,a.useState)(""),[S,$]=(0,a.useState)(!1),[k,F]=(0,a.useState)(!1),{obtenerDeCache:I,guardarEnCache:z,limpiarCache:D,cacheStats:P}=Ke(),T=(0,a.useCallback)((async e=>{console.log("\ud83d\udd0d Iniciando procesamiento de archivo:",e.name,e.type,e.size),d(""),F(!0);try{if(!e)throw new Error("No se seleccion\xf3 ning\xfan archivo");if(e.size>10485760)throw new Error("El archivo es demasiado grande (m\xe1ximo 10MB)");const r=e.name.toLowerCase();if(!(r.endsWith(".txt")||r.endsWith(".pdf")||r.endsWith(".docx")||"text/plain"===e.type||"application/pdf"===e.type||"application/vnd.openxmlformats-officedocument.wordprocessingml.document"===e.type))throw new Error("Formato de archivo no soportado. Use TXT, PDF o DOCX");console.log("\ud83d\udccb Validaci\xf3n b\xe1sica completada");let o="";if(r.endsWith(".txt")||"text/plain"===e.type)console.log("\ud83d\udcdd Procesando archivo TXT..."),o=await new Promise(((t,i)=>{const a=new FileReader;a.onload=e=>t(e.target.result),a.onerror=e=>i(new Error("Error al leer el archivo")),a.readAsText(e)}));else if(r.endsWith(".docx")||"application/vnd.openxmlformats-officedocument.wordprocessingml.document"===e.type){console.log("\ud83d\udcc4 Procesando archivo DOCX...");try{const t=await Promise.resolve().then(i.t.bind(i,9312,19)),a=await e.arrayBuffer();o=(await t.default.extractRawText({arrayBuffer:a})).value}catch(t){throw new Error(`Error al procesar DOCX: ${t.message}`)}}else{if(!r.endsWith(".pdf")&&"application/pdf"!==e.type)throw new Error("Formato no soportado. Use archivos TXT, DOCX o PDF.");console.log("\ud83d\udcd5 Procesando archivo PDF...");if(await(0,He.WR)())try{const t=await(0,He.SI)(e);if(!t||0===t.trim().length)throw new Error("No se pudo extraer texto del PDF. El archivo puede estar vac\xedo o contener solo im\xe1genes.");console.log("\ud83e\udd16 Analizando estructura del PDF con IA...");const i=await Ve(e,{analyzeStructure:!0,onProgress:e=>{console.log("\ud83d\udcca Progreso:",e.message||e)}});"object"===typeof i&&i.text?(o=i.text,i.hasStructure&&i.structure&&(console.log("\u2728 Estructura detectada por IA:",i.structure),h(i.structure))):o=i}catch(a){console.warn("\ud83d\udd04 Error con backend, usando fallback:",a.message);const t=await Ve(e,{analyzeStructure:!0,onProgress:e=>{console.log("\ud83d\udcca Progreso:",e.message||e)}});"object"===typeof t&&t.text?(o=t.text,t.hasStructure&&t.structure&&(console.log("\u2728 Estructura detectada por IA:",t.structure),h(t.structure))):o=t}else{console.warn("\ud83d\udd04 Backend no disponible, usando procesamiento con fallback");const t=await Ve(e,{analyzeStructure:!0,onProgress:e=>{console.log("\ud83d\udcca Progreso:",e.message||e)}});"object"===typeof t&&t.text?(o=t.text,t.hasStructure&&t.structure&&(console.log("\u2728 Estructura detectada por IA:",t.structure),h(t.structure))):o=t}}if(!o||0===o.trim().length)throw new Error("El archivo est\xe1 vac\xedo o no se pudo leer el contenido");console.log("\ufffd Contenido extra\xeddo:",o.length,"caracteres");const n=o.split(/\s+/).filter((e=>e.length>0)).length,s={palabras:n,caracteres:o.length,tiempoLectura:Math.ceil(n/200)};console.log("\ud83d\udcca Metadatos calculados:",s);const l={name:e.name,size:e.size,type:e.type,contenido:o,metadatos:s};console.log("\u2705 Archivo procesado exitosamente, estableciendo en estado"),y(l),A(e)}catch(t){console.error("\u274c Error procesando archivo:",t),d(t.message||"Error al procesar el archivo")}finally{F(!1)}}),[d]),N=(0,a.useCallback)((e=>{e.preventDefault(),$(!1);const t=Array.from(e.dataTransfer.files);console.log("\ud83d\udcc2 Archivos dropeados:",t.length,t),t.length>0&&(console.log("\ud83d\udcdd Procesando primer archivo:",t[0].name),T(t[0]))}),[T]),L=(0,a.useCallback)((e=>{e.preventDefault(),$(!0)}),[]),O=(0,a.useCallback)((e=>{e.preventDefault(),$(!1)}),[]),R=(0,a.useCallback)((async i=>{i.preventDefault();const{hasDrafts:a}=(0,Ye.x)();if(a&&t){const e=(0,Ye.m)();if(!window.confirm(e))return void console.log("\u274c [CargaTexto] Carga cancelada por el usuario")}console.log("handleSubmit ejecutado - Estado:",{archivoSeleccionado:!!b,contenidoArchivo:!(null===b||void 0===b||!b.contenido),textoIngresado:E,textoTrimmed:E.trim(),loading:r,error:c}),d(""),n(!0);try{let t="";if(null!==b&&void 0!==b&&b.contenido)t=b.contenido,console.log("Usando contenido del archivo");else{if(!E.trim())throw new Error("Por favor, selecciona un archivo o ingresa texto.");t=E.trim(),console.log("Usando texto ingresado:",t)}console.log("Estableciendo texto en contexto:",t.substring(0,100)+"..."),e(t),console.log("\ud83e\uddf9 [CargaTexto] Limpiando an\xe1lisis anterior..."),x&&"function"===typeof x&&x(null),console.log("\ud83d\ude80 [CargaTexto] Iniciando an\xe1lisis autom\xe1tico del documento..."),console.log("\ud83d\udd0d [CargaTexto] analyzeDocument disponible:",!!g),console.log("\ud83d\udd0d [CargaTexto] Tipo de analyzeDocument:",typeof g),console.log("\ud83d\udd0d [CargaTexto] Longitud del texto:",t.length),g&&"function"===typeof g?(console.log("\u2705 [CargaTexto] Llamando a analyzeDocument()..."),g(t).then((()=>{console.log("\u2705 [CargaTexto] analyzeDocument completado exitosamente"),setTimeout((()=>{console.log("\ud83d\udcd6 [CargaTexto] Cambiando a pesta\xf1a de Lectura Guiada..."),window.dispatchEvent(new CustomEvent("app-change-tab",{detail:{tabId:"lectura-guiada"}}))}),500)})).catch((e=>{console.error("\u274c [CargaTexto] Error en an\xe1lisis autom\xe1tico:",e),console.error("\u274c [CargaTexto] Stack trace:",e.stack)}))):console.warn("\u26a0\ufe0f [CargaTexto] analyzeDocument NO est\xe1 disponible o no es funci\xf3n");try{const e=m&&"object"===typeof m?m.objectUrl:null;e&&URL.revokeObjectURL(e);const t=w||null;if(t){const e=t.name||(null===b||void 0===b?void 0:b.name)||"documento",i=t.type||(null===b||void 0===b?void 0:b.type)||"",a=t.size||(null===b||void 0===b?void 0:b.size)||0,r="application/pdf"===i||e.toLowerCase().endsWith(".pdf"),o=r?URL.createObjectURL(t):null;p({file:t,name:e,type:r?"application/pdf":i||"text/plain",size:a,objectUrl:o,lastUpdated:Date.now()})}else p(null)}catch(o){console.warn("No se pudo asignar archivoActual:",o),p(null)}y(null),A(null),C(""),console.log("An\xe1lisis completado exitosamente")}catch(s){console.error("Error en handleSubmit:",s.message),d(s.message)}finally{n(!1)}}),[b,E,e,n,d]),M=(0,a.useCallback)((()=>{y(null),A(null),d("")}),[d]),B=a.useMemo((()=>{const e=(null===b||void 0===b?void 0:b.contenido)||E;if(!e)return null;const t=e.split(/\s+/).length;return{words:t,chars:e.length,readingTime:Math.ceil(t/200)}}),[null===b||void 0===b?void 0:b.contenido,E]);return(0,l.jsxs)(Fi,{initial:{opacity:0,x:-20},animate:{opacity:1,x:0},transition:{duration:.3},children:[(0,l.jsxs)(Ii,{children:[(0,l.jsx)(Di,{children:"\ud83d\udcc1"}),(0,l.jsx)(zi,{children:"Cargar Contenido"})]}),(0,l.jsxs)(Pi,{onSubmit:R,children:[(0,l.jsx)(Ti,{$isDragActive:S,onDragOver:L,onDragLeave:O,onDrop:N,onClick:()=>document.getElementById("file-input").click(),whileHover:{scale:1.02},whileTap:{scale:.98},children:(0,l.jsxs)(Ni,{children:[(0,l.jsx)(Li,{children:"\ud83d\udcc4"}),(0,l.jsxs)("div",{children:[(0,l.jsx)("div",{children:(0,l.jsx)("strong",{children:"Selecciona un archivo"})}),(0,l.jsx)("div",{children:"o arrastra aqu\xed"})]}),(0,l.jsx)("div",{style:{fontSize:"0.8rem"},children:"PDF, TXT, DOCX"})]})}),(0,l.jsx)("input",{id:"file-input",type:"file",accept:".txt,.pdf,.docx",onChange:e=>e.target.files[0]&&T(e.target.files[0]),style:{display:"none"}}),(0,l.jsx)(o.N,{children:b&&(0,l.jsxs)(Mi,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},children:[(0,l.jsxs)(Bi,{children:[(0,l.jsxs)(_i,{children:["\ud83d\udcce ",b.name]}),(0,l.jsxs)(qi,{children:[(b.size/1024).toFixed(1)," KB",b.metadatos&&(0,l.jsxs)(l.Fragment,{children:[" \u2022 ",b.metadatos.palabras," palabras"]})]})]}),(0,l.jsx)(Qi,{onClick:M,children:"\xd7"})]})}),(0,l.jsx)(o.N,{children:k&&(0,l.jsxs)(Ui,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:[(0,l.jsx)(Hi,{}),"Procesando archivo..."]})}),!b&&(0,l.jsx)(l.Fragment,{children:(0,l.jsx)(Oi,{placeholder:"O pega tu texto aqu\xed...",value:E,onChange:e=>C(e.target.value),disabled:r||k})}),(0,l.jsx)(Ri,{type:"submit",disabled:r||k||!(null!==b&&void 0!==b&&b.contenido)&&!E.trim(),whileHover:{scale:1.02},whileTap:{scale:.98},onClick:()=>{console.log("Debug completo - Estado del bot\xf3n:",{loading:r,procesando:k,archivoSeleccionado:b,tieneContenidoArchivo:!(null===b||void 0===b||!b.contenido),textoIngresado:E,textoTrimmed:E.trim(),longitud:E.length,condicionOriginal:!b&&!E.trim(),condicionNueva:!(null!==b&&void 0!==b&&b.contenido)&&!E.trim(),estaDeshabilitado:r||k||!(null!==b&&void 0!==b&&b.contenido)&&!E.trim()})},children:r?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(Hi,{style:{width:"14px",height:"14px"}}),"Analizando..."]}):"\ud83d\udd0d Analizar Contenido"}),(0,l.jsx)(o.N,{children:c&&(0,l.jsx)(Ze.A,{type:"error",message:c})})]}),B&&(0,l.jsxs)(Vi,{children:[(0,l.jsxs)(Gi,{children:["\ud83d\udcca ",B.words.toLocaleString()," palabras"]}),(0,l.jsxs)(Gi,{children:["\ud83d\udcc4 ",B.chars.toLocaleString()," caracteres"]}),(0,l.jsxs)(Gi,{children:["\u23f1\ufe0f ~",B.readingTime," min de lectura"]}),t&&(0,l.jsx)(Gi,{style:{color:f.success},children:"\u2705 Contenido cargado"})]}),(0,l.jsx)(ki,{theme:u?j.a5:j._k})]})},Xi=n.Ay.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`,Ji=n.Ay.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  max-width: 420px;
  width: 100%;
`,Ki=n.Ay.div`
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #666;
    margin: 0;
    font-size: 14px;
  }
`,Yi=n.Ay.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`,Zi=n.Ay.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`,ea=n.Ay.label`
  font-size: 14px;
  font-weight: 600;
  color: #333;
`,ta=n.Ay.input`
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`,ia=n.Ay.button`
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`,aa=(0,n.Ay)(ia)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }
`,ra=(0,n.Ay)(ia)`
  background: white;
  color: #333;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
  &:hover:not(:disabled) {
    background: #f9f9f9;
    border-color: #667eea;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`,oa=n.Ay.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 0;
  
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e0e0e0;
  }
  
  span {
    color: #999;
    font-size: 13px;
  }
`,na=n.Ay.div`
  padding: 12px;
  background: #fee;
  border-left: 4px solid #f44;
  border-radius: 4px;
  color: #c33;
  font-size: 14px;
`,sa=n.Ay.div`
  padding: 12px;
  background: #efe;
  border-left: 4px solid #4a4;
  border-radius: 4px;
  color: #383;
  font-size: 14px;
`,la=n.Ay.button`
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  text-align: right;
  padding: 0;
  margin-top: -8px;
  
  &:hover {
    text-decoration: underline;
  }
`,ca=n.Ay.div`
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;
  
  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;function da(){const{currentUser:e,loading:t}=(0,C.As)(),[i,r]=(0,a.useState)(""),[o,n]=(0,a.useState)(""),[s,c]=(0,a.useState)(!1),[d,u]=(0,a.useState)(""),[m,p]=(0,a.useState)("");if(t)return(0,l.jsx)(Xi,{children:(0,l.jsx)(Ji,{children:(0,l.jsxs)(Ki,{children:[(0,l.jsx)("h1",{children:"\ud83d\udcda AppLectura"}),(0,l.jsx)("p",{children:"Cargando..."})]})})});if(e)return null;return(0,l.jsx)(Xi,{children:(0,l.jsxs)(Ji,{children:[(0,l.jsxs)(Ki,{children:[(0,l.jsx)("h1",{children:"\ud83d\udcda AppLectura"}),(0,l.jsx)("p",{children:"Literacidad Cr\xedtica con IA"})]}),d&&(0,l.jsx)(na,{children:d}),m&&(0,l.jsx)(sa,{children:m}),(0,l.jsxs)(Yi,{onSubmit:async e=>{if(e.preventDefault(),u(""),p(""),i&&o){c(!0);try{await(0,S._h)(i,o),console.log("\u2705 Login exitoso"),p("\xa1Inicio de sesi\xf3n exitoso! Bienvenido.")}catch(t){u(t.message)}finally{c(!1)}}else u("Por favor completa todos los campos")},children:[(0,l.jsxs)(Zi,{children:[(0,l.jsx)(ea,{children:"Email"}),(0,l.jsx)(ta,{type:"email",value:i,onChange:e=>r(e.target.value),placeholder:"tu@email.com",disabled:s})]}),(0,l.jsxs)(Zi,{children:[(0,l.jsx)(ea,{children:"Contrase\xf1a"}),(0,l.jsx)(ta,{type:"password",value:o,onChange:e=>n(e.target.value),placeholder:"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",disabled:s})]}),(0,l.jsx)(la,{type:"button",onClick:async()=>{if(i){u(""),c(!0);try{await(0,S.xw)(i),p("Email de recuperaci\xf3n enviado. Revisa tu bandeja de entrada.")}catch(e){u(e.message)}finally{c(!1)}}else u("Ingresa tu email para recuperar tu contrase\xf1a")},disabled:s,children:"\xbfOlvidaste tu contrase\xf1a?"}),(0,l.jsx)(aa,{type:"submit",disabled:s,children:s?"\u23f3 Iniciando sesi\xf3n...":"\ud83d\udd10 Iniciar Sesi\xf3n"})]}),(0,l.jsx)(oa,{children:(0,l.jsx)("span",{children:"o continuar con"})}),(0,l.jsxs)(ra,{onClick:async()=>{u(""),p(""),c(!0);try{console.log("\ud83d\udd35 [Login] Iniciando proceso de Google Sign-In...");const e=await(0,S.XL)("estudiante");console.log("\u2705 [Login] Google Sign-In exitoso:",e),p("\xa1Inicio de sesi\xf3n con Google exitoso!")}catch(e){console.error("\u274c [Login] Error en Google Sign-In:",e),u(e.message||"Error al iniciar sesi\xf3n con Google. Intenta de nuevo."),c(!1)}},disabled:s,children:[(0,l.jsxs)("svg",{viewBox:"0 0 24 24",children:[(0,l.jsx)("path",{fill:"#4285F4",d:"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"}),(0,l.jsx)("path",{fill:"#34A853",d:"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"}),(0,l.jsx)("path",{fill:"#FBBC05",d:"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"}),(0,l.jsx)("path",{fill:"#EA4335",d:"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"})]}),"Continuar con Google"]}),(0,l.jsx)(ca,{children:"\xbfNo tienes cuenta? Contacta a tu docente para obtener acceso"})]})})}var ua=i(2180);const ma=new class{constructor(){this.metrics=new Map,this.observers=[],this.isEnabled=!1,this.isEnabled&&this.initializeObservers()}initializeObservers(){if("PerformanceObserver"in window)try{const e=new PerformanceObserver((e=>{for(const t of e.getEntries())this.metrics.set("navigation",{domContentLoaded:t.domContentLoadedEventEnd-t.domContentLoadedEventStart,loadComplete:t.loadEventEnd-t.loadEventStart,networkTime:t.responseEnd-t.requestStart,timestamp:Date.now()})}));e.observe({entryTypes:["navigation"]}),this.observers.push(e);const t=new PerformanceObserver((e=>{const t=e.getEntries().map((e=>({name:e.name,duration:e.duration,size:e.transferSize||0,type:e.initiatorType})));this.metrics.set("resources",t)}));t.observe({entryTypes:["resource"]}),this.observers.push(t),"memory"in performance&&setInterval((()=>{this.metrics.set("memory",{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit,timestamp:Date.now()})}),5e3)}catch(e){console.warn("Error inicializando observadores de performance:",e)}}markStart(e){if(this.isEnabled)return performance.mark(`${e}-start`),e}markEnd(e){if(this.isEnabled){performance.mark(`${e}-end`);try{performance.measure(e,`${e}-start`,`${e}-end`);const t=performance.getEntriesByName(e,"measure")[0];if(t){const i=this.metrics.get(e)||[];i.push({duration:t.duration,timestamp:Date.now()}),i.length>100&&i.shift(),this.metrics.set(e,i),performance.clearMarks(`${e}-start`),performance.clearMarks(`${e}-end`),performance.clearMeasures(e)}}catch(t){console.warn(`Error midiendo operaci\xf3n ${e}:`,t)}}}measure(e,t){if(!this.isEnabled)return t();const i=performance.now(),a=t(),r=performance.now(),o=this.metrics.get(e)||[];return o.push({duration:r-i,timestamp:Date.now()}),o.length>100&&o.shift(),this.metrics.set(e,o),a}async measureAsync(e,t){if(!this.isEnabled)return await t();const i=performance.now(),a=await t(),r=performance.now(),o=this.metrics.get(e)||[];return o.push({duration:r-i,timestamp:Date.now()}),o.length>100&&o.shift(),this.metrics.set(e,o),a}getStats(e){if(!this.isEnabled)return null;const t=this.metrics.get(e);if(!t||0===t.length)return null;const i=t.map((e=>e.duration)),a=[...i].sort(((e,t)=>e-t));return{count:i.length,avg:i.reduce(((e,t)=>e+t),0)/i.length,min:Math.min(...i),max:Math.max(...i),median:a[Math.floor(a.length/2)],p95:a[Math.floor(.95*a.length)],recent:i.slice(-10)}}getSummary(){var e;if(!this.isEnabled)return{disabled:!0};const t={timestamp:(new Date).toISOString(),operations:{},memory:this.metrics.get("memory"),navigation:this.metrics.get("navigation"),resources:(null===(e=this.metrics.get("resources"))||void 0===e?void 0:e.slice(-20))||[]};for(const[i]of this.metrics)["memory","navigation","resources"].includes(i)||(t.operations[i]=this.getStats(i));return t}cleanup(){const e=Date.now()-36e5;for(const[t,i]of this.metrics)if(Array.isArray(i)){const a=i.filter((t=>t.timestamp&&t.timestamp>e));0===a.length?this.metrics.delete(t):this.metrics.set(t,a)}}export(){if(!this.isEnabled)return null;const e={timestamp:(new Date).toISOString(),userAgent:navigator.userAgent,metrics:Object.fromEntries(this.metrics)};return JSON.stringify(e,null,2)}destroy(){this.observers.forEach((e=>{try{e.disconnect()}catch(t){console.warn("Error desconectando observer:",t)}})),this.observers=[],this.metrics.clear()}};ma.isEnabled&&setInterval((()=>{ma.cleanup()}),36e5);const pa=()=>({markStart:ma.markStart.bind(ma),markEnd:ma.markEnd.bind(ma),measure:ma.measure.bind(ma),measureAsync:ma.measureAsync.bind(ma),getStats:ma.getStats.bind(ma),getSummary:ma.getSummary.bind(ma)});(0,n.Ay)(r.P.div)`
  position: fixed;
  bottom: 70px;
  left: 20px;
  width: 320px;
  max-height: 500px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surface)||"#ffffff"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#dddddd"}};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  overflow: hidden;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    width: calc(100vw - 40px);
    max-width: 320px;
    bottom: 60px;
    left: 20px;
    right: 20px;
  }
`,n.Ay.div`
  padding: 12px 16px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#007bff"}};
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.9rem;
`,n.Ay.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`,n.Ay.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
`,n.Ay.div`
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.cardBg)||"#f8f9fa"}};
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#e9ecef"}};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
`,n.Ay.h4`
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#333"}};
  font-weight: 600;
`,n.Ay.div`
  font-size: 0.7rem;
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.textSecondary)||"#666"}};
  line-height: 1.4;
`,n.Ay.div`
  width: 100%;
  height: 4px;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#e9ecef"}};
  border-radius: 2px;
  margin: 4px 0;
  position: relative;
`,n.Ay.div`
  height: 100%;
  background: ${e=>{const t=e.percentage;return t>80?"#dc3545":t>60?"#ffc107":"#28a745"}};
  border-radius: 2px;
  width: ${e=>Math.min(e.percentage,100)}%;
  transition: all 0.3s ease;
`,n.Ay.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${e=>"good"===e.status?"#28a745":"warning"===e.status?"#ffc107":"#dc3545"};
  display: inline-block;
  margin-right: 6px;
`,n.Ay.button`
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#007bff"}}dd;
  border: 2px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.primary)||"#007bff"}};
  color: white;
  cursor: pointer;
  z-index: 9998;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  opacity: 0.85;
  
  &:hover {
    transform: scale(1.1);
    opacity: 1;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
    bottom: 16px;
    left: 16px;
  }
`,n.Ay.button`
  background: none;
  border: 1px solid ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.border)||"#dee2e6"}};
  color: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.text)||"#333"}};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  margin-left: 8px;
  
  &:hover {
    background: ${e=>{var t;return(null===(t=e.theme)||void 0===t?void 0:t.surfaceHover)||"#f8f9fa"}};
  }
`;function ha(e){let{theme:t}=e;const[i,r]=(0,a.useState)(!1),[o,n]=(0,a.useState)(null),[s,l]=(0,a.useState)(!1),c=pa();(0,a.useEffect)((()=>{const e=e=>{const t=!!(e&&e.detail&&e.detail.active);l(t)};return window.addEventListener("tutor-visibility",e),()=>window.removeEventListener("tutor-visibility",e)}),[]),(0,a.useEffect)((()=>{if(i){const e=()=>{const e=c.getSummary();n(e)};e();const t=setInterval(e,2e3);return()=>clearInterval(t)}}),[i,c]);return null}const ga=a.memo(ha),xa=(0,a.lazy)((()=>Promise.all([i.e(275),i.e(304)]).then(i.bind(i,2304)).then((e=>({default:a.memo(e.default)}))))),va=(0,a.lazy)((()=>Promise.all([i.e(30),i.e(770),i.e(61)]).then(i.bind(i,4859)).then((e=>({default:a.memo(e.default)}))))),fa=(0,a.lazy)((()=>Promise.all([i.e(190),i.e(631)]).then(i.bind(i,5631)).then((e=>({default:a.memo(e.default)}))))),ba=(0,a.lazy)((()=>i.e(305).then(i.bind(i,2305)).then((e=>({default:a.memo(e.default)}))))),ya=(0,a.lazy)((()=>Promise.all([i.e(797),i.e(654)]).then(i.bind(i,654)).then((e=>({default:a.memo(e.default)}))))),wa=n.Ay.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: all 0.3s ease;
  background: ${e=>e.theme.background};
  color: ${e=>e.theme.text};
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`,Aa=n.Ay.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100vw;
  margin: 0 auto;
  position: relative;
  
  /* Responsive breakpoints */
  @media (min-width: 768px) {
    flex-direction: row;
    max-width: 1400px;
    padding: 0 1rem;
  }
  
  @media (min-width: 1200px) {
    max-width: 1600px;
    padding: 0 2rem;
  }
`,Ea=(0,n.Ay)(r.P.aside)`
  width: 100%;
  background: ${e=>e.theme.surface};
  border-right: 1px solid ${e=>e.theme.border};
  display: flex;
  flex-direction: column;
  
  @media (min-width: 768px) {
    width: ${e=>e.$collapsed?"60px":"320px"};
    min-width: ${e=>e.$collapsed?"60px":"320px"};
    max-height: calc(100vh - 80px);
    position: sticky;
    top: 80px;
    transition: width 0.3s ease;
  }
  
  @media (min-width: 1200px) {
    width: ${e=>e.$collapsed?"60px":"380px"};
    min-width: ${e=>e.$collapsed?"60px":"380px"};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`,ja=n.Ay.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  
  @media (min-width: 768px) {
    min-height: calc(100vh - 80px);
    margin-left: 1rem;
  }
`,Ca=n.Ay.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${e=>e.theme.cardBg};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  
  /* Modo lectura enfocada */
  ${e=>e.$focusMode&&`\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    z-index: 1000;\n    margin: 0;\n    border-radius: 0;\n    background: ${e.theme.background};\n  `}
`,Sa=n.Ay.div`
  background: ${e=>e.theme.surface};
  border-bottom: 1px solid ${e=>e.theme.border};
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`,$a=(0,n.Ay)(r.P.div)`
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 160px);
  
  @media (min-width: 768px) {
    max-height: calc(100vh - 200px);
  }
`,ka=n.Ay.button`
  position: absolute;
  top: 1rem;
  right: -15px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${e=>e.theme.primary};
  color: white;
  border: none;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.1);
  }
  
  @media (min-width: 768px) {
    display: flex;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;n.Ay.button`
  background: ${e=>e.theme.primary};
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  min-height: 44px;
  
  &:hover {
    opacity: 0.9;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;function Fa(){const{texto:e,modoOscuro:t,toggleModoOscuro:i,loading:r,error:c,sessionConflict:d,conflictingSessionInfo:u}=(0,a.useContext)(s.BR),{currentUser:m,loading:p,signOut:h}=(0,C.As)(),g=pa(),[x,v]=(0,a.useState)((()=>{try{const e=localStorage.getItem("appActiveTab");if(e)return"lectura"===e?"lectura-guiada":e}catch{}return"lectura-guiada"})),[f,b]=(0,a.useState)(!1),[y,w]=(0,a.useState)(!1);a.useEffect((()=>{if(e&&"lectura-guiada"===x){const e=setTimeout((()=>{b(!0)}),300);return()=>clearTimeout(e)}}),[e,x]);const A=(0,a.useCallback)((e=>{g.markStart(`tab-change-${e}`);const t="lectura"===e?"lectura-guiada":e;v(t);try{localStorage.setItem("appActiveTab",t)}catch{}g.markEnd(`tab-change-${e}`)}),[g]),E=(0,a.useCallback)((()=>{b((e=>!e))}),[]);(0,a.useCallback)((()=>{w((e=>!e))}),[]);a.useEffect((()=>{const e=e=>{var t,i;!0===(null===e||void 0===e||null===(t=e.detail)||void 0===t?void 0:t.active)&&w(!0),!1===(null===e||void 0===e||null===(i=e.detail)||void 0===i?void 0:i.active)&&w(!1)};window.addEventListener("visor-focus-mode",e);const t=e=>{var t;const i=null===e||void 0===e||null===(t=e.detail)||void 0===t?void 0:t.tabId;if(!i)return;["lectura","lectura-interactiva","lectura-guiada","prelectura","analisis","evaluacion","actividades","notas"].includes(i)&&A(i)};return window.addEventListener("app-change-tab",t),()=>{window.removeEventListener("visor-focus-mode",e),window.removeEventListener("app-change-tab",t)}}),[]);const S=(0,a.useMemo)((()=>Boolean(null===e||void 0===e?void 0:e.trim())),[e]),$=(0,a.useMemo)((()=>t?j.a5:j._k),[t]);return(0,l.jsxs)(n.NP,{theme:$,children:[(0,l.jsx)(qe,{isOpen:d,sessionInfo:u,onReload:async()=>{try{await(0,ua.j3)(m.uid),window.location.reload()}catch(c){console.error("Error al tomar control de la sesi\xf3n:",c),window.location.reload()}},onLogout:async()=>{await h(),window.location.reload()}}),p?(0,l.jsx)(wa,{children:(0,l.jsx)(J,{})}):m?(0,l.jsxs)(wa,{children:[!y&&(0,l.jsx)(O,{titulo:"Asistente de Lectura y Comprensi\xf3n con IA",modoOscuro:t,onToggleModo:i,children:(0,l.jsx)(Ce,{onClickDetails:()=>console.log("TODO: Abrir panel de detalles")})}),(0,l.jsxs)(Aa,{children:[!y&&(0,l.jsxs)(Ea,{$collapsed:f,initial:{x:-20,opacity:0},animate:{x:0,opacity:1},transition:{duration:.3},children:[(0,l.jsx)(ka,{onClick:E,children:f?"\u2192":"\u2190"}),!f&&(0,l.jsx)(K.A,{children:(0,l.jsx)(Wi,{})})]}),(0,l.jsx)(ja,{children:(0,l.jsxs)(Ca,{$focusMode:y,children:[(0,l.jsx)(Sa,{children:(0,l.jsx)(H,{tabs:[{id:"lectura-guiada",label:"Lectura Guiada",icon:"\ud83e\udde0"},{id:"prelectura",label:"An\xe1lisis del Texto",icon:"\ud83d\udcd6"},{id:"actividades",label:"Actividades",icon:"\ud83c\udfaf"},{id:"notas",label:"Notas de Estudio",icon:"\ud83d\udcdd"},{id:"evaluacion",label:"Evaluaci\xf3n",icon:"\u2705"}],activeTab:x,onTabChange:A,disabled:!S&&"lectura-interactiva"!==x,compact:y})}),(0,l.jsx)($a,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},children:(0,l.jsx)(K.A,{children:(0,l.jsxs)(o.N,{mode:"wait",children:[r&&(0,l.jsx)(J,{}),c&&(0,l.jsxs)("div",{children:["Error: ",c]}),!r&&!c&&(()=>{switch(x){case"lectura-guiada":return(0,l.jsx)(a.Suspense,{fallback:(0,l.jsx)(J,{}),children:(0,l.jsx)(va,{})});case"prelectura":return(0,l.jsx)(a.Suspense,{fallback:(0,l.jsx)(J,{}),children:(0,l.jsx)(ya,{})});case"evaluacion":return(0,l.jsx)(a.Suspense,{fallback:(0,l.jsx)(J,{}),children:(0,l.jsx)(fa,{})});case"actividades":return(0,l.jsx)(a.Suspense,{fallback:(0,l.jsx)(J,{}),children:(0,l.jsx)(ba,{})});case"notas":return(0,l.jsx)(a.Suspense,{fallback:(0,l.jsx)(J,{}),children:(0,l.jsx)(xa,{})});default:return(0,l.jsx)("div",{children:"Vista no encontrada"})}})()]})})},x)]})})]}),(0,l.jsx)(Se,{modoOscuro:t}),(0,l.jsx)(ga,{theme:$})]}):(0,l.jsx)(da,{})]})}const Ia=function(){return(0,l.jsx)(K.A,{children:(0,l.jsx)(C.OJ,{children:(0,l.jsx)(s.QG,{children:(0,l.jsx)(Y.PedagogyProvider,{children:(0,l.jsx)(Fa,{})})})})})}},5485:(e,t,i)=>{"use strict";i.d(t,{f$:()=>r});const a=3e3,r=(e,t)=>{if(!e||0===e.length)return`${t}_empty`;const i=a;let r="";if(e.length<=i)r=e;else{const t=e.slice(0,Math.floor(i/3)),a=Math.floor(e.length/2-i/6);r=t+e.slice(a,a+Math.floor(i/3))+e.slice(-Math.floor(i/3))}let o=0;for(let a=0;a<r.length;a++){o=(o<<5)-o+r.charCodeAt(a),o|=0}const n=e.trim().split(/\s+/).length,s=[50,100,150].map((t=>t<e.length?e.charCodeAt(t):0)).join("");return`${t}_${o}_${e.length}_${n}_${s}`}},5803:(e,t,i)=>{"use strict";i.d(t,{u9:()=>a});const a=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:45e3;const{signal:a,...r}=t||{},o=new AbortController,n=()=>{try{o.abort()}catch{}};a&&(a.aborted?n():a.addEventListener("abort",n,{once:!0}));const s=setTimeout((()=>{try{o.abort()}catch{}}),i),l=fetch(e,{...r,signal:o.signal}),c=new Promise(((e,t)=>{o.signal.addEventListener("abort",(()=>{const e=new Error("Aborted");e.name="AbortError",t(e)}),{once:!0})}));return Promise.race([l,c]).finally((()=>{clearTimeout(s),a&&a.removeEventListener("abort",n)}))}},6393:(e,t,i)=>{"use strict";i.d(t,{_k:()=>o,a5:()=>n});const a={secondary:"#009688",accent:"#3190FC",warning:"#f9ab00",academicSection:"#6366f1",academicSubtitle:"#8b5cf6",academicEmphasis:"#fbbf24",academicQuote:"#6b7280",academicFootnote:"#9ca3af"},r={spacing:{xs:"0.25rem",sm:"0.5rem",md:"1rem",lg:"1.5rem",xl:"2rem",xxl:"3rem"},fontSize:{xs:"0.75rem",sm:"0.875rem",md:"1rem",lg:"1.125rem",xl:"1.25rem",xxl:"1.5rem",xxxl:"2rem"},fontWeight:{normal:400,medium:500,semibold:600,bold:700},lineHeight:{tight:1.25,normal:1.5,relaxed:1.75},borderRadius:{sm:"4px",md:"8px",lg:"12px",xl:"16px",full:"9999px"},transition:{fast:"150ms ease",normal:"250ms ease",slow:"350ms ease"},zIndex:{dropdown:1e3,sticky:1020,fixed:1030,modalBackdrop:1040,modal:1050,popover:1060,tooltip:1070}},o={name:"light",...a,...r,background:"#F6F8FA",backgroundSecondary:"#EBEEF1",surface:"#FFFFFF",surfaceHover:"#F1F5F9",cardBg:"#FFFFFF",text:"#232B33",textMuted:"#607D8B",textSecondary:"#607D8B",border:"#E4EAF1",borderLight:"#F0F3F7",borderDark:"#D4DAE1",primary:"#3190FC",primaryLight:"#5BA5FD",primaryDark:"#1F7EEB",primaryHover:"#1F7EEB",success:"#009688",successLight:"#26A69A",successDark:"#00796B",error:"#d93025",errorLight:"#E35850",errorDark:"#C62828",errorBackground:"#FFEBEE",errorBorder:"#FFCDD2",warning:"#f9ab00",warningLight:"#FFB333",warningDark:"#F57C00",info:"#3190FC",infoBg:"#E9F3FF",infoLight:"#64B5F6",hover:"#F6FAFF",active:"#E9F3FF",focus:"#4d90fe",disabled:"#E4EAF1",disabledText:"#A7B4C2",keyboardBg:"#F6F8FA",iaMessage:"#F2F8FF",userMessage:"#ECF8F6",chatBg:"#F6F8FA",scrollTrack:"#E4EAF1",scrollThumb:"#C7D1DB",scrollThumbHover:"#B0BAC4",inputBg:"#FFFFFF",inputBorder:"#D4DAE1",inputBorderFocus:"#3190FC",inputBorderError:"#d93025",shadow:{sm:"0 1px 2px rgba(0, 0, 0, 0.05)",md:"0 4px 6px rgba(0, 0, 0, 0.07)",lg:"0 10px 15px rgba(0, 0, 0, 0.1)",xl:"0 20px 25px rgba(0, 0, 0, 0.15)",inner:"inset 0 2px 4px rgba(0, 0, 0, 0.06)"}},n={name:"dark",...a,...r,background:"#141922",backgroundSecondary:"#0F131A",surface:"#1B2230",surfaceHover:"#222A3A",cardBg:"#1B2230",text:"#E6EAF0",textMuted:"#A7B4C2",textSecondary:"#C3CFDA",border:"#2A3240",borderLight:"#353D4F",borderDark:"#1F2633",primary:"#5BA5FD",primaryLight:"#82B1FF",primaryDark:"#3190FC",primaryHover:"#82B1FF",success:"#26A69A",successLight:"#4DB6AC",successDark:"#00897B",error:"#ff6b6b",errorLight:"#FF8A80",errorDark:"#E57373",errorBackground:"#3D1F1F",errorBorder:"#5A2D2D",warning:"#FFB74D",warningLight:"#FFD54F",warningDark:"#FFA726",info:"#64B5F6",infoBg:"#0B2A4A",infoLight:"#90CAF9",hover:"#222A3A",active:"#2A3340",focus:"#82B1FF",disabled:"#222A3A",disabledText:"#5A6470",keyboardBg:"#222A3A",iaMessage:"#132034",userMessage:"#102522",chatBg:"#141922",scrollTrack:"#222A3A",scrollThumb:"#4B5563",scrollThumbHover:"#6B7280",inputBg:"#1B2230",inputBorder:"#2A3240",inputBorderFocus:"#5BA5FD",inputBorderError:"#ff6b6b",shadow:{sm:"0 1px 2px rgba(0, 0, 0, 0.3)",md:"0 4px 6px rgba(0, 0, 0, 0.4)",lg:"0 10px 15px rgba(0, 0, 0, 0.5)",xl:"0 20px 25px rgba(0, 0, 0, 0.6)",inner:"inset 0 2px 4px rgba(0, 0, 0, 0.3)"}}},7085:(e,t,i)=>{"use strict";function a(){const e=[];let t=!1,i={};try{const e=localStorage.getItem("rubricProgress");e&&(i=JSON.parse(e))}catch(l){console.warn("Error leyendo rubricProgress:",l)}const a=e=>{const t=i[e];if(!t||!t.scores||0===t.scores.length)return!1;const a=t.scores[t.scores.length-1],r=Date.now()-3e5;return a.timestamp&&a.timestamp>r},r=sessionStorage.getItem("resumenAcademico_draft");r&&r.trim().length>0&&!a("rubrica1")&&(t=!0,e.push({artefacto:"Resumen Acad\xe9mico con Citas",estado:"Borrador sin evaluar",ubicacion:"Actividades > Resumen Acad\xe9mico"}));const o={marco:sessionStorage.getItem("tablaACD_marcoIdeologico"),estrategias:sessionStorage.getItem("tablaACD_estrategiasRetoricas"),presentes:sessionStorage.getItem("tablaACD_vocesPresentes"),silenciadas:sessionStorage.getItem("tablaACD_vocesSilenciadas")};if((o.marco||o.estrategias||o.presentes||o.silenciadas)&&!a("rubrica2")){Object.values(o).some((e=>e&&e.trim().length>0))&&(t=!0,e.push({artefacto:"Tabla de An\xe1lisis Cr\xedtico del Discurso (ACD)",estado:"Borrador sin evaluar",ubicacion:"Actividades > Tabla ACD"}))}const n={actores:sessionStorage.getItem("mapaActores_actores"),contexto:sessionStorage.getItem("mapaActores_contextoHistorico"),conexiones:sessionStorage.getItem("mapaActores_conexiones"),consecuencias:sessionStorage.getItem("mapaActores_consecuencias")};if((n.actores||n.contexto||n.conexiones||n.consecuencias)&&!a("rubrica3")){Object.values(n).some((e=>e&&e.trim().length>0))&&(t=!0,e.push({artefacto:"Mapa de Actores Sociales",estado:"Borrador sin evaluar",ubicacion:"Actividades > Mapa de Actores"}))}const s={tesis:sessionStorage.getItem("respuestaArgumentativa_tesis"),evidencias:sessionStorage.getItem("respuestaArgumentativa_evidencias"),contra:sessionStorage.getItem("respuestaArgumentativa_contraargumento"),refutacion:sessionStorage.getItem("respuestaArgumentativa_refutacion")};if((s.tesis||s.evidencias||s.contra||s.refutacion)&&!a("rubrica4")){Object.values(s).some((e=>e&&e.trim().length>0))&&(t=!0,e.push({artefacto:"Respuesta Argumentativa",estado:"Borrador sin evaluar",ubicacion:"Actividades > Respuesta Argumentativa"}))}return{hasDrafts:t,details:e}}function r(){const{hasDrafts:e,details:t}=a();if(!e)return null;return`\u26a0\ufe0f ADVERTENCIA: Cambio de Sesi\xf3n\n\nTienes borradores sin evaluar en los siguientes artefactos:\n\n${t.map((e=>`\u2022 ${e.artefacto}`)).join("\n")}\n\n\u26a0\ufe0f Si cambias de sesi\xf3n o cargas un nuevo documento, estos borradores se perder\xe1n permanentemente.\n\n\ud83d\udca1 Recomendaci\xf3n: Eval\xfaa estos artefactos antes de cambiar de sesi\xf3n para guardar tu progreso.\n\n\xbfDeseas continuar de todas formas?`}i.d(t,{m:()=>r,x:()=>a})},7270:e=>{e.exports={generateSocraticQuestions:function(e){let{dimension:t,anchors:i=[],max:a=5}=e;const r=function(e){switch(e){case"comprensionAnalitica":return["\xbfC\xf3mo parafrasear\xedas la tesis central con tus propias palabras?","\xbfQu\xe9 evidencia textual respalda esa idea? C\xedtala.","\xbfQu\xe9 partes son centrales y cu\xe1les secundarias? \xbfPor qu\xe9?"];case"acd":return["\xbfQu\xe9 perspectiva o inter\xe9s crees que gu\xeda al autor? \xbfEn qu\xe9 te basas?","\xbfQu\xe9 voces se incluyen y cu\xe1les podr\xedan estar silenciadas?","\xbfQu\xe9 elecciones l\xe9xicas o met\xe1foras influyen en la interpretaci\xf3n?"];case"contextualizacion":return["\xbfEn qu\xe9 debate social o pol\xedtico situar\xedas este texto?","\xbfQu\xe9 evento o proceso hist\xf3rico podr\xeda haberlo influido?","\xbfQu\xe9 consecuencias busca o podr\xeda tener en la sociedad?"];case"argumentacion":return["\xbfCu\xe1l es tu postura y qu\xe9 evidencias del texto la sostienen?","\xbfQu\xe9 objeciones prever\xedas y c\xf3mo las responder\xedas?","\xbfQu\xe9 contraejemplo pondr\xeda a prueba tu argumento?"];default:return["\xbfQu\xe9 idea principal extraes del texto y con qu\xe9 cita la sustentas?","\xbfQu\xe9 asumi\xf3 el autor que no dijo expl\xedcitamente?","\xbfQu\xe9 informaci\xf3n falta para una comprensi\xf3n m\xe1s completa?"]}}(t);return{dimension:t,questions:r.slice(0,a).map(((e,t)=>{const a=i[t%Math.max(i.length,1)];if(a&&i.length){const t=`${e} (Referencia: "${a.cita}" p\xe1rrafo ${a.parrafo})`;return{question:e,anchor:{quote:a.cita,paragraph:a.parrafo},anchoredQuestion:t}}return{question:e}}))}},assessResponseQuality:function(){const e=String((arguments.length>0&&void 0!==arguments[0]?arguments[0]:"")||""),t=(3*Math.min(1,e.length/180)+2*(/(\"|"|\u201c|\u201d).+?(\"|"|\u201c|\u201d)/.test(e)?1:0)+2*(/(porque|ya que|debido a|por lo tanto|aunque)/i.test(e)?1:.5)+2*(/(sin embargo|no obstante|aunque)/i.test(e)?1:.5))/9*10,i=Math.round(t);return{score:i,level:i>=8?"avanzada":i>=5?"intermedia":"basica"}}}},7337:(e,t,i)=>{"use strict";i.d(t,{A:()=>u});i(9950);var a=i(4752),r=i(1132),o=i(3291),n=i(4414);const s=(0,a.Ay)(r.P.div)`
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 4px solid ${e=>e.$borderColor};
  background: ${e=>e.$backgroundColor};
  color: ${e=>e.$textColor};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`,l=a.Ay.div`
  font-size: 1.2rem;
  flex-shrink: 0;
`,c=a.Ay.div`
  flex: 1;
  font-weight: 500;
`,d=a.Ay.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.1);
  }
`;const u=function(e){let{type:t="info",message:i,onClose:a,icon:r}=e;const u=(e=>{switch(e){case"error":return{backgroundColor:"#FEF2F2",borderColor:"#FCA5A5",textColor:"#DC2626",icon:"\u274c"};case"warning":return{backgroundColor:"#FEF3C7",borderColor:"#FBBF24",textColor:"#D97706",icon:"\u26a0\ufe0f"};case"success":return{backgroundColor:"#D1FAE5",borderColor:"#009688",textColor:"#065F46",icon:"\u2705"};default:return{backgroundColor:"#E9F3FF",borderColor:"#3190FC",textColor:"#1E40AF",icon:"\u2139\ufe0f"}}})(t),m=r||u.icon;return(0,n.jsx)(o.N,{children:(0,n.jsxs)(s,{initial:{opacity:0,y:-20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},transition:{duration:.3},$backgroundColor:u.backgroundColor,$borderColor:u.borderColor,$textColor:u.textColor,role:"alert",children:[(0,n.jsx)(l,{children:m}),(0,n.jsx)(c,{children:i}),a&&(0,n.jsx)(d,{onClick:a,title:"Cerrar",children:"\xd7"})]})})}},7424:(e,t,i)=>{"use strict";i.r(t),i.d(t,{PedagogyContext:()=>h,PedagogyProvider:()=>g,useACDAnalyzer:()=>b,usePedagogy:()=>x,useProgression:()=>v,useRewards:()=>y,useZDPDetector:()=>f});var a=i(9950),r=i(4414);const{RUBRIC:o}=i(8864),{buildTutorPrompt:n,buildEvaluatorPrompt:s}=i(1187),{generateSocraticQuestions:l}=i(7270),{scheduleNext:c}=i(3158),{createProgressionEngine:d}=i(777),{ZDPDetector:u}=i(2303),{ACDAnalyzer:m}=i(7844),{RewardsEngine:p}=i(9769),h=(0,a.createContext)(null);function g(e){let{children:t}=e;const[i,g]=(0,a.useState)((()=>{try{const e=localStorage.getItem("pedagogyConfig");return e?JSON.parse(e):{idioma:"es",socraticMax:5}}catch{return{idioma:"es",socraticMax:5}}})),[x]=(0,a.useState)((()=>{const e=new p;return"undefined"!==typeof window&&(window.__rewardsEngine=e),e})),v=(0,a.useCallback)((e=>{g((t=>{const i={...t,...e};try{localStorage.setItem("pedagogyConfig",JSON.stringify(i))}catch{}return i}))}),[]),f=(0,a.useMemo)((()=>({RUBRIC:o,buildTutorPrompt:n,buildEvaluatorPrompt:s,generateSocraticQuestions:l,scheduleNext:c,progression:d(),zdpDetector:new u,acdAnalyzer:new m,rewards:x,updateConfig:v,modulesLoaded:!0})),[v,x]),b=(0,a.useMemo)((()=>({config:i})),[i]),y=(0,a.useMemo)((()=>({...f,...b})),[f,b]);return(0,r.jsx)(h.Provider,{value:y,children:t})}function x(){const e=(0,a.useContext)(h);if(!e)throw new Error("usePedagogy debe usarse dentro de PedagogyProvider");return e}function v(){const{progression:e}=x();return e}function f(){const{zdpDetector:e}=x();return e}function b(){const{acdAnalyzer:e}=x();return e}function y(){const{rewards:e}=x();return e}},7844:e=>{const t={liberalism:{name:"Liberalismo Cl\xe1sico",markers:["libertad","individuo","derechos","autonom\xeda","elecci\xf3n","voluntad","ciudadano"],color:"#3b82f6",questions:['\xbfQu\xe9 concepci\xf3n de "libertad" se asume aqu\xed?',"\xbfSe ignoran condiciones estructurales que limitan esa libertad individual?"]},neoliberalism:{name:"Neoliberalismo",markers:["mercado","competencia","eficiencia","productividad","emprendedor","innovaci\xf3n","flexibilidad","desregulaci\xf3n","privatizaci\xf3n"],color:"#f59e0b",questions:['\xbfQu\xe9 se naturaliza como "eficiente" sin cuestionar para qui\xe9n?',"\xbfQu\xe9 valores humanos quedan subordinados a la l\xf3gica del mercado?"]},conservatism:{name:"Conservadurismo",markers:["tradici\xf3n","orden","familia","valores","estabilidad","autoridad","moral","deber"],color:"#8b5cf6",questions:["\xbfQu\xe9 tradiciones se defienden y cu\xe1les se omiten?",'\xbfQui\xe9n define los "valores" como universales?']},socialism:{name:"Socialismo/Izquierda",markers:["igualdad","colectivo","clase","trabajador","explotaci\xf3n","solidaridad","justicia social","redistribuci\xf3n"],color:"#ef4444",questions:["\xbfSe visibiliza el conflicto de clases o se oculta?","\xbfQu\xe9 modelo de igualdad se propone?"]},feminism:{name:"Feminismo",markers:["g\xe9nero","patriarcado","machismo","opresi\xf3n","empoderamiento","sororidad","cuidado","feminista"],color:"#ec4899",questions:["\xbfQu\xe9 roles de g\xe9nero se reproducen o desaf\xedan?","\xbfSe visibiliza el trabajo reproductivo y de cuidados?"]},postcolonialism:{name:"Poscolonialismo",markers:["colonialismo","imperialismo","hegemon\xeda","occidente","subalterno","descolonial","eurocentrismo","racismo"],color:"#10b981",questions:["\xbfQu\xe9 perspectiva geopol\xedtica se centra y cu\xe1l se margina?","\xbfSe reproduce una mirada euroc\xe9ntrica?"]},environmentalism:{name:"Ecologismo",markers:["naturaleza","sostenible","ecolog\xeda","medio ambiente","cambio clim\xe1tico","recursos naturales","biodiversidad"],color:"#22c55e",questions:["\xbfSe trata la naturaleza como recurso o como valor intr\xednseco?","\xbfQui\xe9n paga los costos ambientales?"]}},i=[{name:"Hip\xe9rbole/Generalizaci\xf3n",pattern:/\b(siempre|nunca|todos|nadie|absolutamente|totalmente|completamente|jam\xe1s|ning\xfan|cualquier)\b/gi,function:"Exagera para dramatizar o simplificar",criticalQuestion:"\xbfEsta generalizaci\xf3n absoluta es precisa? \xbfQu\xe9 casos excepcionales se ignoran?",color:"#ef4444"},{name:"Eufemismo",examples:[{harsh:"despido",soft:"ajuste de personal"},{harsh:"invasi\xf3n",soft:"intervenci\xf3n"},{harsh:"bombardeo",soft:"ataque quir\xfargico"},{harsh:"tortura",soft:"t\xe9cnicas de interrogatorio mejoradas"},{harsh:"pobreza",soft:"vulnerabilidad"}],function:"Suaviza realidades negativas",criticalQuestion:"\xbfQu\xe9 realidad dura se oculta con este lenguaje edulcorado?",color:"#3b82f6"},{name:"Nominalizaci\xf3n",pattern:/\b\w+(ci\xf3n|miento|dad|ismo|eza|ancia|encia)\b/gi,function:"Convierte acciones en sustantivos, ocultando agentes",criticalQuestion:"\xbfQUI\xc9N realiz\xf3 esta acci\xf3n? \xbfQui\xe9n tiene responsabilidad aqu\xed?",example:'"La explotaci\xf3n contin\xfaa" \u2192 \xbfQui\xe9n explota a qui\xe9n?',color:"#8b5cf6"},{name:"Voz Pasiva",pattern:/\b(fue|ser\xe1|es|son|fueron|ser\xe1n)\s+\w+(ado|ada|idos|idas|ido|ida)\b/gi,function:"Oculta el agente responsable",criticalQuestion:"\xbfQui\xe9n HIZO esto? \xbfPor qu\xe9 se oculta la responsabilidad?",example:'"Se tomaron medidas" \u2192 \xbfQui\xe9n las tom\xf3?',color:"#f59e0b"},{name:"Presuposici\xf3n",markers:["obviamente","claramente","naturalmente","es evidente","como todos sabemos","sin duda"],function:"Presenta algo controvertido como obvio",criticalQuestion:"\xbfEsta asunci\xf3n es compartida por TODOS? \xbfQu\xe9 se da por sentado sin argumentar?",color:"#06b6d4"},{name:"Legitimaci\xf3n por Autoridad",pattern:/\b(expertos?|cient\xedficos?|estudios?|investigaciones?|datos|estad\xedsticas|instituciones?)\b/gi,function:"Apela a autoridad para validar",criticalQuestion:"\xbfQu\xe9 expertos? \xbfFinanciados por qui\xe9n? \xbfQu\xe9 otros expertos discrepan?",color:"#10b981"},{name:"Falsa Dicotom\xeda",pattern:/\b(o\s+\w+|entre\s+\w+\s+y\s+\w+|solo\s+(dos|ambos)|elegir\s+entre)\b/gi,function:"Reduce opciones a solo dos alternativas",criticalQuestion:"\xbfRealmente solo hay estas dos opciones? \xbfQu\xe9 alternativas se excluyen del marco?",color:"#ec4899"}];class a{constructor(){this.frames=t,this.strategies=i}analyze(e){if(!e||"string"!==typeof e)return this._emptyAnalysis();const t=this.detectIdeologicalFrames(e),i=this.detectRhetoricalStrategies(e),a=this.analyzePowerRelations(e);return{ideologicalFrames:t,rhetoricalStrategies:i,powerRelations:a,voiceAnalysis:this.analyzeVoices(e),summary:this._generateSummary(t,i,a),timestamp:Date.now()}}detectIdeologicalFrames(e){e.toLowerCase();const t=e.split(/\s+/).length,i=Object.entries(this.frames).map((i=>{let[a,r]=i;const o=r.markers.reduce(((t,i)=>{const a=new RegExp(`\\b${i}\\w*\\b`,"gi"),r=e.match(a)||[];return t.concat(r)}),[]),n=o.length/t;return{id:a,name:r.name,color:r.color,count:o.length,density:Math.round(1e4*n)/100,examples:[...new Set(o)].slice(0,5),criticalQuestions:r.questions,markers:r.markers.filter((t=>new RegExp(`\\b${t}`,"i").test(e)))}})).filter((e=>e.count>0));return i.sort(((e,t)=>t.density-e.density)),i.slice(0,3)}detectRhetoricalStrategies(e){const t=[];return this.strategies.forEach((i=>{if(i.pattern){const a=e.match(i.pattern);a&&t.push({name:i.name,color:i.color,function:i.function,occurrences:a.length,examples:[...new Set(a.map((e=>e.trim())))].slice(0,3),criticalQuestion:i.criticalQuestion,exampleExplanation:i.example})}else if(i.markers){const a=i.markers.filter((t=>new RegExp(t,"i").test(e)));a.length>0&&t.push({name:i.name,color:i.color,function:i.function,occurrences:a.length,examples:a,criticalQuestion:i.criticalQuestion})}else if(i.examples){const a=i.examples.filter((t=>new RegExp(`\\b${t.soft}\\b`,"i").test(e)));a.length>0&&t.push({name:i.name,color:i.color,function:i.function,occurrences:a.length,examples:a.map((e=>`"${e.soft}" (oculta: "${e.harsh}")`)),criticalQuestion:i.criticalQuestion})}})),t}analyzePowerRelations(e){const t={};return Object.entries({dominance:["controla","domina","impone","ordena","manda","dirige","gobierna"],resistance:["resiste","opone","desaf\xeda","lucha","confronta","rebelde"],legitimation:["legal","leg\xedtimo","autorizado","oficial","institucional"],marginalization:["excluye","margina","invisibiliza","silencia","ignora"]}).forEach((i=>{let[a,r]=i;const o=r.filter((t=>new RegExp(`\\b${t}\\w*\\b`,"i").test(e)));o.length>0&&(t[a]={count:o.length,examples:o})})),{detected:t,summary:this._summarizePowerRelations(t),criticalQuestion:"\xbfQui\xe9n tiene PODER en este discurso? \xbfQui\xe9n est\xe1 subordinado? \xbfC\xf3mo se legitima esta jerarqu\xeda?"}}analyzeVoices(e){const t=e.match(/"[^"]+"/g)||[],i=e.match(/\b(seg\xfan|para|de acuerdo a|en palabras de)\s+\w+/gi)||[],a={};return Object.entries({power:["gobierno","empresa","corporaci\xf3n","autoridad","\xe9lite","l\xedder"],subordinate:["trabajador","ciudadano","pueblo","comunidad","v\xedctima","minor\xeda"]}).forEach((t=>{let[i,r]=t;const o=r.filter((t=>new RegExp(`\\b${t}\\w*\\b`,"i").test(e)));o.length>0&&(a[i]=o)})),{directQuotes:t.length,indirectReferences:i.length,socialGroupsMentioned:a,criticalQuestions:["\xbfQu\xe9 voces hablan DIRECTAMENTE en este texto?","\xbfQu\xe9 grupos sociales est\xe1n REPRESENTADOS?","\xbfQu\xe9 perspectivas est\xe1n AUSENTES o SILENCIADAS?","\xbfQui\xe9n tiene el PRIVILEGIO de hablar y qui\xe9n solo es hablado?"]}}buildACDPrompt(e,t,i){const{ideologicalFrames:a,rhetoricalStrategies:r}=e,o=a[0],n=r[0];return`# AN\xc1LISIS CR\xcdTICO DEL DISCURSO (ACD)\n\n**Texto analizado**:\n"${i.slice(0,300)}..."\n\n**Pregunta del estudiante**:\n"${t}"\n\n---\n\n## HALLAZGOS AUTOM\xc1TICOS\n\n### \ud83c\udfad Marcos Ideol\xf3gicos Detectados:\n${a.map((e=>`**${e.name}** (${e.density}% del texto)\n   - Marcadores: ${e.examples.slice(0,3).join(", ")}\n   - Preguntas cr\xedticas: ${e.criticalQuestions[0]}`)).join("\n\n")}\n\n### \ud83d\udde3\ufe0f Estrategias Ret\xf3ricas:\n${r.slice(0,3).map((e=>`**${e.name}** (${e.occurrences} veces)\n   - Ejemplos: ${e.examples.slice(0,2).join(", ")}\n   - Funci\xf3n: ${e.function}\n   - Pregunta cr\xedtica: ${e.criticalQuestion}`)).join("\n\n")}\n\n---\n\n## TU TAREA COMO TUTOR SOCR\xc1TICO (ACD)\n\n**IMPORTANTE**: NO des an\xe1lisis completo. Haz preguntas que gu\xeden al descubrimiento.\n\n**Estrategia**:\n1. Se\xf1ala UN hallazgo relevante del an\xe1lisis (ej: "${(null===o||void 0===o?void 0:o.name)||"marco ideol\xf3gico"} presente")\n2. Conecta con la pregunta del estudiante\n3. Haz 2-3 preguntas socr\xe1ticas que empujen a descubrir:\n   - \xbfQu\xe9 INTERESES representa este discurso?\n   - \xbfQu\xe9 se NATURALIZA como inevitable o normal?\n   - \xbfQu\xe9 ALTERNATIVAS quedan fuera del marco?\n4. Si detectaste ${(null===n||void 0===n?void 0:n.name)||"estrategia ret\xf3rica"}, pregunta qu\xe9 FUNCI\xd3N cumple\n\n**Tono**: Socr\xe1tico, no sentencioso. Preguntas > afirmaciones.\n**Extensi\xf3n**: M\xe1ximo 120 palabras.\n\n**Responde en espa\xf1ol:**`}calculateACDPoints(e){const{ideologicalFrames:t,rhetoricalStrategies:i}=e;let a=0;const r=[];return t.length>0&&(a+=30*t.length,r.push(`Marcos ideol\xf3gicos identificados: ${t.map((e=>e.name)).join(", ")}`)),i.length>0&&(a+=20*i.length,r.push(`Estrategias ret\xf3ricas detectadas: ${i.length}`)),{points:a,reasons:r,level:"ACD Expert",message:a>0?`\ud83c\udfaf \xa1An\xe1lisis cr\xedtico del discurso! +${a} pts`:"Contin\xfaa analizando para desbloquear puntos ACD"}}_generateSummary(e,t,i){if(0===e.length&&0===t.length)return"No se detectaron marcadores ideol\xf3gicos o ret\xf3ricos significativos en este fragmento.";return`${e.length>0?`Marco dominante: ${e[0].name} (${e[0].density}%).`:""}${t.length>0?` Estrategias: ${t.map((e=>e.name)).join(", ")}.`:""} An\xe1lisis cr\xedtico recomendado: cuestionar supuestos, identificar intereses, buscar voces silenciadas.`}_summarizePowerRelations(e){const t=Object.keys(e);return 0===t.length?"No se detectaron marcadores de poder expl\xedcitos.":`Marcadores de poder detectados: ${t.join(", ")}. Cuestiona: \xbfqui\xe9n ejerce poder y c\xf3mo se legitima?`}_emptyAnalysis(){return{ideologicalFrames:[],rhetoricalStrategies:[],powerRelations:{detected:{},summary:"",criticalQuestion:""},voiceAnalysis:{directQuotes:0,indirectReferences:0,socialGroupsMentioned:{},criticalQuestions:[]},summary:"Texto insuficiente para an\xe1lisis.",timestamp:Date.now()}}exportFramework(){return{ideologicalFrames:Object.entries(this.frames).map((e=>{let[t,i]=e;return{id:t,name:i.name,markers:i.markers}})),rhetoricalStrategies:this.strategies.map((e=>({name:e.name,function:e.function,criticalQuestion:e.criticalQuestion}))),version:"1.0.0",theoreticalBasis:"Van Dijk, Fairclough, Wodak"}}}e.exports={ACDAnalyzer:a,IDEOLOGICAL_FRAMES:t,RHETORICAL_STRATEGIES:i},"undefined"!==typeof window&&(window.ACDAnalyzer=a)},8864:(e,t,i)=>{"use strict";i.r(t),i.d(t,{RUBRIC:()=>a,default:()=>b,getDimension:()=>c,normalizarPuntaje10aNivel4:()=>r,normalizeDimensionInput:()=>x,scoreToLevelDescriptor:()=>p,summarizeEvaluation:()=>f});const a={dimensiones:{comprensionAnalitica:{nombre:"Comprensi\xf3n anal\xedtica",descripcion:"Reconstruye el significado literal e inferencial del texto con evidencia expl\xedcita",criterios:["Identifica tesis central con citas precisas","Distingue hechos de opiniones con ejemplos textuales","Parafrasea manteniendo fidelidad conceptual","Analiza estructura argumentativa y jerarqu\xeda de ideas","Fundamenta deducciones en evidencia textual expl\xedcita"],niveles:{1:"Insuficiente: Repite informaci\xf3n superficial sin evidencia. No identifica tesis ni distingue tipos de informaci\xf3n.",2:"B\xe1sico: Identifica ideas principales pero con evidencia escasa o imprecisa. Par\xe1frasis literal sin an\xe1lisis.",3:"Adecuado: Parafrasea con fidelidad, distingue informaci\xf3n central/secundaria, usa evidencia textual apropiada.",4:"Avanzado: Reconstruye tesis con precisi\xf3n, analiza estructura argumentativa completa, fundamenta con citas estrat\xe9gicas."},preguntasGuia:["\xbfCu\xe1l es la tesis central y qu\xe9 evidencias la sustentan?","\xbfQu\xe9 afirmaciones son hechos verificables y cu\xe1les opiniones del autor?","\xbfC\xf3mo organiz\xf3 el autor sus argumentos? \xbfQu\xe9 informaci\xf3n es central vs secundaria?"]},acd:{nombre:"An\xe1lisis ideol\xf3gico-discursivo (ACD)",descripcion:"Desvela ideolog\xedas, sesgos y estrategias ret\xf3ricas que subyacen al discurso",criterios:["Identifica perspectiva ideol\xf3gica y posicionamiento del autor","Analiza estrategias ret\xf3ricas y elecciones l\xe9xicas intencionadas","Detecta voces autorizadas vs silenciadas o marginadas","Determina intereses, beneficiarios y marcos interpretativos","Examina met\xe1foras, eufemismos y carga valorativa del lenguaje"],niveles:{1:"Insuficiente: No reconoce perspectiva ni sesgos. Acepta el texto como neutral u objetivo.",2:"B\xe1sico: Identifica algunas estrategias ret\xf3ricas evidentes pero sin conectar con ideolog\xeda subyacente.",3:"Adecuado: Analiza marcos interpretativos y voces, identifica algunos sesgos con ejemplos textuales.",4:"Avanzado: Desvela sistem\xe1ticamente ideolog\xeda, intereses y silencios. Analiza estrategias ret\xf3ricas complejas."},preguntasGuia:["\xbfDesde qu\xe9 perspectiva ideol\xf3gica se escribe este texto? \xbfQu\xe9 sesgos detectas?","\xbfQu\xe9 voces tienen autoridad y cu\xe1les est\xe1n ausentes o silenciadas?","\xbfA qui\xe9n beneficia esta interpretaci\xf3n y qu\xe9 intereses podr\xedan estar en juego?","\xbfQu\xe9 estrategias ret\xf3ricas usa el autor para persuadir o manipular?"]},contextualizacion:{nombre:"Contextualizaci\xf3n socio-hist\xf3rica",descripcion:"Sit\xfaa el texto en su entorno de producci\xf3n y analiza sus implicaciones sociales",criterios:["Identifica actores sociales y pol\xedticos relevantes","Conecta con eventos hist\xf3ricos y procesos sociales espec\xedficos","Analiza impacto y consecuencias en grupos/comunidades concretas","Ubica en debates p\xfablicos y tensiones sociales actuales","Reconoce el texto como intervenci\xf3n en di\xe1logos sociales amplios"],niveles:{1:"Insuficiente: Trata el texto como objeto aislado, sin conexi\xf3n con su contexto social o hist\xf3rico.",2:"B\xe1sico: Menciona contexto general pero sin conexiones espec\xedficas con procesos o consecuencias.",3:"Adecuado: Conecta con procesos sociales y actores espec\xedficos, identifica algunas implicaciones.",4:"Avanzado: Sit\xfaa sistem\xe1ticamente en debates p\xfablicos, analiza consecuencias concretas y din\xe1micas de poder."},preguntasGuia:["\xbfEn qu\xe9 contexto socio-pol\xedtico se produce este texto y qu\xe9 eventos lo influenciaron?","\xbfQu\xe9 actores sociales est\xe1n involucrados y c\xf3mo los afecta?","\xbfQu\xe9 consecuencias reales ha tenido o busca tener este discurso?","\xbfEn qu\xe9 debates p\xfablicos actuales se inscribe esta discusi\xf3n?"]},argumentacion:{nombre:"Argumentaci\xf3n y contraargumento",descripcion:"Construye posturas propias y maneja objeciones con pensamiento dial\xf3gico",criterios:["Formula postura propia clara y fundamentada","Articula razones l\xf3gicas respaldadas por evidencia textual","Anticipa objeciones leg\xedtimas y las aborda sistem\xe1ticamente","Integra perspectivas alternativas sin debilitar la argumentaci\xf3n","Demuestra pensamiento dial\xf3gico y manejo de la complejidad"],niveles:{1:"Insuficiente: Expresa opini\xf3n personal sin razones ni evidencia. Ignora perspectivas alternativas.",2:"B\xe1sico: Ofrece razones generales con evidencia limitada. Reconoce otras perspectivas superficialmente.",3:"Adecuado: Postura fundamentada con evidencia textual, anticipa algunas objeciones principales.",4:"Avanzado: Argumentaci\xf3n robusta, refuta objeciones con rigor, integra complejidad sin simplificar."},preguntasGuia:["\xbfCu\xe1l es tu postura fundamentada sobre este tema y qu\xe9 evidencias del texto la sustentan?","\xbfQu\xe9 objeciones v\xe1lidas podr\xedan hacer a tu argumento y c\xf3mo las responder\xedas?","\xbfC\xf3mo integras perspectivas alternativas sin debilitar tu posici\xf3n?","\xbfQu\xe9 limitaciones reconoces en tu propio argumento?"]}},escala:{min:1,max:10}};function r(e){const t=Number(e);return Number.isNaN(t)||t<1?1:t>=9?4:t>=7?3:t>=5?2:1}const o={min:1,max:10},n={min:1,max:4};function s(e){return Number.isNaN(e)?o.min:Math.max(o.min,Math.min(o.max,e))}function l(){return Object.keys(a.dimensiones)}function c(e){return a.dimensiones[e]||null}function d(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"comprensionAnalitica";return l().includes(e)?e:t}function u(e,t){var i;const a=c(d(e));return(null===a||void 0===a||null===(i=a.niveles)||void 0===i?void 0:i[t])||""}function m(e){return r(s(e))}function p(e,t){const i=m(t);return{level:i,descriptor:u(e,i)}}function h(e){const t=new Map;if(t.has(e))return t.get(e);const i=c(d(e)),a=(null===i||void 0===i?void 0:i.criterios)||[];return t.set(e,a),a}const g={comprensionanalitica:"comprensionAnalitica","comprensi\xf3nanal\xedtica":"comprensionAnalitica",analisisideologicodiscursivo:"acd","an\xe1lisisideol\xf3gico-discursivo":"acd",acd:"acd",contextualizacion:"contextualizacion","contextualizaci\xf3n":"contextualizacion",argumentacion:"argumentacion","argumentaci\xf3n":"argumentacion"};function x(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"comprensionAnalitica";if(!e||"string"!==typeof e)return t;const i=e.toLowerCase().replace(/[^\w\s\xf1\xe1\xe9\xed\xf3\xfa\xfc-]/g,"").replace(/\s|_|-|\./g,""),a=g[i];return a&&d(a)?a:d(e,t)}const v=["comprensionAnalitica","acd","contextualizacion","argumentacion"];function f(e){if(!e||"object"!==typeof e)return{error:"Evaluaci\xf3n inv\xe1lida",valid:!1};const t=x(e.dimension),i=c(t);if(!i)return{error:`Dimensi\xf3n desconocida: ${e.dimension}`,valid:!1};const a=Number(e.score);if(Number.isNaN(a)||a<o.min||a>o.max)return{error:`Score inv\xe1lido: ${e.score}`,valid:!1};const r=s(a),{level:n,descriptor:l}=p(t,r),d=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:10;return Array.isArray(e)?e.slice(0,t).filter(Boolean):[]};return{valid:!0,key:t,name:i.nombre,score:r,level:n,descriptor:l,criteria:i.criterios.slice(),strengths:d(e.strengths),improvements:d(e.improvements),evidence:d(e.evidence),summary:String(e.summary||"").slice(0,1e3)}}!function e(t){return Object.getOwnPropertyNames(t).forEach((i=>{const a=t[i];a&&"object"===typeof a&&e(a)})),Object.freeze(t)}(a),Object.freeze(a),Object.freeze(g),Object.freeze(v);const b={RUBRIC:a,normalizarPuntaje10aNivel4:r,SCORE_SCALE:o,LEVEL4_SCALE:n,clampScore:s,getDimensionKeys:l,getDimension:c,validateDimensionKey:d,levelDescriptor:u,scoreToLevel:m,scoreToLevelDescriptor:p,getCriteriaByDimension:h,findDimensionKeyByName:function(e){if(!e)return null;const t=String(e).toLowerCase();return l().find((e=>{const i=a.dimensiones[e].nombre.toLowerCase();return i===t||i.includes(t)}))||null},DIMENSION_ALIASES:g,normalizeDimensionInput:x,ORDERED_DIMENSIONS:v,getOrderedDimensions:function(){const e=new Set(l());return v.filter((t=>e.has(t)))},computeScoreFromCriteria:function(e){let{dimensionKey:t,criteriaScores:i=[],weights:a=[]}=e;const r=h(t);if(!r.length||!i.length)return o.min;const l=r.length,c=Array.isArray(a)&&a.length===l?a:Array(l).fill(1),d=c.reduce(((e,t)=>e+t),0)||1,u=i.slice(0,l).reduce(((e,t,i)=>e+Math.max(n.min,Math.min(n.max,t))*c[i]),0)/d;return s(Math.round((u-1)/(n.max-1)*(o.max-o.min)+o.min))},summarizeEvaluation:f}},9769:e=>{const t={QUESTION_BLOOM_1:{points:5,label:"\ud83d\udcd6 Pregunta Literal"},QUESTION_BLOOM_2:{points:10,label:"\ud83d\udca1 Pregunta Inferencial"},QUESTION_BLOOM_3:{points:20,label:"\ud83c\udf0d Pregunta Aplicativa"},QUESTION_BLOOM_4:{points:35,label:"\ud83d\udd0d Pregunta Anal\xedtica"},QUESTION_BLOOM_5:{points:60,label:"\u2696\ufe0f Pregunta Cr\xedtica (ACD)"},QUESTION_BLOOM_6:{points:100,label:"\u2728 Pregunta Propositiva"},ACD_FRAME_IDENTIFIED:{points:40,label:"\ud83c\udfad Marco Ideol\xf3gico Identificado"},ACD_STRATEGY_IDENTIFIED:{points:25,label:"\ud83d\udde3\ufe0f Estrategia Ret\xf3rica Identificada"},ACD_POWER_ANALYSIS:{points:50,label:"\u26a1 An\xe1lisis de Relaciones de Poder"},EVALUATION_SUBMITTED:{points:20,label:"\ud83d\udcdd Evaluaci\xf3n Enviada"},EVALUATION_LEVEL_1:{points:10,label:"\ud83e\udd49 Nivel 1 - Inicial"},EVALUATION_LEVEL_2:{points:25,label:"\ud83e\udd48 Nivel 2 - B\xe1sico"},EVALUATION_LEVEL_3:{points:50,label:"\ud83e\udd47 Nivel 3 - Competente"},EVALUATION_LEVEL_4:{points:100,label:"\ud83d\udc8e Nivel 4 - Avanzado"},QUOTE_USED:{points:5,label:"\ud83d\udcce Cita Textual Usada"},STRONG_TEXTUAL_ANCHORING:{points:30,label:"\ud83d\udd17 Anclaje Textual S\xf3lido"},METACOGNITIVE_INTEGRATION:{points:20,label:"\ud83e\udde0 Integraci\xf3n Fluida de Evidencia"},DIMENSION_UNLOCKED:{points:75,label:"\ud83d\udd13 Dimensi\xf3n Desbloqueada"},DIMENSION_COMPLETED:{points:150,label:"\u2705 Dimensi\xf3n Completada"},ANNOTATION_CREATED:{points:8,label:"\ud83d\udcdd Anotaci\xf3n Creada"},NOTE_CREATED:{points:12,label:"\ud83d\udcad Nota de Estudio Creada"},WEB_SEARCH_USED:{points:15,label:"\ud83c\udf10 Enriquecimiento Web"},CONTEXTUALIZATION_HISTORICAL:{points:40,label:"\ud83d\udd70\ufe0f Contextualizaci\xf3n Socio-Hist\xf3rica"},SOCIAL_CONNECTIONS_MAPPED:{points:30,label:"\ud83d\udd17 Conexiones Sociales Mapeadas"},CRITICAL_THESIS_DEVELOPED:{points:35,label:"\ud83d\udcad Tesis Cr\xedtica Desarrollada"},COUNTERARGUMENT_ANTICIPATED:{points:25,label:"\u2694\ufe0f Contraargumento Anticipado"},REFUTATION_ELABORATED:{points:25,label:"\ud83d\udee1\ufe0f Refutaci\xf3n Elaborada"},PERFECT_SCORE:{points:200,label:"\u2b50 Puntuaci\xf3n Perfecta"},METACOGNITIVE_REFLECTION:{points:35,label:"\ud83e\udd14 Reflexi\xf3n Metacognitiva"},SELF_ASSESSMENT:{points:20,label:"\ud83d\udcca Autoevaluaci\xf3n"},ACTIVITY_COMPLETED:{points:40,label:"\ud83c\udfaf Actividad Completada"},TABLA_ACD_COMPLETED:{points:80,label:"\ud83d\udcca Tabla ACD Completada"}},i={3:1.2,7:1.5,14:2,21:2.5,30:3},a={FIRST_QUESTION:{id:"first_question",name:"\ud83c\udf31 Primer Paso",description:"Primera interacci\xf3n con el tutor",points:10,icon:"\ud83c\udf31"},CRITICAL_THINKER:{id:"critical_thinker",name:"\ud83e\udde0 Pensador Cr\xedtico",description:"Primera pregunta de nivel 5 (ACD)",points:100,icon:"\ud83e\udde0"},ACD_MASTER:{id:"acd_master",name:"\ud83c\udfad Maestro del ACD",description:"Identific\xf3 3 marcos ideol\xf3gicos diferentes",points:150,icon:"\ud83c\udfad"},EVIDENCE_CHAMPION:{id:"evidence_champion",name:"\ud83d\udd17 Campe\xf3n de Evidencia",description:"Us\xf3 10+ citas textuales en evaluaciones",points:75,icon:"\ud83d\udd17"},TEN_EVALUATIONS:{id:"ten_evals",name:"\ud83d\udcda Evaluador Dedicado",description:"10 evaluaciones completadas",points:100,icon:"\ud83d\udcda"},PERFECT_SCORE:{id:"perfect",name:"\u2b50 Excelencia Cr\xedtica",description:"Puntuaci\xf3n 10/10 en evaluaci\xf3n",points:200,icon:"\u2b50"},ALL_DIMENSIONS:{id:"all_dims",name:"\ud83c\udf93 Literato Cr\xedtico",description:"Todas las 4 dimensiones completadas",points:500,icon:"\ud83c\udf93"},WEEK_STREAK:{id:"week_streak",name:"\ud83d\udd25 Racha Semanal",description:"7 d\xedas consecutivos de estudio",points:100,icon:"\ud83d\udd25"},MONTH_STREAK:{id:"month_streak",name:"\ud83d\udcaa Dedicaci\xf3n Mensual",description:"30 d\xedas consecutivos de estudio",points:500,icon:"\ud83d\udcaa"},METACOGNITIVE_MASTER:{id:"metacog_master",name:"\ud83e\ude9e Maestro Metacognitivo",description:"5 reflexiones metacognitivas completadas",points:150,icon:"\ud83e\ude9e"}};class r{constructor(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"undefined"!==typeof localStorage?localStorage:null;if(this.storage=e,this.state=this.initialState(),"undefined"!==typeof window&&!window.__firebaseUserLoading){const e=this.loadState();e&&e.totalPoints>0&&(console.warn("\u26a0\ufe0f [RewardsEngine] Usando cach\xe9 local temporal, Firebase tendr\xe1 prioridad..."),this.state=e)}}loadState(){if(!this.storage)return this.initialState();try{const e=this.storage.getItem("rewards_state");if(!e)return this.initialState();const t=JSON.parse(e);return{...this.initialState(),...t,history:Array.isArray(t.history)?t.history:[],achievements:Array.isArray(t.achievements)?t.achievements:[],dailyLog:t.dailyLog||{}}}catch(e){return console.warn("Error loading rewards state:",e),this.initialState()}}initialState(){return{totalPoints:0,spentPoints:0,availablePoints:0,streak:0,lastInteraction:null,history:[],achievements:[],dailyLog:{},stats:{totalInteractions:0,bloomLevelCounts:{},acdFramesIdentified:0,quotesUsed:0,evaluationsSubmitted:0,avgBloomLevel:0}}}persist(){if(this.storage)try{this.storage.setItem("rewards_state",JSON.stringify(this.state)),"undefined"!==typeof window&&window.dispatchEvent(new CustomEvent("rewards-state-changed",{detail:{totalPoints:this.state.totalPoints,availablePoints:this.state.availablePoints,streak:this.state.streak}}))}catch(e){console.warn("Error persisting rewards:",e)}}recordEvent(e){let i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};const a=t[e];if(!a)return console.warn("Unknown reward event:",e),{points:0,multiplier:1,totalEarned:0,message:"Evento desconocido"};this.updateStreak();const r=a.points,o=this.getStreakMultiplier(),n=Math.round(r*o);return this.state.totalPoints+=n,this.state.availablePoints=this.state.totalPoints-this.state.spentPoints,this.state.lastInteraction=Date.now(),this.state.history.push({event:e,label:a.label,basePoints:r,multiplier:o,earnedPoints:n,timestamp:Date.now(),metadata:i}),this.updateStats(e,i),this.updateDailyLog(n,i),this.checkAchievements(e,i),this.persist(),{points:r,multiplier:o,totalEarned:n,message:`${a.label} +${n} pts`,streak:this.state.streak}}updateStreak(){const e=Date.now(),t=this.state.lastInteraction?new Date(this.state.lastInteraction).toISOString().split("T")[0]:null,i=new Date(e).toISOString().split("T")[0];if(t){if(t===i)return;t===new Date(e-864e5).toISOString().split("T")[0]?(this.state.streak+=1,7!==this.state.streak||this.state.achievements.includes("week_streak")?30!==this.state.streak||this.state.achievements.includes("month_streak")||this.unlockAchievement("month_streak"):this.unlockAchievement("week_streak")):this.state.streak=1}else this.state.streak=1}getStreakMultiplier(){const e=this.state.streak,t=Object.keys(i).map(Number).filter((t=>e>=t)).sort(((e,t)=>t-e));return 0===t.length?1:i[t[0]]}updateStats(e,t){if(this.state.stats.totalInteractions+=1,e.startsWith("QUESTION_BLOOM_")){const t=parseInt(e.replace("QUESTION_BLOOM_",""));this.state.stats.bloomLevelCounts[t]=(this.state.stats.bloomLevelCounts[t]||0)+1;const i=Object.values(this.state.stats.bloomLevelCounts).reduce(((e,t)=>e+t),0),a=Object.entries(this.state.stats.bloomLevelCounts).reduce(((e,t)=>{let[i,a]=t;return e+parseInt(i)*a}),0);this.state.stats.avgBloomLevel=Math.round(a/i*10)/10}"ACD_FRAME_IDENTIFIED"===e&&(this.state.stats.acdFramesIdentified+=1),"QUOTE_USED"===e&&t.count&&(this.state.stats.quotesUsed+=t.count),"EVALUATION_SUBMITTED"===e&&(this.state.stats.evaluationsSubmitted+=1)}updateDailyLog(e,t){const i=(new Date).toISOString().split("T")[0];this.state.dailyLog[i]||(this.state.dailyLog[i]={interactions:0,points:0,bloomLevels:[]}),this.state.dailyLog[i].interactions+=1,this.state.dailyLog[i].points+=e,t.bloomLevel&&this.state.dailyLog[i].bloomLevels.push(t.bloomLevel)}checkAchievements(e,t){if(1!==this.state.stats.totalInteractions||this.state.achievements.includes("first_question")||this.unlockAchievement("first_question"),"QUESTION_BLOOM_5"===e&&!this.state.achievements.includes("critical_thinker")){1===(this.state.stats.bloomLevelCounts[5]||0)&&this.unlockAchievement("critical_thinker")}this.state.stats.acdFramesIdentified>=3&&!this.state.achievements.includes("acd_master")&&this.unlockAchievement("acd_master"),this.state.stats.quotesUsed>=10&&!this.state.achievements.includes("evidence_champion")&&this.unlockAchievement("evidence_champion"),this.state.stats.evaluationsSubmitted>=10&&!this.state.achievements.includes("ten_evals")&&this.unlockAchievement("ten_evals"),10!==t.score||this.state.achievements.includes("perfect")||this.unlockAchievement("perfect"),t.allDimensionsComplete&&!this.state.achievements.includes("all_dims")&&this.unlockAchievement("all_dims");this.state.history.filter((e=>"METACOGNITIVE_REFLECTION"===e.event)).length>=5&&!this.state.achievements.includes("metacog_master")&&this.unlockAchievement("metacog_master")}unlockAchievement(e){const t=a[e.toUpperCase()];if(t&&!this.state.achievements.includes(e))return this.state.achievements.push(e),this.state.totalPoints+=t.points,this.state.availablePoints=this.state.totalPoints-this.state.spentPoints,this.state.history.push({event:"ACHIEVEMENT_UNLOCKED",label:`\ud83c\udfc6 ${t.name}`,basePoints:t.points,multiplier:1,earnedPoints:t.points,timestamp:Date.now(),metadata:{achievementId:e,description:t.description}}),this.persist(),t}redeemPoints(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"Canje con docente";if(e>this.state.availablePoints)throw new Error(`Puntos insuficientes. Disponibles: ${this.state.availablePoints}, solicitados: ${e}`);return this.state.spentPoints+=e,this.state.availablePoints=this.state.totalPoints-this.state.spentPoints,this.state.history.push({event:"POINTS_REDEEMED",label:t,basePoints:-e,multiplier:1,earnedPoints:-e,timestamp:Date.now(),metadata:{reason:t}}),this.persist(),this.state.availablePoints}getState(){return{...this.state}}exportState(){return JSON.parse(JSON.stringify(this.state))}importState(e){if(e&&"object"===typeof e){var t,i,a,r,o,n,s,l,c,d,u,m;if(arguments.length>1&&void 0!==arguments[1]&&arguments[1])this.state={...this.state,totalPoints:Math.max(this.state.totalPoints,e.totalPoints||0),spentPoints:Math.max(this.state.spentPoints,e.spentPoints||0),availablePoints:Math.max(this.state.availablePoints,e.availablePoints||0),streak:Math.max(this.state.streak,e.streak||0),lastInteraction:e.lastInteraction||this.state.lastInteraction,history:[...this.state.history||[],...e.history||[]],achievements:[...new Set([...this.state.achievements||[],...e.achievements||[]])],dailyLog:{...this.state.dailyLog||{},...e.dailyLog||{}},stats:{totalInteractions:Math.max((null===(t=this.state.stats)||void 0===t?void 0:t.totalInteractions)||0,(null===(i=e.stats)||void 0===i?void 0:i.totalInteractions)||0),bloomLevelCounts:{...(null===(a=this.state.stats)||void 0===a?void 0:a.bloomLevelCounts)||{},...(null===(r=e.stats)||void 0===r?void 0:r.bloomLevelCounts)||{}},acdFramesIdentified:Math.max((null===(o=this.state.stats)||void 0===o?void 0:o.acdFramesIdentified)||0,(null===(n=e.stats)||void 0===n?void 0:n.acdFramesIdentified)||0),quotesUsed:Math.max((null===(s=this.state.stats)||void 0===s?void 0:s.quotesUsed)||0,(null===(l=e.stats)||void 0===l?void 0:l.quotesUsed)||0),evaluationsSubmitted:Math.max((null===(c=this.state.stats)||void 0===c?void 0:c.evaluationsSubmitted)||0,(null===(d=e.stats)||void 0===d?void 0:d.evaluationsSubmitted)||0),avgBloomLevel:Math.max((null===(u=this.state.stats)||void 0===u?void 0:u.avgBloomLevel)||0,(null===(m=e.stats)||void 0===m?void 0:m.avgBloomLevel)||0)}};else this.state={...this.initialState(),...e,history:Array.isArray(e.history)?e.history:[],achievements:Array.isArray(e.achievements)?e.achievements:[],dailyLog:e.dailyLog||{}};this.persist(),console.log("\u2705 [RewardsEngine] Estado importado exitosamente")}else console.warn("\u26a0\ufe0f [RewardsEngine] Estado importado inv\xe1lido")}getAnalytics(){return{engagement:{totalInteractions:this.state.stats.totalInteractions,streak:this.state.streak,avgBloomLevel:this.state.stats.avgBloomLevel,dailyActivity:Object.entries(this.state.dailyLog).map((e=>{let[t,i]=e;return{date:t,interactions:i.interactions,points:i.points,avgBloomLevel:i.bloomLevels.length>0?i.bloomLevels.reduce(((e,t)=>e+t),0)/i.bloomLevels.length:0}}))},quality:{bloomLevelDistribution:this.state.stats.bloomLevelCounts,acdFramesIdentified:this.state.stats.acdFramesIdentified,quotesPerEvaluation:this.state.stats.evaluationsSubmitted>0?Math.round(this.state.stats.quotesUsed/this.state.stats.evaluationsSubmitted*10)/10:0},gamification:{totalPoints:this.state.totalPoints,availablePoints:this.state.availablePoints,spentPoints:this.state.spentPoints,achievements:this.state.achievements.length,achievementsList:this.state.achievements.map((e=>{var t;return null===(t=a[e.toUpperCase()])||void 0===t?void 0:t.name}))},history:this.state.history}}exportCSV(){return"\ufeff"+[["Fecha y Hora","Tipo de Evento","Descripci\xf3n","Puntos Base","Multiplicador","Puntos Ganados","Nivel Bloom","Artefacto"],...this.state.history.map((e=>{var t,i;return[new Date(e.timestamp).toLocaleString("es-ES",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}),e.event,e.label,e.basePoints,e.multiplier.toFixed(1),e.earnedPoints,(null===(t=e.metadata)||void 0===t?void 0:t.bloomLevel)||"",(null===(i=e.metadata)||void 0===i?void 0:i.artefacto)||""]}))].map((e=>e.map((e=>`"${e}"`)).join(","))).join("\n")}reset(){this.state=this.initialState(),this.persist()}}e.exports={RewardsEngine:r,REWARD_EVENTS:t,ACHIEVEMENTS:a,STREAK_MULTIPLIERS:i},"undefined"!==typeof window&&(window.RewardsEngine=r)}}]);