# Atajos de Teclado - AppLectura

Esta aplicación incluye atajos de teclado para mejorar la productividad de usuarios avanzados.

## Atajos Globales

### Artefactos de Evaluación
Disponibles en: ResumenAcademico, TablaACD, MapaActores, RespuestaArgumentativa, BitacoraEticaIA

| Atajo | Acción | Descripción |
|-------|--------|-------------|
| `Ctrl + S` | Guardar borrador | Guarda manualmente el progreso en sessionStorage |
| `Ctrl + Enter` | Evaluar | Envía la respuesta para evaluación con IA (si está válida) |
| `Esc` | Cerrar | Cierra paneles laterales (citas, errores) o modales abiertos |

## Características

### Prevención de Conflictos
- Los atajos funcionan **incluso dentro de campos de texto** (textarea)
- `Ctrl + S` no activa el "Guardar página" del navegador
- `Ctrl + Enter` solo funciona cuando la validación es exitosa

### Feedback Visual
- Al presionar `Ctrl + S`, aparece confirmación temporal "✅ Guardado manual exitoso"
- Los atajos se muestran en una barra informativa bajo cada formulario
- Tooltips en botones indican el atajo correspondiente

### Rate Limiting
- `Ctrl + Enter` respeta los límites de evaluación (5s cooldown, 10/hora)
- Si el límite está activo, el atajo no hace nada

## Implementación Técnica

### Hook: `useKeyboardShortcuts`
```js
useKeyboardShortcuts({
  'ctrl+s': (e) => { /* guardar */ },
  'ctrl+enter': (e) => { /* evaluar */ },
  'escape': (e) => { /* cerrar */ }
}, {
  enabled: true,
  excludeInputs: false // Permite atajos en textarea
});
```

### Componente Visual: `KeyboardShortcutsBar`
Muestra la barra informativa con formato de teclas estilizado:
```jsx
<KeyboardShortcutsBar 
  theme={theme}
  shortcuts={[
    { keys: ['Ctrl', 'S'], label: 'Guardar' },
    { keys: ['Ctrl', 'Enter'], label: 'Evaluar' },
    { keys: ['Esc'], label: 'Cerrar' }
  ]}
/>
```

## Próximas Extensiones

### Lectura Guiada
- `Ctrl + B`: Resaltar selección
- `Ctrl + Shift + C`: Guardar cita
- `Ctrl + N`: Agregar nota

### Navegación
- `Ctrl + Tab`: Siguiente pestaña
- `Ctrl + Shift + Tab`: Pestaña anterior
- `Ctrl + 1-5`: Ir a pestaña específica

### Análisis del Texto
- `Ctrl + F`: Buscar en análisis
- `Ctrl + P`: Imprimir análisis
- `Ctrl + E`: Exportar análisis

## Compatibilidad

- ✅ Windows: Ctrl + tecla
- ✅ Linux: Ctrl + tecla
- ⚠️ macOS: Usa Cmd en lugar de Ctrl (detectado automáticamente)

## Accesibilidad

- Los atajos son **opcionales** - todas las acciones están disponibles con mouse
- La barra de atajos es **oculta visualmente en móviles** (media queries)
- Compatible con lectores de pantalla (elementos `<kbd>` semánticos)
