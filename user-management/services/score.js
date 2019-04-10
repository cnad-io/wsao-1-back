'use strict';

module.exports = async (fastify, opts) => {
  fastify.get('/score', async (request, reply) => {
    return { msg: "TODO" };
  });
};
