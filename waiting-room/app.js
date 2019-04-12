'use strict';

const states = {
  assigned:"Assigned"
}

const waitingroom = "waiting room"
const events = {
  in: {
    join:'join',
    disconnect:'disconnect'
  },
  out:{
    new_player:'user connected',
    players_room: 'players in room',
    disconnected: 'disconnected',
    room_assigned 'room assigned'
  }
}
const maxplayersroom=4;

const app = require('http').createServer();
const io = require('socket.io')(app);
const fs = require('fs');
const uuidv4 = require('uuid/v4');

app.listen(8080);

io.on('connection', (socket) => {
  socket.emit('news', { hello: 'world' });
  socket.on(events.in.join, (data) => {
    socket.join(waitingroom);
    io.to(waitingroom).emit(events.out.new_player, data.token);
    updateRoom();
  });
  socket.on(events.in.disconnect, function () {
    socket.emit(events.out.disconnected);
    updateRoom();
  });
});


function updateRoom(){
  var room = io.sockets.adapter.rooms[waitingroom];
  io.to(waitingroom).emit(events.out.players_room, room );

  if (room.length==maxplayersroom)
  assignGameRoom();
}

function createGameRoom(){
// create game room using game room service
var room = uuidv4();

return room;
}

function assignGameRoom(){
var room = createGameRoom();
var response =  { state: states.assigned , game_room_token: room }
io.to(waitingroom).emit(events.out.room_assigned, response);

//io.sockets.clients(waitingroom).forEach(function(s){
    //s.leave(waitingroom);
//});

}
