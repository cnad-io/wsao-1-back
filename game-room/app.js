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
var connected = infinispan.client({port: DATAGRID_PORT, host: DATAGRID_HOST }, {cacheName: DATAGRID_CACHE_NAME , version: DATAGRID_PROTO_VERSION });



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

        var getRoomStatus = putNewRoom.then(
          function() {
            return client.get(roomId+"_room");
        });
        var showRoomStatus = getRoomStatus.then(
        function(value) { 
          console.log("room: "+JSON.stringify(value))
        });
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
    on_player_moved(socket,data);
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
      console.log("room: "+JSON.stringify(value))
      if(value == 'initiated'){
        socket.join(data.roomId);
        var doRegisterPlayer = registerPlayer(data,socket.id,client);
        socket.emit(publicEvents.out.news, { info: "welcome wsao game room" });
        checkGameRoomToStart(data.roomId);
        return doRegisterPlayer;
      }else{
        socket.emit(publicEvents.out.news, { info: "room "+data.roomId+" doesn't exist" });
        return getRoomStatus;
      }
    });
    //var clientClear = roomValidation.then(
    //  function() { return client.clear(); });
  
    //return clientClear;
  }).catch(function(error) {
    console.log("Got error: " + error);
    console.log("Got error: " + error.message);
  
  });    
}
function on_player_moved(socket,data){
  socket.to(data.roomId).emit(publicEvents.out.remote_player_moved,data)
  connected.then(function (client){
    var savePlayerMove = savePlayerMove(data,client);
    //caculateEvents(data);
  }).catch(function(error) {
    console.log("Got error: " + error);
    console.log("Got error: " + error.message);

  });  

}
/** END Socket IO Callback function **/


function calculateInitialLocation(roomId,playerId,playerNumber){
  var x;
  var y;
  var z;
  var rotation;

  switch (playerNumber) {
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

function savePlayerMove(data,cacheClient){
  var savePlayerMove = cacheClient.put(data.roomId+"_player_"+data.playerId,JSON.stringify(data) );

  return savePlayerMove;
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
 connected.then(function (client){
    var getPlayers = client.get(roomId+"_players");

    var calculateInitialPosition = getPlayers.then(
      function(value) { 
        console.log('getPlayers=%s', value);

        var players = JSON.parse(value);
        io.to(roomId).emit(publicEvents.out.news, { info: "Assigning player location" });
        players.keys.forEach((playerkey) => {
          var initial_position= calculateInitialLocation(roomId, players[playerkey].playerId,players[playerkey].playerNumber);
          savePlayerMove(initial_position,client);        
        });
      
        return client.get(roomId+"_players"); 
    }); 

    var getPlayersPosition = calculateInitialPosition.then(
      function(value) { 
        var players = JSON.parse(value);
        var players_keys= [];
        players.keys.forEach((playerkey) => {
          players_keys.push(roomId+"_player_"+players[playerkey].playerId);       
        });

        return client.getAll(players_keys); 
    }); 

    var sendPlayerPosition = getPlayersPosition.then(
      function(entries) {
        entries.forEach((move) => {
          io.to(roomId).emit(publicEvents.out.remote_player_moved,JSON.parse(move.value));

        });
      }
    );
  
    //var clientClear = sendPlayerPosition.then(function() { return client.clear(); });
    //return clientClear;
  }).catch(function(error) {
    console.log("Got error: " + error);
    console.log("Got error: " + error.message);

  }); 
  io.to(roomId).emit(publicEvents.out.game_ready, {counter:3} );
}


function registerPlayer(data,socketId,cacheClient){
  console.log("Register Player: "+JSON.stringify(data));
    var getPlayers = cacheClient.get(data.roomId+"_players");
    var updatePlayers = getPlayers.then(
      function(value) { 
        console.log(JSON.stringify(value));
        console.log(data.roomId+"_players");
        /* TODO: identificar si cambia el socket */
        var players = value;
        if(players != null){
          players = JSON.parse(players);
        }else{
          players = {keys:[]}
        }
        players.keys.indexOf(socketId) === -1 ? players.keys.push(socketId):console.log("This item already exists");
        var player_number=1+players.keys.indexOf(socketId);
        players[socketId]={         
          playerId:data.playerId,
          nickname:data.nickname != null ? data.nickname:'',
          playerNumber:player_number
        }
        console.log("New Player: "+JSON.stringify(players));
        return cacheClient.put(data.roomId+"_players",JSON.stringify(players));
    }); 
    return updatePlayers;


}
