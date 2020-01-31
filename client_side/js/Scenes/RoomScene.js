/* jshint esversion: 6 */

let initRoomSocketCompleted = false;

class Room extends Phaser.Scene {
    constructor() {
        super({key:"Room"});
    }

    preload() {
        currentScene = "Room";

        // reset the ready to play btn
        api.resetReadyToPlay(match.matchId);
        currPlayer.readyToPlay = false;

        this.load.image('main menu', "../assets/ui/BL_GUI_MainMenu.png");
        this.load.image('large button', "../assets/ui/BL_GUI_LargeButton.png");
        this.load.image('room background', "../assets/ui/BL_GUI_TextField.png");
        this.load.image('player frame', "../assets/ui/BL_GUI_Input.png");
        this.load.image('current player symbol', "../assets/ui/BL_GUI_RadioButton2_filled.png");
        this.load.image('not ready symbol', "../assets/ui/BL_GUI_RadioButton1_empty.png");
        this.load.image('ready symbol', "../assets/ui/BL_GUI_RadioButton1_green.png");
        this.load.image('small button', "../assets/ui/BL_GUI_SmallButton.png");
        this.load.image('small button grey', "../assets/ui/BL_GUI_SmallButton_Grey.png");
        this.playerFrames = null;
    }

    create() {
        this.background = this.add.image(center.x, center.y, 'main menu');
        this.background.setDisplaySize(this.cameras.main.width + 40, this.cameras.main.height + 20);

        this.roomBackground = this.add.image(center.x, center.y + 50, 'room background');
        this.roomBackground.setDisplaySize(this.cameras.main.width - 500, this.cameras.main.height - 220);

        // ready button
        let readyBtnAndText = createReadyButton(this);
        this.readyBtn = readyBtnAndText.btn;
        this.readyText = readyBtnAndText.btnText;

        // menu button
        createRoomToMenuButton(this);

        if (!initRoomSocketCompleted) {
            initRoomSocketCompleted = true;

            initSocketListenerForRoom(this);
        }

        // the call back is in initSocketListenerForRoom
        api.getMatchInfo(match.matchId);  // renew the match object in this function

    }
}

function initSocketListenerForRoom(game) {
    // data = {matchId, players = [{playerId, username, readyToPlay}], allPlayersReady}
    socket.on("match info", function(data) {
        match.players = data.players;

        //clean room
        if (game.playerFrames) {
            destroyPlayerFrames(game);
        }

        // display each players in the room
        game.playerFrames = drawAllPlayers(game, match.players, center.x - 15, center.y - 70);

        // refresh things that can be affected by match change
        refreshReadyBtn(game);
        tryToStartMatch(game, data.allPlayersReady);
    });

    // the callback for player changing status (clicking the ready button)
    socket.on("player status change success", function(data) {
        if (currentScene === "Room") {
            api.getMatchInfo(match.matchId);
        }
    });

    // a player chose to leave the room
    socket.on("otherLeftMatch", function(data) {
        // just get match info for yourselve because the other player is probabily not in match right now
        api.getMatchInfo(match.matchId, false);
    });

    // other player disconnected from game
    socket.on("matchDestroyed", function(data) {
        if (currentScene === "Room") {
            api.getMatchInfo(match.matchId);
        }
    });
}

/**
 * Draw all the player frame that is currently in the room
 * @param {this scene} game 
 * @param [{username, readyToPlay}] players 
 * @returns a list of frames that contains all elements within the frame
 */
function drawAllPlayers(game, players, initX, initY) {
    let playerFrames = [];
    let boxX = initX;
    let boxY = initY;
    for (let i = 0; i < players.length; i++) {
        if (players[i].username) {
            let playerFrame = createPlayerFrame(game, boxX, boxY, players[i]);
            playerFrames.push(playerFrame);
            boxY += 105;
        }
    }
    return playerFrames;
}

function createPlayerFrame(game, x, y, playerData) {
    // player frame
    let playerFrame = game.add.image(x, y, 'player frame');
    playerFrame.setDisplaySize(game.cameras.main.width - 680, 100);

    // player name
    let playerName = game.add.text(x - 130, y - 20, playerData.username, { fill: '#000000', fontSize: '32px' });

    // who are you
    let currPlayerSymbol = null;
    if(playerData.username === currPlayer.username) {
        currPlayerSymbol = game.add.image(x - 150, y, 'current player symbol');
        currPlayerSymbol.setDisplaySize(30, 30);
    }

    // not ready symbol
    let readySymbol;
    if(playerData.readyToPlay) {
        readySymbol = game.add.image(x + 150, y, "ready symbol");
    } else {
        readySymbol = game.add.image(x + 150, y, "not ready symbol");
    }
    readySymbol.setDisplaySize(30, 30);

    // becareful currPlayerSymbol might be null
    return [playerFrame, playerName, currPlayerSymbol, readySymbol];
}

function destroyPlayerFrames(game) {
    for (let i = 0; i < game.playerFrames.length; i++) {
        let playerFrame = game.playerFrames[i];
        for (let j = 0; j < playerFrame.length; j++) {
            // the player frames might not contain the elment in all
            // player frames. i.e. currPlayerSymbol
            if (playerFrame[j]) {
                playerFrame[j].destroy();
            }
        }
    }
}

function createSmallBtn(game, x, y, btnName) {
    let btn = game.add.image(x, y, "small button");
    btn.setDisplaySize(250, 100);
    text = game.add.text(x - 60, y - 15, btnName, { fill: '#FFFFFF', fontSize: '25px' });
    return {btn: btn, btnText: text};
}

function createSmallBtnGrey(game, x, y, btnName) {
    let btn = game.add.image(x, y, "small button grey");
    btn.setDisplaySize(250, 100);
    text = game.add.text(x - 70, y - 15, btnName, { fill: '#FFFFFF', fontSize: '25px' });
    return {btn: btn, btnText: text};
}

/**
 * Create a ready button for the current player
 * @param {scene} game 
 */
function createReadyButton(game) {
    let readyBtnAndText = createSmallBtn(game, center.x + 350, center.y + 200, "Ready");
    let readyBtn = readyBtnAndText.btn;
    setItemAlpha(readyBtn);
    readyBtn.on('pointerup', function() {
        readyBtn.alpha = 0.9;
        currPlayer.readyToPlay = true;
        api.updatePlayerStatus(match.matchId, true);
    });

    return {btn: readyBtn, btnText: readyBtnAndText.btnText};
}

/**
 * Create a not ready button for the current player
 * @param {scene} game 
 */
function createNotReadyButton(game) {
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

function refreshReadyBtn(game) {
    if(game.readyBtn) game.readyBtn.destroy();
    if(game.readyText) game.readyText.destroy();
    // if currPlayer is ready then create the not ready btn
    if(currPlayer.readyToPlay) {
        let notReadyBtnAndText = createNotReadyButton(game);
        game.readyBtn = notReadyBtnAndText.btn;
        game.readyText = notReadyBtnAndText.btnText;
    // if currPlayer is not ready then create the ready btn
    } else {
        let readyBtnAndText = createReadyButton(game);
        game.readyBtn = readyBtnAndText.btn;
        game.readyText = readyBtnAndText.btnText;
    }
}

/**
 * If both players are ready try to start the game
 */
function tryToStartMatch(game, allPlayersReady) {
    if(match.players.length > 1) {

        if (allPlayersReady) {
            game.scene.stop("Room").start("MatchSetup");
        }
    }
}

/**
 * Create a back to menu button for the current player
 * @param {scene} game 
 */
function createRoomToMenuButton(game) {
    let btnAndText = createSmallBtn(game, center.x + 350, center.y - 100, "To Menu");
    let btn = btnAndText.btn;
    setItemAlpha(btn);

    btn.on('pointerup', function() {
        btn.alpha = 0.9;

        api.leaveMatch(true);
        game.scene.stop("Room").start('Menu');
    });

    return {btn: btn, btnText: btnAndText.btnText};
}