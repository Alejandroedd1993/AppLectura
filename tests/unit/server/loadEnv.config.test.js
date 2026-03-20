import { loadServerEnvWithCandidates, resolveServerEnvPath } from '../../../server/config/loadEnv.shared.js';

describe('loadEnv config', () => {
  test('prioriza el .env dentro de server antes que el de la raiz', () => {
    const candidates = [
      '/repo/server/.env',
      '/repo/.env',
    ];

    const resolved = resolveServerEnvPath({
      candidates,
      existsSync: (candidate) => candidate === '/repo/server/.env' || candidate === '/repo/.env',
    });

    expect(resolved).toBe('/repo/server/.env');
  });

  test('usa el .env de la raiz como fallback cuando no existe el de server', () => {
    const candidates = [
      '/repo/server/.env',
      '/repo/.env',
    ];

    const resolved = resolveServerEnvPath({
      candidates,
      existsSync: (candidate) => candidate === '/repo/.env',
    });

    expect(resolved).toBe('/repo/.env');
  });

  test('carga dotenv una sola vez con el path resuelto', () => {
    const config = jest.fn();

    const result = loadServerEnvWithCandidates({
      config,
      candidates: ['/repo/.env'],
      existsSync: () => true,
    });

    expect(result).toEqual({ loaded: true, path: '/repo/.env' });
    expect(config).toHaveBeenCalledTimes(1);
    expect(config).toHaveBeenCalledWith({ path: '/repo/.env' });
  });

  test('no invoca dotenv si no existe ningun archivo .env local', () => {
    const config = jest.fn();

    const result = loadServerEnvWithCandidates({
      config,
      candidates: ['/repo/server/.env', '/repo/.env'],
      existsSync: () => false,
    });

    expect(result).toEqual({ loaded: false, path: null });
    expect(config).not.toHaveBeenCalled();
  });
});