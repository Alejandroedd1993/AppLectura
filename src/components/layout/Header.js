import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import ClearHistoryButton from '../common/ClearHistoryButton';
import SyncIndicator from '../common/SyncIndicator';
import NotificationBell from '../common/NotificationBell';
import { lightTheme, darkTheme } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../firebase/auth';

/**
 * Componente Header: Muestra el encabezado de la aplicación.
 * @param {string} titulo - Título que se mostrará en el encabezado.
 * @param {boolean} modoOscuro - Estado del modo oscuro.
 * @param {function} onToggleModo - Función para cambiar el modo.
 * @param {React.ReactNode} children - Componentes adicionales a mostrar en el header.
 */
const Header = ({ titulo = 'Mi App de Lectura', modoOscuro = false, onToggleModo, onBack, showBackButton = false, children }) => {
  const theme = modoOscuro ? darkTheme : lightTheme;
  const { currentUser, userData } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      try {
        await logout();
        console.log('👋 Sesión cerrada exitosamente');
      } catch (error) {
        console.error('❌ Error cerrando sesión:', error);
        alert('Error al cerrar sesión. Intenta de nuevo.');
      }
    }
  };

  return (
    <HeaderContainer>
      <LeftSection>
        {showBackButton && (
          <BackButton onClick={onBack} title="Volver a mis cursos">
            ⬅️ Mis Cursos
          </BackButton>
        )}
        <Title>{titulo}</Title>
      </LeftSection>
      <HeaderActions>
        {currentUser && (
          <UserInfo>
            {userData?.photoURL && (
              <UserAvatar src={userData.photoURL} alt={userData.nombre || 'Usuario'} />
            )}
            <UserDetails>
              <UserName>{userData?.nombre || currentUser.displayName || 'Usuario'}</UserName>
              <UserRole>{userData?.role === 'docente' ? '👨‍🏫 Docente' : '👨‍🎓 Estudiante'}</UserRole>
            </UserDetails>
          </UserInfo>
        )}
        {/* 🔔 Campana de notificaciones para estudiantes */}
        <NotificationBell theme={theme} />
        <SyncIndicator compact />
        {children}
        <ClearHistoryButton theme={theme} />
        {onToggleModo && (
          <ModeToggle
            onClick={onToggleModo}
            aria-label={`Cambiar a modo ${modoOscuro ? 'claro' : 'oscuro'}`}
            title={`Cambiar a modo ${modoOscuro ? 'claro' : 'oscuro'}`}
          >
            {modoOscuro ? '☀️' : '🌙'}
          </ModeToggle>
        )}
        {currentUser && (
          <LogoutButton
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            🚪 Salir
          </LogoutButton>
        )}
      </HeaderActions>
    </HeaderContainer>
  );
};

Header.propTypes = {
  titulo: PropTypes.string,
  modoOscuro: PropTypes.bool,
  onToggleModo: PropTypes.func,
  onBack: PropTypes.func,
  showBackButton: PropTypes.bool,
  children: PropTypes.node,
};

const HeaderContainer = styled.header`
  background: ${props => props.theme?.surface || '#FFFFFF'};
  color: ${props => props.theme?.text || '#232B33'};
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-bottom: 2px solid ${props => props.theme?.border || '#E4EAF1'};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  @media (max-width: 640px) {
    padding: 12px 16px;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  flex: 1 1 auto;
`;

const BackButton = styled.button`
  background: transparent;
  border: 1px solid ${props => props.theme?.primary || '#3190FC'};
  color: ${props => props.theme?.primary || '#3190FC'};
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme?.primary || '#3190FC'}15;
    transform: translateX(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.1rem, 2.6vw, 1.5rem);
  font-weight: 600;
  background: linear-gradient(45deg, #3190FC, #009688);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  min-width: 0;
  word-break: break-word;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  @media (max-width: 640px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const ModeToggle = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1em;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  background: ${props => props.theme?.surfaceVariant || 'rgba(0, 0, 0, 0.05)'};
  
  @media (max-width: 768px) {
    gap: 0.5rem;
    padding: 0.35rem;
  }
`;

const UserAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${props => props.theme?.primary || '#3190FC'};
  
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
  }
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const UserName = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme?.text || '#232B33'};
`;

const UserRole = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme?.textSecondary || '#6B7280'};
  text-transform: capitalize;
`;

const LogoutButton = styled.button`
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  min-height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
  
  &:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(239, 68, 68, 0.2);
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    
    span {
      display: none;
    }
  }
`;

export default Header;