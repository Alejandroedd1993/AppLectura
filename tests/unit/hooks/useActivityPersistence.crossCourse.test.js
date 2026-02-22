import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useActivityPersistence from '../../../src/hooks/useActivityPersistence';

function Probe({ courseId, documentId, answer, onRehydrate }) {
  const { saveManual } = useActivityPersistence(documentId, {
    enabled: true,
    courseId,
    studentAnswers: { answer },
    onRehydrate
  });

  return (
    <button type="button" onClick={() => saveManual()}>
      save
    </button>
  );
}

describe('useActivityPersistence cross-course isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('rehidrata por scope de curso y no mezcla datos con mismo documentId', async () => {
    const onRehydrate = jest.fn();
    const documentId = 'bitacora_etica_ia_texto-1';
    const keyA = `activity_results_course-A_${documentId}`;
    const keyB = `activity_results_course-B_${documentId}`;

    const { rerender } = render(
      <Probe
        courseId="course-A"
        documentId={documentId}
        answer="A-data"
        onRehydrate={onRehydrate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      const savedA = JSON.parse(localStorage.getItem(keyA) || '{}');
      expect(savedA?.data?.student_answers?.answer).toBe('A-data');
    });

    rerender(
      <Probe
        courseId="course-B"
        documentId={documentId}
        answer="B-data"
        onRehydrate={onRehydrate}
      />
    );

    await waitFor(() => {
      const bEmptyCall = onRehydrate.mock.calls.find(
        ([, meta]) => meta?.courseId === 'course-B' && meta?.isEmpty === true
      );
      expect(bEmptyCall).toBeTruthy();
      expect(bEmptyCall[0]?.student_answers?.answer).toBeUndefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      const savedB = JSON.parse(localStorage.getItem(keyB) || '{}');
      expect(savedB?.data?.student_answers?.answer).toBe('B-data');
    });

    rerender(
      <Probe
        courseId="course-A"
        documentId={documentId}
        answer="ignored"
        onRehydrate={onRehydrate}
      />
    );

    await waitFor(() => {
      const aLoadedCall = onRehydrate.mock.calls.find(
        ([data, meta]) =>
          meta?.courseId === 'course-A' &&
          meta?.isEmpty === false &&
          data?.student_answers?.answer === 'A-data'
      );
      expect(aLoadedCall).toBeTruthy();
    });
  });
});

