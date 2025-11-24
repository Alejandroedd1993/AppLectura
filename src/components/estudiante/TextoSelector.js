/**
 * TextoSelector - Componente para que estudiantes vean y seleccionen textos asignados
 * 
 * Funcionalidades:
 * - Lista de textos asignados por el docente
 * - Cards con preview y estado de progreso
 * - Navegación a lectura/actividades
 * - Indicadores de completitud por rúbrica
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTextosEstudiante } from '../../firebase/firestore';
import { getAllStudentProgress } from '../../firebase/firestore';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 40px auto;
  text-align: center;
  color: white;
  
  h1 {
    font-size: 42px;
    font-weight: 700;
    margin: 0 0 12px 0;
  }
  
  p {
    font-size: 18px;
    opacity: 0.9;
    margin: 0;
  }
`;

const UserInfo = styled.div`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px 30px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .info {
    display: flex;
    gap: 30px;
    
    .item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .label {
        font-size: 12px;
        opacity: 0.8;
        text-transform: uppercase;
      }
      
      .value {
        font-size: 16px;
        font-weight: 600;
      }
    }
  }
  
  .logout-btn {
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }
  }
`;

const TextosGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
`;

const TextoCard = styled(motion.div)`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }
`;

const CardHeader = styled.div`
  background: ${props => props.$completed ? 
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  };
  padding: 24px;
  color: white;
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 700;
  }
  
  .meta {
    font-size: 14px;
    opacity: 0.9;
    display: flex;
    gap: 16px;
    
    span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
`;

const CardBody = styled.div`
  padding: 24px;
`;

const ProgressSection = styled.div`
  margin-bottom: 20px;
  
  .label {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 8px;
    font-weight: 600;
  }
  
  .progress-bar {
    background: #e0e0e0;
    border-radius: 8px;
    height: 8px;
    overflow: hidden;
    
    .fill {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }
  }
  
  .percentage {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin-top: 8px;
  }
`;

const RubricasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 20px;
`;

const RubricaBadge = styled.div`
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: ${props => props.$completed ? '#e8f5e9' : '#fafafa'};
  border: 2px solid ${props => props.$completed ? '#4caf50' : '#e0e0e0'};
  
  .icon {
    font-size: 16px;
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 10px;
    color: ${props => props.$completed ? '#2e7d32' : '#999'};
    font-weight: 600;
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 12px;
  
  button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
      }
    }
    
    &.secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      
      &:hover {
        background: #f5f5ff;
      }
    }
  }
`;

const EmptyState = styled.div`
  max-width: 600px;
  margin: 100px auto;
  text-align: center;
  color: white;
  
  .icon {
    font-size: 80px;
    margin-bottom: 20px;
  }
  
  h2 {
    font-size: 32px;
    margin: 0 0 12px 0;
  }
  
  p {
    font-size: 18px;
    opacity: 0.9;
  }
`;

const LoadingState = styled.div`
  max-width: 600px;
  margin: 100px auto;
  text-align: center;
  color: white;
  
  .spinner {
    font-size: 60px;
    animation: spin 2s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  p {
    font-size: 18px;
    margin-top: 20px;
  }
`;

export default function TextoSelector() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [textos, setTextos] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    loadTextos();
  }, [currentUser]);

  const loadTextos = async () => {
    try {
      setLoading(true);

      // Cargar textos asignados
      const textosAsignados = await getTextosEstudiante(currentUser.uid);
      
      // Cargar progreso de todos los textos
      const allProgress = await getAllStudentProgress(currentUser.uid);
      
      // Mapear progreso por textoId
      const progressMap = {};
      allProgress.forEach(p => {
        progressMap[p.textoId] = p;
      });
      
      setTextos(textosAsignados);
      setProgressData(progressMap);

    } catch (error) {
      console.error('Error cargando textos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { logout } = await import('../../firebase/auth');
    await logout();
    navigate('/login');
  };

  const calculateProgress = (textoId) => {
    const progress = progressData[textoId];
    if (!progress) return { percentage: 0, completed: 0, total: 5 };

    let completed = 0;
    for (let i = 1; i <= 5; i++) {
      if (progress[`rubrica${i}`]) {
        completed++;
      }
    }

    return {
      percentage: (completed / 5) * 100,
      completed,
      total: 5
    };
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <div className="spinner">🔄</div>
          <p>Cargando tus textos...</p>
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>📚 Mis Textos Asignados</h1>
        <p>Selecciona un texto para continuar tu lectura y actividades</p>
      </Header>

      <UserInfo>
        <div className="info">
          <div className="item">
            <span className="label">Estudiante</span>
            <span className="value">👤 {userData?.nombre || 'Usuario'}</span>
          </div>
          <div className="item">
            <span className="label">Textos Activos</span>
            <span className="value">📖 {textos.length}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 Cerrar Sesión
        </button>
      </UserInfo>

      {textos.length === 0 ? (
        <EmptyState>
          <div className="icon">📭</div>
          <h2>No tienes textos asignados</h2>
          <p>Tu docente aún no te ha asignado ningún texto para trabajar.</p>
        </EmptyState>
      ) : (
        <TextosGrid>
          {textos.map((texto, index) => {
            const progress = calculateProgress(texto.id);
            const isCompleted = progress.completed === 5;

            return (
              <TextoCard
                key={texto.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CardHeader $completed={isCompleted}>
                  <h3>{texto.titulo}</h3>
                  <div className="meta">
                    <span>✍️ {texto.autor || 'Autor desconocido'}</span>
                    <span>📂 {texto.genero || 'General'}</span>
                  </div>
                </CardHeader>

                <CardBody>
                  <ProgressSection>
                    <div className="label">Progreso General</div>
                    <div className="progress-bar">
                      <div className="fill" style={{ width: `${progress.percentage}%` }} />
                    </div>
                    <div className="percentage">{Math.round(progress.percentage)}% completado</div>
                  </ProgressSection>

                  <div className="label" style={{ marginBottom: 12 }}>Rúbricas</div>
                  <RubricasGrid>
                    {[1, 2, 3, 4, 5].map(i => (
                      <RubricaBadge
                        key={i}
                        $completed={!!progressData[texto.id]?.[`rubrica${i}`]}
                      >
                        <div className="icon">
                          {progressData[texto.id]?.[`rubrica${i}`] ? '✅' : '⭕'}
                        </div>
                        <div className="label">R{i}</div>
                      </RubricaBadge>
                    ))}
                  </RubricasGrid>

                  <CardActions>
                    <button
                      className="primary"
                      onClick={() => navigate(`/estudiante/lectura/${texto.id}`)}
                    >
                      📖 Leer Texto
                    </button>
                    <button
                      className="secondary"
                      onClick={() => navigate(`/estudiante/actividades/${texto.id}`)}
                    >
                      📝 Actividades
                    </button>
                  </CardActions>
                </CardBody>
              </TextoCard>
            );
          })}
        </TextosGrid>
      )}
    </Container>
  );
}

