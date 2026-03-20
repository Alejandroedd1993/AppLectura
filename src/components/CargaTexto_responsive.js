import React, { useState, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

// Componentes y utilidades
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { procesarArchivo } from '../utils/fileProcessor';
import { checkBackendAvailability, processPdfWithBackend } from '../utils/backendUtils';
import { checkUnsaveDrafts, getWarningMessage } from '../utils/checkUnsaveDrafts';
import { hashText } from '../utils/netUtils';
import { uploadSessionPdfFile } from '../firebase/firestore';

// Componentes de UI
import AlertMessage from '../components/AlertMessage';
import SessionsHistory from './common/SessionsHistory';

import logger from '../utils/logger';
// Estilos optimizados para sidebar
const CargaContainer = styled(motion.div)`
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  @media (max-width: 640px) {
    padding: 0.75rem;
    gap: 0.75rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${props => props.theme.border};
  flex-wrap: wrap;
`;

const Title = styled.h3`
  margin: 0;
  font-size: clamp(1rem, 2.4vw, 1.1rem);
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const Icon = styled.span`
  font-size: 1.5rem;
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
`;

const CompactDropZone = styled(motion.div)`
  border: 2px dashed ${props => props.$isDragActive ? props.theme.primary : props.theme.border};
  border-radius: 8px;
  padding: 1.5rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$isDragActive ? props.theme.primary + '10' : 'transparent'};
  
  &:hover {
    border-color: ${props => props.theme.primary};
    background: ${props => props.theme.surfaceHover};
  }

  @media (max-width: 640px) {
    padding: 1rem 0.75rem;
  }
`;

const DropZoneContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.textMuted};
  font-size: 0.9rem;
`;

const FileIcon = styled.span`
  font-size: 2rem;
  color: ${props => props.theme.primary};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  max-height: 200px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.border};
  border-radius: 6px;
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.primary}20;
  }
  
  &::placeholder {
    color: ${props => props.theme.textMuted};
  }

  @media (max-width: 640px) {
    min-height: 100px;
  }
`;

const SubmitButton = styled(motion.button)`
  background: ${props => props.theme.success};
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  min-height: 44px;
  touch-action: manipulation;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const FileInfo = styled(motion.div)`
  background: ${props => props.theme.success}15;
  border: 1px solid ${props => props.theme.success}50;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const FileDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const FileName = styled.span`
  font-weight: 600;
  color: ${props => props.theme.text};
`;

const FileStats = styled.span`
  color: ${props => props.theme.textMuted};
  font-size: 0.8rem;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.error};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 1.2rem;
  min-height: 32px;
  min-width: 32px;
  touch-action: manipulation;
  
  &:hover {
    background: ${props => props.theme.error}20;
  }
`;

const LoadingIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: ${props => props.theme.primary};
  font-size: 0.9rem;
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${props => props.theme.border};
  border-top: 2px solid ${props => props.theme.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const StatusSection = styled.div`
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.border};
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.85rem;
  color: ${props => props.theme.textMuted};
`;

function CargaTexto() {
  const {
    setTexto,
    texto,
    loading,
    setLoading,
    error,
    setError,
    modoOscuro,
    archivoActual,
    setArchivoActual,
    setTextStructure,
    // NUEVO: Función de análisis automático
    analyzeDocument,
    setCompleteAnalysis,
    // NUEVO: Función para crear sesiones
    createSession: _createSession,
    currentTextoId,
    rubricProgress,
    activitiesProgress, // 🆕 FASE 4: Para verificar artefactos ya entregados
    switchLecture,
    currentUser,
    sourceCourseId // 🔧 FIX CROSS-COURSE: Para scope de borradores
  } = useContext(AppContext);

  const { isDocente: _isDocente } = useAuth();

  const theme = modoOscuro ? darkTheme : lightTheme;

  // Estados locales
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [archivoFuente, setArchivoFuente] = useState(null); // File original para generar ObjectURL
  const [textoIngresado, setTextoIngresado] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Manejar selección de archivo
  const handleFileSelect = useCallback(async (file) => {
    logger.log('🔍 Iniciando procesamiento de archivo:', file.name, file.type, file.size);
    setError('');
    setProcesando(true);

    try {
      // Validar archivo básico
      if (!file) {
        throw new Error('No se seleccionó ningún archivo');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('El archivo es demasiado grande (máximo 10MB)');
      }

      const fileName = file.name.toLowerCase();
      const isValidType = fileName.endsWith('.txt') ||
        fileName.endsWith('.pdf') ||
        fileName.endsWith('.docx') ||
        file.type === 'text/plain' ||
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (!isValidType) {
        throw new Error('Formato de archivo no soportado. Use TXT, PDF o DOCX');
      }

      logger.log('📋 Validación básica completada');

      let contenido = '';

      // Procesar según el tipo de archivo
      if (fileName.endsWith('.txt') || file.type === 'text/plain') {
        logger.log('📝 Procesando archivo TXT...');
        contenido = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsText(file);
        });
      } else if (fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        logger.log('📄 Procesando archivo DOCX...');
        try {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.default.extractRawText({ arrayBuffer });
          contenido = result.value;
        } catch (err) {
          throw new Error(`Error al procesar DOCX: ${err.message}`);
        }
      } else if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
        logger.log('📕 Procesando archivo PDF...');
        // Verificar si el backend está disponible
        const isBackendAvailable = await checkBackendAvailability();

        if (!isBackendAvailable) {
          logger.warn('🔄 Backend no disponible, usando procesamiento con fallback');
          // En lugar de lanzar un error, usar el procesador con fallback
          const result = await procesarArchivo(file, {
            analyzeStructure: true,
            onProgress: (progress) => {
              logger.log('📊 Progreso:', progress.message || progress);
            }
          });

          // result puede ser string o { text, structure, hasStructure }
          if (typeof result === 'object' && result.text) {
            contenido = result.text;
            if (result.hasStructure && result.structure) {
              logger.log('✨ Estructura detectada por IA:', result.structure);
              setTextStructure(result.structure);
            }
          } else {
            contenido = result;
          }
        } else {
          try {
            const pdfText = await processPdfWithBackend(file);
            if (!pdfText || pdfText.trim().length === 0) {
              throw new Error('No se pudo extraer texto del PDF. El archivo puede estar vacío o contener solo imágenes.');
            }

            contenido = pdfText;
          } catch (backendError) {
            logger.warn('🔄 Error con backend, usando fallback:', backendError.message);
            // Si falla el backend, usar el procesador con fallback
            const result = await procesarArchivo(file, {
              analyzeStructure: true,
              onProgress: (progress) => {
                logger.log('📊 Progreso:', progress.message || progress);
              }
            });

            if (typeof result === 'object' && result.text) {
              contenido = result.text;
              if (result.hasStructure && result.structure) {
                logger.log('✨ Estructura detectada por IA:', result.structure);
                setTextStructure(result.structure);
              }
            } else {
              contenido = result;
            }
          }
        }
      } else {
        throw new Error('Formato no soportado. Use archivos TXT, DOCX o PDF.');
      }

      if (!contenido || contenido.trim().length === 0) {
        throw new Error('El archivo está vacío o no se pudo leer el contenido');
      }

      logger.log('� Contenido extraído:', contenido.length, 'caracteres');

      // Crear metadatos básicos
      const words = contenido.split(/\s+/).filter(word => word.length > 0).length;
      const metadatos = {
        palabras: words,
        caracteres: contenido.length,
        tiempoLectura: Math.ceil(words / 200)
      };

      logger.log('📊 Metadatos calculados:', metadatos);

      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        contenido: contenido,
        metadatos: metadatos
      };

      logger.log('✅ Archivo procesado exitosamente, estableciendo en estado');
      setArchivoSeleccionado(fileData);
      setArchivoFuente(file);

    } catch (err) {
      logger.error('❌ Error procesando archivo:', err);
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setProcesando(false);
    }
  }, [setError]);

  // Manejar drop de archivos
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    logger.log('📂 Archivos dropeados:', files.length, files);
    if (files.length > 0) {
      logger.log('📝 Procesando primer archivo:', files[0].name);
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  // Manejar envío
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // 🆕 Verificar si hay borradores sin evaluar antes de cargar nuevo texto (FASE 4: también considera activitiesProgress)
    const { hasDrafts } = checkUnsaveDrafts(currentTextoId, rubricProgress, activitiesProgress, sourceCourseId);
    if (hasDrafts && texto) {
      const warningMessage = getWarningMessage(currentTextoId, rubricProgress, activitiesProgress, sourceCourseId);
      const confirmed = window.confirm(warningMessage);

      if (!confirmed) {
        logger.log('❌ [CargaTexto] Carga cancelada por el usuario');
        return;
      }
    }

    logger.log('handleSubmit ejecutado - Estado:', {
      archivoSeleccionado: !!archivoSeleccionado,
      contenidoArchivo: !!archivoSeleccionado?.contenido,
      textoIngresado: textoIngresado,
      textoTrimmed: textoIngresado.trim(),
      loading,
      error
    });

    setError('');
    setLoading(true);

    try {
      let contenidoFinal = '';

      if (archivoSeleccionado?.contenido) {
        contenidoFinal = archivoSeleccionado.contenido;
        logger.log('Usando contenido del archivo');
      } else if (textoIngresado.trim()) {
        contenidoFinal = textoIngresado.trim();
        logger.log('Usando texto ingresado:', contenidoFinal);
      } else {
        throw new Error('Por favor, selecciona un archivo o ingresa texto.');
      }

      logger.log('Estableciendo texto en contexto:', contenidoFinal.substring(0, 100) + '...');

      // 🆕 FIX CRÍTICO: Asegurar nuevo textoId por carga para evitar reutilizar cache/lectura anterior
      const sampleForId = contenidoFinal.length > 12000
        ? (contenidoFinal.slice(0, 6000) + contenidoFinal.slice(-6000) + String(contenidoFinal.length))
        : (contenidoFinal + String(contenidoFinal.length));
      const newTextoId = `texto_${hashText(sampleForId)}_${contenidoFinal.length}`;

      const derivedFileName = archivoFuente?.name || archivoSeleccionado?.name || null;
      const derivedFileType = archivoFuente?.type || archivoSeleccionado?.type || null;

      let persistedFileURL = null;
      const selectedOriginalFile = archivoFuente || null;
      const isPdfOriginal = !!selectedOriginalFile && (
        String(selectedOriginalFile.type || '').toLowerCase() === 'application/pdf' ||
        String(selectedOriginalFile.name || '').toLowerCase().endsWith('.pdf')
      );

      if (isPdfOriginal && currentUser?.uid) {
        try {
          persistedFileURL = await uploadSessionPdfFile({
            file: selectedOriginalFile,
            userId: currentUser.uid,
            textoId: newTextoId
          });
          logger.log('✅ [CargaTexto] fileURL persistente creada para PDF local');
        } catch (uploadError) {
          logger.warn('⚠️ [CargaTexto] No se pudo subir PDF para restauración futura:', uploadError?.message || uploadError);
        }
      }

      if (switchLecture && typeof switchLecture === 'function') {
        logger.log('🔁 [CargaTexto] switchLecture() con nuevo textoId:', newTextoId);
        switchLecture({
          id: newTextoId,
          courseId: null,
          content: contenidoFinal,
          fileName: derivedFileName,
          fileType: derivedFileType,
          fileURL: persistedFileURL || null
        });
      } else {
        // Fallback conservador
        logger.warn('⚠️ [CargaTexto] switchLecture no disponible; usando setters legacy');
        setTexto(contenidoFinal);
      }

      // NUEVO: Trigger automático de análisis completo (Pre-lectura + Análisis Crítico con RAG)
      logger.log('🚀 [CargaTexto] Iniciando análisis automático del documento...');
      logger.log('🔍 [CargaTexto] analyzeDocument disponible:', !!analyzeDocument);
      logger.log('🔍 [CargaTexto] Tipo de analyzeDocument:', typeof analyzeDocument);
      logger.log('🔍 [CargaTexto] Longitud del texto:', contenidoFinal.length);

      if (analyzeDocument && typeof analyzeDocument === 'function') {
        // Ejecutar análisis en background (no bloqueante)
        logger.log('✅ [CargaTexto] Llamando a analyzeDocument()...');
        analyzeDocument(contenidoFinal, newTextoId)
          .then(() => {
            logger.log('✅ [CargaTexto] analyzeDocument completado exitosamente');
            // Cambiar a pestaña DESPUÉS de que el análisis complete
            setTimeout(() => {
              logger.log('📖 [CargaTexto] Cambiando a pestaña de Lectura Guiada...');
              window.dispatchEvent(new CustomEvent('app-change-tab', {
                detail: { tabId: 'lectura-guiada' }
              }));
            }, 500);
          })
          .catch(err => {
            logger.error('❌ [CargaTexto] Error en análisis automático:', err);
            logger.error('❌ [CargaTexto] Stack trace:', err.stack);
            // No mostrar error al usuario, el análisis es opcional
          });
      } else {
        logger.warn('⚠️ [CargaTexto] analyzeDocument NO está disponible o no es función');
      }

      // Guardar referencia del archivo original (especialmente PDF) para vista "Original"
      try {
        const previousObjectUrl = (archivoActual && typeof archivoActual === 'object') ? archivoActual.objectUrl : null;
        if (previousObjectUrl) {
          URL.revokeObjectURL(previousObjectUrl);
        }

        const originalFile = archivoFuente || null;
        if (originalFile) {
          const resolvedName = originalFile.name || archivoSeleccionado?.name || 'documento';
          const resolvedType = originalFile.type || archivoSeleccionado?.type || '';
          const resolvedSize = originalFile.size || archivoSeleccionado?.size || 0;
          const isPdfFile = resolvedType === 'application/pdf' || resolvedName.toLowerCase().endsWith('.pdf');
          const objectUrl = isPdfFile ? URL.createObjectURL(originalFile) : null;

          setArchivoActual({
            file: originalFile,
            name: resolvedName,
            type: isPdfFile ? 'application/pdf' : (resolvedType || 'text/plain'),
            size: resolvedSize,
            fileURL: isPdfFile ? (persistedFileURL || null) : null,
            objectUrl,
            lastUpdated: Date.now()
          });
        } else {
          setArchivoActual(null);
        }
      } catch (eSetFile) {
        logger.warn('No se pudo asignar archivoActual:', eSetFile);
        setArchivoActual(null);
      }

      // Limpiar formulario (mantener archivoActual en contexto para visor)
      setArchivoSeleccionado(null);
      setArchivoFuente(null);
      setTextoIngresado('');

      logger.log('Análisis completado exitosamente');

    } catch (err) {
      logger.error('Error en handleSubmit:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [archivoSeleccionado, textoIngresado, setTexto, setLoading, setError, analyzeDocument, switchLecture, currentTextoId, rubricProgress, texto, archivoFuente, setArchivoActual, archivoActual, setCompleteAnalysis, setTextStructure, currentUser]);

  // Quitar archivo seleccionado
  const removeFile = useCallback(() => {
    setArchivoSeleccionado(null);
    setArchivoFuente(null);
    setError('');
  }, [setError]);

  // Calcular estadísticas
  const stats = React.useMemo(() => {
    const content = archivoSeleccionado?.contenido || textoIngresado;
    if (!content) return null;

    const words = content.split(/\s+/).length;
    const chars = content.length;
    const readingTime = Math.ceil(words / 200); // ~200 palabras por minuto

    return { words, chars, readingTime };
  }, [archivoSeleccionado?.contenido, textoIngresado]);

  return (
    <CargaContainer
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Header>
        <Icon>📁</Icon>
        <Title>Cargar Contenido</Title>
      </Header>

      <FormContainer onSubmit={handleSubmit}>
        {/* Drop Zone */}
        <CompactDropZone
          $isDragActive={isDragActive}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <DropZoneContent>
            <FileIcon>📄</FileIcon>
            <div>
              <div><strong>Selecciona un archivo</strong></div>
              <div>o arrastra aquí</div>
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              PDF, TXT, DOCX
            </div>
          </DropZoneContent>
        </CompactDropZone>

        <input
          id="file-input"
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />

        {/* Archivo seleccionado */}
        <AnimatePresence>
          {archivoSeleccionado && (
            <FileInfo
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FileDetails>
                <FileName>📎 {archivoSeleccionado.name}</FileName>
                <FileStats>
                  {(archivoSeleccionado.size / 1024).toFixed(1)} KB
                  {archivoSeleccionado.metadatos && (
                    <> • {archivoSeleccionado.metadatos.palabras} palabras</>
                  )}
                </FileStats>
              </FileDetails>
              <RemoveButton onClick={removeFile}>×</RemoveButton>
            </FileInfo>
          )}
        </AnimatePresence>

        {/* Indicador de procesamiento */}
        <AnimatePresence>
          {procesando && (
            <LoadingIndicator
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Spinner />
              Procesando archivo...
            </LoadingIndicator>
          )}
        </AnimatePresence>

        {/* Área de texto */}
        {!archivoSeleccionado && (
          <>
            <TextArea
              placeholder="O pega tu texto aquí..."
              value={textoIngresado}
              onChange={(e) => setTextoIngresado(e.target.value)}
              disabled={loading || procesando}
            />

          </>
        )}

        {/* Botón de análisis */}
        <SubmitButton
          type="submit"
          disabled={loading || procesando || (!archivoSeleccionado?.contenido && !textoIngresado.trim())}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            logger.log('Debug completo - Estado del botón:', {
              loading,
              procesando,
              archivoSeleccionado: archivoSeleccionado,
              tieneContenidoArchivo: !!archivoSeleccionado?.contenido,
              textoIngresado: textoIngresado,
              textoTrimmed: textoIngresado.trim(),
              longitud: textoIngresado.length,
              condicionOriginal: (!archivoSeleccionado && !textoIngresado.trim()),
              condicionNueva: (!archivoSeleccionado?.contenido && !textoIngresado.trim()),
              estaDeshabilitado: loading || procesando || (!archivoSeleccionado?.contenido && !textoIngresado.trim())
            });
          }}
        >
          {loading ? (
            <>
              <Spinner style={{ width: '14px', height: '14px' }} />
              Analizando...
            </>
          ) : (
            '🔍 Analizar Contenido'
          )}
        </SubmitButton>

        {/* Errores */}
        <AnimatePresence>
          {error && (
            <AlertMessage type="error" message={error} />
          )}
        </AnimatePresence>
      </FormContainer>

      {/* Estadísticas del contenido */}
      {stats && (
        <StatusSection>
          <StatusItem>
            📊 {stats.words.toLocaleString()} palabras
          </StatusItem>
          <StatusItem>
            📄 {stats.chars.toLocaleString()} caracteres
          </StatusItem>
          <StatusItem>
            ⏱️ ~{stats.readingTime} min de lectura
          </StatusItem>
          {texto && (
            <StatusItem style={{ color: theme.success }}>
              ✅ Contenido cargado
            </StatusItem>
          )}
        </StatusSection>
      )}


      {/* Historial de Sesiones - Visible para todos los usuarios */}
      <SessionsHistory theme={modoOscuro ? darkTheme : lightTheme} />
    </CargaContainer>
  );
}

export default CargaTexto;
