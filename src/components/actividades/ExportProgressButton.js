import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { exportGenericPDF } from '../../utils/exportUtils';
import {
  buildProgressSnapshot,
  RUBRIC_PROGRESS_META,
  formatRubricAttemptDisplay,
  formatSnapshotDate
} from '../../services/progressSnapshot';
import logger from '../../utils/logger';

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ExportButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: ${props => props.$format === 'csv' ? props.theme.success : props.theme.primary};
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
`;

const Modal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled(motion.div)`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  padding: 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    color: ${props => props.theme.textPrimary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  p {
    margin: 0 0 1.5rem 0;
    color: ${props => props.theme.textSecondary};
    line-height: 1.6;
  }

  .buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  &.primary {
    background: ${props => props.theme.success};
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 150, 136, 0.3);
    }
  }

  &.secondary {
    background: transparent;
    color: ${props => props.theme.textPrimary};
    border: 2px solid ${props => props.theme.border};

    &:hover {
      background: ${props => props.theme.background};
    }
  }
`;

const RUBRIC_CONTENT_KEYS = Object.fromEntries(
  Object.entries(RUBRIC_PROGRESS_META).map(([rubricId, meta]) => [rubricId, meta?.artifactKey])
);

export const CSV_HEADERS = [
  'Fecha y Hora',
  'Artefacto',
  'Estado',
  'Puntuacion (sobre 10)',
  'Nivel Alcanzado (1-4)',
  'Descripcion del Nivel',
  'Intento o registro'
];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toMillis(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?.toDate === 'function') {
    return value.toDate().getTime();
  }
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000;
  }
  return 0;
}

function formatExportDate(value, locale = 'es-ES') {
  const millis = toMillis(value);
  return millis ? new Date(millis).toLocaleString(locale) : 'Sin fecha';
}

function formatAttemptExportValue(rubric) {
  return formatRubricAttemptDisplay(rubric, { legacyLabel: 'Sin registro legacy' });
}

function getArtifactName(rubricId, explicitName) {
  return explicitName || RUBRIC_PROGRESS_META[rubricId]?.artifactName || rubricId;
}

function buildAggregateExportRow(rubric, nivelDescripcion) {
  const artifactScore = toNumber(rubric?.artifactData?.teacherOverrideScore) ||
    toNumber(rubric?.artifactData?.score) ||
    toNumber(rubric?.artifactData?.lastScore);
  const hasAggregateState = rubric.isPendingReview || rubric.summativeAttempted || artifactScore > 0;

  if (!hasAggregateState) return null;

  let estado = rubric.currentStatusLabel;
  if (rubric.isPendingReview) {
    const sumStatus = String(rubric?.summative?.status || '').toLowerCase();
    estado = sumStatus === 'submitted'
      ? 'Sumativo esperando revisión'
      : 'Artefacto esperando revisión';
  } else if (rubric.summativeAttempted && rubric.summativeScore > 0) {
    estado = 'Evaluacion sumativa';
  } else if (toNumber(rubric?.artifactData?.teacherOverrideScore) > 0) {
    estado = 'Override docente vigente';
  } else if (artifactScore > 0) {
    estado = 'Artefacto evaluado';
  }

  const rank = rubric.scoreBand?.rank || '';
  const rankDescription = rank ? (nivelDescripcion[rank] || rubric.badgeLabel) : rubric.badgeLabel;

  return {
    sortTime: toMillis(rubric.lastActivityAt),
    values: [
      formatExportDate(rubric.lastActivityAt),
      getArtifactName(rubric.rubricId, rubric.artifactName),
      estado,
      rubric.effectiveScore > 0
        ? rubric.effectiveScore.toFixed(2)
        : (rubric.isPendingReview ? 'Esperando revisión' : 'Sin nota'),
      rank,
      rankDescription,
      formatAttemptExportValue(rubric)
    ]
  };
}

export function buildCsvRows(snapshot) {
  const nivelDescripcion = {
    1: 'Novato - Inicio del proceso',
    2: 'Aprendiz - En progreso',
    3: 'Competente - Satisfactorio',
    4: 'Experto - Excelente'
  };

  const rows = [];

  snapshot.rubrics.forEach((rubric) => {
    if (rubric.formativeScores.length > 0) {
      rubric.formativeScores.forEach((score, index) => {
        const numericScore = toNumber(score.score);
        const nivel = score.nivel || Math.ceil(numericScore / 2.5);
        const rowTime = toMillis(score.timestamp) || toMillis(rubric.lastActivityAt);
        rows.push({
          sortTime: rowTime,
          values: [
            formatExportDate(rowTime),
            getArtifactName(rubric.rubricId, rubric.artifactName),
            'Evaluacion formativa',
            numericScore.toFixed(2),
            nivel,
            nivelDescripcion[nivel] || 'Evaluacion formativa',
            index + 1
          ]
        });
      });

      const aggregateRow = buildAggregateExportRow(rubric, nivelDescripcion);
      if (aggregateRow) {
        rows.push(aggregateRow);
      }
      return;
    }

    if (!rubric.started) return;

    const aggregateRow = buildAggregateExportRow(rubric, nivelDescripcion);
    if (aggregateRow) {
      rows.push(aggregateRow);
      return;
    }

    rows.push({
      sortTime: toMillis(rubric.lastActivityAt),
      values: [
        formatExportDate(rubric.lastActivityAt),
        getArtifactName(rubric.rubricId, rubric.artifactName),
        rubric.currentStatusLabel,
        rubric.effectiveScore > 0
          ? rubric.effectiveScore.toFixed(2)
          : (rubric.isPendingReview ? 'Esperando revisión' : 'Sin nota'),
        rubric.scoreBand?.rank || '',
        rubric.badgeLabel,
        formatAttemptExportValue(rubric)
      ]
    });
  });

  return rows.sort((a, b) => b.sortTime - a.sortTime);
}

export default function ExportProgressButton({
  rubricProgress,
  progressSnapshot = null,
  studentName: _studentName = 'estudiante',
  documentId = null,
  tutorInteractions = [],
  savedCitations = [],
  lectureId = null,
  sourceCourseId = null
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [format, setFormat] = useState('csv');

  const snapshot = useMemo(() => (
    progressSnapshot || buildProgressSnapshot({ rubricProgress, lectureId })
  ), [progressSnapshot, rubricProgress, lectureId]);

  const safeDocumentId = documentId || lectureId || 'documento';
  const hasData = snapshot.hasData;

  const loadArtefactosContent = () => {
    const content = {};
    const key = lectureId || 'global';
    const scopedKey = sourceCourseId ? `${sourceCourseId}_${key}` : key;
    const courseScope = sourceCourseId ? `${sourceCourseId}::` : '';

    try {
      const resumenData = localStorage.getItem(`activity_resumen_academico_${scopedKey}`) ||
        (!sourceCourseId ? localStorage.getItem(`activity_resumen_academico_${key}`) : null);
      if (resumenData) {
        const parsed = JSON.parse(resumenData);
        content.resumenAcademico = parsed.student_answers?.resumen || '';
      }
    } catch (error) {
      logger.warn('Error loading resumenAcademico', error);
    }

    try {
      const acdData = localStorage.getItem(`activity_tabla_acd_${scopedKey}`) ||
        (!sourceCourseId ? localStorage.getItem(`activity_tabla_acd_${key}`) : null);
      if (acdData) {
        const parsed = JSON.parse(acdData);
        content.tablaACD = {
          marcoIdeologico: parsed.student_answers?.marco_ideologico || '',
          estrategiasRetoricas: parsed.student_answers?.estrategias_retoricas || '',
          vocesPresentes: parsed.student_answers?.voces_presentes || '',
          vocesSilenciadas: parsed.student_answers?.voces_silenciadas || ''
        };
      }
    } catch (error) {
      logger.warn('Error loading tablaACD', error);
    }

    try {
      const mapaData = localStorage.getItem(`activity_mapa_actores_${scopedKey}`) ||
        (!sourceCourseId ? localStorage.getItem(`activity_mapa_actores_${key}`) : null);
      if (mapaData) {
        const parsed = JSON.parse(mapaData);
        content.mapaActores = {
          actores: parsed.student_answers?.actores || '',
          contextoHistorico: parsed.student_answers?.contexto_historico || '',
          conexiones: parsed.student_answers?.conexiones || '',
          consecuencias: parsed.student_answers?.consecuencias || ''
        };
      }
    } catch (error) {
      logger.warn('Error loading mapaActores', error);
    }

    try {
      const respData = localStorage.getItem(`activity_respuesta_argumentativa_${scopedKey}`) ||
        (!sourceCourseId ? localStorage.getItem(`activity_respuesta_argumentativa_${key}`) : null);
      if (respData) {
        const parsed = JSON.parse(respData);
        content.respuestaArgumentativa = {
          tesis: parsed.student_answers?.tesis || '',
          evidencias: parsed.student_answers?.evidencias || '',
          contraargumento: parsed.student_answers?.contraargumento || '',
          refutacion: parsed.student_answers?.refutacion || ''
        };
      }
    } catch (error) {
      logger.warn('Error loading respuestaArgumentativa', error);
    }

    try {
      const bitacoraData = localStorage.getItem(`activity_bitacora_etica_ia_${scopedKey}`) ||
        (!sourceCourseId ? localStorage.getItem(`activity_bitacora_etica_ia_${key}`) : null);
      const reflexionesData = localStorage.getItem(`ethicalReflections:${courseScope}${key}`) ||
        (!sourceCourseId ? localStorage.getItem(`ethicalReflections:${key}`) : null);

      content.bitacoraEticaIA = {};
      if (bitacoraData) {
        const parsed = JSON.parse(bitacoraData);
        const answers = parsed.student_answers || {};
        content.bitacoraEticaIA = {
          verificacionFuentes: answers.verificacionFuentes || answers.verificacion_fuentes || '',
          procesoUsoIA: answers.procesoUsoIA || answers.proceso_uso_ia || '',
          reflexionEtica: answers.reflexionEtica || answers.reflexion_etica || '',
          declaraciones: answers.declaraciones || []
        };
      }

      if (reflexionesData) {
        const reflexiones = JSON.parse(reflexionesData);
        content.bitacoraEticaIA = {
          ...content.bitacoraEticaIA,
          verificacionFuentes: reflexiones.verificacionFuentes || content.bitacoraEticaIA.verificacionFuentes || '',
          procesoUsoIA: reflexiones.procesoUsoIA || content.bitacoraEticaIA.procesoUsoIA || '',
          reflexionEtica: reflexiones.reflexionEtica || content.bitacoraEticaIA.reflexionEtica || '',
          declaraciones: reflexiones.declaraciones || content.bitacoraEticaIA.declaraciones || []
        };
      }
    } catch (error) {
      logger.warn('Error loading bitacoraEticaIA', error);
    }

    return content;
  };

  const handleExport = (selectedFormat) => {
    if (!hasData) return;

    if (selectedFormat === 'csv') {
      exportCSV();
    } else {
      exportPDF();
    }

    setShowConfirm(false);
  };

  const exportCSV = () => {
    const rows = buildCsvRows(snapshot);
    const titleRow = `"Historial de Evaluaciones - Exportado: ${new Date().toLocaleString('es-ES')}"`;
    const csv = [titleRow, CSV_HEADERS.map(h => `"${h}"`).join(','), ...rows
      .map(row => row.values.map(cell => `"${cell}"`).join(','))]
      .join('\n');

    downloadFile(`\uFEFF${csv}`, `progreso_${safeDocumentId}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
  };

  const exportPDF = async () => {
    const artefactosContent = loadArtefactosContent();
    const legacyEvidenceCount = snapshot.rubrics.filter((rubric) => rubric.hasLegacyScoreOnlyEvidence).length;

    const rows = snapshot.rubrics.map((rubric) => {
      const bestScore = rubric.bestRecordedScore > 0 ? rubric.bestRecordedScore : rubric.effectiveScore;
      const levelLabel = rubric.scoreBand?.rank
        ? `${rubric.scoreBand.rank} (${rubric.badgeLabel})`
        : rubric.badgeLabel;

      return [
        getArtifactName(rubric.rubricId, rubric.artifactName),
        rubric.currentStatusLabel,
        formatAttemptExportValue(rubric),
        rubric.effectiveScore > 0 ? rubric.effectiveScore.toFixed(2) : '—',
        bestScore > 0 ? bestScore.toFixed(2) : '—',
        `${levelLabel} · ${formatSnapshotDate(rubric.lastActivityAt)}`
      ];
    });

    const contenidoArtefactos = {};
    Object.keys(RUBRIC_CONTENT_KEYS).forEach((rubricId) => {
      const contentKey = RUBRIC_CONTENT_KEYS[rubricId];
      contenidoArtefactos[contentKey] = artefactosContent?.[contentKey];
    });

    const interaccionesTutorRecientes = Array.isArray(tutorInteractions)
      ? tutorInteractions.slice(-8).map((interaction) => ({
        fecha: interaction?.timestamp ? new Date(interaction.timestamp).toLocaleString('es-ES') : null,
        tipo: interaction?.type || 'chat',
        preguntaEstudiante: interaction?.prompt || interaction?.question || '',
        respuestaTutor: interaction?.response || '',
      }))
      : [];

    const citasRecientes = Array.isArray(savedCitations)
      ? savedCitations.slice(0, 12).map((cita) => ({
        texto: cita?.texto || cita?.text || '',
        posicion: cita?.posicion || cita?.position || null,
        fechaGuardado: cita?.timestamp ? new Date(cita.timestamp).toLocaleString('es-ES') : null
      }))
      : [];

    const datePart = new Date().toISOString().split('T')[0];
    await exportGenericPDF({
      title: 'Informe de progreso (Actividades)',
      fileName: `progreso_${safeDocumentId}_${datePart}.pdf`,
      sections: [
        {
          heading: 'Resumen',
          keyValues: {
            fechaExportacion: new Date().toLocaleString('es-ES'),
            documentoID: safeDocumentId,
            lectureId,
            dimensionesActivas: snapshot.summary.coverageCount,
            dimensionesConNota: snapshot.summary.evaluatedCount,
            pendientesRevision: snapshot.summary.pendingCount,
            totalEvaluaciones: snapshot.summary.totalAttempts,
            ...(legacyEvidenceCount > 0 ? { registrosLegacySinHistorial: legacyEvidenceCount } : {}),
            promedioGeneral: snapshot.summary.averageEvaluatedScore > 0 ? snapshot.summary.averageEvaluatedScore.toFixed(2) : '0.00',
            mejorPuntaje: snapshot.summary.bestScore > 0 ? snapshot.summary.bestScore.toFixed(2) : '0.00',
            totalInteraccionesTutor: tutorInteractions?.length || 0,
            totalCitasGuardadas: savedCitations?.length || 0,
          }
        },
        {
          heading: 'Tabla por artefacto',
          text: 'Detalle por artefacto (estado, intentos y puntuaciones). Para el historial completo por intento, usa el CSV.',
          table: {
            headers: ['Artefacto', 'Estado', 'Intentos / registro', 'Ultima', 'Maxima', 'Nivel / Fecha'],
            rows
          }
        },
        {
          heading: 'Contenido del estudiante (si existe)',
          keyValues: contenidoArtefactos
        },
        {
          heading: 'Interacciones con tutor (recientes)',
          list: interaccionesTutorRecientes
        },
        {
          heading: 'Citas guardadas (muestra)',
          list: citasRecientes
        }
      ]
    });
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ButtonContainer>
        <ExportButton
          $format="csv"
          onClick={() => {
            setFormat('csv');
            setShowConfirm(true);
          }}
          disabled={!hasData}
          whileHover={{ scale: hasData ? 1.05 : 1 }}
          whileTap={{ scale: hasData ? 0.95 : 1 }}
        >
          <span className="icon">📊</span>
          Exportar CSV
        </ExportButton>

        <ExportButton
          $format="pdf"
          onClick={() => {
            setFormat('pdf');
            setShowConfirm(true);
          }}
          disabled={!hasData}
          whileHover={{ scale: hasData ? 1.05 : 1 }}
          whileTap={{ scale: hasData ? 0.95 : 1 }}
        >
          <span className="icon">📄</span>
          Exportar PDF
        </ExportButton>
      </ButtonContainer>

      <AnimatePresence>
        {showConfirm && (
          <Modal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-progress-title"
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="export-progress-title">
                <span>{format === 'csv' ? '📊' : '📄'}</span>
                Exportar Progreso en {format.toUpperCase()}
              </h3>

              <p>
                Se descargara un archivo {format.toUpperCase()} con la informacion visible de esta lectura y sus evidencias asociadas.
              </p>

              <ul style={{
                marginLeft: '1.5rem',
                marginBottom: '1.5rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.8
              }}>
                {format === 'csv' ? (
                  <>
                    <li><strong>Fecha y hora</strong> de cada evaluacion registrada</li>
                    <li><strong>Artefacto y estado</strong> actual de la dimension</li>
                    <li><strong>Puntuacion sobre 10</strong> cuando exista</li>
                    <li><strong>Nivel alcanzado</strong> o estado en revisión</li>
                    <li><strong>Numero de intento</strong> por registro</li>
                  </>
                ) : (
                  <>
                    <li><strong>Resumen general:</strong> cobertura, notas, revisiones en espera y mejor puntaje</li>
                    <li><strong>Tabla por artefacto:</strong> estado, intentos, ultima nota y maxima</li>
                    <li><strong>Contenido del estudiante:</strong> respuestas guardadas si existen</li>
                    <li><strong>Soporte:</strong> muestra de interacciones con tutor y citas guardadas</li>
                    <li><strong>Nota:</strong> para el historial fino por intento, usa el CSV</li>
                  </>
                )}
              </ul>

              <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                {format === 'csv'
                  ? '📊 Archivo CSV listo para abrir en Excel, Google Sheets o cualquier hoja de calculo.'
                  : '📄 Archivo PDF listo para compartir o archivar en portafolios y seguimiento docente.'
                }
              </p>

              <div className="buttons">
                <Button
                  className="secondary"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="primary"
                  onClick={() => handleExport(format)}
                >
                  <span style={{ marginRight: '0.5rem' }}>📥</span>
                  Descargar {format.toUpperCase()}
                </Button>
              </div>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
