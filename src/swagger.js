const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'URLCraft API',
      version: '0.9.0',
      description: 'Secure URL Shortener with JWT Authentication',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/auth-routes.js',
    './src/routes.js',
    './src/health-routes.js',
  ],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
