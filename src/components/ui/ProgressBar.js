import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const BarContainer = styled.div`
  width: 100%;
  height: 10px;
  background-color: ${props => props.theme.border};
  border-radius: 5px;
  overflow: hidden;
  margin-top: 10px;
`;

const Bar = styled(motion.div)`
  height: 100%;
  background-color: ${props => props.theme.primary};
  border-radius: 5px;
`;

const ProgressBar = ({ progress, theme }) => {
  return (
    <BarContainer theme={theme}>
      <Bar 
        theme={theme}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5 }}
      />
    </BarContainer>
  );
};

export default ProgressBar;
