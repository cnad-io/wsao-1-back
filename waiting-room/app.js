'use strict';

const states = {
  assigned: "Assigned",
  waiting: "waiting in room",
  rejected: "rwjected"
}

const waitingroom = "waiting room"
const publicEvents = {
  in: {
    join:'join',
    disconnect:'disconnect'
  },
  out:{
    players_room: 'players in room',
    disconnected: 'disconnected',
    news: 'news',

    join_response: 'join response',
    room_assigned: 'room assigned',
    player_joined: 'player joined'

  }
}
const serverEvents = {
    out: {
    createRoom:'createRoom',
    disconnect:'disconnect'
  },
  in:{
    new_room:'newroom'
  }
}
const maxplayersroom=4;

const app = require('http').createServer();
const io = require('socket.io')(app);
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const ioOut = require('socket.io-client');
var redis = require('socket.io-redis');


app.listen(8080);
io.adapter(redis({ host: 'redis-waiting-room', port: 6379 }));
io.origins('*:*');
io.on('connection', (socket) => {
  socket.emit(publicEvents.out.news, { info: 'welcome to wsao' });
  socket.on(publicEvents.in.join, (data) => {
    console.log("SOMEONE JOINED: "+JSON.stringify(data));
    var validate = validatePlayer(data.token);
    if(validate){
      socket.join(waitingroom);
      socket.emit(publicEvents.out.join_response,{idplayer:socket.id});
      io.to(waitingroom).emit(publicEvents.out.player_joined, data.token);
      updateRoom();
    }else{
      socket.emit(publicEvents.out.news, { info: 'Your token is invalid' });
    }
  });
  socket.on(publicEvents.in.disconnect, function () {
    socket.emit(publicEvents.out.disconnected);
    updateRoom();
  });
});

const adminSocket = ioOut('http://game-room-internal:8081');



function validatePlayer(token){

//TODO: conexion a management user

  return true;
}

function updateRoom(){
  var room = io.sockets.adapter.rooms[waitingroom];
  io.to(waitingroom).emit(publicEvents.out.players_room, room );

  //TODO: fix the room's members counter if (room.length==maxplayersroom)
  //createGameRoom();
}


function createGameRoom(){
// create game room using game room service
  adminSocket.on(serverEvents.in.new_room, (data) => {
    assignGameRoom(data.game_room_token);
  });

  io.to(waitingroom).emit(publicEvents.out.news, {info:"creando game-room"});
  adminSocket.emit(serverEvents.out.createRoom, {});

}

function assignGameRoom(game_room_token){

  var response =  { state: states.assigned , game_room_token: game_room_token }
  io.to(waitingroom).emit(publicEvents.out.room_assigned, response);
  io.to(waitingroom).emit(publicEvents.out.news, {info:"game-room: "+game_room_token});
}
