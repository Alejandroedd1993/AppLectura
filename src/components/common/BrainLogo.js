import React from 'react';

/**
 * BrainLogo — Cerebro geométrico tipo circuito/laberinto dentro de círculo.
 * Componente SVG inline reutilizable en toda la app.
 *
 * @param {number}  size  – Tamaño en px (default 72)
 * @param {boolean} light – true → trazo oscuro (para fondos claros); false → trazo blanco
 * @param {string}  [className] – Para styled-components / css-modules
 */
const BrainLogo = ({ size = 72, light = false, className }) => {
  const stroke = light ? '#1b3a5c' : 'rgba(255,255,255,0.9)';
  const accent = '#3190FC';

  return (
    <svg
      className={className}
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
      <path d="M58 30 C52 30, 42 32, 38 40 C34 48, 36 52, 40 54" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M40 54 C36 58, 32 62, 32 68 C32 74, 36 78, 42 80" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M42 80 C46 84, 52 86, 56 88" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M48 38 C44 44, 42 50, 44 56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M38 62 C42 66, 44 72, 46 76" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M50 44 L44 50 L50 56" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      <path d="M42 64 L48 68 L42 74" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />

      {/* ── Hemisferio derecho ── */}
      <path d="M62 30 C68 30, 78 32, 82 40 C86 48, 84 52, 80 54" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M80 54 C84 58, 88 62, 88 68 C88 74, 84 78, 78 80" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M78 80 C74 84, 68 86, 64 88" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M72 38 C76 44, 78 50, 76 56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M82 62 C78 66, 76 72, 74 76" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M70 44 L76 50 L70 56" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      <path d="M78 64 L72 68 L78 74" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />

      {/* ── Fisura interhemisférica ── */}
      <path d="M60 28 L60 88" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />

      {/* ── Tallo cerebral ── */}
      <path d="M56 88 C58 92, 58 96, 56 100" stroke={stroke} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M64 88 C62 92, 62 96, 64 100" stroke={stroke} strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Nodos de red neuronal */}
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

export default React.memo(BrainLogo);
