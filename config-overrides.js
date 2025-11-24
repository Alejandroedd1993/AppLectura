const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function override(config, env) {
  // Allow importing modules from outside of src/
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, 'src'),
    'src': path.resolve(__dirname, 'src'),
  };

  // Copiar el worker de PDF.js a la carpeta pública
  config.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
          to: path.resolve(__dirname, 'public/pdf.worker.min.js'),
        },
      ],
    })
  );

  // Add fallbacks for Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": false,
    "stream": false,
    "buffer": false,
    "util": false,
    "assert": false,
    "http": false,
    "https": false,
    "os": false,
    "url": false,
    "zlib": false,
    "querystring": false,
    "path": false,
    "fs": false,
    "child_process": false,
    "net": false,
    "tls": false
  };

  // Resolver webpack deprecation warnings
  if (env === 'development') {
    config.devServer = {
      ...config.devServer,
      setupMiddlewares: (middlewares, devServer) => {
        // Configuración personalizada de middlewares
        return middlewares;
      },
      // Remover las opciones deprecadas
      onBeforeSetupMiddleware: undefined,
      onAfterSetupMiddleware: undefined,
    };
  }

  return config;
};
