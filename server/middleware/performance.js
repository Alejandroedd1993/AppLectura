import compression from 'compression';

const performanceMiddleware = (app) => {
  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => {
        // Evitar comprimir streaming (SSE o fetch stream)
        if (req.headers.accept && req.headers.accept.includes('text/event-stream')) return false;
        if (req.query && req.query.stream === '1') return false;
        if (req.headers['x-skip-compression']) return false;
        return compression.filter(req, res);
      },
    })
  );

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      try {
        res.setHeader('X-Response-Time', `${ms}ms`);
      } catch (_) {}
      if (ms > 5000) console.log(`⚠️ Lento ${req.method} ${req.originalUrl} -> ${ms}ms`);
    });
    next();
  });

  app.use((req, res, next) => {
    res.setTimeout(30000, () => {
      console.log('⏰ Timeout:', req.method, req.originalUrl);
      if (!res.headersSent) res.status(408).json({ error: 'Timeout de servidor' });
    });
    next();
  });
};

export default performanceMiddleware;
