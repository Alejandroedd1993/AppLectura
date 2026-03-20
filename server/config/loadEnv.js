import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadServerEnvWithCandidates } from './loadEnv.shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadServerEnv({
  config = dotenv.config,
  existsSync = fs.existsSync,
  candidates,
} = {}) {
  const envCandidates = Array.isArray(candidates) && candidates.length > 0
    ? candidates
    : [
        path.resolve(__dirname, '..', '.env'),
        path.resolve(__dirname, '..', '..', '.env'),
      ];

  return loadServerEnvWithCandidates({
    config,
    existsSync,
    candidates: envCandidates,
  });
}