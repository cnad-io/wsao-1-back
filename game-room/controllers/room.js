"use strict";

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


    
    }
};


var onJoinGameRoom = function (data) {

    logger.info(data.nickname + ' joined.');
    return new Promise(function (resolve, reject) {

    });
  };


module.exports = {
    on: {
      joinGameRoom: onJoinGameRoom,
      createGameRoom: onCreateGameRoom
    }
  };