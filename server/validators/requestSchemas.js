import { z } from 'zod';

const providerSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.trim().toLowerCase();
}, z.enum(['openai', 'deepseek', 'gemini']));

const analysisProviderSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.trim().toLowerCase();
}, z.enum(['openai', 'gemini', 'deepseek', 'smart', 'alternate', 'debate']));

const chatRoleSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.trim().toLowerCase();
}, z.enum(['system', 'user', 'assistant']));

const trimmedNonEmptyString = (message) => z.string({ required_error: message }).trim().min(1, message);

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).optional());

export const chatCompletionRequestSchema = z.object({
  provider: providerSchema.default('deepseek'),
  model: optionalTrimmedString,
  messages: z.array(z.object({
    role: chatRoleSchema,
    content: trimmedNonEmptyString('Cada mensaje debe incluir contenido no vacio.')
  })).min(1, 'Debes enviar al menos un mensaje en la conversacion.'),
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  max_tokens: z.coerce.number().int().positive().default(1200),
  stream: z.coerce.boolean().default(false),
  response_format: z.any().optional(),
  apiKey: z.any().optional()
}).passthrough();

export const analysisTextRequestSchema = z.object({
  texto: trimmedNonEmptyString('Por favor proporciona un texto para analizar.'),
  api: analysisProviderSchema.default('smart')
}).passthrough();

export const preLectureRequestSchema = z.object({
  text: z.string({ required_error: 'Debes enviar un texto mas extenso para el analisis de prelectura.' }).trim().min(100, 'Debes enviar un texto mas extenso para el analisis de prelectura.'),
  metadata: z.record(z.any()).optional().default({})
}).passthrough();

export const glossaryRequestSchema = z.object({
  text: z.string({ required_error: 'Se requieren al menos 200 caracteres para generar glosario.' }).trim().min(200, 'Se requieren al menos 200 caracteres para generar glosario.'),
  maxTerms: z.coerce.number().int().min(1).max(20).default(6)
}).passthrough();

export const notesGenerateRequestSchema = z.object({
  texto: trimmedNonEmptyString('Proporciona texto para generar notas'),
  api: providerSchema.default('openai'),
  contexto: z.record(z.any()).nullable().optional(),
  nivelAcademico: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  }, z.enum(['secundaria', 'pregrado', 'posgrado', 'doctorado']).default('pregrado')),
  tipoTexto: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  }, z.enum(['auto', 'narrativo', 'poetico', 'filosofico', 'ensayo']).default('auto')),
  numeroTarjetas: z.coerce.number().int().min(1).max(50).optional()
}).passthrough();

export const assessmentEvaluateRequestSchema = z.object({
  texto: z.string({ required_error: 'Incluye un texto base suficiente para poder evaluar la respuesta.' }).trim().min(50, 'Incluye un texto base suficiente para poder evaluar la respuesta.').transform((value) => value.slice(0, 10000)),
  respuesta: z.string({ required_error: 'Incluye una respuesta suficiente para poder evaluarla.' }).trim().min(20, 'Incluye una respuesta suficiente para poder evaluarla.').transform((value) => value.slice(0, 5000)),
  dimension: trimmedNonEmptyString('Debes indicar la dimension que deseas evaluar.').transform((value) => value.toLowerCase()),
  provider: optionalTrimmedString,
  validationMetadata: z.record(z.any()).optional()
}).passthrough();

export const assessmentComprehensiveRequestSchema = z.object({
  texto: z.string({ required_error: 'Incluye un texto mas extenso para la evaluacion comprehensiva.' }).trim().min(200, 'Incluye un texto mas extenso para la evaluacion comprehensiva.').transform((value) => value.slice(0, 15000)),
  respuesta: z.string({ required_error: 'Incluye una respuesta mas desarrollada para la evaluacion comprehensiva.' }).trim().min(100, 'Incluye una respuesta mas desarrollada para la evaluacion comprehensiva.').transform((value) => value.slice(0, 8000)),
  provider: optionalTrimmedString
}).passthrough();

const bulkAssessmentItemSchema = z.object({
  texto: z.string({ required_error: 'Cada item debe incluir un texto base valido.' }).trim().min(50, 'Cada item debe incluir un texto base valido.').transform((value) => value.slice(0, 10000)),
  respuesta: z.string({ required_error: 'Cada item debe incluir una respuesta valida.' }).trim().min(20, 'Cada item debe incluir una respuesta valida.').transform((value) => value.slice(0, 5000)),
  dimension: trimmedNonEmptyString('Cada item debe incluir una dimension.').transform((value) => value.toLowerCase()),
  provider: optionalTrimmedString,
  idioma: optionalTrimmedString
}).passthrough();

export const assessmentBulkRequestSchema = z.object({
  items: z.array(bulkAssessmentItemSchema).min(1, 'Proporciona al menos una evaluacion para procesar.').max(10, 'Reduce la cantidad de evaluaciones enviadas en una sola solicitud.')
}).passthrough();

export const webSearchRequestSchema = z.object({
  query: trimmedNonEmptyString('Debes proporcionar una consulta para realizar la busqueda web.'),
  type: optionalTrimmedString,
  maxResults: z.coerce.number().int().min(1).max(10).default(5)
}).passthrough();

export const webSearchAnswerRequestSchema = z.object({
  query: trimmedNonEmptyString('Debes proporcionar una consulta para generar la respuesta con IA.'),
  type: optionalTrimmedString,
  maxResults: z.coerce.number().int().min(1).max(10).default(5),
  provider: z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  }, z.enum(['openai', 'deepseek', 'smart']).default('smart'))
}).passthrough();

export const storageProxyQuerySchema = z.object({
  url: z.string({ required_error: 'Debes enviar el parametro url para recuperar el archivo.' }).url('La URL solicitada no tiene un formato valido.')
}).passthrough();

export const adminCleanupEnqueueRequestSchema = z.object({
  courseId: trimmedNonEmptyString('Debes indicar el curso para la limpieza administrativa.'),
  studentUid: trimmedNonEmptyString('Debes indicar el estudiante para la limpieza administrativa.'),
  reason: optionalTrimmedString,
  processNow: z.coerce.boolean().default(true)
}).passthrough();

export const adminCleanupRunPendingRequestSchema = z.object({
  maxJobs: z.coerce.number().int().min(1).max(100).default(20)
}).passthrough();