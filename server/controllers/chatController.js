

const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generarPregunta = async (req, res) => {
  const { texto, nivelPregunta } = req.body;

  if (!texto || !nivelPregunta) {
    return res.status(400).json({ error: 'El texto y el nivel de la pregunta son requeridos.' });
  }

  const sistemaPregunta = {
      literal: {
        prompt: `Como tutor de lectura, analiza este texto y genera UNA pregunta literal (información explícita) que ayude al estudiante a comprender los datos básicos del texto. \n\nTexto: "${texto}"\n\nGenera solo UNA pregunta literal clara y específica sobre información que aparece directamente en el texto. La pregunta debe ayudar a desarrollar habilidades de comprensión básica.`,
        siguiente: 'inferencial'
      },
      inferencial: {
        prompt: `Como tutor de lectura, analiza este texto y genera UNA pregunta inferencial que requiera que el estudiante deduzca información no explícita.\n\nTexto: "${texto}"\n\nGenera solo UNA pregunta inferencial que requiera análisis y deducción, ayudando al estudiante a desarrollar pensamiento crítico. La pregunta debe requerir que el estudiante "lea entre líneas".`,
        siguiente: 'critico-valorativo'
      },
      'critico-valorativo': {
        prompt: `Como tutor de lectura que fomenta la literacidad crítica, analiza este texto y genera UNA pregunta crítico-valorativa que invite a la reflexión personal considerando contextos sociales, políticos y culturales.\n\nTexto: "${texto}"\n\nGenera solo UNA pregunta que requiera reflexión personal, evaluación crítica y consideración del contexto social/político/cultural del texto. Esta pregunta debe desarrollar el pensamiento crítico y la literacidad crítica del estudiante.`,
        siguiente: 'literal'
      }
    };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
          {
            role: 'system',
            content: `Eres un tutor especializado en comprensión lectora y literacidad crítica. Tu objetivo es ayudar a estudiantes a desarrollar habilidades de lectura crítica a través de preguntas progresivas. \n\nIMPORTANTE: \n- Responde SOLO con la pregunta, sin explicaciones adicionales\n- Las preguntas deben ser claras y apropiadas para el nivel educativo\n- Fomenta el pensamiento crítico y la reflexión personal\n- Considera siempre el contexto social, político y cultural cuando sea relevante`
          },
          {
            role: 'user',
            content: sistemaPregunta[nivelPregunta].prompt
          }
        ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const pregunta = response.choices[0].message.content.trim();
    res.json({ pregunta });

  } catch (error) {
    console.error('Error al generar pregunta:', error);
    res.status(500).json({ error: 'Error al generar la pregunta.' });
  }
};

const evaluarRespuesta = async (req, res) => {
  const { texto, nivelPregunta, preguntaActual, respuesta } = req.body;

  if (!texto || !nivelPregunta || !preguntaActual || !respuesta) {
    return res.status(400).json({ error: 'Faltan parámetros para la evaluación.' });
  }

  try {
    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Eres un tutor especializado en evaluación de comprensión lectora. Evalúa las respuestas de los estudiantes considerando:\n\n1. Calidad del contenido (precisión, relevancia)\n2. Profundidad del análisis\n3. Coherencia y claridad\n4. Ortografía y sintaxis\n5. Pensamiento crítico (para preguntas inferenciales y crítico-valorativas)\n\nProporciona:\n- Una puntuación del 1 al 10\n- Retroalimentación constructiva y motivadora\n- Sugerencias para mejorar si es necesario\n\nFormato de respuesta:\nPUNTUACIÓN: [número]\nRETROALIMENTACIÓN: [comentario constructivo]`
          },
          {
            role: 'user',
            content: `Texto original: "${texto}"\n            \nPregunta (nivel ${nivelPregunta}): "${preguntaActual}"\n\nRespuesta del estudiante: "${respuesta}"\n\nEvalúa esta respuesta considerando el nivel de la pregunta y proporciona retroalimentación constructiva.`
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const evaluacion = response.choices[0].message.content;
      const puntuacionMatch = evaluacion.match(/PUNTUACIÓN:\s*(\d+)/);
      const retroalimentacionMatch = evaluacion.match(/RETROALIMENTACIÓN:\s*(.*)/s);

      res.json({
        puntuacion: puntuacionMatch ? parseInt(puntuacionMatch[1]) : 5,
        retroalimentacion: retroalimentacionMatch ? retroalimentacionMatch[1].trim() : evaluacion
      });

  } catch (error) {
    console.error('Error al evaluar respuesta:', error);
    res.status(500).json({ error: 'Error al evaluar la respuesta.' });
  }
};

module.exports = { generarPregunta, evaluarRespuesta };
