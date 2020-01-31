/* jshint esversion: 6 */

let marker;
let unitsMap;
let tileMapInfo;
let gameStatus;
let mapSelected;
let initMatchSetupSocketCompleted = false;

class MatchSetup extends Phaser.Scene {
    constructor() {
        super({key:"MatchSetup"});
    }

    preload() {
        // init global variables
        unitsMap = {
            knight : {unitClass : "Knight", display : 2, cost : 5},
            thief: {unitClass: "Thief", display: 2, cost: 5}
        };
        tileMapInfo = {
            p1Base: {},  // {name, id, x, y, xwidth, yheight, colour}
            p2Base: {},  // {name, id, x, y, xwidth, yheight, colour}
            collideTileMap: [], // [{tileId, x, y}, {tileId, x, y}, ...]
            mapSize: {x: -1, y: -1},  // {x, y}
            playerTerritory: {topLeftCorner: {x: -1, y: -1}, bottomRightCorner: {x: -1, y: -1}}   // {topLeftCorner, bottomRightCorner}
        };
        gameStatus = {
            unitSpaceAvailable : 0,
            unitsPlaced : []  // [{unitClass, x, y, boxMarker}]
        };
        mapSelected = "Final_Tileset";
        currentScene = "MatchSetup";
        api.notifyChatCreationListeners();

        this.load.image("tileset", "../assets/game/Final_Tileset.png");
        this.load.tilemapTiledJSON("map", "../assets/game/Final_Map.json");
        this.load.spritesheet(unitsMap.thief.unitClass, '../assets/game/characters/Female_Unit_Walk.png', {frameWidth: 48, frameHeight: 48});
        this.load.spritesheet(unitsMap.knight.unitClass, '../assets/game/characters/Male_Unit_Walk.png', {frameWidth: 48, frameHeight: 48});
        this.selectedUnit = null;
        this.clickDelay = 1000;
        this.previousClick = 0;
        this.p1BaseBox = null;
        this.p2BaseBox = null;
        this.setUpCompleted = false;    // instantiate unit position should only be called once

        // reset the ready to play btn
        api.resetReadyToPlay(match.matchId);
        currPlayer.readyToPlay = false;

        if (!initMatchSetupSocketCompleted) {
            socket.on("player colour", function(colour) {
                currPlayer.colour = colour;
            });
        }
        api.getPlayerColour(match.matchId)
        
        this.instantiationCompleted = false;
    }
    // once these bugs are fixed, and have made it working, we'll need to work together in refactoring GameServerMatch with the high coupling
    create() {

        this.map = this.make.tilemap({key: "map"});
        let tileset = this.map.addTilesetImage("Final_Tileset", "tileset");

        this.belowLayer1 = this.map.createStaticLayer("Below Player 1", tileset, 0, 0);
        this.belowLayer2 = this.map.createStaticLayer("Below Player 2", tileset, 0, 0);
        this.worldLayer = this.map.createStaticLayer("World", tileset, 0, 0);    
        this.aboveLayer = this.map.createStaticLayer("Above Player", tileset, 0, 0);

        // collidable
        this.worldLayer.setCollisionByProperty({ collides: true });
        this.aboveLayer.setDepth(10);

        // add a button for each unit
        this.add.text(center.x + 210, center.y - 350, "Units Available", { fill: '#FFFFFF', fontSize: '32px' });
        createUnitButton(this, center.x + 350, center.y - 250, unitsMap.knight.unitClass + "(" + unitsMap.knight.cost + ")", "knight");
        createUnitButton(this, center.x + 350, center.y - 150, unitsMap.thief.unitClass + "(" + unitsMap.thief.cost + ")", "thief");

        // Create a simple graphic that can be used to show which tile the mouse is over
        marker = this.add.graphics();
        marker.lineStyle(5, 0xffffff, 1);
        marker.strokeRect(0, 0, this.map.tileWidth, this.map.tileHeight);
        marker.lineStyle(3, currPlayer.colour, 1);
        marker.strokeRect(0, 0, this.map.tileWidth, this.map.tileHeight);

        let readyBtnAndText = createSetupReadyButton(this);
        this.readyBtn = readyBtnAndText.btn;
        this.readyText = readyBtnAndText.btnText;

        // init all the callbacks
        if (!initMatchSetupSocketCompleted) {
            initMatchSetupSocketCompleted = true;
            initSocketListenerForMatchSetup(this);
        }

        // callback = socket.on("match setup info")
        api.getMatchSetupInfo(match.matchId);  // renew the match object in this function

        // callback = socket.on("map info")
        api.getGameMapInfo(mapSelected, match.matchId);

        // callback = socket.on("initial unit space")
        api.getInitialUnitSpace(match.matchId);
        
        this.instantiationCompleted = true;
    }

    update(time, delta) {
        if (this.instantiationCompleted) {

            if(this.selectedUnitText) this.selectedUnitText.destroy();
            if(this.selectedUnit) this.selectedUnitText = this.add.text(center.x + 200, center.y + 300, "Unitspace: " + gameStatus.unitSpaceAvailable + " \nSelected Unit: " + this.selectedUnit.unitClass, { fill: '#FFFFFF', fontSize: '20px' });
        
            // Convert the mouse position to world position within the camera
            const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);

            // Place the marker in world space, but snap it to the tile grid. If we convert world -> tile and
            // then tile -> world, we end up with the position of the tile under the pointer
            const pointerTileXY = this.worldLayer.worldToTileXY(worldPoint.x, worldPoint.y);
            const snappedWorldPoint = this.worldLayer.tileToWorldXY(pointerTileXY.x, pointerTileXY.y);
            // not clicking outside the map and a unit is selected
            let inMap = isInMap(this, snappedWorldPoint.x, snappedWorldPoint.y);
            let inTerritory = isInPlayerTerritory(snappedWorldPoint.x, snappedWorldPoint.y);
            let tileIsCollidable = isTileCollidable(snappedWorldPoint.x, snappedWorldPoint.y);
            if(inMap && inTerritory && !tileIsCollidable) {
                marker.setPosition(snappedWorldPoint.x, snappedWorldPoint.y);
            }

            // mouse click
            if (this.input.manager.activePointer.isDown && (time - this.previousClick > this.clickDelay)) {
                this.previousClick = time;

                // player must select a unit, player must can't place the unit outside
                // player can not place their unit on colliable, player must have enough energy
                // player can only place units in their own region
                // player can not place unit ontop of another unit
                let unitAlreadyAtPosition = isThereUnitAtPosition(snappedWorldPoint.x, snappedWorldPoint.y);
                if (this.selectedUnit && inMap && inTerritory && 
                    (gameStatus.unitSpaceAvailable >= this.selectedUnit.cost) &&
                    !tileIsCollidable && !unitAlreadyAtPosition) {

                    gameStatus.unitSpaceAvailable -= this.selectedUnit.cost;
                    drawSprite(this, this.selectedUnit, snappedWorldPoint.x, snappedWorldPoint.y, currPlayer.colour);
                    
                    let unitCoordinate = convertPixelToTileCoordinate(snappedWorldPoint.x, snappedWorldPoint.y);
                    gameStatus.unitsPlaced.push({
                        "unitClass": this.selectedUnit.unitClass,
                        "display": this.selectedUnit.display,
                        "x": unitCoordinate.x,
                        "y": unitCoordinate.y
                    });
                }
            }
        }
    }
}

function initSocketListenerForMatchSetup(game) {
    // data = {matchId, players, allPlayersAreReady, initialUnitSpace}
    socket.on("match setup info", function(data) {
        match.players = data.players;

        // refresh things that can be affected by match change
        refreshSetupReadyBtn(game);
        tryToStartGame(game, data.allPlayersAreReady);
    });

    socket.on("map info", function(tileMapParser) {
        tileMapInfo.p1Base = tileMapParser.p1Base;
        tileMapInfo.p2Base = tileMapParser.p2Base;
        tileMapInfo.collideTileMap = tileMapParser.collideTileMap; 
        tileMapInfo.mapSize = tileMapParser.mapSize;
        tileMapInfo.playerTerritory = tileMapParser.playerTerritory;

        // draw the base that needs to be capture
        displayPlayerBase(game);
    });

    // the callback for player changing status (clicking the ready button)
    socket.on("player status change success", function(data) {
        if (currentScene === "MatchSetup") {
            api.getMatchSetupInfo(match.matchId);
        }
    });

    socket.on("game setup completed", function(data) {
        game.scene.stop("MatchSetup").start("Match");
    });

    socket.on("initial unit space", function(data) {
        gameStatus.unitSpaceAvailable = data.initialUnitSpace;
    });

    // other player left the game
    socket.on("matchDestroyed", function(data) {
        if (currentScene === "MatchSetup") {
            api.leaveMatch(false);
            game.scene.stop("MatchSetup").start('Menu');
        }
    });
}

function createUnitButton(game, x, y, name, key) {
    let readyBtnAndText = createSmallBtn(game, x, y, name);
    let readyBtn = readyBtnAndText.btn;
    setItemAlpha(readyBtn);
    readyBtn.on('pointerup', function() {
        readyBtn.alpha = 0.9;
        game.selectedUnit = unitsMap[key];
    });
}

function drawSprite(game, unit, snappedWorldPointX, snappedWorldPointY, boxColour) {
    // boxMarker
    let boxMarker = drawBoxMarker(game, snappedWorldPointX, snappedWorldPointY, boxColour);

    // sprite
    let sprite = game.physics.add.sprite(snappedWorldPointX + 24, snappedWorldPointY + 24, unit.unitClass, unit.display).setSize(game.map.tileWidth, game.map.tileHeight).setOffset(0, 0);
    
    return {boxMarker: boxMarker, sprite: sprite};
}

function drawBoxMarker(game, snappedWorldPointX, snappedWorldPointY, boxColour) {
    // boxMarker
    let boxMarker = game.add.graphics().lineStyle(5, boxColour, 1).strokeRect(0, 0, game.map.tileWidth, game.map.tileHeight);
    boxMarker.setPosition(snappedWorldPointX, snappedWorldPointY);

    return boxMarker;
}

function initDebugMapMode(game) {
    // Debug graphics
    game.input.keyboard.once("keydown_B", event => {
        // Turn on physics debugging to show player's hitbox
        game.physics.world.createDebugGraphic();

        // Create worldLayer collision graphic above the player, but below the help text
        const graphics = game.add
            .graphics()
            .setAlpha(0.75)
            .setDepth(20);
        game.worldLayer.renderDebug(graphics, {
            tileColor: null, // Color of non-colliding tiles
            collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
            faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
        });
    });
}

function convertPixelToTileCoordinate(snappedWorldPointX, snappedWorldPointY) {
    return {
        x : Math.floor(snappedWorldPointX/48),
        y : Math.floor(snappedWorldPointY/48)
    };
}

/**
 * return true if the tile is colliable and false if the tile is not
 * @param {*} snappedWorldPointX 
 * @param {*} snappedWorldPointY 
 */
function isTileCollidable(snappedWorldPointX, snappedWorldPointY) {
    let targetCoordinate = convertPixelToTileCoordinate(snappedWorldPointX, snappedWorldPointY);
    let isCollidable = false;
    tileMapInfo.collideTileMap.forEach(function(tile) {
        // tile = {id, x, y} where x and y is in tile coordinate
        if(targetCoordinate.x === tile.x && targetCoordinate.y === tile.y) {
            isCollidable = true;
        }
    });

    return isCollidable;
}

/**
 * If both players are ready try to start the game
 */
function tryToStartGame(game, allPlayersAreReady) {
    if(gameStatus.unitsPlaced.length > 0) {

        if (allPlayersAreReady && !game.setUpCompleted) {
            game.setUpCompleted = true;
            api.instantiateUnitPosition(match.matchId, gameStatus.unitsPlaced);
            // if the above is a success then "game setup completed" socket event will
            // be received
        }
    }
}

/**
 * Create a ready button for the current player
 * @param {scene} game 
 */
function createSetupReadyButton(game) {
    let readyBtnAndText = createSmallBtn(game, center.x + 350, center.y + 200, "Ready");
    let readyBtn = readyBtnAndText.btn;
    setItemAlpha(readyBtn);

    readyBtn.on('pointerup', function() {
        readyBtn.alpha = 0.9;
        currPlayer.readyToPlay = true;

        // change player status iff they placed at least one unit
        if(gameStatus.unitsPlaced.length > 0) {
            api.updatePlayerStatus(match.matchId, true);

        } else {
            game.add.text(center.x + 200, center.y, "Place at least \none unit before \ngame start!", { fill: '#FF0000', fontSize: '32px' });
        }
    });

    return {btn: readyBtn, btnText: readyBtnAndText.btnText};
}

/**
 * Create a not ready button for the current player
 * @param {scene} game 
 */
function createSetupNotReadyButton(game) {
    let notReadyBtnAndText = createSmallBtnGrey(game, center.x + 350, center.y + 200, "Not Ready");
    let notReadyBtn = notReadyBtnAndText.btn;
    setItemAlpha(notReadyBtn);
    notReadyBtn.on('pointerup', function() {
        notReadyBtn.alpha = 0.9;
        currPlayer.readyToPlay = false;
        api.updatePlayerStatus(match.matchId, false);
    });

    return {btn: notReadyBtn, btnText: notReadyBtnAndText.btnText};
}

function refreshSetupReadyBtn(game) {
    // compare currPlayer status with the info in match (the info we got from server)
    if(game.readyBtn && game.readyText) {
        game.readyBtn.destroy();
        game.readyText.destroy();
    }
    // if currPlayer is ready then create the not ready btn
    if(currPlayer.readyToPlay) {
        let notReadyBtnAndText = createSetupNotReadyButton(game);
        game.readyBtn = notReadyBtnAndText.btn;
        game.readyText = notReadyBtnAndText.btnText;
    // if currPlayer is not ready then create the ready btn
    } else {
        let readyBtnAndText = createSetupReadyButton(game);
        game.readyBtn = readyBtnAndText.btn;
        game.readyText = readyBtnAndText.btnText;
    }
}

function isInPlayerTerritory(snappedWorldPointX, snappedWorldPointY) {
    let tileCoordinate = convertPixelToTileCoordinate(snappedWorldPointX, snappedWorldPointY);
    let inTerritory = false;
    if((tileMapInfo.playerTerritory.topLeftCorner.x <= tileCoordinate.x && tileMapInfo.playerTerritory.bottomRightCorner.x >= tileCoordinate.x) &&
        (tileMapInfo.playerTerritory.topLeftCorner.y <= tileCoordinate.y && tileMapInfo.playerTerritory.bottomRightCorner.y >= tileCoordinate.y)) {
            inTerritory = true;
        }
    
    return inTerritory;
}

function isInMap(game, snappedWorldPointX, snappedWorldPointY) {
    return ((game.worldLayer.height > snappedWorldPointY) && (game.worldLayer.width > snappedWorldPointX));
}

/**
 * There is a unit at the position
 * @param {*} snappedWorldPointX 
 * @param {*} snappedWorldPointY 
 */
function isThereUnitAtPosition(snappedWorldPointX, snappedWorldPointY) {
    let tileCoordinate = convertPixelToTileCoordinate(snappedWorldPointX, snappedWorldPointY);
    let result = false;
    gameStatus.unitsPlaced.forEach(function(unit) {
        if((unit.x === tileCoordinate.x) && (unit.y === tileCoordinate.y)) {
            result = true;
        }
    });

    return result;
}

function displayPlayerBase(game) {
    game.p1BaseBox = game.add.graphics().lineStyle(10, tileMapInfo.p1Base.colour, 1);
    game.p1BaseBox.strokeRect(0, 0, game.map.tileWidth * tileMapInfo.p1Base.xwidth, game.map.tileHeight * tileMapInfo.p1Base.yheight);
    game.p1BaseBox.setPosition(tileMapInfo.p1Base.x * game.map.tileWidth, tileMapInfo.p1Base.y * game.map.tileHeight);

    game.p2BaseBox = game.add.graphics().lineStyle(10, tileMapInfo.p2Base.colour, 1);
    game.p2BaseBox.strokeRect(0, 0, game.map.tileWidth * tileMapInfo.p2Base.xwidth, game.map.tileHeight * tileMapInfo.p2Base.yheight);
    game.p2BaseBox.setPosition(tileMapInfo.p2Base.x * game.map.tileWidth, tileMapInfo.p2Base.y * game.map.tileHeight);
}