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
    disconnect:'disconnect',
    myData: 'my data',
    keyStroke: 'keyStroke'
  },
  out:{
    yourdata:'your data',
    sceneupdate: 'scene update',
    scoreupdate: 'score update',
    news: 'news'
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
          socket.emit(publicEvents.out.news, { info: "welcome wsao game room" });
  });
  socket.on(publicEvents.in.mydata, (data) => {
          socket.emit(publicEvents.out.news, { info: "here is yourdata" });
  });
  socket.on(publicEvents.in.keyStroke, (data) => {
  });
  socket.on(publicEvents.in.myData, (data) => {
  });
});
