/**
 * Componente de Registro
 * Permite crear cuenta con Email/Password y seleccionar rol
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { registerWithEmail } from '../../firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 20px;
`;

const RegisterCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  max-width: 500px;
  width: 100%;
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 8px 0;
  }
  
  p {
    color: #666;
    margin: 0;
    font-size: 14px;
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
    border-color: #f5576c;
    box-shadow: 0 0 0 3px rgba(245, 87, 108, 0.1);
  }
  
  &:disabled {
    background: #f5f5f5;
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
  border: 2px solid ${props => props.$selected ? '#f5576c' : '#e0e0e0'};
  border-radius: 12px;
  background: ${props => props.$selected ? 'rgba(245, 87, 108, 0.1)' : 'white'};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  
  &:hover:not(:disabled) {
    border-color: #f5576c;
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .icon {
    font-size: 32px;
    margin-bottom: 8px;
  }
  
  .title {
    font-weight: 600;
    color: ${props => props.$selected ? '#f5576c' : '#333'};
    margin-bottom: 4px;
  }
  
  .description {
    font-size: 12px;
    color: #666;
  }
`;

const PrimaryButton = styled.button`
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(245, 87, 108, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

const LoginPrompt = styled.div`
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;
  
  a {
    color: #f5576c;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const PasswordRequirements = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: -8px;
  
  ul {
    margin: 4px 0;
    padding-left: 20px;
  }
  
  li {
    margin: 2px 0;
    
    &.valid {
      color: #4a4;
    }
  }
`;

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
      
      console.log('✅ Registro exitoso, redirigiendo...');
      
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
        <Logo>
          <h1>📚 Crear Cuenta</h1>
          <p>Únete a AppLectura</p>
        </Logo>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label>¿Cuál es tu rol?</Label>
            <RoleSelector>
              <RoleOption
                type="button"
                $selected={role === 'estudiante'}
                onClick={() => setRole('estudiante')}
                disabled={loading}
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
              >
                <div className="icon">👩‍🏫</div>
                <div className="title">Docente</div>
                <div className="description">Asignar textos y evaluar</div>
              </RoleOption>
            </RoleSelector>
          </InputGroup>
          
          <InputGroup>
            <Label>Nombre completo</Label>
            <Input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              disabled={loading}
            />
          </InputGroup>
          
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
          
          {role === 'docente' && (
            <InputGroup>
              <Label>Institución</Label>
              <Input
                type="text"
                value={institucion}
                onChange={(e) => setInstitucion(e.target.value)}
                placeholder="Universidad / Colegio"
                disabled={loading}
              />
            </InputGroup>
          )}
          
          <InputGroup>
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
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
            <Label>Confirmar contraseña</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
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
          
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? '⏳ Creando cuenta...' : '🎉 Crear Cuenta'}
          </PrimaryButton>
        </Form>
        
        <LoginPrompt>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </LoginPrompt>
      </RegisterCard>
    </RegisterContainer>
  );
}

