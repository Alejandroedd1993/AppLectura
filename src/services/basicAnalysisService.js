import logger from '../utils/logger';
import { buildEdgeFingerprint, hashStringDjb2 } from '../utils/hash';


/**
 * 🆕 A1 FIX: Servicio de Análisis Básico Local
 * Genera análisis preliminar instantáneo usando heurísticas
 * Permite mostrar resultados inmediatos mientras DeepSeek procesa
 * 
 * @module basicAnalysisService
 */

/**
 * Detecta el género textual basado en patrones léxicos
 */
function detectGenre(text) {
    const lower = text.toLowerCase();
    const patterns = {
        'Artículo periodístico': ['según', 'fuentes', 'declaró', 'informó', 'reportó'],
        'Ensayo académico': ['hipótesis', 'conclusión', 'metodología', 'análisis', 'estudio'],
        'Texto argumentativo': ['en primer lugar', 'por lo tanto', 'en consecuencia', 'se concluye'],
        'Texto narrativo': ['había una vez', 'entonces', 'después', 'finalmente', 'personaje'],
        'Texto expositivo': ['consiste en', 'se define como', 'se caracteriza por', 'ejemplo de'],
        'Texto científico': ['experimento', 'resultados', 'muestra', 'variables', 'hipótesis']
    };

    let maxScore = 0;
    let detectedGenre = 'Texto general';

    for (const [genre, keywords] of Object.entries(patterns)) {
        const score = keywords.filter(k => lower.includes(k)).length;
        if (score > maxScore) {
            maxScore = score;
            detectedGenre = genre;
        }
    }

    return detectedGenre;
}

/**
 * Detecta la tipología textual
 */
function detectTypology(text) {
    const lower = text.toLowerCase();

    // Contadores de indicadores
    const argumentative = ['porque', 'ya que', 'por lo tanto', 'en consecuencia', 'sin embargo', 'aunque'].filter(k => lower.includes(k)).length;
    const narrative = ['después', 'entonces', 'luego', 'finalmente', 'mientras', 'cuando'].filter(k => lower.includes(k)).length;
    const expository = ['es decir', 'por ejemplo', 'consiste en', 'se define', 'significa'].filter(k => lower.includes(k)).length;
    const descriptive = ['tiene', 'presenta', 'muestra', 'posee', 'caracteriza'].filter(k => lower.includes(k)).length;

    const scores = {
        'Argumentativo': argumentative,
        'Narrativo': narrative,
        'Expositivo': expository,
        'Descriptivo': descriptive
    };

    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Calcula el nivel de complejidad del texto
 */
function calculateComplexity(text) {
    // Métricas básicas
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / Math.max(1, sentences.length);
    const avgWordLength = words.reduce((acc, w) => acc + w.length, 0) / Math.max(1, words.length);

    // Palabras técnicas/académicas (simplificado)
    const technicalPatterns = /\b(metodología|epistemología|paradigma|fenomenología|hermenéutica|ontología|axiología|heurística|semántica|pragmática|sintaxis|morfología|lexicología)\b/gi;
    const technicalCount = (text.match(technicalPatterns) || []).length;

    // Puntuación
    let score = 0;
    if (avgWordsPerSentence > 25) score += 2;
    else if (avgWordsPerSentence > 15) score += 1;

    if (avgWordLength > 6) score += 2;
    else if (avgWordLength > 5) score += 1;

    if (technicalCount > 5) score += 2;
    else if (technicalCount > 2) score += 1;

    if (score >= 4) return 'Avanzado';
    if (score >= 2) return 'Intermedio';
    return 'Básico';
}

/**
 * Detecta el registro lingüístico
 */
function detectRegister(text) {
    const lower = text.toLowerCase();

    // Indicadores de formalidad
    const formalIndicators = ['usted', 'señor', 'mediante', 'asimismo', 'no obstante', 'cabe destacar'].filter(k => lower.includes(k)).length;
    const informalIndicators = ['tú', 'bueno', 'pues', 'ok', 'vale', 'genial', 'super'].filter(k => lower.includes(k)).length;
    const technicalIndicators = ['según', 'conforme a', 'de acuerdo con', 'véase', 'cfr.', 'ibíd'].filter(k => lower.includes(k)).length;

    if (technicalIndicators > 2 || formalIndicators > 3) return 'Técnico-formal';
    if (formalIndicators > informalIndicators) return 'Formal';
    if (informalIndicators > formalIndicators) return 'Informal';
    return 'Neutro';
}

/**
 * Extrae el primer párrafo significativo como tesis preliminar
 */
function extractFirstParagraph(text) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
    if (paragraphs.length === 0) return text.substring(0, 200) + '...';

    const first = paragraphs[0].trim();
    if (first.length > 300) {
        return first.substring(0, 300) + '...';
    }
    return first;
}

/**
 * Extrae palabras clave básicas del texto
 */
function extractBasicKeywords(text, count = 5) {
    // Stopwords en español
    const stopwords = new Set([
        'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
        'con', 'no', 'una', 'su', 'al', 'es', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya',
        'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también',
        'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno',
        'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes'
    ]);

    const words = text.toLowerCase()
        .replace(/[^\wáéíóúñü\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4 && !stopwords.has(w));

    // Contar frecuencias
    const freq = {};
    words.forEach(w => {
        freq[w] = (freq[w] || 0) + 1;
    });

    // Ordenar por frecuencia y tomar top N
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([word]) => word);
}

/**
 * Genera un ID único basado en el contenido del texto
 */
function generateDocId(text) {
    const fingerprint = buildEdgeFingerprint(text, {
        headChars: 100,
        tailChars: 100,
        includeLength: true,
        separator: ''
    });
    const hash = hashStringDjb2(fingerprint, {
        mode: 'absolute',
        radix: 10,
        emptyValue: '0'
    });
    return `basic_${hash}_${text.length}`;
}

/**
 * 🎯 FUNCIÓN PRINCIPAL: Genera análisis básico instantáneo
 * @param {string} text - Texto a analizar
 * @returns {object} Análisis preliminar estructurado
 */
export function generateBasicAnalysis(text) {
    if (!text || text.trim().length < 100) {
        return null;
    }

    logger.log('⚡ [BasicAnalysis] Generando análisis preliminar local...');
    const startTime = Date.now();

    const genre = detectGenre(text);
    const typology = detectTypology(text);
    const complexity = calculateComplexity(text);
    const register = detectRegister(text);
    const thesis = extractFirstParagraph(text);
    const keywords = extractBasicKeywords(text, 5);

    const analysis = {
        prelecture: {
            metadata: {
                genero_textual: genre,
                proposito_comunicativo: 'Análisis en progreso...',
                tipologia_textual: typology,
                autor: null,
                fecha_texto: null,
                web_enriched: false
            },
            argumentation: {
                tesis_central: thesis,
                hipotesis_secundarias: [],
                tipo_argumentacion: 'Pendiente análisis profundo...',
                tipo_razonamiento: null,
                argumentos_principales: []
            },
            linguistics: {
                tipo_estructura: 'Pendiente análisis profundo...',
                coherencia_cohesion: null,
                registro_linguistico: register,
                nivel_complejidad: complexity,
                figuras_retoricas: []
            },
            web_sources: [],
            web_summary: null
        },
        critical: {
            resumen: 'Análisis detallado en progreso. Los resultados completos estarán disponibles en breve.',
            temas_principales: keywords,
            palabras_clave: keywords,
            contexto_critico: {
                genero_textual: genre,
                complejidad_critica: complexity === 'Avanzado' ? 'Alta' : complexity === 'Intermedio' ? 'Media' : 'Baja',
                voces_representadas: [],
                voces_silenciadas: [],
                marcadores_criticos: {},
                ideologia_subyacente: null,
                contraste_web: null
            }
        },
        metadata: {
            document_id: generateDocId(text),
            analysis_timestamp: new Date().toISOString(),
            processing_time_ms: Date.now() - startTime,
            web_enriched: false,
            provider: 'basic-local',
            version: '1.0-heuristic',
            text_length: text.length,
            _isPreliminary: true  // 🆕 Flag para indicar que es análisis parcial
        }
    };

    logger.log(`✅ [BasicAnalysis] Análisis preliminar generado en ${Date.now() - startTime}ms`);
    logger.log(`   Género: ${genre}, Tipología: ${typology}, Complejidad: ${complexity}`);

    return analysis;
}

/**
 * Combina análisis básico con análisis profundo
 * @param {object} basic - Análisis básico (preliminar)
 * @param {object} deep - Análisis profundo (DeepSeek)
 * @returns {object} Análisis combinado
 */
export function mergeAnalysis(basic, deep) {
    if (!deep || !deep.prelecture) {
        logger.warn('⚠️ [BasicAnalysis] Análisis profundo inválido, retornando básico');
        return basic;
    }

    logger.log('🔀 [BasicAnalysis] Combinando análisis básico con profundo...');

    // El análisis profundo tiene prioridad, pero preservamos algunos datos del básico si faltan
    const merged = {
        ...deep,
        metadata: {
            ...deep.metadata,
            _isPreliminary: false,  // Ya no es preliminar
            _mergedFrom: 'basic+deep'
        }
    };

    return merged;
}

export default {
    generateBasicAnalysis,
    mergeAnalysis
};
