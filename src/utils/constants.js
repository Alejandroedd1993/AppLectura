// src/utils/constants.js

export const SPANISH_STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'ante', 'bajo', 'cabe', 'con',
  'contra', 'desde', 'en', 'entre', 'hacia', 'hasta',
  'para', 'por', 'según', 'sin', 'so', 'sobre', 'tras',
  'y', 'e', 'ni', 'o', 'u', 'pero', 'sino', 'mas',
  'que', 'si', 'como', 'cuando', 'donde', 'ya', 'muy'
]);

// Otros límites o constantes podrían ir aquí en el futuro
export const LIMITE_TEXTO_COMPLETO = 4000;
export const LIMITE_TEXTO_MEDIO = 50000;
export const LIMITE_TEXTO_GRANDE = 200000;
