import React from 'react'; // eslint-disable-line no-unused-vars -- required for JSX
import { render, act } from '@testing-library/react';

jest.mock('../../../src/firebase/config', () => ({
  auth: { currentUser: null },
  db: {},
  isConfigValid: false,
}));
jest.mock('../../../src/utils/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../src/pedagogy/prompts/tutorSystemPrompts', () => ({
  VALID_INTENTS: [],
  SYSTEM_TOPIC_GUARD: 'GUARD',
  SYSTEM_EQUITY_GUARD: 'EQUITY',
  SYSTEM_ANTI_REDUNDANCY: 'ANTI_REDUNDANCY',
}));
jest.mock('../../../src/pedagogy/safety/tutorGuard', () => ({
  detectHateOrSlur: () => false,
  redactHateOrSlur: (t) => t,
  slurAppearsInContext: () => false,
  validateResponse: () => ({ isValid: true, errors: [] }),
}));
jest.mock('../../../src/utils/fetchWebSearch', () => ({
  fetchWebSearch: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../../src/pedagogy/tutor/studentNeedsAnalyzer', () => ({
  detectStudentNeeds: () => ({}),
}));
jest.mock('../../../src/hooks/usePedagogyIntegration', () => ({
  __esModule: true,
  default: () => ({ zdp: null, rew: null }),
}));

const TutorCore = require('../../../src/components/tutor/TutorCore').default; // eslint-disable-line no-unused-vars -- used in JSX: <TutorCore>

describe('TutorCore stable message ids', () => {
  test('preserva id de initialMessages al hidratar', () => {
    let latestApi = null;

    render(
      <TutorCore
        initialMessages={[
          { id: 'init-1', role: 'assistant', content: 'Hola' },
          { id: 'init-2', role: 'user', content: 'Pregunta' },
        ]}
      >
        {(api) => {
          latestApi = api;
          return <div />;
        }}
      </TutorCore>
    );

    const ids = (latestApi.messages || []).map((m) => m.id);
    expect(ids).toContain('init-1');
    expect(ids).toContain('init-2');
  });

  test('preserva id cuando loadMessages recibe mensajes con id', () => {
    let latestApi = null;

    render(
      <TutorCore>
        {(api) => {
          latestApi = api;
          return <div />;
        }}
      </TutorCore>
    );

    act(() => {
      latestApi.loadMessages([
        { id: 'load-1', role: 'assistant', content: 'A' },
        { id: 'load-2', role: 'assistant', content: 'B' },
      ]);
    });

    const ids = (latestApi.messages || []).map((m) => m.id);
    expect(ids).toContain('load-1');
    expect(ids).toContain('load-2');
  });
});
