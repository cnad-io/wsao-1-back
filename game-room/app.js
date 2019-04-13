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
    join:'join',
    disconnect:'disconnect'
  },
  out:{

  }
}


const app = require('http').createServer();
const appint = require('http').createServer();
const io = require('socket.io')(app);
const ioint = require('socket.io')(appint);

const fs = require('fs');
const uuidv4 = require('uuid/v4');

// public
app.listen(8080);
//Internal
appint.listen(8081);


ioint.on('connection', (socket) => {
  socket.on(serverEvents.in.createRoom, (data) => {
      var game_room_token= uuidv4();
      socket.emit(serverEvents.out.new_room, { game_room_token: game_room_token });
  });
});


io.on('connection', (socket) => {
  socket.on(publicEvents.in.join, (data) => {
          socket.emit("news", { info: "welcome wsao" });
  });
});
