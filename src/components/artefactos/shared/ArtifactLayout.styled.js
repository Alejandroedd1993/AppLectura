/**
 * ArtifactLayout.styled.js
 * Componentes de layout base compartidos por todos los artefactos:
 * Container, Header, Title, Subtitle.
 */
import styled from 'styled-components';

export const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 1.5rem);
`;

export const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  background: linear-gradient(135deg, ${props => props.theme.primary || '#2196F3'} 0%, ${props => props.theme.primaryDark || props.theme.primary || '#1976D2'} 100%);
  border-radius: 12px;
  color: white;
`;

export const HeaderTitle = styled.h2`
  margin: 0 0 0.5rem 0;
  font-size: clamp(1.25rem, 3vw, 1.6rem);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: white;
`;

export const HeaderDescription = styled.p`
  margin: 0;
  font-size: clamp(0.85rem, 2.2vw, 0.95rem);
  opacity: 0.9;
  line-height: 1.5;
  color: white;
`;
