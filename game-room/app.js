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




const app = require('http').createServer();
const appint = require('http').createServer();
const io = require('socket.io')(app);
const ioint = require('socket.io')(appint);

const fs = require('fs');
const uuidv4 = require('uuid/v4');
var redis = require('socket.io-redis');
var infinispan = require('infinispan');

//infinispan client
var connected = infinispan.client({port: DATAGRID_PORT, host: DATAGRID_HOST }, {cacheName: DATAGRID_CACHE_NAME , version: DATAGRID_PROTO_VERSION});



// public
app.listen(8080);
//Internal
appint.listen(8081);


ioint.on('connection', (socket) => {
  socket.on(serverEvents.in.createRoom, (data) => {
      //Al final se crean solas las salas al hacer join
      connected.then(function (client){
        console.log("connected to datagrid");
        var roomId= uuidv4();
        var putNewRoom = client.put(roomId+"_room","initiated");
        socket.emit(serverEvents.out.new_room, { roomId: roomId });

        //var clientClear = putNewRoom.then(
        //  function() { return client.clear(); });
      
        return putNewRoom;
      }).catch(function(error) {
        console.log("Got error: " + error);
        console.log("Got error: " + error.message);
      
      });
    
  });
});


io.adapter(redis({ host: 'redis-game-room', port: 6379 }));
io.on('connection', (socket) => {
  socket.on(publicEvents.in.join, (data) => {
    on_join_game_room(socket,data);
  });
  socket.on(publicEvents.in.player_moved, (data) => {
          socket.to(data.roomId).emit(publicEvents.out.remote_player_moved,data)
          savePlayerMove(data);
          //caculateEvents(data);
  });
  
});

/** Socket IO Callback function **/


function on_join_game_room(socket,data){
  
  connected.then(function (client){
    console.log("connected to datagrid");
    console.log("roomId requested =>"+data.roomId)
    var getRoomStatus = client.get(data.roomId+"_room");

    var roomValidation = getRoomStatus.then(
    function(value) { 
      if(value == 'initiated'){
        socket.join(data.roomId);
        var doRegisterPlayer = registerPlayer(data,socket.id,client);
        socket.emit(publicEvents.out.news, { info: "welcome wsao game room" });
        socket.emit(publicEvents.out.news, { info: "Assigning player location" });
        var initial_position= calculateInitialLocation(data.roomId,data.playerId);
        socket.emit(publicEvents.out.remote_player_moved, initial_position); //borrar de aca se manejara las posiciones iniciales en el startgameroom
        savePlayerMove(initial_position);
        checkGameRoomToStart(data.roomId);
        return doRegisterPlayer;
      }else{
        socket.emit(publicEvents.out.news, { info: "room "+data.roomId+" doesn't exist" });
        return getRoomStatus;
      }
    });
    //var clientClear = roomValidation.then(
    //  function() { return client.clear(); });
  
    return roomValidation;
  }).catch(function(error) {
    console.log("Got error: " + error);
    console.log("Got error: " + error.message);
  
  });    
}
/** END Socket IO Callback function **/


function calculateInitialLocation(roomId,playerId){
  var x;
  var y;
  var z;
  var rotation;
  var player_number;
  var room = io.sockets.adapter.rooms[roomId];

  if (room != null && room.length !=null){
    //Todo: obtener posiciones basado en data y no en el tamaño del room
    player_number=room.length;

  }

  switch (player_number) {
    case 1:
      x=1;
      y=1;
      z=1;
      rotation=1;
      break;
    case 2:
      x=1;
      y=2;
      z=1;
      rotation=1;
      break;
    case 3:
      x=2;
      y=1;
      z=1;
      rotation=1;
      break;
    case 4:
      x=2;
      y=2;
      z=1;
      rotation=1;
      break;
    default:
      x=0;
      y=0;
      z=0;
      rotation=0;
  }

  var initial_pos  = {
     playerId: playerId,
    // token,
    // name,
    // sprite,
     roomId: roomId,
     x:x,
     y:y,
     z:z,
    // rx,
    // ry,
    // rz,
    // rw,
     speed:1,
    // state,
     rotation: rotation
  
  }
  return initial_pos;
}

function savePlayerMove(data){

}

function checkGameRoomToStart(roomId){
  var room = io.sockets.adapter.rooms[roomId];
  if(room == null){
    return;
  }
  if (room.length==maxplayersroom){
    startGameRoom(roomId);
  }else{
    io.to(roomId).emit(publicEvents.out.news, {info: maxplayersroom-room.length + " player(s) remaining to start the game"} );
  }
  
}


function startGameRoom(roomId){
  //broadcast all position
  /*
  for(player in players){
  io.to(roomId).emit(publicEvents.out..remote_player_moved, player.initial_position);
  }
  */
  io.to(roomId).emit(publicEvents.out.game_ready, {counter:3} );
}

function registerPlayer(data,socketId,cacheClient){
  console.log("Register Player: "+JSON.stringify(data));
    var getPlayers = cacheClient.get(data.roomId+"_players");
    var updatePlayers = getPlayers.then(
      function(value) { 
        console.log(JSON.stringify(value));
        console.log(data.roomId+"_players");

        var players = value;
        if(players == null){
          players = {keys:[]}
        }
        players.keys.indexOf(socketId) === -1 ? players.keys.push(socketId):console.log("This item already exists");
        var player_number=players.keys.indexOf(socketId);
        players[socketId]={         
          playerId:data.playerId,
          nickname:data.nickname != null ? data.nickname:'',
          playerNumber:player_number
        }
        console.log("New Player: "+JSON.stringify(players));
        return cacheClient.put(data.roomId+"_players",players)
    }); 
    return updatePlayers;


}
