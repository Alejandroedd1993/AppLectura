/**
 * Componente de Login
 * Permite autenticación con Email/Password y Google SSO
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loginWithEmail, loginWithGoogle, resetPassword } from '../../firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { isConfigValid } from '../../firebase/config';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const LoginCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  max-width: 420px;
  width: 100%;

  @media (max-width: 480px) {
    padding: 24px;
    border-radius: 12px;
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    font-size: clamp(24px, 6vw, 32px);
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #666;
    margin: 0;
    font-size: clamp(12px, 3.5vw, 14px);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #333;
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const Button = styled.button`
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }
`;

const GoogleButton = styled(Button)`
  background: white;
  color: #333;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
  &:hover:not(:disabled) {
    background: #f9f9f9;
    border-color: #667eea;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 10px 0;
  
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e0e0e0;
  }
  
  span {
    color: #999;
    font-size: 13px;
  }
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: #fee;
  border-left: 4px solid #f44;
  border-radius: 4px;
  color: #c33;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  padding: 12px;
  background: #efe;
  border-left: 4px solid #4a4;
  border-radius: 4px;
  color: #383;
  font-size: 14px;
`;

const ForgotPasswordLink = styled.button`
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  text-align: right;
  padding: 0;
  margin-top: -8px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const RegisterPrompt = styled.div`
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;
  
  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

export default function Login() {
  const { currentUser, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    console.log('🔍 [Login] Config status:', { isConfigValid });
    if (!isConfigValid) {
      console.error('❌ [Login] Configuración de Firebase inválida');
      setError('⚠️ Error Crítico: Faltan las credenciales de Firebase o son inválidas (placeholders). Verifica tu archivo .env (API Key y Auth Domain).');
    }
  }, []);
  
  // Si ya está autenticado, no mostrar login
  if (authLoading) {
    return (
      <LoginContainer>
        <LoginCard>
          <Logo>
            <h1>📚 AppLectura</h1>
            <p>Cargando...</p>
          </Logo>
        </LoginCard>
      </LoginContainer>
    );
  }
  
  if (currentUser) {
    return null;
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    setLoading(true);
    
    try {
      await loginWithEmail(email, password);
      
      console.log('✅ Login exitoso');
      setSuccess('¡Inicio de sesión exitoso! Bienvenido.');
      
      // AuthContext detectará el cambio automáticamente
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      console.log('🔵 [Login] Iniciando proceso de Google Sign-In...');
      
      const result = await loginWithGoogle('estudiante'); // Rol por defecto
      
      console.log('✅ [Login] Google Sign-In exitoso:', result);
      setSuccess('¡Inicio de sesión con Google exitoso!');
      
      // AuthContext detectará el cambio automáticamente y cerrará el login
      
    } catch (err) {
      console.error('❌ [Login] Error en Google Sign-In:', err);
      
      let msg = err.message;
      
      // Mensajes amigables para errores comunes
      if (err.code === 'auth/internal-error') {
        msg = 'Error de conexión con Google. Posibles causas: \n1. Bloqueo de red/firewall a servicios de Google (api.js).\n2. Auth Domain incorrecto en .env.\n3. API Key inválida.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Inicio de sesión cancelado.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'El navegador bloqueó la ventana emergente. Por favor permítela para iniciar sesión.';
      }
      
      setError(msg || 'Error al iniciar sesión con Google. Intenta de nuevo.');
      setLoading(false); // Importante: resetear loading en error
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Ingresa tu email para recuperar tu contraseña');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await resetPassword(email);
      setSuccess('Email de recuperación enviado. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <h1>📚 AppLectura</h1>
          <p>Literacidad Crítica con IA</p>
        </Logo>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        
        <Form onSubmit={handleEmailLogin}>
          <InputGroup>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
            />
          </InputGroup>
          
          <InputGroup>
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </InputGroup>
          
          <ForgotPasswordLink 
            type="button" 
            onClick={handleForgotPassword}
            disabled={loading}
          >
            ¿Olvidaste tu contraseña?
          </ForgotPasswordLink>
          
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? '⏳ Iniciando sesión...' : '🔐 Iniciar Sesión'}
          </PrimaryButton>
        </Form>
        
        <Divider>
          <span>o continuar con</span>
        </Divider>
        
        <GoogleButton onClick={handleGoogleLogin} disabled={loading}>
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </GoogleButton>
        
        <RegisterPrompt>
          ¿No tienes cuenta? Contacta a tu docente para obtener acceso
        </RegisterPrompt>
      </LoginCard>
    </LoginContainer>
  );
}

