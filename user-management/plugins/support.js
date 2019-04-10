'use strict';

const fp = require('fastify-plugin');
const config = require('config');

module.exports = fp(async (fastify, opts) => {
  fastify.decorate('conf', config);
});
