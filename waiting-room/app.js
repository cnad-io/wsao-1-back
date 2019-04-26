'use strict';

const states = {
  assigned: "Assigned",
  waiting: "waiting in room",
  rejected: "rejected"
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
    on_join(socket,data);
  });
  socket.on(publicEvents.in.disconnect, () =>  {
    on_disconnect();
  });
});

/** Server events listeners **/
const adminSocket = ioOut('http://game-room-internal:8081');
adminSocket.on(serverEvents.in.new_room, (data) => {
  assignGameRoom(data.roomId);
});
/** END server events listeners **/


/** Socket IO Callback function **/
function on_join(socket,data){
  console.log("SOMEONE JOINED: "+JSON.stringify(data));
  var validate = validatePlayer(data.nickname);
  if(validate){
    socket.join(waitingroom);
    socket.emit(publicEvents.out.join_response,{playerId:socket.id,nickname: data.nickname});
    io.to(waitingroom).emit(publicEvents.out.player_joined, data.nickname);
    updateRoom();
  }else{
    socket.emit(publicEvents.out.news, { info: 'Your token is invalid' });
  }
}

function on_disconnect(socket){
  if(socket != null){
    socket.emit(publicEvents.out.disconnected);
  } 
  updateRoom();
}
/** END Socket IO Callback function **/



function validatePlayer(token){

//TODO: conexion a management user

  return true;
}

function updateRoom(){
  var room = io.sockets.adapter.rooms[waitingroom];
  io.to(waitingroom).emit(publicEvents.out.players_room, room );

  //TODO: fix the room's members counter 

  if (room != null && room.length==maxplayersroom){
    createGameRoom();
  }else {
    io.to(waitingroom).emit(publicEvents.out.news, {info: maxplayersroom-room.length + " player(s) remaining to assign a game room"} );
  }
  //
}


function createGameRoom(){
// create game room using game room service
  //adminSocket.removeListener(serverEvents.in.new_room, [function]);


  io.to(waitingroom).emit(publicEvents.out.news, {info:"creando game-room"});
  adminSocket.emit(serverEvents.out.createRoom, {});

}

function assignGameRoom(roomId){

  var response =  { state: states.assigned , roomId: roomId }
  io.to(waitingroom).emit(publicEvents.out.room_assigned, response);
  io.to(waitingroom).emit(publicEvents.out.news, {info:"game-room: "+roomId});
}
