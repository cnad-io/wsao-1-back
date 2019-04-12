'use strict';

const states = {
  assigned:"Assigned"
}

const waitingroom = "waiting room"

var usersWaiting = []

const app = require('http').createServer();
const io = require('socket.io')(app);
const fs = require('fs');
const uuidv4 = require('uuid/v4');
app.listen(8080);

io.on('connection', (socket) => {
  socket.emit('news', { hello: 'world' });
  socket.on('join', (data) => {
    join(socket,data)
  });
});



function join(socket, data){

socket.join(waitingroom);
io.to(waitingroom).emit('user connected', data.token);

var room = io.sockets.adapter.rooms[waitingroom];
io.to(waitingroom).emit('user in room', room );

;
if (room.length=200)
assignGameRoom();
}

function createGameRoom(room){
// create game room using game room service
room = uuidv4();

}

function assignGameRoom(){
var room = 'newroom';
createGameRoom(room)
var response =  { state: states.assigned , game_room_token: room }
io.to(waitingroom).emit('go to your game room', response);

//io.sockets.clients(waitingroom).forEach(function(s){
    //s.leave(waitingroom);
//});

}
