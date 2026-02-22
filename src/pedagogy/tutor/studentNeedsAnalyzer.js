// Patrones de detección de necesidades del estudiante (confusión, frustración, curiosidad, insight)
export const CONFUSION_PATTERNS = [
    /no entiendo/i, /no comprendo/i, /no comprend/i,
    /qu[eé] significa/i, /qu[eé] quiere decir/i, /qu[eé] quieres decir/i,
    /me pierdo/i, /no capto/i, /no cacho/i, /no pillo/i,
    /no s[eé] qu[eé]/i, /no s[eé] que/i,
    /confuso/i, /confundid[oa]/i, /me confund/i,
    /complicado/i, /muy complicad/i,
    /dif[ií]cil/i, /muy dif[ií]cil/i, /es dif[ií]cil/i,
    /\?\?\?+/,
    /no me queda claro/i, /no me queda/i, /no tengo claro/i,
    /no lo veo claro/i, /no lo pillo/i,
    /estoy perdid[oa]/i, /me perd[ií]/i,
    /no le veo sentido/i, /no tiene sentido/i, /no me cuadra/i,
    /estoy bloquead[oa]/i, /no me sale/i,
];

export const FRUSTRATION_PATTERNS = [
    /esto es dif[ií]cil/i, /no le encuentro sentido/i,
    /muy complicado/i, /súper complicad/i,
    /imposible/i, /es imposible/i,
    /no puedo/i, /no puedo más/i, /ya no puedo/i,
    /ya intent[ée]/i, /ya lo intent[ée]/i,
    /no veo c[oó]mo/i, /frustrante/i, /frustrad[oa]/i,
    /me frustra/i, /esto me frustra/i,
    /no me sale/i, /no me da/i,
    /estoy hart[oa]/i, /ya me cans[ée]/i,
    /tirar la toalla/i, /me rindo/i, /rendirme/i,
    /no puedo con esto/i, /no doy m[aá]s/i,
];

export const CURIOSITY_PATTERNS = [
    /me pregunto/i, /me estoy preguntando/i,
    /ser[aá] que/i, /será que/i,
    /por qu[eé]/i, /porque/i, /por qué razón/i,
    /c[oó]mo/i, /de qué manera/i, /de qué forma/i,
    /qu[eé] pasa si/i, /y si/i, /cu[aá]l ser[ií]a/i,
    /interesante/i, /es interesante/i, /muy interesante/i,
    /curioso/i, /qué curioso/i,
    /quisiera saber/i, /me gustaría saber/i,
    /tengo curiosidad/i, /me da curiosidad/i,
    /me llama la atención/i, /qué pasaría si/i,
    /cómo funcionaría/i, /cuál sería el resultado/i,
    /investigar/i, /explorar/i, /profundizar/i,
    /saber más/i, /conocer más/i,
];

export const INSIGHT_PATTERNS = [
    /creo que/i, /pienso que/i, /me parece que/i,
    /opino que/i, /considero que/i,
    /tal vez/i, /quizá/i, /quizás/i,
    /podr[ií]a ser/i, /podría ser/i,
    /esto se relaciona con/i, /esto me recuerda/i, /me recuerda a/i,
    /similar a/i, /parecido a/i, /se parece a/i,
    /conecta con/i, /está conectado con/i,
    /entiendo que/i, /ahora entiendo/i,
    /ah[aá],?\s/i, /¡ah!/i, /ya veo/i, /ahora veo/i,
    /tiene sentido/i, /ahora tiene sentido/i, /¡claro!/i,
    /exacto/i, /eso es/i, /tiene lógica/i, /es lógico/i,
    /como si/i, /analogía/i, /comparar/i, /comparando/i,
    /igual que/i, /lo mismo que/i, /es como/i, /equivalente a/i,
];

export function detectStudentNeeds(prompt) {
    const p = (prompt || '').toLowerCase();

    // Scoring con constantes pre-compiladas (definidas fuera del componente)
    const getScore = (patterns) => patterns.reduce((s, rx) => s + (rx.test(p) ? 1 : 0), 0);

    const confusionScore = getScore(CONFUSION_PATTERNS);
    const frustrationScore = getScore(FRUSTRATION_PATTERNS);
    const curiosityScore = getScore(CURIOSITY_PATTERNS);
    const insightScore = getScore(INSIGHT_PATTERNS);

    // H4 FIX: Usar umbral >= 2 para curiosity (evita falsos positivos
    // de patrones demasiado amplios como /cómo/i, /por qué/i) y
    // priorizar insight cuando ambos puntúan.
    const curiosityActive = curiosityScore >= 2;
    const insightActive = insightScore > 0;

    return {
        confusion: confusionScore > 0,
        frustration: frustrationScore > 0,
        // Si hay insight real, priorizarlo sobre curiosity genérica
        curiosity: curiosityActive && !insightActive,
        insight: insightActive,
        _scores: {
            confusion: confusionScore,
            frustration: frustrationScore,
            curiosity: curiosityScore,
            insight: insightScore
        }
    };
}
