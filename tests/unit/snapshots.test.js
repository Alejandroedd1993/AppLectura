/**
 * Snapshot tests para componentes UI críticos
 * Previene regresiones visuales no intencionales
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../src/styles/theme';
import EstimatedTimeBadge from '../../src/components/ui/EstimatedTimeBadge';
import KeyboardShortcutsBar from '../../src/components/ui/KeyboardShortcutsBar';

describe('UI Components Snapshots', () => {
  describe('EstimatedTimeBadge', () => {
    it('debe mantener estructura visual (normal)', () => {
      const tree = renderer
        .create(
          <ThemeProvider theme={lightTheme}>
            <EstimatedTimeBadge minutes={15} theme={lightTheme} />
          </ThemeProvider>
        )
        .toJSON();

      expect(tree).toMatchSnapshot();
    });

    it('debe mantener estructura visual (compact)', () => {
      const tree = renderer
        .create(
          <ThemeProvider theme={lightTheme}>
            <EstimatedTimeBadge minutes={20} theme={lightTheme} compact />
          </ThemeProvider>
        )
        .toJSON();

      expect(tree).toMatchSnapshot();
    });

    it('debe mantener estructura visual (sin minutos)', () => {
      const tree = renderer
        .create(
          <ThemeProvider theme={lightTheme}>
            <EstimatedTimeBadge theme={lightTheme} />
          </ThemeProvider>
        )
        .toJSON();

      expect(tree).toMatchSnapshot();
    });
  });

  describe('KeyboardShortcutsBar', () => {
    it('debe mantener estructura visual (shortcuts estándar)', () => {
      const shortcuts = [
        { keys: ['Ctrl', 'S'], label: 'Guardar' },
        { keys: ['Ctrl', 'Enter'], label: 'Evaluar' },
        { keys: ['Esc'], label: 'Cerrar' }
      ];

      const tree = renderer
        .create(
          <ThemeProvider theme={lightTheme}>
            <KeyboardShortcutsBar 
              shortcuts={shortcuts}
              theme={lightTheme}
            />
          </ThemeProvider>
        )
        .toJSON();

      expect(tree).toMatchSnapshot();
    });

    it('debe mantener estructura visual (sin shortcuts)', () => {
      const tree = renderer
        .create(
          <ThemeProvider theme={lightTheme}>
            <KeyboardShortcutsBar 
              shortcuts={[]}
              theme={lightTheme}
            />
          </ThemeProvider>
        )
        .toJSON();

      expect(tree).toMatchSnapshot();
    });

    it('debe mantener estructura visual (shortcuts complejos)', () => {
      const shortcuts = [
        { keys: ['Ctrl', 'Shift', 'A'], label: 'Acción compleja' },
        { keys: ['Alt', 'F4'], label: 'Cerrar ventana' }
      ];

      const tree = renderer
        .create(
          <ThemeProvider theme={lightTheme}>
            <KeyboardShortcutsBar 
              shortcuts={shortcuts}
              theme={lightTheme}
            />
          </ThemeProvider>
        )
        .toJSON();

      expect(tree).toMatchSnapshot();
    });
  });
});
