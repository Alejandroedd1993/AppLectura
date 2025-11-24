import { render, act } from '@testing-library/react';

// Helper para renderizar componentes con Suspense/lazy y esperar microtasks
export async function renderAsync(ui, options) {
  let utils;
  await act(async () => {
    utils = render(ui, options);
    // Esperar a que se resuelvan microtasks y timers cortos
    await Promise.resolve();
  });
  return utils;
}

export async function flushPromises() {
  await act(async () => { await Promise.resolve(); });
}
