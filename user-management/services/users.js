'use strict';

module.exports = async (fastify, opts) => {
  fastify.get('/user', async (request, reply) => {
    return { msg: "TODO" };
  });
};
