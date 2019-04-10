'use strict';

const path = require('path');
const AutoLoad = require('fastify-autoload');

module.exports = (fastify, opts, next) => {
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  });

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'services'),
    options: Object.assign({}, opts)
  });

  next();
};
