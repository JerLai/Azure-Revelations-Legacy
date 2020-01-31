/**
 * Responsible for doing the physics calculations/checks to validate movement based on server's state of the match
 */

//var math = require('mathjs');
var shared = require('./shared.js').shared;
let BlocksReader = require('./BlocksReader.js').BlocksReader;
let TileMapParser = require("./TileMapParser.js").TileMapParser;
let UnitsManager = require('./UnitsManager.js');


// Object responsible for handling the movements of all players (checking for obstacles, broadcasting ...), for only key press
class PhysicsHandler {
   constructor() {
      this.lastMove = 0; // timestamp of the last time the player moved (client-side use only, as in make sure we only parse another client move after some time has passed)
   }

}

PhysicsHandler.prototype.loadBlocks = function() {
   TileMapParser.parseJSON();
   BlocksReader.loadBlocks(TileMapParser.getCollideTilePositions());
}
// check if enough time has elapsed to allow a new movement, to prevent rapid firing
PhysicsHandler.prototype.canMoveAgain = function(){
   if(Date.now() - this.lastMove < shared.config.moveDelay) return false;
   this.lastMove = Date.now();
   return true;
};

// Performs keyboard-based movement ; angle is computed based on the combination of pressed keys
PhysicsHandler.prototype.moveByKeys = function(units, unit, angle){
   if(angle === null) return null;
   //angle *= (Math.PI/180);
   let start = {
       x: unit.x,
       y: unit.y
   };
   let end = {
       x : unit.x,
       y : unit.y
   };
   if(angle === 0) {
      end.x += 1;
   }
   else if(angle === 90) {
      end.y -= 1;
   }
   else if (angle === 180) {
      end.x -= 1;
   }
   else if (angle === 270) {
      end.y += 1;
   }
   end = this.sanitizeCoordinates(end.x, end.y);//shared.sanitizeCoordinates(end.x,end.y);
   let judgement = this.validateMovement(units,end);
   return {verdict : judgement, end: end};
};

// Out of bounds checking of the map
PhysicsHandler.prototype.sanitizeCoordinates = function(x, y) {
   let dim = TileMapParser.getMapSize();
   let newX = x;
   let newY = y;
   if (newX < 0) newX = 0;
   else if (newX > dim.x - 1) newX = dim.x - 1;
   if (newY < 0) newY = 0;
   else if (newY > dim.y - 1) newY = dim.y - 1;

   return {x: newX, y: newY};
}

PhysicsHandler.prototype.validateMovement = function (units, end) {
   let result = true;
   if (BlocksReader.isBlockAt(end.x, end.y) || units.isUnitAt(end.x, end.y)) {
      result = false;
   }
   return result;
};

PhysicsHandler.prototype.processAttack = function(units, atkUnit, defUnit) {
   let dmg = 0;
   let result = false;
   // Check if both units are at the places they say they are
   if (units.isUnitAt(atkUnit.x, atkUnit.y) && units.isUnitAt(defUnit.x, defUnit.y)) {
      // Check if the correct units are referenced, probably overkill, should really do this in GameServerMatch
      if (units.unitValueAt(atkUnit.x, atkUnit.y) === atkUnit.id && units.unitValueAt(defUnit.x, defUnit.y) === defUnit.id) {
         let atkStats = atkUnit.getBattleStats();
         let defStats = defUnit.getBattleStats();
         let atkPower = atkStats.atk * this.chanceGen(atkStats.acc);
         let crit = this.chanceGen(atkStats.crit);
         if (crit === 1) {
            atkPower = Math.floor(atkPower * 1.5);
         }
         let defPower = defStats.def;
         let parry = this.chanceGen(defStats.parry);
         if (parry === 1) {
            defPower = Math.floor(defPower * 1.5);
         }
         // If the attacking unit was going to land a hit, is it able to go through their defense
         // if defense is higher, then no damage
         if (atkPower < defPower) {
            dmg = 0;
         }
         // Calculate whether or not defUnit was able to dodge it
         // damage will still be 0 if successful dodge
         else {
            let dodge = this.chanceGen(defStats.dodge);
            if (dodge === 0) {
               dmg = Math.floor(atkPower - defPower);
            } else {
               dmg = 0;
            }
         }
         result = true;
      }
   }
   return {verdict: result, dmg: dmg};
};
// Generic chance generator using pseudo-randomness with Math.random
PhysicsHandler.prototype.chanceGen = function(percent) {
   let chance = Math.floor(Math.random() * 101); //Generates integer from 0 to 100
   let result = 0;
   if (chance <= percent) {
      result = 1;
   }
   return result;
};
PhysicsHandler.prototype.captureBase = function(units, unitInfo, player, currUnit) {
   let victoryArea;
   if (player === 1) {
      victoryArea = TileMapParser.getP2Base();
   }
   else if (player === 2) {
      victoryArea = TileMapParser.getP1Base();
   }

   let result = true;
   unitInfo.forEach(function(unit) {
      let nutShell = unit.getNutshell();
      // position check for enemy soldiers
      if (units.isUnitAt(nutShell.x, nutShell.y)) {
         // check if that nutshell is within the confines of the victoryArea
         if (nutShell.x >= victoryArea.x && nutShell.x < victoryArea.x + victoryArea.xwidth) {
            if (nutShell.y >= victoryArea.y && nutShell.y < victoryArea.y + victoryArea.yheight) {
               // An enemy unit does exist within the confines
               result = false;
            }
         }
      }
   });
   // At this point no enemy units are on their base, check if current controlled unit is where it is supposed to be
   if (units.isUnitAt(currUnit.x, currUnit.y) && units.unitValueAt(currUnit.x, currUnit.y)) {
      if (currUnit.x < victoryArea.x || currUnit.x >= victoryArea.x + victoryArea.xwidth) {
         result = false;
      }
      if (currUnit.y < victoryArea.y || currUnit.y >= victoryArea.y + victoryArea.yheight) {
         result = false;
      }
   }

   // At this point, no enemy units are on their base, and the controlled unit is within the confines of the base
   return result;
};
/***********************************************************************************************
 * Beyond this point is copied code that will not be used in the beta or final but may be used
 * later on in advanced implementations of the game
 ***********************************************************************************************/
// The below method is not used for movement, but for ranged characters checking if they can attack a unit (later updates)
// If later pixel/ more dynamic movement is used, this may be used instead
PhysicsHandler.prototype.checkObstacles = function(start,end){ // coordinates in px
   // Coarse algorithm to check if an obstacle is on the trajectory (straight line from start to end coordinates).
   // It does so by splitting the path in chunks of 20 pixels, and check if the corresponding cell has a block or not.
   // If yes, returns the end coordinates in case of "hitting" the obstacle; if no, return the intended end coordinates.
   var chunkLength = shared.config.chunkLength; // The smaller, the more precise the algorithm
   var startCell = shared.computeCellCoordinates(start.x,start.y);
   var speed = PhysicsHandler.computeSpeed(PhysicsHandler.computeAngle(start,end));
   var distance = PhysicsHandler.euclideanDistance(start,end);
   // Split the path in chunks
   var nbChunks = Math.ceil(distance/chunkLength);
   var tmp = {
       x: start.x,
       y: start.y
   };
   var previousCell = {};
   for(var i = 0; i < nbChunks; i++){
      tmp.x += speed.x*chunkLength;
      tmp.y += speed.y*chunkLength;
      var cell = shared.computeCellCoordinates(tmp.x,tmp.y);
      if(cell.x == startCell.x && cell.y == startCell.y) continue; // ignore obstacles on starting cell
      if(cell.x == previousCell.x && cell.y == previousCell.y) continue;
      if(BlocksManager.isBlockAt(cell.x,cell.y) || shared.isOutOfBounds(cell.x,cell.y)) { // If obstacle, step back and return
         return {
            x: tmp.x - speed.x*chunkLength,
            y: tmp.y - speed.y*chunkLength
         };
      }
      if(UnitsManager.isUnitAt(cell.x, cell.y) || shared.isOutOfBounds(cell.x,cell.y)) {
         return {
            x: tmp.x - speed.x*chunkLength,
            y: tmp.y - speed.y*chunkLength
         };
      }
       previousCell.x = cell.x;
       previousCell.y = cell.y;
   }
   // No obstacle found, return intended end coordinates
   return end;
};

//TODO: reconsider usage of tween player,
PhysicsHandler.prototype.tweenPlayer = function(id,x,y){ // Handles the visual aspects of player movement
   if(!Game.initialized) return;
   var player = Game.players[id];
   if(player.tween) player.tween.stop();
   var distance = Phaser.Math.distance(player.x,player.y,x,y);
   // The following tweens a sprite linearly from its current position to the received (x,y) coordinates
   player.tween = game.add.tween(player);
   var duration = distance/shared.config.spriteSpeed;
   player.tween.to({x:x,y:y}, duration,Phaser.Easing.Linear.None);
   player.tween.start();
};

PhysicsHandler.prototype.computeAngle = function(a,b){ // return angle between points a and b, in radians
   return -(Math.atan2(b.y- a.y, b.x- a.x)); //*(180/Math.PI));
};

PhysicsHandler.prototype.computeSpeed = function(angle){ // return unit speed vector given an angle
   return {
       x: Math.cos(angle),
       y: -Math.sin(angle)
   };
};

PhysicsHandler.prototype.euclideanDistance = function(a,b){ // return Euclidean distance between points a and b
   return Math.sqrt(Math.pow(a.x- b.x,2)+Math.pow(a.y- b.y,2));
};

module.exports.PhysicsHandler = PhysicsHandler;