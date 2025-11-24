
import { z } from 'zod';

// Definimos el esquema para el análisis de texto que esperamos de las APIs de IA.
// Ahora más permisivo con valores por defecto
export const analysisSchema = z.object({
  resumen: z.string().default('Análisis en proceso'),
  ideasPrincipales: z.array(z.string()).default([]),
  analisisEstilistico: z.object({
    tono: z.string().default('neutral'),
    sentimiento: z.string().default('neutral'),
    estilo: z.string().default('informativo'),
    publicoObjetivo: z.string().default('general'),
  }).default({
    tono: 'neutral',
    sentimiento: 'neutral',
    estilo: 'informativo',
    publicoObjetivo: 'general'
  }),
  preguntasReflexion: z.array(z.string()).default([]),
  vocabulario: z.array(z.object({
    palabra: z.string(),
    definicion: z.string(),
  })).default([]),
  complejidad: z.string().default('intermedio'),
  temas: z.array(z.string()).default([]),
});

// Esquema para notas de estudio
export const notesSchema = z.object({
  resumen: z.string().min(1),
  notas: z.array(z.object({
    titulo: z.string().min(1),
    contenido: z.string().min(1)
  })).min(1),
  preguntas: z.array(z.string()).min(1),
  tarjetas: z.array(z.object({
    frente: z.string().min(1),
    reverso: z.string().min(1)
  })).min(1)
});
