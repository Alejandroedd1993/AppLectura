const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const targetPort = process.env.BACKEND_PORT || process.env.PORT_BACKEND || '3001';
  const target = `http://localhost:${targetPort}`;
  console.log('[proxy] Enrutando /api hacia', target);
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      timeout: 60000,
      proxyTimeout: 60000,
    })
  );
};
