/**
 * shared/index.js
 * Barrel export de todos los styled-components compartidos de artefactos.
 * 
 * Uso: import { Container, Header, SubmissionBanner, ... } from './shared';
 */

// Layout base
export { Container, Header, HeaderTitle, HeaderDescription } from './ArtifactLayout.styled';

// Sistema de bloqueo y entrega
export { SubmissionBanner, SubmitButton, LockedMessage, LockIcon, LockText, UnlockButton } from './LockSystem.styled';

// Mensajes de estado
export { AutoSaveMessage, RestoreBanner, RestoreButton, PasteErrorMessage, ShortcutsHint } from './StatusMessages.styled';

// Guía pedagógica
export { GuideSection, GuideHeader, GuideTitle, ToggleIcon, GuideContent, GuideQuestions, GuideQuestion } from './GuideSection.styled';

// Formularios
export { FormSection, SectionTitle, Label, Textarea, HintText, ValidationMessage, ButtonGroup, Button, PrimaryButton } from './FormComponents.styled';

// Feedback criterial
export { FeedbackSection, FeedbackHeader, NivelGlobal, DimensionLabel, CriteriosGrid, CriterioCard, CriterioHeader, CriterioTitle, CriterioNivel, ListSection, ListTitle, List, ListItem, LoadingSpinner, SpinnerIcon, LoadingText } from './FeedbackDisplay.styled';

// Panel de citas
export { CitasButton, CitasPanel, CitasPanelHeader, CitasList, CitaItem, CitaTexto, CitaFooter, CitaInfo, InsertarButton, EliminarButton, EmptyCitasMessage } from './CitasPanel.styled';
