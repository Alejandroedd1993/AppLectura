/**
 * Componente de Registro
 * Permite crear cuenta con Email/Password y seleccionar rol
 * 
 * Rediseñado para armonizar con el design system de la app:
 * - Paleta: #3190FC (azul) + #009688 (teal)
 * - Fondo oscuro sofisticado
 * - Card con glassmorphism
 * - Animaciones de entrada
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { registerWithEmail } from '../../firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

import logger from '../../utils/logger';

/* ═══════════════════════════════════════════
   ANIMACIONES
   ═══════════════════════════════════════════ */

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ═══════════════════════════════════════════
   STYLED COMPONENTS
   ═══════════════════════════════════════════ */

const RegisterContainer = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d2137 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(49, 144, 252, 0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: -10%;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 150, 136, 0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
`;

const RegisterCard = styled.div`
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 44px 40px;
  max-width: 500px;
  width: 100%;
  position: relative;
  z-index: 1;
  animation: ${fadeInUp} 0.6s ease-out;

  @media (max-width: 480px) {
    padding: 28px 24px;
    border-radius: 16px;
    margin: 0 8px;
  }
`;

const LogoArea = styled.div`
  text-align: center;
  margin-bottom: 32px;
  animation: ${fadeInUp} 0.6s ease-out 0.1s both;
`;

const LogoIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
  animation: ${float} 4s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(49, 144, 252, 0.3));

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const LogoTitle = styled.h1`
  font-size: clamp(26px, 6vw, 34px);
  font-weight: 700;
  background: linear-gradient(135deg, #3190FC 0%, #009688 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
  animation: ${shimmer} 3s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-size: 100% auto;
  }
`;

const LogoSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  font-size: clamp(13px, 3.5vw, 15px);
  font-weight: 400;
  letter-spacing: 0.3px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: ${fadeInUp} 0.6s ease-out 0.2s both;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const Input = styled.input`
  padding: 13px 16px;
  background: rgba(255, 255, 255, 0.07);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  font-size: 15px;
  color: #e8ecf0;
  font-family: inherit;
  transition: all 0.25s ease;
  min-height: 44px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  &:focus {
    outline: none;
    border-color: #3190FC;
    background: rgba(49, 144, 252, 0.08);
    box-shadow: 0 0 0 3px rgba(49, 144, 252, 0.15);
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }
`;

const RoleSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const RoleOption = styled.button`
  padding: 20px;
  border: 1.5px solid ${props => props.$selected ? '#3190FC' : 'rgba(255, 255, 255, 0.12)'};
  border-radius: 12px;
  background: ${props => props.$selected ? 'rgba(49, 144, 252, 0.12)' : 'rgba(255, 255, 255, 0.04)'};
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: center;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: #3190FC;
    background: rgba(49, 144, 252, 0.08);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .title {
    font-weight: 600;
    color: ${props => props.$selected ? '#3190FC' : 'rgba(255, 255, 255, 0.85)'};
    margin-bottom: 4px;
    font-size: 14px;
  }

  .description {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
  }
`;

const PrimaryButton = styled.button`
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  min-height: 44px;
  font-family: inherit;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, #3190FC 0%, #009688 100%);
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(49, 144, 252, 0.35);

    &::before {
      left: 100%;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(49, 144, 252, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  padding: 12px 14px;
  background: rgba(217, 48, 37, 0.12);
  border-left: 3px solid #ef4444;
  border-radius: 8px;
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.5;
  animation: ${fadeInUp} 0.3s ease-out;
`;

const LoginPrompt = styled.div`
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  animation: ${fadeInUp} 0.6s ease-out 0.4s both;

  a {
    color: #3190FC;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
      color: #5BA5FD;
    }
  }
`;

const PasswordRequirements = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: -6px;

  ul {
    margin: 4px 0;
    padding-left: 20px;
  }

  li {
    margin: 2px 0;

    &.valid {
      color: #009688;
    }
  }
`;

const LoadingSpinner = styled.span`
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
`;

const CardGlow = styled.div`
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border-radius: 21px;
  background: linear-gradient(135deg, rgba(49, 144, 252, 0.2), transparent 40%, transparent 60%, rgba(0, 150, 136, 0.2));
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;

  ${RegisterCard}:hover & {
    opacity: 1;
  }
`;

/* ═══════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════ */

export default function Register() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('estudiante');
  const [institucion, setInstitucion] = useState(''); // Solo para docentes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!nombre || !email || !password || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (!passwordValid) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (role === 'docente' && !institucion) {
      setError('Los docentes deben indicar su institución');
      return;
    }

    setLoading(true);

    try {
      const metadata = role === 'docente'
        ? { institucion }
        : { cohorte: new Date().getFullYear() + '-A' }; // Cohorte automática para estudiantes

      const { userData } = await registerWithEmail(email, password, nombre, role, metadata);

      logger.log('✅ Registro exitoso, redirigiendo...');

      // Redirigir según el rol
      if (userData.role === 'docente') {
        navigate('/docente/dashboard');
      } else {
        navigate('/estudiante/textos');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterContainer>
      <RegisterCard>
        <CardGlow />
        <LogoArea>
          <LogoIcon>📚</LogoIcon>
          <LogoTitle>Crear Cuenta</LogoTitle>
          <LogoSubtitle>Únete a AppLectura</LogoSubtitle>
        </LogoArea>

        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}

        <Form onSubmit={handleSubmit} noValidate>
          <InputGroup>
            <Label htmlFor="register-role">¿Cuál es tu rol?</Label>
            <RoleSelector>
              <RoleOption
                type="button"
                $selected={role === 'estudiante'}
                onClick={() => setRole('estudiante')}
                disabled={loading}
                aria-pressed={role === 'estudiante'}
              >
                <div className="icon">👨‍🎓</div>
                <div className="title">Estudiante</div>
                <div className="description">Leer y analizar textos</div>
              </RoleOption>

              <RoleOption
                type="button"
                $selected={role === 'docente'}
                onClick={() => setRole('docente')}
                disabled={loading}
                aria-pressed={role === 'docente'}
              >
                <div className="icon">👩‍🏫</div>
                <div className="title">Docente</div>
                <div className="description">Asignar textos y evaluar</div>
              </RoleOption>
            </RoleSelector>
          </InputGroup>

          <InputGroup>
            <Label htmlFor="register-name">Nombre completo</Label>
            <Input
              id="register-name"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              disabled={loading}
              autoComplete="name"
              aria-label="Nombre completo"
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              autoComplete="email"
              aria-label="Dirección de correo electrónico"
            />
          </InputGroup>

          {role === 'docente' && (
            <InputGroup>
              <Label htmlFor="register-institution">Institución</Label>
              <Input
                id="register-institution"
                type="text"
                value={institucion}
                onChange={(e) => setInstitucion(e.target.value)}
                placeholder="Universidad / Colegio"
                disabled={loading}
                aria-label="Nombre de la institución"
              />
            </InputGroup>
          )}

          <InputGroup>
            <Label htmlFor="register-password">Contraseña</Label>
            <Input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="new-password"
              aria-label="Contraseña"
            />
            <PasswordRequirements>
              <ul>
                <li className={passwordValid ? 'valid' : ''}>
                  {passwordValid ? '✓' : '○'} Mínimo 6 caracteres
                </li>
              </ul>
            </PasswordRequirements>
          </InputGroup>

          <InputGroup>
            <Label htmlFor="register-confirm-password">Confirmar contraseña</Label>
            <Input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="new-password"
              aria-label="Confirmar contraseña"
            />
            {confirmPassword && (
              <PasswordRequirements>
                <ul>
                  <li className={passwordsMatch ? 'valid' : ''}>
                    {passwordsMatch ? '✓ Contraseñas coinciden' : '○ Las contraseñas no coinciden'}
                  </li>
                </ul>
              </PasswordRequirements>
            )}
          </InputGroup>

          <PrimaryButton type="submit" disabled={loading} aria-label="Crear cuenta">
            {loading ? (
              <><LoadingSpinner />Creando cuenta...</>
            ) : (
              'Crear Cuenta'
            )}
          </PrimaryButton>
        </Form>

        <LoginPrompt>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </LoginPrompt>
      </RegisterCard>
    </RegisterContainer>
  );
}
