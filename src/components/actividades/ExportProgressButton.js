import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { exportGenericPDF } from '../../utils/exportUtils';

import logger from '../../utils/logger';
/**
 * 📥 ExportProgressButton - Exporta el progreso del estudiante en CSV/PDF
 *
 * Funcionalidades:
 * - Formato CSV para análisis en Excel/SPSS (detalle por intento)
 * - Formato PDF para portafolio/lectura humana (resumen + tabla)
 */

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

const ARTEFACTO_NAMES = {
  rubrica1: 'Resumen Académico',
  rubrica2: 'Tabla ACD',
  rubrica3: 'Mapa de Actores',
  rubrica4: 'Respuesta Argumentativa',
  rubrica5: 'Bitácora Ética IA'
};

export default function ExportProgressButton({
  rubricProgress,
  studentName: _studentName = 'estudiante',
  documentId = 'documento',
  tutorInteractions = [],
  savedCitations = [],
  lectureId = null
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [format, setFormat] = useState('csv');

  const hasData = rubricProgress && Object.values(rubricProgress).some(r => r?.scores?.length > 0);

  // 🆕 Cargar contenido de artefactos desde localStorage
  const loadArtefactosContent = () => {
    const content = {};
    const key = lectureId || 'global';

    // Resumen Académico
    try {
      const resumenKey = `activity_resumen_academico_${key}`;
      const resumenData = localStorage.getItem(resumenKey);
      if (resumenData) {
        const parsed = JSON.parse(resumenData);
        content.resumenAcademico = parsed.student_answers?.resumen || '';
      }
    } catch (e) { logger.warn('Error loading resumenAcademico', e); }

    // Tabla ACD
    try {
      const acdKey = `activity_tabla_acd_${key}`;
      const acdData = localStorage.getItem(acdKey);
      if (acdData) {
        const parsed = JSON.parse(acdData);
        content.tablaACD = {
          marcoIdeologico: parsed.student_answers?.marco_ideologico || '',
          estrategiasRetoricas: parsed.student_answers?.estrategias_retoricas || '',
          vocesPresentes: parsed.student_answers?.voces_presentes || '',
          vocesSilenciadas: parsed.student_answers?.voces_silenciadas || ''
        };
      }
    } catch (e) { logger.warn('Error loading tablaACD', e); }

    // Mapa de Actores
    try {
      const mapaKey = `activity_mapa_actores_${key}`;
      const mapaData = localStorage.getItem(mapaKey);
      if (mapaData) {
        const parsed = JSON.parse(mapaData);
        content.mapaActores = {
          actores: parsed.student_answers?.actores || '',
          contextoHistorico: parsed.student_answers?.contexto_historico || '',
          conexiones: parsed.student_answers?.conexiones || '',
          consecuencias: parsed.student_answers?.consecuencias || ''
        };
      }
    } catch (e) { logger.warn('Error loading mapaActores', e); }

    // Respuesta Argumentativa
    try {
      const respKey = `activity_respuesta_argumentativa_${key}`;
      const respData = localStorage.getItem(respKey);
      if (respData) {
        const parsed = JSON.parse(respData);
        content.respuestaArgumentativa = {
          tesis: parsed.student_answers?.tesis || '',
          evidencias: parsed.student_answers?.evidencias || '',
          contraargumento: parsed.student_answers?.contraargumento || '',
          refutacion: parsed.student_answers?.refutacion || ''
        };
      }
    } catch (e) { logger.warn('Error loading respuestaArgumentativa', e); }

    // Bitácora Ética IA
    try {
      const bitacoraKey = `activity_bitacora_etica_ia_${key}`;
      const bitacoraData = localStorage.getItem(bitacoraKey);
      const reflexionesKey = `ethicalReflections:${key}`;
      const reflexionesData = localStorage.getItem(reflexionesKey);

      content.bitacoraEticaIA = {};
      if (bitacoraData) {
        const parsed = JSON.parse(bitacoraData);
        content.bitacoraEticaIA = {
          verificacionFuentes: parsed.student_answers?.verificacion_fuentes || '',
          procesoUsoIA: parsed.student_answers?.proceso_uso_ia || '',
          reflexionEtica: parsed.student_answers?.reflexion_etica || '',
          declaraciones: parsed.student_answers?.declaraciones || []
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
    } catch (e) { logger.warn('Error loading bitacoraEticaIA', e); }

    return content;
  };

  const handleExport = (selectedFormat) => {
    if (!rubricProgress) return;

    if (selectedFormat === 'csv') {
      exportCSV();
    } else {
      exportPDF();
    }

    setShowConfirm(false);
  };

  const exportCSV = () => {
    const headers = [
      'Fecha y Hora',
      'Artefacto',
      'Puntuación (sobre 10)',
      'Nivel Alcanzado (1-4)',
      'Descripción del Nivel',
      'Número de Intento'
    ];

    const nivelDescripcion = {
      1: 'Inicial - Requiere desarrollo',
      2: 'Básico - En progreso',
      3: 'Competente - Satisfactorio',
      4: 'Avanzado - Excelente'
    };

    const rows = [];

    Object.entries(rubricProgress).forEach(([rubricId, data]) => {
      if (data?.scores) {
        data.scores.forEach((score, index) => {
          const nivel = score.nivel || Math.ceil(score.score / 2.5);

          rows.push([
            new Date(score.timestamp).toLocaleString('es-ES', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            ARTEFACTO_NAMES[rubricId] || rubricId,
            score.score.toFixed(2),
            nivel,
            nivelDescripcion[nivel] || 'Sin clasificar',
            index + 1
          ]);
        });
      }
    });

    // Ordenar por fecha (más reciente primero)
    rows.sort((a, b) => new Date(b[0]) - new Date(a[0]));

    const titleRow = `"Historial de Evaluaciones — Exportado: ${new Date().toLocaleString('es-ES')}"`;
    const csv = [titleRow, headers.map(h => `"${h}"`).join(','), ...rows
      .map(row => row.map(cell => `"${cell}"`).join(','))]
      .join('\n');

    const BOM = '\uFEFF';
    downloadFile(BOM + csv, `progreso_${documentId}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
  };

  const exportPDF = async () => {
    // 🆕 Cargar contenido de artefactos
    const artefactosContent = loadArtefactosContent();

    const rubricToContentKey = {
      rubrica1: 'resumenAcademico',
      rubrica2: 'tablaACD',
      rubrica3: 'mapaActores',
      rubrica4: 'respuestaArgumentativa',
      rubrica5: 'bitacoraEticaIA'
    };

    const rubricIds = Object.keys(ARTEFACTO_NAMES);
    const nivelDescripcion = {
      1: 'Inicial - Requiere desarrollo',
      2: 'Básico - En progreso',
      3: 'Competente - Satisfactorio',
      4: 'Avanzado - Excelente'
    };

    let totalScore = 0;
    let totalNivel = 0;
    let artefactosConDatos = 0;
    let dimensionesCompletadas = 0;
    let totalEvaluaciones = 0;

    const rows = rubricIds.map((rubricId) => {
      const data = rubricProgress?.[rubricId];
      // 🛡️ Excluir scores de PracticaGuiada (solo artefactos reales)
      const scores = (data?.scores || []).filter(s => s.artefacto !== 'PracticaGuiada');
      totalEvaluaciones += scores.length;

      if (scores.length === 0) {
        return [ARTEFACTO_NAMES[rubricId] || rubricId, 'Sin datos', '0', '—', '—', '—'];
      }

      const lastScore = scores[scores.length - 1];
      const highestScore = Math.max(...scores.map(s => Number(s?.score) || 0));
      const lastNivel = lastScore.nivel || Math.ceil((Number(lastScore.score) || 0) / 2.5);

      artefactosConDatos++;
      totalScore += Number(lastScore.score) || 0;
      totalNivel += Number(lastNivel) || 0;
      if (lastNivel >= 3) dimensionesCompletadas++;

      const estado = lastNivel >= 3 ? 'Completado' : 'En progreso';
      const ultimaFecha = lastScore.timestamp ? new Date(lastScore.timestamp).toLocaleString('es-ES') : '—';

      return [
        ARTEFACTO_NAMES[rubricId] || rubricId,
        estado,
        String(scores.length),
        (Number(lastScore.score) || 0).toFixed(2),
        highestScore.toFixed(2),
        `${lastNivel} (${nivelDescripcion[lastNivel] || 'Sin clasificar'}) · ${ultimaFecha}`
      ];
    });

    const promedioGeneral = artefactosConDatos > 0 ? (totalScore / artefactosConDatos).toFixed(2) : '0.00';
    const nivelPromedioAlcanzado = artefactosConDatos > 0 ? Math.round(totalNivel / artefactosConDatos) : 0;

    const contenidoArtefactos = {};
    rubricIds.forEach(rubricId => {
      const key = rubricToContentKey[rubricId];
      if (!key) return;
      contenidoArtefactos[key] = artefactosContent?.[key];
    });

    const interaccionesTutorRecientes = Array.isArray(tutorInteractions)
      ? tutorInteractions
        .slice(-8)
        .map(interaction => ({
          fecha: interaction?.timestamp ? new Date(interaction.timestamp).toLocaleString('es-ES') : null,
          tipo: interaction?.type || 'chat',
          preguntaEstudiante: interaction?.prompt || interaction?.question || '',
          respuestaTutor: interaction?.response || '',
        }))
      : [];

    const citasRecientes = Array.isArray(savedCitations)
      ? savedCitations
        .slice(0, 12)
        .map(cita => ({
          texto: cita?.texto || cita?.text || '',
          posicion: cita?.posicion || cita?.position || null,
          fechaGuardado: cita?.timestamp ? new Date(cita.timestamp).toLocaleString('es-ES') : null
        }))
      : [];

    const datePart = new Date().toISOString().split('T')[0];
    await exportGenericPDF({
      title: 'Informe de progreso (Actividades)',
      fileName: `progreso_${documentId}_${datePart}.pdf`,
      sections: [
        {
          heading: 'Resumen',
          keyValues: {
            fechaExportacion: new Date().toLocaleString('es-ES'),
            documentoID: documentId,
            lectureId,
            totalEvaluaciones,
            dimensionesCompletadas,
            promedioGeneral,
            nivelPromedioAlcanzado,
            totalInteraccionesTutor: tutorInteractions?.length || 0,
            totalCitasGuardadas: savedCitations?.length || 0,
          }
        },
        {
          heading: 'Tabla por artefacto',
          text: 'Detalle por artefacto (estado, intentos y puntuaciones). Para el historial completo de intentos, usa el CSV.',
          table: {
            headers: ['Artefacto', 'Estado', 'Intentos', 'Última', 'Máxima', 'Nivel / Fecha'],
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

      {/* Modal de Confirmación */}
      <AnimatePresence>
        {showConfirm && (
          <Modal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
          >
            <ModalContent
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>
                <span>{format === 'csv' ? '📊' : '📄'}</span>
                Exportar Progreso en {format.toUpperCase()}
              </h3>

              <p>
                Se descargará un archivo {format.toUpperCase()} con toda tu información de progreso:
              </p>

              <ul style={{
                marginLeft: '1.5rem',
                marginBottom: '1.5rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.8
              }}>
                {format === 'csv' ? (
                  <>
                    <li><strong>Fecha y hora</strong> de cada evaluación</li>
                    <li><strong>Nombre del artefacto</strong> evaluado</li>
                    <li><strong>Puntuación sobre 10</strong></li>
                    <li><strong>Nivel alcanzado</strong> (Inicial, Básico, Competente, Avanzado)</li>
                    <li><strong>Número de intento</strong> (1, 2, 3...)</li>
                    <li>Ordenado por fecha (más reciente primero)</li>
                  </>
                ) : (
                  <>
                    <li><strong>Resumen general:</strong> dimensiones completadas, promedio y nivel alcanzado</li>
                    <li><strong>Tabla por artefacto:</strong> estado, intentos, última y máxima puntuación</li>
                    <li><strong>Contenido (si existe):</strong> respuestas guardadas del estudiante en cada artefacto</li>
                    <li><strong>Soporte:</strong> muestra de interacciones con el tutor y citas guardadas</li>
                    <li><strong>Nota:</strong> para el historial completo por intento, usa el CSV</li>
                  </>
                )}
              </ul>

              <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                {format === 'csv'
                  ? '📊 Archivo CSV listo para abrir en Excel, Google Sheets o cualquier hoja de cálculo. Ideal para gráficos y análisis visual.'
                  : '📦 Archivo JSON estructurado para programadores e investigadores. Incluye metadatos completos y estructura jerárquica.'
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
