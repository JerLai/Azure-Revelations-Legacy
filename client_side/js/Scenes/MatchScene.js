/* jshint esversion: 6 */
let gameServerMatch;
let victoryMessage;
let initMatchSocketCompleted = false;

class Match extends Phaser.Scene {
    constructor() {
        super({key:"Match"});
    }

    preload() {
        // init global variables
        gameServerMatch = {
            matchId : null,
            playerIds: null,
            playerColour: null,
            unitInfo: {}, // {playerId: {id, unitClass, display, x, y, boxMarker, sprite}}
            isPlayerTurn: false,
            playerUsernameTurn: null
        };
        victoryMessage = "";
        currentScene = "Match";
        
        this.load.audio('bgm', '../assets/game/music/Battle.mp3');

        // variables
        this.selectedUnit = null;
        this.clickDelay = 1000;
        this.previousClick = 0;
        this.unitMoveDelay = 500;
        this.previousUnitMove = 0;
        this.commandUnit = null; // this should be a unit object
        this.commandUnitBoxMarker = null;  // this is the golden box
        this.commandingYourUnit = false;
        this.instantiationCompleted = false;
        this.unitsReadyToMove = true;
        this.attackRangeBox = null;
        this.readyToAttack = false;

        // flashing elements
        this.targetingUnitBoxFlash = {box: null, counter: 0};
        this.flashingDamage = {box: null, counter: 0};
        this.flashingCaptureCircle = {cir: null, counter: 0};
        this.flashingCaptureText = {text: null, counter: 0};
    }

    create() {
        // BGM
        this.bgm = this.sound.add('bgm');
        this.bgm.setLoop(true);
        this.bgm.play();

        // Map
        this.map = this.make.tilemap({key: "map"});
        const tileset = this.map.addTilesetImage("Final_Tileset", "tileset");

        this.belowLayer1 = this.map.createStaticLayer("Below Player 1", tileset, 0, 0);
        this.belowLayer2 = this.map.createStaticLayer("Below Player 2", tileset, 0, 0);
        this.worldLayer = this.map.createStaticLayer("World", tileset, 0, 0);    
        this.aboveLayer = this.map.createStaticLayer("Above Player", tileset, 0, 0);

        initDebugMapMode(this);

        // collidable
        this.worldLayer.setCollisionByProperty({ collides: true });
        this.aboveLayer.setDepth(10);

        // Create a simple graphic that can be used to show which tile the mouse is over
        marker = this.add.graphics();
        marker.lineStyle(5, 0xffffff, 1);
        marker.strokeRect(0, 0, this.map.tileWidth, this.map.tileHeight);
        marker.lineStyle(3, currPlayer.colour, 1);
        marker.strokeRect(0, 0, this.map.tileWidth, this.map.tileHeight);

        displayPlayerBase(this);

        // init socket listeners
        if (!initMatchSocketCompleted) {
            initMatchSocketCompleted = true;
            initSocketListenerForMatch(this);
        }

        // get the game server match
        // callback = socket.on("game server match")
        api.getGameServerMatch(match.matchId);

        // register the controls the player can make
        registerControls(this);

        this.instantiationCompleted = true;
    }

    update(time, delta) {
        if (this.instantiationCompleted) {

            // hidden or visible
            if(this.commandUnitText) this.commandUnitText.destroy();
            if(this.commandUnit) this.commandUnitText = this.add.text(center.x + 200, center.y + 180,
                "Commanding Unit: " + this.commandUnit.unitClass + 
                "\nUnit Energy:" + this.commandUnit.currentEnergy + 
                "\nUnit HP: " + this.commandUnit.hp + " ATK: " + this.commandUnit.atk + " DEF: " + this.commandUnit.def + 
                "\nCan Attack: " + !this.commandUnit.hasAttacked,
                { fill: '#FFFFFF', fontSize: '20px' });
            
            // Flashing elements
            // damaging oponent box
            if(this.targetingUnitBoxFlash.counter > 0) this.targetingUnitBoxFlash.counter--;
            else if(this.targetingUnitBoxFlash.box) this.targetingUnitBoxFlash.box.destroy();

            if(this.flashingDamage.counter > 0) this.flashingDamage.counter--;
            else if(this.flashingDamage.box) this.flashingDamage.box.destroy();

            if(this.flashingCaptureCircle.counter > 0) this.flashingCaptureCircle.counter--;
            else if(this.flashingCaptureCircle.cir) this.flashingCaptureCircle.cir.destroy();

            if(this.flashingCaptureText.counter > 0) this.flashingCaptureText.counter--;
            else if(this.flashingCaptureText.text) this.flashingCaptureText.text.destroy();


            // Convert the mouse position to world position within the camera
            const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);

            // Place the marker in world space, but snap it to the tile grid. If we convert world -> tile and
            // then tile -> world, we end up with the position of the tile under the pointer
            const pointerTileXY = this.worldLayer.worldToTileXY(worldPoint.x, worldPoint.y);
            const snappedWorldPoint = this.worldLayer.tileToWorldXY(pointerTileXY.x, pointerTileXY.y);
            // not clicking outside the map and a unit is selected
            let inMap = isInMap(this, snappedWorldPoint.x, snappedWorldPoint.y);
            let tileIsCollidable = isTileCollidable(snappedWorldPoint.x, snappedWorldPoint.y);
            if(inMap && !tileIsCollidable) {
                marker.setPosition(snappedWorldPoint.x, snappedWorldPoint.y);
            }

            // mouse click
            if (this.input.manager.activePointer.isDown && (time - this.previousClick > this.clickDelay)) {
                this.previousClick = time;

                let unitCoordinate = convertPixelToTileCoordinate(snappedWorldPoint.x, snappedWorldPoint.y);
                
                // player should only be able to select unit to command when they are not attacking
                let unit = isYourUnitAndReturn(snappedWorldPoint.x, snappedWorldPoint.y);
                if(unit.targetUnit && !this.readyToAttack) {
                    this.commandingYourUnit = unit.targetIsYourUnit;
                    selectUnitToCommand(this, unit.targetUnit);

                    // if the player is currently commanding their unit
                    // then create a capture button
                    if(this.commandUnit && this.commandingYourUnit && gameServerMatch.isPlayerTurn) {
                        this.captureBtnAndText = createCaptureButton(this);
                    // if condition does not satisfy then remove the btn
                    } else {
                        if(this.captureBtnAndText) {
                            this.captureBtnAndText.btn.destroy();
                            this.captureBtnAndText.btnText.destroy();
                        }
                    }

                    // if the player is currently commanding their unit and the unit can still attack
                    // then player should be able to use that unit to atttack
                    if(this.commandUnit && this.commandingYourUnit && gameServerMatch.isPlayerTurn && !this.commandUnit.hasAttacked) { // make sure to check the unit can still attack
                        this.attackBtnAndText = createAttackButton(this);

                    // if condition does not satisfy then remove the btn
                    } else {
                        if(this.attackBtnAndText) {
                            this.attackBtnAndText.btn.destroy();
                            this.attackBtnAndText.btnText.destroy();
                        }
                    }

                // Attacking a enemy unit
                // player must be commanding their unit
                // enemy unit must be in range
                // player must be clicking at a enemy unit and is ready to attack
                } else if(this.commandUnit && (unit.targetUnit && !unit.targetIsYourUnit) && this.readyToAttack && bothUnitsAreInAtkRange(this.commandUnit, unit.targetUnit)) {
                    
                    if(this.targetingUnitBoxFlash.box) this.targetingUnitBoxFlash.box.destroy();
                    this.targetingUnitBoxFlash.box = this.add.graphics().lineStyle(8, 0x8B0000, 0.5);
                    this.targetingUnitBoxFlash.box.strokeRect(0, 0, this.map.tileWidth, this.map.tileHeight);
                    this.targetingUnitBoxFlash.box.setPosition(unit.targetUnit.x * this.map.tileWidth, unit.targetUnit.y * this.map.tileHeight);
                    this.targetingUnitBoxFlash.counter = 100; // ms before it disappear

                    api.commandUnitToAttack(match.matchId, this.commandUnit.id, unit.targetUnit.id);

                    // after player attack destroy the attack btn
                    if(this.attackBtnAndText) {
                        this.attackBtnAndText.btn.destroy();
                        this.attackBtnAndText.btnText.destroy();
                    }
                }
            }

            // if the player is currently commanding their unit and the unit still have energy
            // then player should be able to move the unit
            // make sure the units are ready to move
            // should be the current player's turn
            if(this.commandUnit && this.commandingYourUnit && (this.commandUnit.currentEnergy > 0) && this.unitsReadyToMove && gameServerMatch.isPlayerTurn && (time - this.previousUnitMove > this.unitMoveDelay)) {
                this.previousUnitMove = time;
                let angle = computeKeysAngle(this);

                // if unit tries to move
                if(angle !== null) {
                    this.unitsReadyToMove = false;

                    // before moving remove the attack range lines if there are any
                    if(this.attackRangeBox) this.attackRangeBox.destroy(); 
                    this.readyToAttack = false;

                    api.playerMoveUnit(match.matchId, this.commandUnit.id, angle);
                }
            }
        }
    }
}


/******************************
 * Helper functions *
 ******************************/

function initSocketListenerForMatch(game) {
    socket.on("update units position", function(changedUnit) {  // changedUnit
        refreshUnitposition(game, changedUnit);

        game.unitsReadyToMove = true;
    });

    socket.on("game server match", function(data) {
        gameServerMatch.playerIds = data.playerIds;
        gameServerMatch.playerColour = data.playerColour;
        game.initUnitsInfo = data.unitInfo; // {playerId: [Unit object]}
        gameServerMatch.isPlayerTurn = data.isPlayerTurn; // true / false
        gameServerMatch.playerUsernameTurn = data.playerUsernameTurn;   // the username of the player this turn

        // Display turn message
        displayRemoveTurnTextBtn(game, data.playerUsernameTurn, data.isPlayerTurn);

        // display all units
        displayAllUnits(game);
    });

    socket.on("next turn", function(data) { // data = {playerIdTurn, playerUsernameTurn, updatedUnitInfo}
        gameServerMatch.isPlayerTurn = (data.playerIdTurn === currPlayer.databaseId);
        gameServerMatch.playerUsernameTurn = data.playerUsernameTurn;

        // if it is the player turn, the player reselect the unit they want to command
        if(gameServerMatch.isPlayerTurn && game.commandUnit) {
            game.commandUnitBoxMarker.destroy();
        }
        
        // display turn text
        displayRemoveTurnTextBtn(game, gameServerMatch.playerUsernameTurn, gameServerMatch.isPlayerTurn);

        // update gameServerMatch unit info
        updateAllUnitInfo(data.updatedUnitInfo);
    });

    // after attacking a unit
    socket.on("update units status", function(data) {  // data = {dmg, attacker: Unit, defender: Unit}
        displayDamageOnUnit(game, data.dmg, data.defender);

        updateUnitInfo(data.attacker);
        updateUnitInfo(data.defender);
    });

    // after trying to capture base
    socket.on("player victory", function(message) {
        victoryMessage = message;
        game.bgm.stop();
        api.requestToLeaveRoom(match.matchId);
        game.scene.stop("Match").start('Result');
    });

    socket.on("invalid capture", function(message) {
        if (game.flashingCaptureText.text) game.flashingCaptureText.text.destroy();
        game.flashingCaptureText.text = game.add.text(center.x + 200, center.y - 150, message, { fill: '#FF0000', fontSize: '25px' });
        game.flashingCaptureText.counter = 100;
    });

    // other player left the game
    socket.on("matchDestroyed", function(data) {
        if (currentScene === "Match") {
            game.bgm.stop();
            api.leaveMatch(false);
            game.scene.stop("Match").start('Menu');
        }
    });
}

function displayAllUnits(game) {
    for(let i = 0; i < gameServerMatch.playerIds.length; i++) {
        let playerId = gameServerMatch.playerIds[i];
        let playerColour = gameServerMatch.playerColour[i];
        gameServerMatch.unitInfo[playerId] = [];

        // loop through all the player's units
        game.initUnitsInfo[playerId].forEach(function(unit) {
            // display units
            let xPx = unit.x * game.map.tileWidth;
            let yPx = unit.y * game.map.tileHeight;

            // draw sprite
            let image = drawSprite(game, unit, xPx, yPx, playerColour);

            // add unit to gameServerMatch.unitInfo
            gameServerMatch.unitInfo[playerId].push({
                "id": unit.id,
                "unitClass": unit.unitClass,
                "display": unit.display,
                "x": unit.x,
                "y": unit.y,
                "currentEnergy": unit.currentEnergy,
                "hp": unit.hp,
                "atk": unit.atk,
                "def": unit.def,
                "hasAttacked": unit.hasAttacked,
                "boxMarker": image.boxMarker,
                "sprite": image.sprite
            });
        });
    }
}


function selectUnitToCommand(game, unit, forceReselect=false) {
    let sameUnit = false;   // wether the game.commandUnit === unit

    // if you are already commanding a unit then change the previous commanding unit
    // to its original colour
    if(game.commandUnit) {
        game.commandUnitBoxMarker.destroy();

        // check if game.commandUnit === unit
        if ((game.commandUnit.x === unit.x) && (game.commandUnit.y === unit.y)) {
            sameUnit = true;
        }
    }

    // if it is the same unit then deselect the unit
    if (sameUnit && !forceReselect) {
        game.commandUnit = null;

    // if it is a different unit then select the unit
    } else {
        game.commandUnit = unit;
        let boxMarker = drawBoxMarker(game, unit.x * game.map.tileWidth, unit.y * game.map.tileHeight, 0xf6e20e);   // unique highlight
        game.commandUnitBoxMarker = boxMarker;
    }
}

/**
 * Refresh the position of the unit that changed
 * @param {*} game this 
 * @param {*} changeUnit the unit that changed
 */
function refreshUnitposition(game, changedUnit) {
    // remove all units
    let targetPlayerId = null;
    let targetIndex = null;
    gameServerMatch.playerIds.forEach(function(playerId){
        let i = 0;
        gameServerMatch.unitInfo[playerId].forEach(function(unit) {
            if(unit.id === changedUnit.id) {
                unit.sprite.x = changedUnit.x * game.map.tileWidth + game.map.tileWidth/2;
                unit.sprite.y = changedUnit.y * game.map.tileHeight + 24;
                unit.boxMarker.x = changedUnit.x * game.map.tileWidth;
                unit.boxMarker.y = changedUnit.y * game.map.tileHeight;
                
                // set the location of the unit in unitInfo
                targetPlayerId = playerId;
                targetIndex = i;
            }
            i++;
        });
    });

    // overwrite old position with new position
    gameServerMatch.unitInfo[targetPlayerId][targetIndex].x = changedUnit.x;
    gameServerMatch.unitInfo[targetPlayerId][targetIndex].y = changedUnit.y;
    gameServerMatch.unitInfo[targetPlayerId][targetIndex].currentEnergy = changedUnit.currentEnergy;
    
    // reselect the your unit
    //selectUnitToCommand(game, gameServerMatch.unitInfo[targetPlayerId][targetIndex]);
    if (game.commandUnit) {
        selectUnitToCommand(game, game.commandUnit, true);
    }
}


function registerControls(game) {
    // register WASD key (regardless of actual keyboard layout) (the associated logic takes place Game.update())
    game.WASD = {
        up: game.input.keyboard.addKey('UP'),
        down: game.input.keyboard.addKey('DOWN'),
        left: game.input.keyboard.addKey('LEFT'),
        right: game.input.keyboard.addKey('RIGHT')
    };
}

function isUpPressed(game) {
    return (game.WASD.up.isDown);
}

function isDownPressed(game) {
    return (game.WASD.down.isDown);
}

function isRightPressed(game) {
    return (game.WASD.right.isDown);
}

function isLeftPressed(game){
    return (game.WASD.left.isDown);
}

// compute direction based on pressed directional keys
function computeKeysAngle(game){
    let angle = null;
    if (isUpPressed(game) && !isRightPressed(game) && !isLeftPressed(game)) { // go up
        angle = 90;
    }else if (isUpPressed(game) && isLeftPressed(game)) { // up left
        angle = 135;
    }else if (isLeftPressed(game) && !isUpPressed(game) && !isDownPressed(game)) { // left
        angle = 180;
    }else if (isLeftPressed(game) && isDownPressed(game)) { // down left
        angle = 225;
    }else if (isDownPressed(game) && !isRightPressed(game) && !isLeftPressed(game)) { // down
        angle = 270;
    }else if (isDownPressed(game) && isRightPressed(game)) { // down right
        angle = 315;
    }else if (isRightPressed(game) && !isDownPressed(game) && !isUpPressed(game)) { // right
        angle = 0;
    }else if (isUpPressed(game) && isRightPressed(game)) { // up right
        angle = 45;
    }
    return angle;
}

/**
 * If this is your unit then return the unit object else return null
 * @param {*} snappedWorldPointX 
 * @param {*} snappedWorldPointY 
 */
function isYourUnitAndReturn(snappedWorldPointX, snappedWorldPointY) {
    let tileCoordinate = convertPixelToTileCoordinate(snappedWorldPointX, snappedWorldPointY);
    let targetUnit = null;
    let targetIsYourUnit = false;
    gameServerMatch.playerIds.forEach(function(playerId) {
        gameServerMatch.unitInfo[playerId].forEach(function(unit) {
            if((unit.x === tileCoordinate.x) && (unit.y === tileCoordinate.y)) {
                if(playerId === currPlayer.databaseId) targetIsYourUnit = true;
                targetUnit = unit;
            }
        });
    });

    return {targetUnit: targetUnit, targetIsYourUnit: targetIsYourUnit};
}

function displayRemoveTurnTextBtn(game, playerUsernameTurn, isPlayerTurn) {
    if(game.turnText) game.turnText.destroy();
    game.turnText = game.add.text(center.x + 220, 30, playerUsernameTurn + "'s Turn", { fill: '#ffa803', fontSize: '32px' });

    // end turn button
    if(isPlayerTurn) {
        game.endTurnBtnAndText = createEndTurnButton(game);

    } else {
        if(game.endTurnBtnAndText) {
            game.endTurnBtnAndText.btn.destroy();
            game.endTurnBtnAndText.btnText.destroy();
        }
    }
}

/**
 * Create a end turn button for the current player
 * @param {scene} game 
 */
function createEndTurnButton(game) {
    let btnAndText = createSmallBtn(game, center.x, center.y + 320, "End Turn");
    let btn = btnAndText.btn;
    setItemAlpha(btn);

    btn.on('pointerup', function() {
        btn.alpha = 0.9;

        // if the player clicked attack before end turn
        if (game.attackRangeBox) game.attackRangeBox.destroy(); 
        game.readyToAttack = false;

        // the capture and attack btn should disappear after the player click end turn
        if (game.attackBtnAndText) {
            if (game.attackBtnAndText.btn) game.attackBtnAndText.btn.destroy();
            if (game.attackBtnAndText.btnText) game.attackBtnAndText.btnText.destroy();
        }

        if (game.captureBtnAndText) {
            if (game.captureBtnAndText.btn) game.captureBtnAndText.btn.destroy();
            if (game.captureBtnAndText.btnText) game.captureBtnAndText.btnText.destroy();
        }

        api.playerEndTurn(match.matchId);
    });

    return {btn: btn, btnText: btnAndText.btnText};
}

/**
 * The id of the unit must exist in unitInfo
 */
function getUnitColourById(unitId) {
    let colour = null;
    for(let i = 0; i < gameServerMatch.playerIds.length; i++) {
        let playerId = gameServerMatch.playerIds[i];
        gameServerMatch.unitInfo[playerId].forEach(function(unit) {
            if(unit.id === unitId) colour = gameServerMatch.playerColour[i];
        });
    }

    return colour;
}

/**
 * Turn change unit info update.
 * such as updating the unit energy and hp after the turn change from player 1 to player 2.
 */
function updateAllUnitInfo(newUnitInfo) {
    gameServerMatch.playerIds.forEach(function(playerId) {
        newUnitInfo[playerId].forEach(function(updatedInfo) {   // {hp, atk, def, currentEnergy}
            let position = findUnitLocationInUnitInfo(updatedInfo.id);
            gameServerMatch.unitInfo[position.playerId][position.unitIndex].hp = updatedInfo.hp;
            gameServerMatch.unitInfo[position.playerId][position.unitIndex].atk = updatedInfo.atk;
            gameServerMatch.unitInfo[position.playerId][position.unitIndex].def = updatedInfo.def;
            gameServerMatch.unitInfo[position.playerId][position.unitIndex].currentEnergy = updatedInfo.currentEnergy;
            gameServerMatch.unitInfo[position.playerId][position.unitIndex].hasAttacked = updateUnitInfo.hasAttacked;
        });
    });
}

/**
 * The purpose of this function is to find the unit in gameServerMatch
 * with the given id
 * return {playerId, unitIndex}
 */
function findUnitLocationInUnitInfo(unitId) {
    let targetPlayerId = null;
    let targetUnitIndex = null;
    gameServerMatch.playerIds.forEach(function(playerId) {
        for(let i = 0; i < gameServerMatch.unitInfo[playerId].length; i++) {
            let unit = gameServerMatch.unitInfo[playerId][i];
            if(unit.id === unitId) {
                targetPlayerId = playerId;
                targetUnitIndex = i;
            }
        }
    });
    return {playerId: targetPlayerId, unitIndex: targetUnitIndex};
}

/**
 * Create a attack button for the current player
 * @param {scene} game 
 */
function createAttackButton(game) {
    let btnAndText = createSmallBtn(game, center.x + 250, center.y + 320, "Attack");
    let btn = btnAndText.btn;
    setItemAlpha(btn);

    btn.on('pointerup', function() {
        btn.alpha = 0.9;
        game.readyToAttack = true;

        // Show range of attack
        if(game.attackRangeBox) game.attackRangeBox.destroy();
        if (game.commandUnit) {
            game.attackRangeBox = game.add.graphics().lineStyle(3, 0x000000, 0.8);
            game.attackRangeBox.strokeRect(0, 0, game.map.tileWidth * 3, game.map.tileHeight * 3);
            game.attackRangeBox.setPosition((game.commandUnit.x - 1) * game.map.tileWidth, (game.commandUnit.y - 1) * game.map.tileHeight);
        }

        // change colour
        game.attackBtnAndText.btn.destroy();
        game.attackBtnAndText.btnText.destroy();
        game.attackBtnAndText = createStopAttackButton(game);
    });

    return {btn: btn, btnText: btnAndText.btnText};
}

/**
 * Create a attack button for the current player
 * @param {scene} game 
 */
function createStopAttackButton(game) {
    let btnAndText = createSmallBtnGrey(game, center.x + 250, center.y + 320, "Stop Attack");
    let btn = btnAndText.btn;
    setItemAlpha(btn);

    btn.on('pointerup', function() {
        btn.alpha = 0.9;
        game.readyToAttack = false;
        if(game.attackRangeBox) game.attackRangeBox.destroy();

        // change colour
        game.attackBtnAndText.btn.destroy();
        game.attackBtnAndText.btnText.destroy();
        game.attackBtnAndText = createAttackButton(game);
    });

    return {btn: btn, btnText: btnAndText.btnText};
}

/**
 * check if the two units are in range
 */
function bothUnitsAreInAtkRange(unit1, unit2) {
    return (((Math.pow((unit1.x - unit2.x), 2) * Math.pow((unit1.y - unit2.y), 2)) === 1) ||
        ((Math.pow((unit1.x - unit2.x), 2) + Math.pow((unit1.y - unit2.y), 2)) === 1));
}

/**
 * update unit info
 */
function updateUnitInfo(unit) {
    let location = findUnitLocationInUnitInfo(unit.id);
    let playerId = location.playerId;
    let i = location.unitIndex;

    gameServerMatch.unitInfo[playerId][i].hp = unit.hp;
    gameServerMatch.unitInfo[playerId][i].mp = unit.mp;
    gameServerMatch.unitInfo[playerId][i].hasAttacked = unit.hasAttacked;

    // delete the unit if hp = 0
    if(unit.hp <= 0) {
        gameServerMatch.unitInfo[playerId][i].boxMarker.destroy();
        gameServerMatch.unitInfo[playerId][i].sprite.destroy();
        gameServerMatch.unitInfo[playerId] = gameServerMatch.unitInfo[playerId].splice(i, i+1);
    }
}

/**
 * Display damage on unit
 */
function displayDamageOnUnit(game, dmg, unit) {
    if(game.flashingDamage.box) game.flashingDamage.box.destroy();
    game.flashingDamage.box = game.add.text(unit.x * game.map.tileWidth + 24, unit.y * game.map.tileHeight - 20, ""+dmg, { fill: '#FF0000', fontSize: '20px' });
    game.flashingDamage.counter = 100;
}

/**
 * Create a capture button for the current player
 * @param {scene} game 
 */
function createCaptureButton(game) {
    let btnAndText = createSmallBtn(game, center.x - 250, center.y + 320, "Capture");
    let btn = btnAndText.btn;
    setItemAlpha(btn);

    btn.on('pointerup', function() {
        btn.alpha = 0.9;

        // Show range of attack
        if(game.flashingCaptureCircle.cir) game.flashingCaptureCircle.cir;
        game.flashingCaptureCircle.cir = game.add.graphics().lineStyle(8, 0xb25c23, 0.8);
        game.flashingCaptureCircle.cir.strokeCircle(game.map.tileWidth/2, game.map.tileHeight/2, 50);
        game.flashingCaptureCircle.cir.setPosition(game.commandUnit.x * game.map.tileWidth, game.commandUnit.y * game.map.tileHeight);
        game.flashingCaptureCircle.counter = 50;

        api.captureTheCurrentBase(match.matchId, game.commandUnit.id);
    });

    return {btn: btn, btnText: btnAndText.btnText};
}