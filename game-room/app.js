'use strict';

var events = require('./models/events');
var roomController = require('./controllers/room');


var logger = require('pino')({ 'level': process.env.LOG_LEVEL || 'info' });

console.log(process.env);


var app = require('http').createServer();
var appint = require('http').createServer();
var io = require('socket.io')(app);
var ioint = require('socket.io')(appint);

const fs = require('fs');
var redis = require('socket.io-redis');


app.listen(8080);
appint.listen(8081);

ioint.on('connection', function (socket) {
  socket.on(events.server.in.createRoom, function (data) {
        //Al final se crean solas las salas al hacer join
    roomController.on.createGameRoom(data).then(
      function(response){
        socket.emit(events.server.out.new_room, { roomId: response.roomId });
      }
    ).catch(function () {

    });

  });
});

io.adapter(redis({
  host: 'redis-game-room',
  port: 6379
}));

io.on('connection', function (socket) {
  socket.on(events.public.in.join, function (data) {
    data.socketId=socket.id;
    roomController.on.joinGameRoom(data).then( function (response){
        socket.join(data.roomId);
        socket.emit(events.public.out.news, {
          info: "welcome wsao game room"
        });
      }
    ).catch(function (error) {
      socket.emit(events.public.out.news, error);
    });
  });
  socket.on(events.public.in.player_moved, function (data) {
    process.emit(events.process.sendPlayerMoveToRoom,data);
    roomController.on.playerMove(data);
  });
});


process.on(events.process.sendNewsToRoom, (roomId,data) => {
  logger.info("send a message to " + roomId)
  io.to(roomId).emit(events.public.out.news,data);
});

process.on(events.process.sendPlayerMoveToRoom, (data) => {
  logger.info("send a message to " + data.roomId)
  io.to(data.roomId).emit(events.public.out.remote_player_moved,data);
});

process.on(events.process.sendGameReadySignal, (data) => {
  logger.info("send a message to " + data.roomId)
  io.to(data.roomId).emit(events.public.out.game_ready,data);
});
