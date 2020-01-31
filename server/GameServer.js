const TileMapParser = require("./TileMapParser.js").TileMapParser;
const GameServerMatch = require("./GameServerMatch.js");
const MatchChat = require("./MatchChat.js");
// mongo db
const Users = require('../mongoose_models/user_model');
const Matches = require('../mongoose_models/match_model');

let io;

/**
 * The Game Server, handles the management of creating and removing instances, and to parse
 * the proper match based on which match a socket belongs to
 */
GameServer = {
    matchInstances: {}, // the attributes in mactchInstances will be the different "unique" match ids we generate
                        // each match id maps as so: awxg113hs31h414(sample match id): {socket1, socket2, instance}
    chats: {},
    tileMapParser: TileMapParser.parseJSON()
};

exports.initServer = function(sio, socket) {
    io = sio;
    socket.on('disconnect', function() {
        GameServer.leaveInstance(socket);
        GameServer.killInstanceUponDisconnect(socket);
    });

    // When an intent to create a match is sent from a client
    socket.on('createMatch',function(data) {
        // See if the user from the socket connection, is already in a game
        //TODO: require DatabaseHandler
        Matches.findOne({ players: { $elemMatch: { playerId: socket.userId } } }, function(err, match) {
            if(err) {
                socket.emit("ErrorEvent", err);

            // match is null when player is not in game
            } else if(!match) {
                GameServer.initializeInstance(socket);
            } else {

                socket.emit('alreadyJoined', {
                  matchId: match._id
                });
            }
        });
    });

    // When an intent to join a game if it exists is sent from a client
    // data = null
    socket.on('joinMatch',function(data) {
        // See if the user from the socket connection, is already in a game
        //TODO: require DatabaseHandler
        Matches.findOne({ players: { $elemMatch: { playerId: socket.userId } } }, function(err, match) {
            if(err) {
                socket.emit("ErrorEvent", err);

            // if the player is not in match, match will be null
            } else if(!match) {
                // Now search for an available match instance for player to join
                GameServer.matchSearch(socket);

            } else {

                socket.emit('alreadyJoined', {
                  matchId: match._id
                });
            }
        });
    });

    // When an intent to leave a game, if client is already in one, is sent from said client
    socket.on('leaveMatch', function(doCallback) {
        GameServer.leaveInstance(socket, doCallback);
    });

    socket.on('request to leave room', function(targetMatchId) {
        socket.leave(targetMatchId);
    });

    socket.on("get match info", function(data) { // data = {matchId, toAllPlayers}
        GameServer.emitMatchInfo(socket, data.matchId, data.toAllPlayers);
    });

    socket.on("get match setup info", function(targetMatchId) {
        GameServer.emitMatchSetupInfo(targetMatchId);
    });

    socket.on("new message", function(data) {
        GameServer.chats[data.matchId].addMessage(socket.username, data.message);
        io.in(data.matchId).emit("emitMessage", GameServer.chats[data.matchId].getAllMessages());
    });
    /* ================================================================================================================= */
    /* ================================================In Game Operation================================================ */
    /* ================================================================================================================= */

    /**
     * data = {mapSelected: name of the map. i.e. "Outside_A5", matchId}
     */
    socket.on("get map info", function(data) {
        Matches.findOne({ "_id": data.matchId }, function(err, match) {
            if(err) socket.emit("ErrorEvent", err);
            else if(!match) socket.emit("ErrorEvent", "Target match Id: " + data.matchId + " not found in database");
            else {
                let playerTerritory = null;
                // use the player order in the database to determine the player territory
                for(let i = 0; i < match.players.length; i++) {
                    if(match.players[i].playerId === socket.userId) {
                        playerTerritory = GameServer.getPlayerTerritory(data.mapSelected, i);
                    }
                }

                if(playerTerritory === null) {
                    socket.emit("ErrorEvent", "Player Territory not found");

                } else {
                    TileMapParser.parseJSON();
                    let tileMapInfo = {
                        p1Base: TileMapParser.getP1Base(),
                        p2Base: TileMapParser.getP2Base(),
                        collideTileMap: TileMapParser.getCollideTilePositions(),
                        mapSize: TileMapParser.getMapSize(),
                        playerTerritory: playerTerritory
                    }
                    socket.emit("map info", tileMapInfo);
                }
            }
        });
    });

    /**
     * data = {matchId}
     */
    socket.on("get player colour", function(data) {
        socket.emit("player colour", GameServer.matchInstances[data.matchId].getPlayerColour(socket.id));
    });

    /**
     * Instantiating the player and the unit after the MatchSetupScene
     * @param data = {matchId,
     *   units : [{unitClass, display, x, y}]  display is the display when the unit is initialized
     * }
     */
    socket.on("instantiate game", function(data) {
        if (GameServer.matchInstances[data.matchId]) {
            // playerId and socket id is already added when player joined the room

            // add all units from this player to GameServerMatch with their initial coordinates
            for(let i = 0; i < data.units.length; i++) {
                let unitInfo = data.units[i];
                GameServer.matchInstances[data.matchId].addUnit(socket.userId, {class: unitInfo.unitClass, display: unitInfo.display, x: unitInfo.x, y: unitInfo.y});
            }
            GameServer.matchInstances[data.matchId].playerFinishPlacingUnit(socket.userId);

            if (GameServer.matchInstances[data.matchId].allPlayersHasPlacedTheirUnits()) {
                io.in(data.matchId).emit("game setup completed", true);
            }

        } else {
            socket.emit("ErrorEvent", "Match instances are not instantiated");
        }
    });

    socket.on("player change status", function(data) {
        let targetMatchId = data.matchId;
        let targetPlayerId = socket.userId;
        let targetReadyToPlay = data.newStatus;
        Matches.findOne({ "_id": targetMatchId }, function(err, match) {
            if(err) socket.emit("ErrorEvent", err);
            else if(!match) socket.emit("ErrorEvent", "Target match Id: " + targetMatchId + " not found in matchInstance");
            else {
                let playerIdFound = false;
                let newValue = match;
                let newPlayers = match.players;
                for (let i = 0; i < newPlayers.length; i++) {
                    if(newPlayers[i].playerId === targetPlayerId) {
                        playerIdFound = true;
                        newPlayers[i].readyToPlay = targetReadyToPlay;
                    }
                }
                newValue.players = newPlayers;

                if(!playerIdFound) socket.emit("ErrorEvent", "Error: player id does not match");
                else {
                    Matches.updateOne({ "_id": targetMatchId }, newValue, function(err, newMatch) {
                        if(err) socket.emit("ErrorEvent", err);
                        else socket.emit("player status change success", null);
                    });
                }
            }
        });
    });

    socket.on("reset readyToPlay", function(data) {
        let targetMatchId = data.matchId;
        Matches.findOne({ "_id": targetMatchId }, function(err, match) {
            if(err) socket.emit("ErrorEvent", err);
            else if(!match) socket.emit("ErrorEvent", "Target match Id: " + targetMatchId + " not found in matchInstance");
            else {
                let newValue = match;
                let newPlayers = match.players;
                for (let i = 0; i < newPlayers.length; i++) {
                    newPlayers[i].readyToPlay = false;
                }
                newValue.players = newPlayers;
                Matches.updateOne({ "_id": targetMatchId }, newValue, function(err, newMatch) {
                    if(err) socket.emit("ErrorEvent", err);
                });
            }
        });
    });

    /**
     * @param data = {matchId}
     */
    socket.on("get game server match", function(data) {
        let gameServerMatch = GameServer.matchInstances[data.matchId];
        let returnData = {
            matchId : gameServerMatch.matchId,
            playerIds: gameServerMatch.playerIds,
            playerColour: gameServerMatch.playerColour,
            unitInfo: gameServerMatch.unitInfo, // {socketId: [Unit object]}
            isPlayerTurn: (socket.id === gameServerMatch.getSocketIdTurn()), // true, false
            playerUsernameTurn: gameServerMatch.getPlayerUsernameTurn()
        };

        socket.emit("game server match", returnData);
    });

    function moveUnitCallback(socket, data) {
        return function(newUnitInfo) {
            let unitList = newUnitInfo[socket.userId];
            let changedUnit = null;
            unitList.forEach(function(unit) {
                if(unit.id === data.unitId) {
                    changedUnit = unit;
                }
            });
            io.in(data.matchId).emit("update units position", changedUnit);
        }
    }

    /**
     * @param data = {matchId, unitId, moveAngle}
     * movementAngle is the combination of movement key press
     */
    socket.on("move unit", function(data) {
        // Decouple the data
        if (socket.id === GameServer.matchInstances[data.matchId].getSocketIdTurn()) {
            GameServer.matchInstances[data.matchId].moveUnit(socket.id, data.unitId, data.moveAngle, moveUnitCallback(socket, data));
        }
    });

    function attackRes(data) {
        return function(newUnitInfo) {
            io.in(data.matchId).emit("update units status", newUnitInfo);
        }
    }
    socket.on("attack unit", function(data) {
        if (socket.id === GameServer.matchInstances[data.matchId].getSocketIdTurn()) {
            GameServer.matchInstances[data.matchId].attackUnit(socket.userId, data.atkId, data.defId, attackRes(data));
        }
    });

    function captureRes(socket, data) {
        return function(verdict) {
            if(verdict) {
                delete GameServer.matchInstances[data.matchId];
                delete GameServer.chats[data.matchId];
                Matches.deleteOne({ _id: data.matchId }, function(err, match) {
                    if(err) socket.emit("ErrorEvent", err);
                });
                io.in(data.matchId).emit("player victory", socket.username + " has won!");
            }
            else {
                socket.emit("invalid capture", "Need to be in \nvictory area and \nhave no enemy \nunits in area");
            }
        }
    }
    socket.on("capture base", function(data) {
        if (socket.id === GameServer.matchInstances[data.matchId].getSocketIdTurn()) {
            GameServer.matchInstances[data.matchId].captureBase(data.unitId, captureRes(socket, data));
        }
    });
    /**
     * When the player end their turn
     * data = {matchId}
     */
    socket.on("end turn", function(data) {
        GameServer.matchInstances[data.matchId].nextPlayerTurn();

        let gameServerMatch = GameServer.matchInstances[data.matchId];
        let returnData = {
            playerIdTurn: gameServerMatch.getPlayerIdTurn(),
            playerUsernameTurn: gameServerMatch.getPlayerUsernameTurn(),
            updatedUnitInfo: gameServerMatch.unitInfo
        };
        io.in(data.matchId).emit("next turn", returnData);
    });

    socket.on("get initial unit space", function(data) {  // data = {matchId}
        let returnData = {
            initialUnitSpace: GameServer.matchInstances[data.matchId].initialUnitSpace
        }
        socket.emit("initial unit space", returnData);
    });
};

GameServer.matchSearch = function(socket) {
    // try to find a match with only one player
    //TODO: DatabaseHandler
    Matches.findOne({ "numberOfPlayer": 1 }, function(err, match) {
        if (err) socket.emit("ErrorEvent", err);
        else if(match) {
            // if this is the cause of a server crash than leave game
            if(GameServer.matchInstances[match._id] === undefined) {
                GameServer.leaveInstance(socket);

            // if server never crashed then there should be a matchInstance
            } else {
                let players = match.players;
                players.push({"playerId": socket.userId, "username": socket.username});
                let newValue = {
                    "players": players,
                    "numberOfPlayer": match.numberOfPlayer + 1
                }
                Matches.updateOne({ "_id": match._id }, newValue, function(err, newMatch) {
                    if(err) socket.emit("ErrorEvent", err);
                    else {
                        socket.join(match._id);
                        // add socket to Game Server Match
                        GameServer.matchInstances[match._id].addPlayerSocketId(socket.id);
                        GameServer.matchInstances[match._id].addPlayerId(socket.userId);
                        GameServer.matchInstances[match._id].addPlayerUsername(socket.username);
                        socket.emit('joinSuccess',{matchId: match._id});
                        io.to(match._id).emit('otherJoinChat', "%s has joined the chat", socket.username);
                        socket.emit('selfJoinChat', "You have joined the chat");
                    }
                });
            }

        // if you can't find a match, create a new one
        } else {
            GameServer.initializeInstance(socket);
        }
    });
};

GameServer.initializeInstance = function(socket) {
    // first find the id of the user with the id in socket.userId
    let matchId;

    let newMatch = {
        players: [{playerId: socket.userId, username: socket.username}]
    };
    Matches.create(newMatch, function(err, res) {
        if(err) socket.emit("ErrorEvent", err);
        else {
            matchId = res._id;
            // Log the game match initialization and emit the game
            let gameServerMatch = new GameServerMatch();
            gameServerMatch.initialize(matchId);
            gameServerMatch.addPlayerSocketId(socket.id);
            gameServerMatch.addPlayerId(socket.userId);
            gameServerMatch.addPlayerUsername(socket.username);
            GameServer.matchInstances[matchId] = gameServerMatch;
            let chat = new MatchChat(matchId);
            GameServer.chats[matchId] = chat;
            socket.emit('selfJoinChat', "You have joined the chat");
            socket.emit('matchCreated', {hostSocket: socket.id, host: socket.username, matchId: matchId});
            socket.join(matchId);
        }
    });
};

/**
 * Upon 2 players already in an active match, if one disconnects,
 * instance gets removed from server, forcing the remaining player to go back to main menu
 */
GameServer.killInstanceUponDisconnect = function(socket) {
    // Search in all matches in the database to see if the current client socket connection is in one
    Matches.findOne({ players: { $elemMatch: { playerId: socket.userId } } }, function(err, match) {
        if(err) {
            socket.emit("ErrorEvent", err);
        } else if(!match) {
            // Client was not in a match after all
            socket.emit("ErrorEvent", "killInstanceUponDisconnect: Match not found");

        } else {
            let matchId = match._id;
            // delete matchId from database
            io.to(matchId).emit('matchDestroyed', "Return to main menu");
        }
    });
}

GameServer.leaveInstance = function (socket, doCallback=false) {
    // Search in all matches in the database to see if the current client socket connection is in one
    Matches.findOne({ players: { $elemMatch: { playerId: socket.userId } } }, function(err, match) {
        if(err) {
            socket.emit("ErrorEvent", err);
        } else if(!match) {
            // Client was not in a match after all
            socket.emit("ErrorEvent", "leaveInstance: Match not found");

        } else {
            let matchId = match._id;

            // If client socket connection is the last player, remove the game match instance, effectively destroying it
            if (match.numberOfPlayer === 1) {
                // delete matchId from database
                Matches.deleteOne({ _id: matchId }, function(err, match) {
                    if(err) socket.emit("ErrorEvent", err);
                });

                socket.emit('leftMatch', "You have left the match: " + matchId);
                socket.emit('selfLeftChat', "You have left the chat");
                // Remove the last socket
                socket.leave(matchId);
                delete GameServer.chats[matchId];
                delete GameServer.matchInstances[matchId];
            }
            // Otherwise, just remove their slot from the match
            else {
                let newPlayers = match.players.filter(function(value, index, arr) {
                    return value.playerId !== socket.userId;
                });
                let newValue = {
                    "players": newPlayers,
                    "numberOfPlayer": match.numberOfPlayer - 1
                };
                Matches.updateOne({ _id: matchId }, newValue, function(err, match) {
                    if(err) socket.emit("ErrorEvent", err);
                    else {
                        socket.emit('leftMatch', "You have left the match: " + matchId);
                        if (doCallback) {
                            socket.to(matchId).emit('otherLeftChat', socket.username + " has left the chat");
                            socket.to(matchId).emit('otherLeftMatch', socket.username + " has left the match: " + matchId);
                        }
                        socket.emit('selfLeftChat', "You have left the chat");
                        socket.leave(matchId);
                    }
                });
            }
        }
    });
}

GameServer.emitMatchInfo = function (socket, targetMatchId, toAllPlayers) {
    Matches.findOne({ "_id": targetMatchId }, function(err, match) {
        if(err) io.in(targetMatchId).emit("ErrorEvent", err);
        else if(!match) socket.emit("ErrorEvent", "Target match Id: " + targetMatchId + " not found in matchInstance");
        else {
            let players = [];
            let allPlayersReady = true;
            for (let i = 0; i < match.players.length; i++) {
                players.push({
                    playerId: match.players[i].playerId,
                    username: match.players[i].username,
                    readyToPlay: match.players[i].readyToPlay
                });
                if (!match.players[i].readyToPlay) allPlayersReady = false; 
            }

            let matchInfo = {
                matchId: match._id,
                players: players,
                allPlayersReady: allPlayersReady
            }

            if (toAllPlayers) {
                // emit the match info to all client connecting to the socket
                io.in(targetMatchId).emit('match info', matchInfo);
            } else {
                socket.emit('match info', matchInfo);
            }
        }
    });
};

GameServer.emitMatchSetupInfo = function(targetMatchId) {
    Matches.findOne({ "_id": targetMatchId }, function(err, match) {
        if(err) io.in(targetMatchId).emit('ErrorEvent', err);
        else if(!match) io.in(targetMatchId).emit('ErrorEvent', "Target match Id: " + targetMatchId + " not found in matchInstance");
        else {
            let players = [];
            let allPlayersAreReady = true;
            for (let i = 0; i < match.players.length; i++) {
                players.push({
                    playerId: match.players[i].playerId,
                    username: match.players[i].username,
                    readyToPlay: match.players[i].readyToPlay
                });

                if( match.players[i].readyToPlay === false) {
                    allPlayersAreReady = false;
                }
            }

            let matchInfo = {
                matchId: match._id,
                players: players,
                allPlayersAreReady: allPlayersAreReady
            }
            
            // emit the match setup info to all client connecting to the socket
            io.in(targetMatchId).emit('match setup info', matchInfo);
        }
    });
};

// Maybe in the match instance? or still game server
/**
 * Return the player territory in the form {topLeftCorner, bottomRightCorner}
 * @param {*} mapName name of the map. i.e Outside_A5
 * @param {*} playerIndex index of the player in the database
 */
GameServer.getPlayerTerritory = function(mapName, playerIndex) {
    let result = null;

    if(mapName === "Outside_A5") {
        // this map only allows 2 players
        if(playerIndex === 0) {
            result = {
                topLeftCorner: {x: 0, y: 0},
                bottomRightCorner: {x: 4, y: 9}
            };

        } else if(playerIndex === 1) {
            result = {
                topLeftCorner: {x: 5, y: 0},
                bottomRightCorner: {x: 9, y: 9}
            };
        }

    }
    else if (mapName === "Final_Tileset") {
        if (playerIndex === 0) {
            let p1Base = TileMapParser.getP1Base();
            result = {
                topLeftCorner: {x: p1Base.x, y:p1Base.y},
                bottomRightCorner: {x: p1Base.x + (p1Base.xwidth - 1), y: p1Base.y + (p1Base.yheight - 1)}
            };
        } else if (playerIndex === 1) {
            let p2Base = TileMapParser.getP2Base();
            result = {
                topLeftCorner: {x: p2Base.x, y:p2Base.y},
                bottomRightCorner: {x: p2Base.x + (p2Base.xwidth - 1), y: p2Base.y + (p2Base.yheight - 1)}
            };
        }
    }

    return result;
};
