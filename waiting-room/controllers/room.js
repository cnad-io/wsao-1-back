
"use strict";

var logger = require('pino')({ 'level': process.env.LOG_LEVEL || 'info' });
var Promise = require('bluebird');

var player = require('./player');

var onJoin = function (data) {

  logger.info(data.nickname + ' joined.');
  return new Promise(function (resolve, reject) {
    logger.info(data.nickname + ' joined.');
    logger.debug('Data received from join attempt.', data);

    var validate = player.validate(data.nickname);
    if (validate) {
      logger.info('Valid player.');
      resolve();
    } else {
      logger.info('Invalid player.');
      reject(validate);
    }
  });
};

module.exports = {
  on: {
    join: onJoin
  }
};