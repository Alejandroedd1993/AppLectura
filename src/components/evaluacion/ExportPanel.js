// src/components/evaluacion/ExportPanel.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { exportToCSV, exportToJSON, calculateDetailedStats } from '../../services/analyticsService';

const PanelContainer = styled.div`
  background: ${props => props.theme.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const PanelTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.text};
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PanelDescription = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const ExportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ExportCard = styled.div`
  background: ${props => props.theme.background};
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CardIcon = styled.div`
  font-size: 2rem;
`;

const CardTitle = styled.h4`
  margin: 0;
  color: ${props => props.theme.text};
  font-size: 0.95rem;
  font-weight: 600;
`;

const CardDescription = styled.p`
  margin: 0;
  color: ${props => props.theme.textMuted};
  font-size: 0.8rem;
  line-height: 1.4;
  flex: 1;
`;

const ExportButton = styled(motion.button)`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.625rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.primaryDark};
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: ${props => props.theme.border};
    cursor: not-allowed;
    transform: none;
  }
`;

const SuccessMessage = styled(motion.div)`
  background: #10b98120;
  color: #10b981;
  border: 1px solid #10b981;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
`;

/**
 * Panel de exportación de datos
 */
const ExportPanel = ({ rubricProgress = {}, theme }) => {
  const [exportStatus, setExportStatus] = useState('');

  const hasData = Object.keys(rubricProgress).length > 0;

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    try {
      const csv = exportToCSV(rubricProgress);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(csv, `evaluacion-rubricas-${timestamp}.csv`, 'text/csv;charset=utf-8;');
      setExportStatus('✅ CSV exportado exitosamente');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      setExportStatus('❌ Error al exportar CSV');
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const handleExportJSON = () => {
    try {
      const stats = calculateDetailedStats(rubricProgress);
      const json = exportToJSON(rubricProgress, stats);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(json, `evaluacion-completa-${timestamp}.json`, 'application/json;charset=utf-8;');
      setExportStatus('✅ JSON exportado exitosamente');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      console.error('Error al exportar JSON:', error);
      setExportStatus('❌ Error al exportar JSON');
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const handleExportTXT = () => {
    try {
      const stats = calculateDetailedStats(rubricProgress);
      let report = '═══════════════════════════════════════════════════════\n';
      report += '         REPORTE DE EVALUACIÓN CRITERIAL\n';
      report += '═══════════════════════════════════════════════════════\n\n';
      
      // Resumen general
      report += '📊 RESUMEN GENERAL\n';
      report += '─────────────────────────────────────────────────────\n';
      report += `Rúbricas completadas: ${stats.summary.evaluatedRubrics}/${stats.summary.totalRubrics}\n`;
      report += `Total de intentos: ${stats.summary.totalAttempts}\n`;
      report += `Promedio general: ${stats.summary.averageScore.toFixed(2)}/10\n`;
      report += `Mediana: ${stats.summary.medianScore.toFixed(2)}/10\n`;
      report += `Tasa de completitud: ${stats.summary.completionRate.toFixed(1)}%\n`;
      report += `Consistencia: ${stats.trends.consistencyScore.toFixed(2)}/10\n`;
      report += `Tendencia: ${stats.trends.overallTrend}\n\n`;

      // Desglose por rúbrica
      report += '📝 DESGLOSE POR RÚBRICA\n';
      report += '─────────────────────────────────────────────────────\n';
      Object.entries(rubricProgress).forEach(([rubricId, data]) => {
        const scores = (data.scores || []).map(s => typeof s === 'object' ? Number(s.score) : Number(s));
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lastScore = scores.length > 0 ? scores[scores.length - 1] : 0;
        
        report += `\n${rubricId}\n`;
        report += `  Promedio: ${Number(data.average || 0).toFixed(2)}/10\n`;
        report += `  Intentos: ${scores.length}\n`;
        report += `  Mejor puntaje: ${bestScore.toFixed(2)}\n`;
        report += `  Último puntaje: ${lastScore.toFixed(2)}\n`;
      });

      // Fortalezas
      if (stats.performance.strengths.length > 0) {
        report += '\n\n💪 FORTALEZAS\n';
        report += '─────────────────────────────────────────────────────\n';
        stats.performance.strengths.forEach(item => {
          report += `${item.rubricId}: ${item.score.toFixed(2)}/10\n`;
        });
      }

      // Áreas de mejora
      if (stats.performance.weaknesses.length > 0) {
        report += '\n🎯 ÁREAS DE MEJORA\n';
        report += '─────────────────────────────────────────────────────\n';
        stats.performance.weaknesses.forEach(item => {
          report += `${item.rubricId}: ${item.score.toFixed(2)}/10\n`;
        });
      }

      // Recomendaciones
      if (stats.recommendations.length > 0) {
        report += '\n\n💡 RECOMENDACIONES\n';
        report += '─────────────────────────────────────────────────────\n';
        stats.recommendations.forEach((rec, idx) => {
          report += `\n${idx + 1}. ${rec.title}\n`;
          report += `   ${rec.description}\n`;
          report += `   → ${rec.action}\n`;
        });
      }

      report += '\n\n═══════════════════════════════════════════════════════\n';
      report += `Generado el: ${new Date().toLocaleString('es-ES')}\n`;
      report += '═══════════════════════════════════════════════════════\n';

      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(report, `reporte-evaluacion-${timestamp}.txt`, 'text/plain;charset=utf-8;');
      setExportStatus('✅ Reporte TXT exportado exitosamente');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      console.error('Error al exportar TXT:', error);
      setExportStatus('❌ Error al exportar reporte');
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  if (!hasData) {
    return (
      <PanelContainer theme={theme}>
        <PanelTitle theme={theme}>📥 Exportar Datos</PanelTitle>
        <EmptyState theme={theme}>
          <p>📊 No hay datos para exportar</p>
          <p>Completa algunas evaluaciones para descargar tus resultados</p>
        </EmptyState>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer theme={theme}>
      <PanelTitle theme={theme}>📥 Exportar Datos</PanelTitle>
      <PanelDescription theme={theme}>
        Descarga tus resultados en formatos estructurados para análisis, portafolio o seguimiento docente.
      </PanelDescription>

      <ExportGrid>
        {/* CSV Export */}
        <ExportCard theme={theme}>
          <CardIcon>📊</CardIcon>
          <CardTitle theme={theme}>Excel / CSV</CardTitle>
          <CardDescription theme={theme}>
            Tabla legible con: nombre de artefacto, promedio sobre 10, nivel alcanzado (Inicial/Básico/Competente/Avanzado), número de intentos y mejor puntuación. Ideal para Excel y Google Sheets.
          </CardDescription>
          <ExportButton
            theme={theme}
            onClick={handleExportCSV}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            📊 Descargar CSV
          </ExportButton>
        </ExportCard>

        {/* JSON Export */}
        <ExportCard theme={theme}>
          <CardIcon>💾</CardIcon>
          <CardTitle theme={theme}>Datos Completos (JSON)</CardTitle>
          <CardDescription theme={theme}>
            Archivo estructurado con metadatos, resumen ejecutivo (rúbricas evaluadas, promedio general, mediana, completitud), estadísticas avanzadas y datos completos por artefacto. Ideal para análisis programático.
          </CardDescription>
          <ExportButton
            theme={theme}
            onClick={handleExportJSON}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            💾 Descargar JSON
          </ExportButton>
        </ExportCard>

        {/* TXT Report */}
        <ExportCard theme={theme}>
          <CardIcon>📄</CardIcon>
          <CardTitle theme={theme}>Reporte Legible (TXT)</CardTitle>
          <CardDescription theme={theme}>
            Reporte formateado en texto plano con resumen, fortalezas y recomendaciones.
          </CardDescription>
          <ExportButton
            theme={theme}
            onClick={handleExportTXT}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            📄 Descargar Reporte
          </ExportButton>
        </ExportCard>
      </ExportGrid>

      {exportStatus && (
        <SuccessMessage
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {exportStatus}
        </SuccessMessage>
      )}
    </PanelContainer>
  );
};

export default ExportPanel;
