/**
 * Componente PrivateRoute
 * Protege rutas que requieren autenticación
 * Redirige según el rol del usuario
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const LoadingCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 60px;
  text-align: center;
  
  .spinner {
    font-size: 48px;
    animation: spin 2s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  h2 {
    margin: 20px 0 10px 0;
    color: #333;
  }
  
  p {
    color: #666;
    margin: 0;
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
          <div className="spinner">🔄</div>
          <h2>Cargando...</h2>
          <p>Verificando autenticación</p>
        </LoadingCard>
      </LoadingContainer>
    );
  }

  // No autenticado: redirigir a login
  if (!currentUser || !userData) {
    console.log('🔒 [PrivateRoute] Usuario no autenticado, redirigiendo a', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar rol si es requerido
  if (requiredRole && userData.role !== requiredRole) {
    console.log('⛔ [PrivateRoute] Rol incorrecto. Esperado:', requiredRole, 'Actual:', userData.role);
    
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

