'use strict';

const serverEvents = {
    in: {
    createRoom:'createRoom',
    disconnect:'disconnect'
  },
  out:{
    new_room:'newroom'
  }
}

const publicEvents = {
  in: {
    join:'join game room',
    disconnect:'disconnect',
    player_moved: 'player moved'
  },
  out:{
    scene_updated: 'scene update',
    score_updated: 'score update',
    game_ready: 'game ready',
    news: 'news',
    remote_player_moved: 'remote player moved'


  }
}


const app = require('http').createServer();
const appint = require('http').createServer();
const io = require('socket.io')(app);
const ioint = require('socket.io')(appint);

const fs = require('fs');
const uuidv4 = require('uuid/v4');
var redis = require('socket.io-redis');

// public
app.listen(8080);
//Internal
appint.listen(8081);


ioint.on('connection', (socket) => {
  socket.on(serverEvents.in.createRoom, (data) => {
      var game_room_token= uuidv4();
      //Al final se crean solas las salas al hacer join
      socket.emit(serverEvents.out.new_room, { game_room_token: game_room_token });
  });
});


io.adapter(redis({ host: 'redis-game-room', port: 6379 }));
io.on('connection', (socket) => {
  socket.on(publicEvents.in.join, (data) => {
          socket.emit(publicEvents.out.news, { info: "welcome wsao game room" });
          socket.to(data.game_room_token).emit(publicEvents.out.remote_player_moved, {});
          updateGameRoom(data.game_room_token);
  });
  socket.on(publicEvents.in.player_moved, (data) => {
          io.to(data.game_room_token).emit(publicEvents.out.remote_player_moved,{changes:[data]})
  });
  
});


function updateGameRoom(game_room_token){
  var room = io.sockets.adapter.rooms[game_room_token];
  if (room.length==maxplayersroom){
    io.to(game_room_token).emit(publicEvents.out.game_ready, {counter:3} );
  }
  
}