
"use strict";

var events = require('../models/events');
var logger = require('pino')({ 'level': process.env.LOG_LEVEL || 'info' });
var player = require('./player');

/*eslint max-statements: ["error", 11]*/
var onJoin = function (socket, data) {
  logger.info(data.nickname + ' joined.');
  logger.debug('Data received from join attempt.', data);
  var validate = player.validate(data.nickname);
  if (!validate) {
    logger.info('Invalid player.');
    return socket.emit(events.out.news, { info: 'Your token is invalid' });
  }
  logger.info('Valid player.');
  socket.join('waiting');
  socket.emit(events.public.out.joinResponse,
    { playerId: socket.id, nickname: data.nickname });
  process.emit('playerJoined', data.nickname);
  process.emit('updateRoom');
};

var onDisconnect = function (socket) {
  if (socket != null) {
    socket.emit(
      events.out.disconnect
    );
  }
  process.emit('updateRoom');
};

module.exports = {
  on: {
    join: onJoin,
    disconnect: onDisconnect
  }
};
