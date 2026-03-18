import express from 'express';
import requireFirebaseAuth from '../middleware/firebaseAuth.js';
import { storageProxyLimiter } from '../middleware/rateLimiters.js';
import { sendValidationError } from '../utils/validationError.js';

const router = express.Router();

const isAllowedStorageUrl = (value = '') => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname;
    return host.endsWith('firebasestorage.googleapis.com') || host.endsWith('firebasestorage.app');
  } catch {
    return false;
  }
};

router.get('/storage/proxy', requireFirebaseAuth, storageProxyLimiter, async (req, res) => {
  const targetUrl = req.query.url;

  console.log('📥 [StorageProxy] Solicitud recibida para:', targetUrl?.substring(0, 80));

  if (!targetUrl) {
    return sendValidationError(res, {
      error: 'Missing "url" query parameter',
      mensaje: 'Debes enviar el parametro url para recuperar el archivo.',
      codigo: 'MISSING_STORAGE_URL'
    });
  }

  if (!isAllowedStorageUrl(targetUrl)) {
    console.warn('⚠️ [StorageProxy] URL no permitida:', targetUrl);
    return sendValidationError(res, {
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
      return res.status(upstreamResponse.status || 502).json({
        error: 'Upstream request failed',
        mensaje: 'No se pudo recuperar el archivo desde el origen remoto.',
        codigo: 'STORAGE_UPSTREAM_ERROR'
      });
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = upstreamResponse.headers.get('content-disposition');

    // Get buffer to avoid stream compatibility issues
    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

    console.log('✅ [StorageProxy] Descargado:', buffer.length, 'bytes, tipo:', contentType);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }
    res.setHeader('Cache-Control', 'public, max-age=120');

    res.send(buffer);
  } catch (error) {
    console.error('❌ [StorageProxy] Error fetching file from Storage:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve file from Storage',
      mensaje: 'No se pudo recuperar el archivo solicitado.',
      codigo: 'STORAGE_FETCH_ERROR'
    });
  }
});

export default router;
