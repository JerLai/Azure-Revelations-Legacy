/* jshint esversion: 6 */

let socket = io();

let api = (function(){
    "use strict";

    let module = {};
    
    /**********************************
     * Send *
     **********************************/

    function send(method, url, data, callback) {
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }


    /***********************************
     * Commands
     ***********************************/

    /* ======================================READ=================================== */

    /**
     * Get the current user
     */
    module.getCurrentPlayer = function(callback) {
        send("GET", '/api/auth/currentUser/', null, function(err, res) {
            // res = {username, databaseId}
            if(err) notifyErrorListeners(err);
            else callback(res);
        });
    };

    socket.on("ErrorEvent", function(err) {
        notifyErrorListeners(err);
    });

    /**
     * RoomScene
     * 
     * Retrieve the match info with the given matchId
     */
    module.getMatchInfo = function(matchId, toAllPlayers=true) {
        socket.emit("get match info", {matchId: matchId, toAllPlayers: toAllPlayers});
    };


    /**
     * MatchSetupScene
     * 
     * Retrieve the colour of the current player
     */
    module.getPlayerColour = function(matchId) {
        socket.emit("get player colour", {matchId: match.matchId});
    };

    /**
     * MatchSetupScene
     * 
     * Get map info
     */
    module.getGameMapInfo = function(mapName, matchId) {
        socket.emit("get map info", {
            mapSelected: mapName,
            matchId: matchId
        });
    };

    /**
     * MatchSetupScene
     * 
     * Get match setup info
     */
    module.getMatchSetupInfo = function(matchId) {
        socket.emit("get match setup info", matchId);
    };

    /**
     * MatchScene
     * 
     * Player end turn
     */
    module.playerEndTurn = function(matchId) {
        socket.emit("end turn", {matchId: matchId});
    };

    /**
     * MatchScene
     * 
     * get the current match information
     */
    module.getGameServerMatch = function(matchId) {
        socket.emit("get game server match", {matchId: matchId});
    };

    /**
     * MatchSetupScene
     * 
     * get initial unit space
     */
    module.getInitialUnitSpace = function(matchId) {
        socket.emit("get initial unit space", {matchId: matchId});
    };

    /* ======================================Notififying POST=================================== */

    /**
     * SignupScene
     * 
     * Used in the Signup Scene to register new player to the game with their prefer username
     */
    module.signupNewPlayer = function(newUsername) {
        socket.emit('new player signup', {
            newUsername: newUsername
        });
    };

    /**
     * MenuScene
     * 
     * Try to find a room, if room is found join the room
     * Else if the room is not found then create a new room and join
     * 
     */
    module.findCreateAndJoinMatch = function() {
        socket.emit('joinMatch', null);
    };

    /**
     * MenuScene
     * 
     * Create a room
     */
    module.createMatch = function() {
        socket.emit('createMatch', null);
    };

    /**
     * RoomScene
     * 
     * Leave the current match up
     * 
     * @param doCallback true/false to have a callback
     */
    module.leaveMatch = function(doCallback) {
        socket.emit("leaveMatch", doCallback);
    }

    /**
     * MatchScene
     * 
     * Move a unit to another location
     */
    module.playerMoveUnit = function(matchId, unitId, moveAngle) {
        socket.emit("move unit", {
            matchId: matchId,
            unitId: unitId, 
            moveAngle: moveAngle
        });
    };

    /**
     * MatchScene
     * 
     * Attacking a unit
     */
    module.commandUnitToAttack = function(matchId, commandingUnitId, targetingUnitId) {
        socket.emit("attack unit", {matchId: matchId, atkId: commandingUnitId, defId: targetingUnitId});
    };

    /**
     * MatchScene
     * 
     * Try to capture a base
     */
    module.captureTheCurrentBase = function(matchId, unitId) {
        socket.emit("capture base", {matchId: matchId, unitId: unitId});
    };

    /**
     * MoctchScene
     * 
     * tell server that current player want to leave room
     */
    module.requestToLeaveRoom = function(matchId) {
        socket.emit("request to leave room", matchId);
    };

    /* ======================================POST=================================== */

    /**
     * StartScene
     * 
     * Set up the .userId and .username in the socket to the server
     */
    module.setUpSocketInfo = function(playerId, username) {
        socket.emit("setup userId and username", {
            userId: playerId,
            username: username
        });
    };

    /**
     * RoomScene
     * 
     * Change the status of readyToPlay in player
     */
    module.updatePlayerStatus = function(matchId, newStatus) {
        socket.emit("player change status", {
            matchId: matchId,
            newStatus: newStatus
        });
    };

    /**
     * MatchSetupScene
     * 
     * Reset the ready to play field for all the player in the match
     */
    module.resetReadyToPlay = function(matchId) {
        socket.emit("reset readyToPlay", {
            matchId: matchId
        });
    };

    /**
     * MatchSetupScene
     * 
     * instantiate unit position
     * 
     * @param units = [{unitClass, display, x, y}]  display is the display when the unit is initialized
     */
    module.instantiateUnitPosition = function(matchId, units) {
        socket.emit("instantiate game", {
            matchId: matchId,
            units: units
        });
    };

    /**
     * index
     * 
     * Send a message
     */
    module.emitMessage = function(matchId, message) {
        socket.emit("new message", {matchId: matchId, message: message});
    };

    /*********************************
     * Listeners *
     *********************************/

    // error listeners
    let errorListeners = [];
    
    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    }
    
    module.onError = function(listener){
        errorListeners.push(listener);
    };

    let userListeners = [];

    module.onUserUpdate = function(listener) {
        userListeners.push(listener);
        module.getCurrentPlayer(function(player) {
            listener(player);
        });
    };

    module.notifyUserListeners = function() {
        userListeners.forEach(function(listener) {
            module.getCurrentPlayer(function(player) {
                listener(player);
            });
        });
    };

    let chatCreationListener = [];

    module.onChatCreation = function(listener) {
        chatCreationListener.push(listener);
    };

    module.notifyChatCreationListeners = function() {
        chatCreationListener.forEach(function(listener) {
            listener();
        });
    };

    let chatDeletionListener = [];

    module.onChatDeletion = function(listener) {
        chatDeletionListener.push(listener);
    };

    module.notifyChatDeletionListeners = function() {
        chatDeletionListener.forEach(function(listener) {
            listener();
        });
    };
    
    return module;
})();