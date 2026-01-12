import express from 'express';

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

router.get('/storage/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  console.log('📥 [StorageProxy] Solicitud recibida para:', targetUrl?.substring(0, 80));

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  if (!isAllowedStorageUrl(targetUrl)) {
    console.warn('⚠️ [StorageProxy] URL no permitida:', targetUrl);
    return res.status(400).json({ error: 'Invalid or disallowed storage URL' });
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
        details: errorText.substring(0, 500)
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
    res.status(500).json({ error: 'Failed to retrieve file from Storage', details: error.message });
  }
});

export default router;
