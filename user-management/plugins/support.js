'use strict';

const fp = require('fastify-plugin');
const config = require('config');
const fastifySwagger = require('fastify-swagger');

module.exports = fp(async (fastify, opts) => {
  fastify.decorate('conf', config);
  fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'User Management',
        description: 'User and Score management, consider CRUDL for both objects.',
        version: '1.0.0'
      },
      host: 'localhost:3000',
      schemes: ['http']
    },
    exposeRoute: true,
    routePrefix: '/swagger-docs'
  });
});
