/**
 * @deprecated COMPONENTE MODULAR NO USADO - NO INTEGRAR EN CÓDIGO NUEVO
 * 
 * Componente huérfano de modularización incompleta de AnalisisTexto.js.
 * NO está en uso por ningún componente activo.
 * 
 * Si necesitas visualización de resultados de análisis:
 * - PreLectura.js ya tiene visualización estructurada funcional
 * - Considera integrar funcionalidad útil en PreLectura.js
 * 
 * @see PreLectura.js (componente activo con resultados de análisis)
 */

import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import StatsCard from '../ui/StatsCard';

// Estilos
const ResultsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

// Variantes de animación
const resultVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, delayChildren: 0.1, staggerChildren: 0.07 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

const AnalysisResults = ({ analisis, theme }) => {
  if (!analisis) {
    return null;
  }

  return (
    <ResultsGrid
      variants={resultVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      theme={theme}
    >
      <motion.div variants={itemVariants}>
        <StatsCard
          title="📋 Resumen"
          content={analisis.resumen || "No hay resumen disponible"}
          theme={theme}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <StatsCard
          title="💡 Ideas Principales"
          content={analisis.ideasPrincipales}
          type="list"
          theme={theme}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <StatsCard
          title="🎭 Análisis Estilístico"
          content={analisis.analisisEstilistico}
          type="object"
          theme={theme}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <StatsCard
          title="❓ Preguntas de Reflexión"
          content={analisis.preguntasReflexion}
          type="list"
          theme={theme}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <StatsCard
          title="📚 Vocabulario Destacado"
          content={analisis.vocabulario}
          type="vocabulary"
          theme={theme}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <StatsCard
          title="🎯 Información Adicional"
          content={{
            'Nivel de complejidad': analisis.complejidad || 'No determinado',
            'Temas principales': analisis.temas?.join(', ') || 'No determinados'
          }}
          type="object"
          theme={theme}
        />
      </motion.div>
    </ResultsGrid>
  );
};

export default React.memo(AnalysisResults);