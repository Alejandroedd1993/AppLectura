import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: ${p => p.theme?.surface || '#f8f9fa'};
  border: 2px solid ${p => p.theme?.danger || '#ef4444'};
  border-radius: 12px;
  margin: 20px 0;
`;

const ErrorIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const ErrorTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 1.5rem;
  color: ${p => p.theme?.danger || '#ef4444'};
  font-weight: 700;
`;

const ErrorMessage = styled.p`
  margin: 0 0 24px 0;
  color: ${p => p.theme?.textSecondary || '#666'};
  font-size: 1rem;
  line-height: 1.6;
  max-width: 500px;
`;

const ErrorDetails = styled.details`
  margin-top: 16px;
  padding: 12px 16px;
  background: ${p => p.theme?.background || '#fff'};
  border: 1px solid ${p => p.theme?.border || '#e0e0e0'};
  border-radius: 8px;
  max-width: 600px;
  width: 100%;
  font-size: 0.85rem;
  color: ${p => p.theme?.textSecondary || '#666'};
  text-align: left;
  
  summary {
    cursor: pointer;
    font-weight: 600;
    user-select: none;
    
    &:hover {
      color: ${p => p.theme?.primary || '#2196F3'};
    }
  }
  
  pre {
    margin-top: 8px;
    padding: 8px;
    background: ${p => p.theme?.surface || '#f5f5f5'};
    border-radius: 4px;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    line-height: 1.4;
  }
`;

const ActionButton = styled.button`
  padding: 12px 24px;
  background: ${p => p.theme?.primary || '#2196F3'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${p => p.theme?.primaryDark || '#1976D2'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Actualizar estado para que el siguiente render muestre el fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Registrar error para debugging
    console.error('🔴 ErrorBoundary capturó un error:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);
    
    // Guardar detalles del error en el estado
    this.setState({
      error,
      errorInfo
    });
    
    // Opcional: Enviar a servicio de tracking (ej: Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Si hay callback de reset, ejecutarlo
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Usar fallback customizado si se proporciona
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback UI por defecto
      const { error, errorInfo } = this.state;
      const theme = this.props.theme || {};
      
      return (
        <ErrorContainer theme={theme}>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle theme={theme}>
            Algo salió mal
          </ErrorTitle>
          <ErrorMessage theme={theme}>
            Este componente encontró un error inesperado. 
            {this.props.componentName && ` El problema ocurrió en: ${this.props.componentName}.`}
            {' '}Puedes intentar recargar o continuar con otras actividades.
          </ErrorMessage>
          
          <ActionButton theme={theme} onClick={this.handleReset}>
            🔄 Intentar de nuevo
          </ActionButton>
          
          {process.env.NODE_ENV === 'development' && error && (
            <ErrorDetails theme={theme}>
              <summary>🔍 Detalles técnicos (solo en desarrollo)</summary>
              <pre>
                <strong>Error:</strong> {error.toString()}
                {'\n\n'}
                <strong>Stack:</strong>
                {errorInfo?.componentStack}
              </pre>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    // No hay error, renderizar children normalmente
    return this.props.children;
  }
}

export default ErrorBoundary;
