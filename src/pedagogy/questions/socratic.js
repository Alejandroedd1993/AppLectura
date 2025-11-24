function baseQuestions(dimension) {
  switch (dimension) {
    case 'comprensionAnalitica':
      return [
        '¿Cómo parafrasearías la tesis central con tus propias palabras?',
        '¿Qué evidencia textual respalda esa idea? Cítala.',
        '¿Qué partes son centrales y cuáles secundarias? ¿Por qué?'
      ];
    case 'acd':
      return [
        '¿Qué perspectiva o interés crees que guía al autor? ¿En qué te basas?',
        '¿Qué voces se incluyen y cuáles podrían estar silenciadas?',
        '¿Qué elecciones léxicas o metáforas influyen en la interpretación?'
      ];
    case 'contextualizacion':
      return [
        '¿En qué debate social o político situarías este texto?',
        '¿Qué evento o proceso histórico podría haberlo influido?',
        '¿Qué consecuencias busca o podría tener en la sociedad?'
      ];
    case 'argumentacion':
      return [
        '¿Cuál es tu postura y qué evidencias del texto la sostienen?',
        '¿Qué objeciones preverías y cómo las responderías?',
        '¿Qué contraejemplo pondría a prueba tu argumento?'
      ];
    default:
      return [
        '¿Qué idea principal extraes del texto y con qué cita la sustentas?',
        '¿Qué asumió el autor que no dijo explícitamente?',
        '¿Qué información falta para una comprensión más completa?'
      ];
  }
}

function generateSocraticQuestions({ dimension, anchors = [], max = 5 }) {
  const qs = baseQuestions(dimension);
  const questions = qs.slice(0, max).map((q, i) => {
    const a = anchors[i % Math.max(anchors.length, 1)];
    if (a && anchors.length) {
      const anchoredQuestion = `${q} (Referencia: "${a.cita}" párrafo ${a.parrafo})`;
      return { question: q, anchor: { quote: a.cita, paragraph: a.parrafo }, anchoredQuestion };
    }
    return { question: q };
  });
  return { dimension, questions };
}

// Heurística simple para evaluar complejidad de respuesta
function assessResponseQuality(response = '') {
  const r = String(response || '');
  const lengthScore = Math.min(1, r.length / 180); // >180 chars se considera completo
  const quoteScore = /(\"|"|“|”).+?(\"|"|“|”)/.test(r) ? 1 : 0; // cita
  const causalScore = /(porque|ya que|debido a|por lo tanto|aunque)/i.test(r) ? 1 : 0.5;
  const nuanceScore = /(sin embargo|no obstante|aunque)/i.test(r) ? 1 : 0.5;
  const raw = (lengthScore * 3 + quoteScore * 2 + causalScore * 2 + nuanceScore * 2) / 9 * 10;
  const score = Math.round(raw);
  const level = score >= 8 ? 'avanzada' : score >= 5 ? 'intermedia' : 'basica';
  return { score, level };
}

module.exports = { generateSocraticQuestions, assessResponseQuality };
