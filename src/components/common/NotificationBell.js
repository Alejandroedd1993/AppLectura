/**
 * NotificationBell.js
 * 🔔 Componente de campana de notificaciones para estudiantes
 * Muestra comentarios del docente sobre los artefactos entregados
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const NotificationBell = ({ theme }) => {
  const { currentUser, userData } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Solo mostrar para estudiantes
  const isEstudiante = userData?.role === 'estudiante';

  // Cargar notificaciones desde Firestore
  useEffect(() => {
    if (!currentUser?.uid || !isEstudiante) {
      console.log('🔔 [NotificationBell] No carga: uid=', currentUser?.uid, 'isEstudiante=', isEstudiante);
      setLoading(false);
      return;
    }

    let unsubscribe = null;

    const loadNotifications = async () => {
      try {
        const { collection, query, limit, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../../firebase/config');

        console.log('🔔 [NotificationBell] Configurando listener para:', currentUser.uid);
        
        const notificationsRef = collection(db, 'students', currentUser.uid, 'notifications');
        // Simplificar query - sin orderBy para evitar necesidad de índice
        const q = query(notificationsRef, limit(50));

        unsubscribe = onSnapshot(q, (snapshot) => {
          console.log('🔔 [NotificationBell] Snapshot recibido:', snapshot.docs.length, 'documentos');
          const notifs = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('🔔 [NotificationBell] Notificación:', doc.id, data);
            return {
              id: doc.id,
              ...data
            };
          });
          // Ordenar por createdAtMs en el cliente
          notifs.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
          setNotifications(notifs);
          setUnreadCount(notifs.filter(n => !n.read).length);
          setLoading(false);
        }, (error) => {
          console.error('🔔 [NotificationBell] Error en snapshot:', error);
          setLoading(false);
        });
      } catch (error) {
        console.error('🔔 [NotificationBell] Error configurando listener:', error);
        setLoading(false);
      }
    };

    loadNotifications();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.uid, isEstudiante]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Marcar notificación como leída
  const markAsRead = async (notificationId) => {
    if (!currentUser?.uid) return;

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      const notifRef = doc(db, 'students', currentUser.uid, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });

      // Actualizar estado local
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    if (!currentUser?.uid || unreadCount === 0) return;

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      const unreadNotifs = notifications.filter(n => !n.read);
      
      await Promise.all(unreadNotifs.map(n => 
        updateDoc(doc(db, 'students', currentUser.uid, 'notifications', n.id), { read: true })
      ));

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  };

  // 🆕 Borrar una notificación individual (no afecta el comentario del docente)
  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation(); // Evitar que se marque como leída al hacer clic
    if (!currentUser?.uid) return;

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      await deleteDoc(doc(db, 'students', currentUser.uid, 'notifications', notificationId));

      // Actualizar estado local
      const deletedNotif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (deletedNotif && !deletedNotif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      console.log('🗑️ Notificación eliminada (el comentario del docente permanece en el artefacto)');
    } catch (error) {
      console.error('Error borrando notificación:', error);
    }
  };

  // 🆕 Borrar todas las notificaciones
  const deleteAllNotifications = async () => {
    if (!currentUser?.uid || notifications.length === 0) return;
    
    if (!window.confirm('¿Borrar todas las notificaciones?\n\nLos comentarios del docente seguirán visibles en tus artefactos.')) {
      return;
    }

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');

      await Promise.all(notifications.map(n => 
        deleteDoc(doc(db, 'students', currentUser.uid, 'notifications', n.id))
      ));

      setNotifications([]);
      setUnreadCount(0);
      console.log('🗑️ Todas las notificaciones eliminadas');
    } catch (error) {
      console.error('Error borrando todas las notificaciones:', error);
    }
  };

  // Formatear fecha relativa
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const time = typeof timestamp === 'number' ? timestamp : 
                 timestamp?.toDate ? timestamp.toDate().getTime() : 
                 new Date(timestamp).getTime();
    
    const seconds = Math.floor((Date.now() - time) / 1000);
    
    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
    return new Date(time).toLocaleDateString();
  };

  // Obtener nombre amigable del artefacto
  const getArtifactDisplayName = (key) => {
    const names = {
      resumenAcademico: '📝 Resumen Académico',
      tablaACD: '📊 Tabla ACD',
      mapaActores: '🗺️ Mapa de Actores',
      respuestaArgumentativa: '💬 Respuesta Argumentativa',
      bitacoraEticaIA: '🤖 Bitácora Ética IA'
    };
    return names[key] || key;
  };

  // No renderizar si no es estudiante
  if (!isEstudiante) return null;

  return (
    <BellContainer ref={dropdownRef}>
      <BellButton 
        onClick={() => setIsOpen(!isOpen)}
        $hasUnread={unreadCount > 0}
        theme={theme}
        title="Notificaciones del docente"
      >
        <BellIcon>🔔</BellIcon>
        {unreadCount > 0 && (
          <Badge
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </BellButton>

      <AnimatePresence>
        {isOpen && (
          <Dropdown
            theme={theme}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <DropdownHeader theme={theme}>
              <HeaderTitle>🔔 Comentarios del Docente</HeaderTitle>
              <HeaderActions>
                {unreadCount > 0 && (
                  <MarkAllButton onClick={markAllAsRead} theme={theme}>
                    ✓ Marcar leídas
                  </MarkAllButton>
                )}
                {notifications.length > 0 && (
                  <ClearAllButton onClick={deleteAllNotifications} theme={theme} title="Borrar todas (los comentarios permanecen en tus artefactos)">
                    🗑️ Limpiar
                  </ClearAllButton>
                )}
              </HeaderActions>
            </DropdownHeader>

            <NotificationsList>
              {loading ? (
                <EmptyState theme={theme}>
                  <span className="icon">⏳</span>
                  <span>Cargando...</span>
                </EmptyState>
              ) : notifications.length === 0 ? (
                <EmptyState theme={theme}>
                  <span className="icon">📭</span>
                  <span>No tienes notificaciones</span>
                  <span className="hint">Aquí aparecerán los comentarios de tu docente sobre tus trabajos</span>
                </EmptyState>
              ) : (
                notifications.map(notif => (
                  <NotificationItem
                    key={notif.id}
                    $unread={!notif.read}
                    theme={theme}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                    whileHover={{ backgroundColor: theme.hover || '#f5f5f5' }}
                  >
                    <NotificationIcon $unread={!notif.read}>
                      {notif.type === 'teacher_comment' ? '💬' : '📢'}
                    </NotificationIcon>
                    <NotificationContent>
                      <NotificationTitle theme={theme}>
                        {getArtifactDisplayName(notif.artifactKey)}
                        {!notif.read && <UnreadDot />}
                      </NotificationTitle>
                      <NotificationMeta theme={theme}>
                        {notif.lecturaTitle && (
                          <span className="lecture">📖 {notif.lecturaTitle}</span>
                        )}
                        <span className="time">{formatTimeAgo(notif.createdAtMs || notif.createdAt)}</span>
                      </NotificationMeta>
                      <NotificationComment theme={theme}>
                        "{notif.comment}"
                      </NotificationComment>
                      <NotificationAuthor theme={theme}>
                        — {notif.docenteNombre || 'Tu docente'}
                      </NotificationAuthor>
                    </NotificationContent>
                    <DeleteNotifButton 
                      onClick={(e) => deleteNotification(notif.id, e)}
                      title="Borrar notificación"
                      theme={theme}
                    >
                      ✕
                    </DeleteNotifButton>
                  </NotificationItem>
                ))
              )}
            </NotificationsList>
          </Dropdown>
        )}
      </AnimatePresence>
    </BellContainer>
  );
};

// Styled Components
const BellContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const BellButton = styled.button`
  position: relative;
  background: ${props => props.$hasUnread ? `${props.theme.primary || '#3190FC'}15` : 'transparent'};
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.hover || '#f0f0f0'};
    transform: scale(1.05);
  }

  ${props => props.$hasUnread && `
    animation: bellShake 0.5s ease-in-out;
    
    @keyframes bellShake {
      0%, 100% { transform: rotate(0); }
      25% { transform: rotate(-10deg); }
      50% { transform: rotate(10deg); }
      75% { transform: rotate(-5deg); }
    }
  `}
`;

const BellIcon = styled.span`
  font-size: 1.4rem;
`;

const Badge = styled(motion.span)`
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
`;

const Dropdown = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: ${props => props.theme.cardBg || '#ffffff'};
  border: 1px solid ${props => props.theme.border || '#e0e0e0'};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
`;

const DropdownHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.border || '#e0e0e0'};
  background: ${props => props.theme.surfaceAlt || '#f8f9fa'};
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
`;

const MarkAllButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.primary || '#3190FC'};
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background: ${props => props.theme.primary || '#3190FC'}15;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ClearAllButton = styled.button`
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background: #ef444415;
  }
`;

const DeleteNotifButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: ${props => props.theme.textMuted || '#999'};
  font-size: 0.9rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s ease;

  &:hover {
    background: #ef444420;
    color: #ef4444;
  }
`;

const NotificationsList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const NotificationItem = styled(motion.div)`
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  padding-right: 2rem;
  border-bottom: 1px solid ${props => props.theme.border || '#e0e0e0'}50;
  cursor: pointer;
  background: ${props => props.$unread ? `${props.theme.primary || '#3190FC'}08` : 'transparent'};

  &:last-child {
    border-bottom: none;
  }

  &:hover ${DeleteNotifButton} {
    opacity: 1;
  }
`;

const NotificationIcon = styled.div`
  font-size: 1.5rem;
  flex-shrink: 0;
  opacity: ${props => props.$unread ? 1 : 0.6};
`;

const NotificationContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotificationTitle = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: ${props => props.theme.text || '#333'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UnreadDot = styled.span`
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
`;

const NotificationMeta = styled.div`
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: ${props => props.theme.textMuted || '#666'};
  margin-top: 0.25rem;

  .lecture {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const NotificationComment = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${props => props.theme.surfaceAlt || '#f8f9fa'};
  border-radius: 8px;
  font-size: 0.85rem;
  color: ${props => props.theme.text || '#333'};
  font-style: italic;
  line-height: 1.4;
`;

const NotificationAuthor = styled.div`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: ${props => props.theme.primary || '#3190FC'};
  text-align: right;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.textMuted || '#666'};

  .icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
  }

  .hint {
    font-size: 0.8rem;
    margin-top: 0.5rem;
    opacity: 0.7;
  }
`;

export default NotificationBell;
