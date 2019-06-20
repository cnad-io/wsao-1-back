'use strict';

module.exports = async (fastify, opts) => {
  fastify.get('/healthz', {
    schema: {
      description: 'Health function.',
      tags: ['health']
    },
    response: {
      '200': {
        description: 'Service is healthy.',
        type: 'object',
        properties: {
          msg: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    return { msg: "OK" };
  });
};
