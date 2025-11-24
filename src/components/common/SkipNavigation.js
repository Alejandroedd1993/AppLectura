// src/components/common/SkipNavigation.js
import React from 'react';
import styled from 'styled-components';

const SkipLink = styled.a`
  position: absolute;
  top: -40px;
  left: 0;
  background: ${props => props.theme.primary};
  color: white;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  font-weight: 600;
  z-index: 10000;
  border-radius: 0 0 8px 0;
  transition: top 0.2s ease;

  &:focus {
    top: 0;
    outline: 3px solid ${props => props.theme.focus || '#4d90fe'};
    outline-offset: 2px;
  }
`;

const SkipLinksContainer = styled.div`
  position: relative;
`;

/**
 * Skip Navigation Links para mejorar accesibilidad
 * Permite a usuarios de teclado saltar directamente al contenido
 */
const SkipNavigation = ({ links = [], theme }) => {
  const defaultLinks = [
    { href: '#main-content', label: 'Saltar al contenido principal' },
    { href: '#dashboard-rubricas', label: 'Saltar al dashboard de rúbricas' },
    { href: '#pregunta-actual', label: 'Saltar a la pregunta actual' },
    ...links
  ];

  return (
    <SkipLinksContainer>
      {defaultLinks.map((link, index) => (
        <SkipLink
          key={index}
          href={link.href}
          theme={theme}
          onClick={(e) => {
            e.preventDefault();
            const target = document.querySelector(link.href);
            if (target) {
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          {link.label}
        </SkipLink>
      ))}
    </SkipLinksContainer>
  );
};

export default SkipNavigation;
