/******************************
 * Imports
 ******************************/
let PhysicsHandler = require('./PhysicsHandler.js').PhysicsHandler;
let UnitsManager = require('./UnitsManager.js');

let Knight = require("./Unit/Knight.js").Knight;
let Thief = require("./Unit/Thief.js").Thief;
/******************************
 * Initialization *
 ******************************/

// let shared = require("../client_side/shared/shared.js").shared;

// let BlocksReader = require('../client_side/shared/BlocksReader.js').BlocksReader;

class GameServerMatch {
    constructor() {
        this.playerSocketIds = [];
        this.initialUnitSpace = 40;
        this.playerIds = [];
        this.playerUsernames = [];
        this.matchId = null;
        this.unitInfo = {}; // Pure data representation of units for easier data parse
        this.unitsManager = new UnitsManager();
        this.physicsHandler = new PhysicsHandler();
        this.playerTurn = 0; // index of the playerSocketIds list
        this.playerColour = [0xff4f78, 0x0fd2ee, 0x8070dc, 0x54ff9f];
        this.playerHasPlacedAllUnit = [false, false];
    }
}
GameServerMatch.prototype.initialize = function(matchId) {
    this.matchId = matchId;
    // PhysicsHandler is an instanced class due to future expansion, the need to accomodate different maps may be necessary, so physics would
    // not always be the same for each match
    // Future implementation could be we load the blocks in here, pass it to PhysicsHandler so that that is static, the only things we pass in would
    // be the units and blocks
    this.physicsHandler.loadBlocks(); // Load the BlockReader inside this PhysicsHandler
};

GameServerMatch.prototype.addUnit = function(playerId, newUnit) {
    let unit;
    if (newUnit.class === "Knight") unit = new Knight(newUnit.class, newUnit.display, newUnit.x, newUnit.y);
    else if (newUnit.class === "Thief") unit = new Thief(newUnit.class, newUnit.display, newUnit.x, newUnit.y);
    this.unitInfo[playerId].push(unit);
    this.unitsManager.insertUnitIntoSparseMap(newUnit.x, newUnit.y, unit.id); // Could also pass in the unit object as the value instead, id makes it less data, shouldn't do that but ehhhhhhh
};

GameServerMatch.prototype.playerFinishPlacingUnit = function(playerId) {
    let i = this.playerIds.indexOf(playerId);
    this.playerHasPlacedAllUnit[i] = true;
};

GameServerMatch.prototype.allPlayersHasPlacedTheirUnits = function() {
    let result = true;
    this.playerHasPlacedAllUnit.forEach(function(status) {
        if (!status) result = false;
    });
    return result;
}

GameServerMatch.prototype.removeUnit = function(playerSocketId, unitId) {
    this.unitInfo.playerSocketId = this.unitInfo.playerSocketId.filter(function(value, index, arr) {
        return value.id !== unitId;
    });
};

//TODO: get rid of socketid variables and the method here, change what we store
/**
 * This is where you should initiate a new player not the addPlayerId
 */
GameServerMatch.prototype.addPlayerSocketId = function(playerSocketId) {
    if(!this.playerSocketIds.includes(playerSocketId)) {
        this.playerSocketIds.push(playerSocketId);
    }
};

GameServerMatch.prototype.addPlayerId = function(playerId) {
    if(!this.playerIds.includes(playerId)) {
        this.playerIds.push(playerId);
        this.unitInfo[playerId] = [];
    }
};

GameServerMatch.prototype.addPlayerUsername = function(playerUsername) {
    if(!this.playerUsernames.includes(playerUsername)) {
        this.playerUsernames.push(playerUsername);
    }
};

GameServerMatch.prototype.getPlayerColour = function(playerSocketId) {
    for(let i = 0; i < this.playerSocketIds.length; i++) {
        if(this.playerSocketIds[i] === playerSocketId) {
            return this.playerColour[i];
        }
    }
};

GameServerMatch.prototype.getPlayerUsernameTurn = function() {
    return this.playerUsernames[this.playerTurn];
};

/**
 * reset values for the player whose turn that just ended, for their units
 */
GameServerMatch.prototype.nextPlayerTurn = function() {
    this.unitInfo[this.getPlayerIdTurn()].forEach(function(unit) {
        unit.resetValues();
    });
    this.playerTurn += 1;
    if(this.playerTurn >= this.playerSocketIds.length) {
        this.playerTurn = 0;
    }
};

GameServerMatch.prototype.getPlayerTurnIndex = function() {
    return this.playerTurn;
};

/**
 * Return the socket id of the player that is suppose to make a move
 */
GameServerMatch.prototype.getSocketIdTurn = function() {
    return this.playerSocketIds[this.playerTurn];
};

GameServerMatch.prototype.getPlayerIdTurn = function() {
    return this.playerIds[this.playerTurn];
};

GameServerMatch.prototype.moveUnit = function(playerSocketId, unitId, angle, callback) {
    //Get the proper list of units
    let idPos = this.playerSocketIds.indexOf(playerSocketId); //If socket doesn't match stored one here, bad request
    let playerId = this.playerIds[idPos];
    // Find the right unit to try moving
    for(let i = 0; i < this.unitInfo[playerId].length; i++) {
        let unit = this.unitInfo[playerId][i].getNutshell();
        if (unit.id === unitId) {
            if (unit.energy > 0) {
                // Pass current state of units and check if movement is valid
                let calculation = this.physicsHandler.moveByKeys(this.unitsManager, unit, angle);
                if (calculation !== null) {
                    if (calculation.verdict === true) {// Do a null check first then check if we can move
                        this.unitInfo[playerId][i].moveTo(calculation.end.x, calculation.end.y);
                        this.unitsManager.moveUnit(unit, calculation.end);
                    }
                }
                callback(this.unitInfo);
                }
        }
    }
};

GameServerMatch.prototype.attackUnit = function(atkPlyrId, attackerId, defenderId, attackRes) {
    if(this.playerIds.includes(atkPlyrId)) {
        let atkPos = this.getPlayerTurnIndex();
        let defPos = 1 - atkPos;
        let defPlyr = this.playerIds[defPos];
        // Get the proper unit on the attacking side
        for(let i = 0; i < this.unitInfo[atkPlyrId].length; i++) {
            let atkUnit = this.unitInfo[atkPlyrId][i];
            if (atkUnit.id === attackerId) {
                if (!atkUnit.hasAttacked) {
                    // Get the proper unit on the attacked side
                    for(let j = 0; j < this.unitInfo[defPlyr].length; j++) {
                        let defUnit = this.unitInfo[defPlyr][j];
                        if (defUnit.id === defenderId) {
                            // Do the calculation if both units exist
                            let calculation = this.physicsHandler.processAttack(this.unitsManager, atkUnit, defUnit);
                            if (calculation.verdict) {
                                // modify the units here
                                defUnit.receiveDamage(calculation.dmg);
                                // remove unit if dead
                                if (defUnit.hp === 0) {
                                    this.unitInfo[defPlyr].splice(j, 1);
                                    this.unitsManager.removeUnitFromSparseMap(defUnit.x, defUnit.y);
                                }
                                this.unitInfo[atkPlyrId][i].attacked();
                                atkUnit.attacked();
                                attackRes({dmg: calculation.dmg, attacker: atkUnit, defender: defUnit});
                            }
                        }
                    }
                }
            }
        }
    }
}

GameServerMatch.prototype.captureBase = function(unitId, captureRes) {
    // Find the unit in the current player's unit list
    for (let i = 0; i < this.unitInfo[this.getPlayerIdTurn()].length; i++) {
        let nutShell = this.unitInfo[this.getPlayerIdTurn()][i].getNutshell();
        if(nutShell.id === unitId) {
            // Check if there is a unit there and its id matches the unitId passed in (maybe do in PhysicsHandler?)
            if (this.unitsManager.isUnitAt(nutShell.x, nutShell.y) && this.unitsManager.unitValueAt(nutShell.x, nutShell.y) === unitId) {
                let calculation = this.physicsHandler.captureBase(this.unitsManager, this.unitInfo[this.playerIds[1 - this.getPlayerTurnIndex()]], this.getPlayerTurnIndex() + 1, nutShell);
                captureRes(calculation);
            }
        }
    }
}
module.exports = GameServerMatch;