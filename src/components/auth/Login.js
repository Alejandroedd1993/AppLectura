/**
 * Componente de Login — Diseño editorial asimétrico
 * Layout split: panel visual izquierdo + formulario derecho
 * Estética: tipografía expresiva, formas orgánicas, sin glassmorphism genérico
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { loginWithEmail, loginWithGoogle, resetPassword } from '../../firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { isConfigValid } from '../../firebase/config';

import logger from '../../utils/logger';

/* ═══════════════════════════════════════════
   ANIMACIONES
   ═══════════════════════════════════════════ */

const reveal = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const drift = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33%      { transform: translate(12px, -8px) rotate(1deg); }
  66%      { transform: translate(-6px, 4px) rotate(-0.5deg); }
`;

const breathe = keyframes`
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

/* ═══════════════════════════════════════════
   PALETA
   ═══════════════════════════════════════════ */
const C = {
  ink: '#0b1120',
  inkSoft: '#1a2340',
  paper: '#f4f1ec',
  paperWarm: '#ede8e0',
  accent: '#3190FC',
  teal: '#009688',
  textDark: '#2c2c35',
  textMid: '#6b6b78',
  textLight: '#a0a0ac',
  danger: '#d93025',
  dangerBg: '#fef2f2',
  successBg: '#ecfdf5',
  successText: '#065f46',
};

/* ═══════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════ */

const Shell = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

/* ---------- PANEL IZQUIERDO (visual) ---------- */

const BrandPanel = styled.div`
  background: ${C.ink};
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 48px;
  overflow: hidden;

  @media (max-width: 860px) {
    display: none;
  }
`;

/* Formas orgánicas decorativas */
const Blob = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  animation: ${drift} 20s ease-in-out infinite;
`;

const BlobAccent = styled(Blob)`
  width: 340px;
  height: 340px;
  background: ${C.accent};
  opacity: 0.12;
  top: 10%;
  left: -8%;
  animation-delay: -3s;
`;

const BlobTeal = styled(Blob)`
  width: 280px;
  height: 280px;
  background: ${C.teal};
  opacity: 0.10;
  bottom: 5%;
  right: -5%;
  animation-delay: -10s;
`;

const BrandContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 380px;
  animation: ${reveal} 0.8s ease-out both;
`;

const BrandIcon = styled.div`
  margin-bottom: 28px;
  line-height: 0;
`;

/**
 * Logo SVG — Cerebro geométrico tipo circuito/laberinto dentro de círculo.
 * Reproduce fielmente el diseño original del usuario.
 * Funciona sobre fondo claro u oscuro sin artefactos.
 */
const BrainLogo = ({ size = 72, light = false }) => {
  // Sobre fondo oscuro: trazo claro. Sobre fondo claro: trazo oscuro.
  const stroke = light ? '#1b3a5c' : 'rgba(255,255,255,0.9)';
  const accent = light ? '#3190FC' : '#3190FC';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Círculo exterior */}
      <circle cx="60" cy="60" r="55" stroke={stroke} strokeWidth="3.5" fill="none" opacity="0.85" />

      {/* ── Hemisferio izquierdo ── */}
      {/* Lóbulo frontal superior izq */}
      <path d="M58 30 C52 30, 42 32, 38 40 C34 48, 36 52, 40 54" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Lóbulo parietal izq */}
      <path d="M40 54 C36 58, 32 62, 32 68 C32 74, 36 78, 42 80" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Lóbulo temporal izq */}
      <path d="M42 80 C46 84, 52 86, 56 88" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Surco central izq */}
      <path d="M48 38 C44 44, 42 50, 44 56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Surco lateral izq */}
      <path d="M38 62 C42 66, 44 72, 46 76" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Conexiones internas izq (circuito) */}
      <path d="M50 44 L44 50 L50 56" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      <path d="M42 64 L48 68 L42 74" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />

      {/* ── Hemisferio derecho ── */}
      {/* Lóbulo frontal superior der */}
      <path d="M62 30 C68 30, 78 32, 82 40 C86 48, 84 52, 80 54" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Lóbulo parietal der */}
      <path d="M80 54 C84 58, 88 62, 88 68 C88 74, 84 78, 78 80" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Lóbulo temporal der */}
      <path d="M78 80 C74 84, 68 86, 64 88" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Surco central der */}
      <path d="M72 38 C76 44, 78 50, 76 56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Surco lateral der */}
      <path d="M82 62 C78 66, 76 72, 74 76" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Conexiones internas der (circuito) */}
      <path d="M70 44 L76 50 L70 56" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      <path d="M78 64 L72 68 L78 74" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />

      {/* ── Fisura interhemisférica (línea central) ── */}
      <path d="M60 28 L60 88" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />

      {/* ── Tallo cerebral ── */}
      <path d="M56 88 C58 92, 58 96, 56 100" stroke={stroke} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M64 88 C62 92, 62 96, 64 100" stroke={stroke} strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Nodos de red neuronal (puntos brillantes) */}
      <circle cx="50" cy="44" r="2" fill={accent} opacity="0.7" />
      <circle cx="70" cy="44" r="2" fill={accent} opacity="0.7" />
      <circle cx="44" cy="56" r="2" fill={accent} opacity="0.5" />
      <circle cx="76" cy="56" r="2" fill={accent} opacity="0.5" />
      <circle cx="48" cy="68" r="2" fill={accent} opacity="0.5" />
      <circle cx="72" cy="68" r="2" fill={accent} opacity="0.5" />
      <circle cx="60" cy="36" r="2" fill={accent} opacity="0.6" />
    </svg>
  );
};

const BrandName = styled.h1`
  font-size: 42px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -1.5px;
  margin: 0 0 12px 0;
  line-height: 1.1;
`;

const BrandAccent = styled.span`
  background: linear-gradient(135deg, ${C.accent}, ${C.teal});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const BrandTagline = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 40px 0;
  font-weight: 400;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255,255,255,0.65);
  font-size: 14px;
  line-height: 1.4;
  animation: ${reveal} 0.6s ease-out both;
  animation-delay: ${p => p.$delay || '0s'};
`;

const FeatureDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color || C.accent};
  flex-shrink: 0;
  animation: ${breathe} 3s ease-in-out infinite;
  animation-delay: ${p => p.$delay || '0s'};
`;

/* Cita inspiracional */
const QuoteBlock = styled.blockquote`
  margin: 48px 0 0 0;
  padding: 20px 0 0 20px;
  border-left: 2px solid rgba(255,255,255,0.12);
  animation: ${reveal} 0.8s ease-out 0.6s both;
`;

const QuoteText = styled.p`
  color: rgba(255,255,255,0.4);
  font-size: 14px;
  font-style: italic;
  line-height: 1.6;
  margin: 0 0 8px 0;
`;

const QuoteAuthor = styled.span`
  color: rgba(255,255,255,0.25);
  font-size: 12px;
`;

/* ---------- PANEL DERECHO (formulario) ---------- */

const FormPanel = styled.div`
  background: ${C.paper};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  position: relative;
  overflow: hidden;

  /* Acento decorativo sutil */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, ${C.accent}, ${C.teal});

    @media (min-width: 861px) {
      width: 3px;
      height: 100%;
      top: 0;
      left: 0;
      background: linear-gradient(180deg, ${C.accent}, ${C.teal});
    }
  }
`;

const FormWrap = styled.div`
  width: 100%;
  max-width: 380px;
  animation: ${reveal} 0.6s ease-out both;
`;

/* Cabecera de formulario (mobile muestra marca, desktop muestra saludo) */
const FormHeader = styled.div`
  margin-bottom: 36px;
`;

const MobileBrand = styled.div`
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;

  @media (max-width: 860px) {
    display: flex;
  }

  .icon { font-size: 28px; }
  .name {
    font-size: 22px;
    font-weight: 800;
    color: ${C.textDark};
    letter-spacing: -0.5px;
  }
`;

const Greeting = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: ${C.textDark};
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
`;

const GreetingSub = styled.p`
  color: ${C.textMid};
  font-size: 15px;
  margin: 0;
  line-height: 1.5;
`;

/* Inputs estilo editorial */
const Form_ = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FieldGroup = styled.div`
  position: relative;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: ${C.textMid};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 14px 0;
  background: transparent;
  border: none;
  border-bottom: 2px solid #d4d0c8;
  font-size: 16px;
  color: ${C.textDark};
  font-family: inherit;
  transition: border-color 0.3s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${C.textLight};
  }

  &:focus {
    outline: none;
    border-bottom-color: ${C.accent};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PasswordRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ForgotLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: ${C.accent};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.2s;

  &:hover { opacity: 0.7; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

/* Botones */
const SubmitBtn = styled.button`
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  background: ${C.ink};
  color: #fff;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
  min-height: 52px;
  position: relative;
  overflow: hidden;
  margin-top: 4px;

  &:hover:not(:disabled) {
    background: ${C.inkSoft};
    box-shadow: 0 8px 32px rgba(11, 17, 32, 0.25);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SeparatorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 4px 0;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #d4d0c8;
  }

  span {
    color: ${C.textLight};
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
`;

const GoogleBtn = styled.button`
  width: 100%;
  padding: 14px;
  border: 2px solid #d4d0c8;
  border-radius: 12px;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  color: ${C.textDark};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.25s ease;
  min-height: 52px;

  svg { width: 20px; height: 20px; flex-shrink: 0; }

  &:hover:not(:disabled) {
    border-color: ${C.accent};
    box-shadow: 0 4px 16px rgba(49, 144, 252, 0.1);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* Mensajes */
const Alert = styled.div`
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  animation: ${reveal} 0.3s ease-out;

  &.error {
    background: ${C.dangerBg};
    color: ${C.danger};
    border: 1px solid #fecaca;
  }

  &.success {
    background: ${C.successBg};
    color: ${C.successText};
    border: 1px solid #a7f3d0;
  }
`;

const Footer = styled.p`
  text-align: center;
  margin: 28px 0 0 0;
  font-size: 13px;
  color: ${C.textLight};
  line-height: 1.5;
`;

const LoadingSpin = styled.span`
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255,255,255,0.25);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.55s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
`;

/* Cursor parpadeante decorativo */
const TypeCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1em;
  background: ${C.accent};
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: ${breathe} 1s step-end infinite;
`;

/* ═══════════════════════════════════════════
   CITAS ROTATIVAS
   ═══════════════════════════════════════════ */
const QUOTES = [
  { text: 'La lectura crítica no es leer contra el texto, sino leer con el texto y más allá de él.', author: 'Daniel Cassany' },
  { text: 'Leer no es descifrar; es construir sentido a partir de signos.', author: 'Emilia Ferreiro' },
  { text: 'No se trata de leer más, sino de leer mejor.', author: 'Paulo Freire' },
  { text: 'El pensamiento crítico comienza donde terminan las certezas.', author: 'Teun van Dijk' },
];

/* ═══════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════ */

export default function Login() {
  const { currentUser, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  useEffect(() => {
    logger.log('🔍 [Login] Config status:', { isConfigValid });
    if (!isConfigValid) {
      logger.error('❌ [Login] Configuración de Firebase inválida');
      setError('⚠️ Error Crítico: Faltan las credenciales de Firebase o son inválidas. Verifica tu archivo .env (API Key y Auth Domain).');
    }
  }, []);

  if (authLoading) {
    return (
      <Shell>
        <BrandPanel><BlobAccent /><BlobTeal /></BrandPanel>
        <FormPanel>
          <FormWrap style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}><BrainLogo size={56} light /></div>
            <Greeting>AppLectura</Greeting>
            <GreetingSub>Cargando…</GreetingSub>
          </FormWrap>
        </FormPanel>
      </Shell>
    );
  }

  if (currentUser) return null;

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
      logger.log('✅ Login exitoso');
      setSuccess('¡Inicio de sesión exitoso! Bienvenido.');
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
      logger.log('🔵 [Login] Iniciando proceso de Google Sign-In...');
      const result = await loginWithGoogle('estudiante');
      logger.log('✅ [Login] Google Sign-In exitoso:', result);
      setSuccess('¡Inicio de sesión con Google exitoso!');
    } catch (err) {
      logger.error('❌ [Login] Error en Google Sign-In:', err);

      let msg = err.message;
      if (err.code === 'auth/internal-error') {
        msg = 'Error de conexión con Google. Posibles causas:\n1. Bloqueo de red/firewall.\n2. Auth Domain incorrecto en .env.\n3. API Key inválida.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Inicio de sesión cancelado.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'El navegador bloqueó la ventana emergente. Por favor permítela para iniciar sesión.';
      }

      setError(msg || 'Error al iniciar sesión con Google. Intenta de nuevo.');
      setLoading(false);
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
    <Shell>
      {/* ── Panel visual ── */}
      <BrandPanel>
        <BlobAccent />
        <BlobTeal />

        <BrandContent>
          <BrandIcon><BrainLogo size={72} /></BrandIcon>
          <BrandName>
            App<BrandAccent>Lectura</BrandAccent>
          </BrandName>
          <BrandTagline>
            Literacidad crítica potenciada por inteligencia artificial.
            Aprende a leer entre líneas.
          </BrandTagline>

          <FeatureList>
            <FeatureItem $delay="0.3s">
              <FeatureDot $color={C.accent} $delay="0s" />
              Tutor IA adaptativo con detección Bloom
            </FeatureItem>
            <FeatureItem $delay="0.45s">
              <FeatureDot $color={C.teal} $delay="1s" />
              Análisis Crítico del Discurso (ACD)
            </FeatureItem>
            <FeatureItem $delay="0.6s">
              <FeatureDot $color="#f59e0b" $delay="2s" />
              Rúbricas formativas con retroalimentación
            </FeatureItem>
            <FeatureItem $delay="0.75s">
              <FeatureDot $color="#a78bfa" $delay="3s" />
              Gamificación pedagógica significativa
            </FeatureItem>
          </FeatureList>

          <QuoteBlock>
            <QuoteText>"{quote.text}"</QuoteText>
            <QuoteAuthor>— {quote.author}</QuoteAuthor>
          </QuoteBlock>
        </BrandContent>
      </BrandPanel>

      {/* ── Panel formulario ── */}
      <FormPanel>
        <FormWrap>
          <FormHeader>
            <MobileBrand>
              <BrainLogo size={30} light />
              <span className="name">AppLectura</span>
            </MobileBrand>
            <Greeting>Bienvenido<TypeCursor /></Greeting>
            <GreetingSub>Inicia sesión para continuar tu aprendizaje</GreetingSub>
          </FormHeader>

          {error && <Alert className="error" role="alert">{error}</Alert>}
          {success && <Alert className="success" role="status">{success}</Alert>}

          <Form_ onSubmit={handleEmailLogin} noValidate>
            <FieldGroup>
              <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
              <FieldInput
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@institución.edu"
                disabled={loading}
                autoComplete="email"
                aria-label="Correo electrónico"
              />
            </FieldGroup>

            <FieldGroup>
              <PasswordRow>
                <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                <ForgotLink
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Recuperar
                </ForgotLink>
              </PasswordRow>
              <FieldInput
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
                aria-label="Contraseña"
              />
            </FieldGroup>

            <SubmitBtn type="submit" disabled={loading} aria-label="Iniciar sesión">
              {loading ? (
                <><LoadingSpin />Iniciando sesión…</>
              ) : (
                'Iniciar Sesión →'
              )}
            </SubmitBtn>
          </Form_>

          <SeparatorRow><span>o</span></SeparatorRow>

          <GoogleBtn
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
            aria-label="Iniciar sesión con Google"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </GoogleBtn>

          <Footer>
            ¿No tienes cuenta? Contacta a tu docente para obtener acceso
          </Footer>
        </FormWrap>
      </FormPanel>
    </Shell>
  );
}
