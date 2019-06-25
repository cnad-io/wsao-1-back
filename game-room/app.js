'use strict';

var maxplayersroom = 4;

var app = require('http').createServer();
var appint = require('http').createServer();
var io = require('socket.io')(app);
var ioint = require('socket.io')(appint);

var uuidv4 = require('uuid/v4');
var redis = require('socket.io-redis');
var infinispan = require('infinispan');
var events = require('./models/events');
var logger = require('pino')({ 'level': process.env.LOG_LEVEL || 'info' });

logger.info('Creating infinitspan connection');
var connected = infinispan.client({
  port: process.env.DATAGRID_PORT || 11333,
  host: process.env.DATAGRID_HOST || 'wsao-datagrid-hotrod'
}, {
  cacheName: process.env.DATAGRID_CACHE_NAME || 'game-room',
  version: process.env.DATAGRID_PROTO_VERSION || '2.5'
});
logger.debug('Infinitspan connection created', connected);

// public
app.listen(8080);
//Internal
appint.listen(8081);

ioint.on('connection', function (socket) {
  socket.on(events.server.in.createRoom, function (data) {
    //Al final se crean solas las salas al hacer join
    connected.then(function (client) {
      logger.info("connected to datagrid");
      var roomId = uuidv4();
      // var players = {keys:[]};
      // var putplayersObject = client.put(roomId+"_players",JSON.stringify(players));

      var putNewRoom = client.put(
        roomId + "_room",
        "initiated"
      );

      socket.emit(events.server.out.new_room, { roomId: roomId });

      var getRoomStatus = putNewRoom.then(function() {
        return client.get(roomId+"_room");
      });
      var showRoomStatus = getRoomStatus.then(function (value) {
        logger.debug("Room: ", JSON.stringify(value));
      });
    }).catch(function (error) {
      logger.error("Got error: ", error);
    });
  });
});

io.adapter(redis({
  host: 'redis-game-room',
  port: 6379
}));

io.on('connection', function (socket) {
  socket.on(events.public.in.join, function (data) {
    on_join_game_room(socket, data);
  });
  socket.on(events.public.in.player_moved, function (data) {
    on_player_moved(socket, data);
  });
});

/** Socket IO Callback function **/
function on_join_game_room(socket, data) {
  connected.then(function (client) {
    logger.info("connected to datagrid");
    logger.debug("RoomId requested", data.roomId)
    var getRoomStatus = client.get(data.roomId + "_room");

    var roomValidation = getRoomStatus.then(function (value) {
      logger.debug("room: ", value);
      if(value == 'initiated'){
        socket.join(data.roomId);
        var doRegisterPlayer = registerPlayer(
          data,
          socket.id,
          client
        );
        socket.emit(events.public.out.news, {
          info: "welcome wsao game room"
        });
        checkGameRoomToStart(data.roomId);
        return doRegisterPlayer;
      } else {
        socket.emit(events.public.out.news, {
          info: "room " + data.roomId + " doesn't exist"
        });
        return getRoomStatus;
      }
    });
  }).catch(function(error) {
    logger.error("Got error:", error);
  });
}

function on_player_moved(socket, data) {
  logger.info("User moved");
  logger.debug("Data", data);
  socket.to(data.roomId).emit(
    events.public.out.remote_player_moved,
    data
  );
  connected.then(function (client) {
    //var doSavePlayerMove = savePlayerMove(data,client);
    //caculateEvents(data);
  }).catch(function(error) {
    logger.error("Got error:", error);
  });
}
/** END Socket IO Callback function **/


function calculateInitialLocation(roomId, playerId, playerNumber) {
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

function savePlayerMove (data, cacheClient) {
  var doSavePlayerMove = cacheClient.put(
    data.roomId + "_player_" + data.playerId,
    JSON.stringify(data)
  );
  return doSavePlayerMove;
}

function checkGameRoomToStart (roomId) {
  var room = io.sockets.adapter.rooms[roomId];
  if(room == null){
    return;
  }
  if (room.length == maxplayersroom) {
    startGameRoom(roomId);
  } else {
    io.to(roomId).emit(
      events.public.out.news, {
        info: maxplayersroom-room.length + " player(s) remaining to start the game"
    });
  }
}

function startGameRoom (roomId) {
 connected.then(function (client) {
    var getPlayers = client.get(roomId + "_players");
    var calculateInitialPosition = getPlayers.then(function(value) {
      logger.info('getPlayers=%s', value);

      var players = JSON.parse(value);
      io.to(roomId).emit(events.public.out.news, { info: "Assigning player location" });
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
          io.to(roomId).emit(events.public.out.remote_player_moved,JSON.parse(move.value));
        });
      }
    );

  }).catch(function(error) {
    logger.error("Got error:", error);
  });
  io.to(roomId).emit(events.public.out.game_ready, {counter: 3});
}


function registerPlayer (data, socketId, cacheClient) {
  logger.info("Register Player: " + JSON.stringify(data));
  var getPlayers = cacheClient.get(data.roomId + "_players");
  var updatePlayers = getPlayers.then(function (value) {
    logger.info(JSON.stringify(value));
    logger.info(data.roomId + "_players");
    /* TODO: identificar si cambia el socket */
    var players = value;
    if (players != null) {
      players = JSON.parse(players);
    } else {
      players = {keys:[]}
    }
    players.keys.indexOf(socketId) === -1 ? players.keys.push(socketId): logger.info("This item already exists");
    var player_number=1+players.keys.indexOf(socketId);
    players[socketId]={
      playerId: data.playerId,
      nickname: data.nickname != null ? data.nickname:'',
      playerNumber: player_number
    }
    logger.info("New Player: " + JSON.stringify(players));
    return cacheClient.put(
      data.roomId + "_players",
      JSON.stringify(players)
    );
  });
  return updatePlayers;
}
