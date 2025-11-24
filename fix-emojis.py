#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys

# Leer el archivo con encoding UTF-8
with open('src/VisorTexto_responsive.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Diccionario de reemplazos
replacements = {
    'ðŸ'¡': '💡',
    'ðŸ"': '📝',
    'â"': '❓',
    'ðŸ"': '📓',
    'ðŸ"‹': '📋',
    '–': '✖',
    'ðŸ"¬': '🔬',
    'AnÃ¡lisis': 'Análisis',
    'AÃ±adir': 'Añadir',
    'menÃº': 'menú',
    'OpciÃ³n': 'Opción',
    'peticiÃ³n': 'petición'
}

# Aplicar todos los reemplazos
for old, new in replacements.items():
    content = content.replace(old, new)

# Escribir el archivo corregido con UTF-8
with open('src/VisorTexto_responsive.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Emojis corregidos exitosamente")
