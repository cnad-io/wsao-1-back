'use strict';

console.log(process.env);
const DATAGRID_PORT = process.env.DATAGRID_PORT || 11333;
const DATAGRID_HOST = process.env.DATAGRID_HOST || 'wsao-datagrid-hotrod';
const DATAGRID_CACHE_NAME = process.env.DATAGRID_CACHE_NAME || 'game-room';
const DATAGRID_PROTO_VERSION =  process.env.DATAGRID_PROTO_VERSION || '2.5';
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
const maxplayersroom=4;

var initial_pos  = {
  // playerId:,
  // token,
  // name,
  // sprite,
  // roomId,
  // x,
  // y,
  // z,
  // rx,
  // ry,
  // rz,
  // rw,
  // speed,
  // state,
  // rotation

}


const app = require('http').createServer();
const appint = require('http').createServer();
const io = require('socket.io')(app);
const ioint = require('socket.io')(appint);

const fs = require('fs');
const uuidv4 = require('uuid/v4');
var redis = require('socket.io-redis');
var infinispan = require('infinispan');


// public
app.listen(8080);
//Internal
appint.listen(8081);


ioint.on('connection', (socket) => {
  socket.on(serverEvents.in.createRoom, (data) => {
      var roomId= uuidv4();
      //Al final se crean solas las salas al hacer join
      var connected = infinispan.client({port: DATAGRID_PORT, host: DATAGRID_HOST }, {cacheName: DATAGRID_CACHE_NAME , version: DATAGRID_PROTO_VERSION});
      connected.then(function (client){
        console.log("connected to datagrid");

        var clientPut = client.put(roomId+"_room","initiated");
        return clientPut.finally(
          function() { 
            socket.emit(serverEvents.out.new_room, { roomId: roomId });
            return client.disconnect(); });
      }).catch(function(error) {
        console.log("Got error: " + error);
        console.log("Got error: " + error.message);
      
      });
    
  });
});


io.adapter(redis({ host: 'redis-game-room', port: 6379 }));
io.on('connection', (socket) => {
  socket.on(publicEvents.in.join, (data) => {

          socket.emit(publicEvents.out.news, { info: "welcome wsao game room" });
          socket.emit(publicEvents.out.remote_player_moved, initial_pos);
          updateGameRoom(data.roomId);
  });
  socket.on(publicEvents.in.player_moved, (data) => {
          socket.to(data.roomId).emit(publicEvents.out.remote_player_moved,{changes:[data]})
  });
  
});


function updateGameRoom(roomId){
  var room = io.sockets.adapter.rooms[roomId];
  if (room.length==maxplayersroom){
    io.to(roomId).emit(publicEvents.out.game_ready, {counter:3} );
  }
  
}