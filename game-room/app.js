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


// public
app.listen(8080);
//Internal
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
    on_player_moved(socket, data);
  });
});


process.on("send news to room", (roomId,data) => {
  io.to(data.roomId).emit(events.public.out.news,roomId, data);

});


