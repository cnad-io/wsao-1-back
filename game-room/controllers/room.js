
"use strict";

const maxplayersroom=4;

var logger = require('pino')({ 'level': process.env.LOG_LEVEL || 'info' });
var Promise = require('bluebird');
var infinispan = require('infinispan');
const uuidv4 = require('uuid/v4');


const DATAGRID_PORT = process.env.DATAGRID_PORT || 11333;
const DATAGRID_HOST = process.env.DATAGRID_HOST || 'wsao-datagrid-hotrod';
const DATAGRID_CACHE_NAME = process.env.DATAGRID_CACHE_NAME || 'game-room';
const DATAGRID_PROTO_VERSION =  process.env.DATAGRID_PROTO_VERSION || '2.5';



//infinispan client
var connected = infinispan.client({port: DATAGRID_PORT, host: DATAGRID_HOST }, {cacheName: DATAGRID_CACHE_NAME , version: DATAGRID_PROTO_VERSION });

var onCreateGameRoom = function (data) {

    return new Promise(function (resolve, reject) {
    
        connected.then(function (client){
            console.log("connected to datagrid");
            var roomId= uuidv4();
            var players = {keys:[]};
            var putplayersObject = client.put(roomId+"_players",JSON.stringify(players));
    
            var putNewRoom = client.put(roomId+"_room","initiated");
            resolve({ roomId: roomId });

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
            reject(error);
    
          });


    
    });


};


var onJoinGameRoom = function (data) {

    logger.info(data.nickname + ' joined.');
    return new Promise(function (resolve, reject) {
        connected.then(function (client) {
            logger.info("connected to datagrid");
            logger.debug("RoomId requested", data.roomId)
            var getRoomStatus = client.get(data.roomId + "_room");
        
            var roomValidation = getRoomStatus.then(function (value) {
              logger.debug("room: ", value);
              if(value == 'initiated'){
                registerPlayer(data);
                resolve();
                checkGameRoomToStart(data.roomId);
              } else {
                reject({info: "room " + data.roomId + " doesn't exist"})
              }
            });

          }).catch(function(error) {
            logger.error("Got error:", error);
          });
        

    });
  };

  var registerPlayer = function  (data) {
    connected.then(function (client) {
        logger.info("Register Player: " + JSON.stringify(data));
        var getPlayers = client.get(data.roomId + "_players");
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
        players.keys.indexOf(data.socketId) === -1 ? players.keys.push(data.socketId): logger.info("This item already exists");
        var player_number=1+players.keys.indexOf(data.socketId);
        players[data.socketId]={
            playerId: data.playerId,
            nickname: data.nickname != null ? data.nickname:'',
            playerNumber: player_number
        }
        logger.info("New Player: " + JSON.stringify(players));
        return client.put(
            data.roomId + "_players",
            JSON.stringify(players)
        );
        });
    }).catch(function(error) {
        logger.error("Got error:", error);
    });
  };

  function checkGameRoomToStart (roomId) {
    logger.info("checkGameRoomToStart");
    //var room = io.sockets.adapter.rooms[roomId];
    var room = { length: 2}
    if(room == null){
      return;
    }
    if (room.length == maxplayersroom) {
    //if (room.length == maxplayersroom) {
      startGameRoom(roomId);
    } else {

        
        process.emit("send news to room",roomId,{
            info: maxplayersroom-room.length + " player(s) remaining to start the game"
        })

  }

  }

  var calculateInitialLocation = function (roomId, playerId, playerNumber) {
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
  
  
  
  
  function savePlayerMove (data, cacheClient) {
    var doSavePlayerMove = cacheClient.put(
      data.roomId + "_player_" + data.playerId,
      JSON.stringify(data)
    );
    return doSavePlayerMove;
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
  


module.exports = {
    on: {
      joinGameRoom: onJoinGameRoom,
      createGameRoom: onCreateGameRoom
    }
  };