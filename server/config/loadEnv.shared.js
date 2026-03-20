export function resolveServerEnvPath({
  existsSync,
  candidates,
} = {}) {
  const envCandidates = Array.isArray(candidates) ? candidates : [];
  const hasFile = typeof existsSync === 'function' ? existsSync : () => false;

  return envCandidates.find((candidate) => hasFile(candidate)) || null;
}

export function loadServerEnvWithCandidates({
  config,
  existsSync,
  candidates,
} = {}) {
  const envPath = resolveServerEnvPath({ existsSync, candidates });

  if (!envPath) {
    return { loaded: false, path: null };
  }

  config({ path: envPath });
  return { loaded: true, path: envPath };
}