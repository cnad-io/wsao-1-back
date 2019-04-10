'use strict';

module.exports = async (fastify, opts) => {
  fastify.get('/healthz', async (request, reply) => {
    return { msg: "OK" };
  });
};
