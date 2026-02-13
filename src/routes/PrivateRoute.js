/**
 * Componente PrivateRoute
 * Protege rutas que requieren autenticación
 * Redirige según el rol del usuario
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled, { keyframes } from 'styled-components';
import BrainLogo from '../components/common/BrainLogo';

import logger from '../utils/logger';

const pulse = keyframes`
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.05); }
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f1ec;
`;

const LoadingCard = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.08);
  padding: 48px 60px;
  text-align: center;

  .logo-wrap {
    animation: ${pulse} 2s ease-in-out infinite;
    margin-bottom: 20px;
  }
  
  h2 {
    margin: 0 0 6px 0;
    color: #2a2a28;
    font-size: 18px;
    font-weight: 600;
  }
  
  p {
    color: #8a8880;
    margin: 0;
    font-size: 14px;
  }
`;

/**
 * PrivateRoute - Protege rutas privadas
 * 
 * @param {React.Component} children - Componente a renderizar si está autenticado
 * @param {string} requiredRole - 'estudiante' o 'docente' (opcional)
 * @param {string} redirectTo - Ruta a la que redirigir si no está autenticado (default: /login)
 */
export default function PrivateRoute({ children, requiredRole = null, redirectTo = '/login' }) {
  const { currentUser, userData, loading } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <LoadingContainer>
        <LoadingCard>
          <div className="logo-wrap"><BrainLogo size={56} light /></div>
          <h2>Cargando...</h2>
          <p>Verificando autenticación</p>
        </LoadingCard>
      </LoadingContainer>
    );
  }

  // No autenticado: redirigir a login
  if (!currentUser || !userData) {
    logger.log('🔒 [PrivateRoute] Usuario no autenticado, redirigiendo a', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar rol si es requerido
  if (requiredRole && userData.role !== requiredRole) {
    logger.log('⛔ [PrivateRoute] Rol incorrecto. Esperado:', requiredRole, 'Actual:', userData.role);
    
    // Redirigir a la ruta apropiada según su rol
    if (userData.role === 'docente') {
      return <Navigate to="/docente/dashboard" replace />;
    } else {
      return <Navigate to="/estudiante/textos" replace />;
    }
  }

  // Autenticado y con rol correcto: renderizar componente
  return children;
}

/**
 * EstudianteRoute - Atajo para rutas de estudiantes
 */
export function EstudianteRoute({ children }) {
  return (
    <PrivateRoute requiredRole="estudiante">
      {children}
    </PrivateRoute>
  );
}

/**
 * DocenteRoute - Atajo para rutas de docentes
 */
export function DocenteRoute({ children }) {
  return (
    <PrivateRoute requiredRole="docente">
      {children}
    </PrivateRoute>
  );
}

