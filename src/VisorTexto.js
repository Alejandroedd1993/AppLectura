import React, { useContext } from 'react';
import { AppContext } from './context/AppContext';
import VisorTextoResponsive from './VisorTexto_responsive';
import TutorDock from './components/tutor/TutorDock';

// Wrapper ligero que mantiene compatibilidad con los tests antiguos
// - Si no hay texto, muestra el placeholder que los tests esperan
// - Si hay texto, delega al visor responsive completo pasando el texto por props
export default function VisorTexto() {
	const { texto } = useContext(AppContext);

	if (!texto || !texto.trim()) {
		return (
			<div role="region" aria-label="visor-texto-placeholder">
				Carga un texto para empezar a leer
			</div>
		);
	}

	return (
		<>
			<VisorTextoResponsive texto={texto} />
			{/* Dock del tutor (solo lectura) */}
			<TutorDock />
		</>
	);
}

