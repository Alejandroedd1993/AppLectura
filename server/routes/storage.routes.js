import express from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { storageProxyLimiter } from '../middleware/rateLimiters.js';
import { sendError } from '../utils/responseHelpers.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { storageProxyQuerySchema } from '../validators/requestSchemas.js';

const router = express.Router();
export const validateStorageProxyQuery = validateRequest(storageProxyQuerySchema, {
  source: 'query',
  buildErrorPayload: ({ details }) => ({
    error: 'Solicitud de storage proxy invalida',
    mensaje: details[0]?.message || 'Revisa los datos enviados antes de reintentar.',
    codigo: 'INVALID_STORAGE_PROXY_REQUEST',
    ...(details[0]?.path ? { field: details[0].path } : {}),
    details
  })
});

const isAllowedStorageUrl = (value = '') => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname;
    return host.endsWith('firebasestorage.googleapis.com') || host.endsWith('firebasestorage.app');
  } catch {
    return false;
  }
};

router.get('/storage/proxy', requireFirebaseAuth, storageProxyLimiter, validateStorageProxyQuery, async (req, res) => {
  const targetUrl = req.query.url;

  console.log('📥 [StorageProxy] Solicitud recibida para:', targetUrl?.substring(0, 80));

  if (!isAllowedStorageUrl(targetUrl)) {
    console.warn('⚠️ [StorageProxy] URL no permitida:', targetUrl);
    return sendError(res, 400, {
      error: 'Invalid or disallowed storage URL',
      mensaje: 'La URL solicitada no pertenece a un origen de Storage permitido.',
      codigo: 'INVALID_STORAGE_URL'
    });
  }

  try {
    // Use native fetch (Node 18+) to avoid node-fetch stream issues
    const upstreamResponse = await fetch(targetUrl);

    console.log('📡 [StorageProxy] Upstream status:', upstreamResponse.status);

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => 'Upstream error');
      console.error('❌ [StorageProxy] Upstream failed:', upstreamResponse.status, errorText.substring(0, 200));
      return sendError(res, upstreamResponse.status || 502, {
        error: 'Upstream request failed',
        mensaje: 'No se pudo recuperar el archivo desde el origen remoto.',
        codigo: 'STORAGE_UPSTREAM_ERROR'
      });
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = upstreamResponse.headers.get('content-disposition');
    const contentLength = upstreamResponse.headers.get('content-length');

    console.log('✅ [StorageProxy] Streaming tipo:', contentType, 'largo:', contentLength || 'desconocido');

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }
    res.setHeader('Cache-Control', 'public, max-age=120');

    if (upstreamResponse.body) {
      const upstreamStream = Readable.fromWeb(upstreamResponse.body);
      await pipeline(upstreamStream, res);
      return;
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    console.error('❌ [StorageProxy] Error fetching file from Storage:', error.message);
    return sendError(res, 500, {
      error: 'Failed to retrieve file from Storage',
      mensaje: 'No se pudo recuperar el archivo solicitado.',
      codigo: 'STORAGE_FETCH_ERROR'
    });
  }
});

export default router;
