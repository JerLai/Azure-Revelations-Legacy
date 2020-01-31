/* jshint esversion: 6 */

let match;
let initMenuSocketCompleted = false;

class Menu extends Phaser.Scene {
    constructor() {
        super({key:"Menu"});
    }

    preload() {
        // init global variables
        match = {
            matchId: null,
            players: []
        };
        currentScene = "Menu";
        api.notifyChatDeletionListeners();
        
        this.load.image('main menu', "../assets/ui/BL_GUI_MainMenu.png");
        this.load.image('large button', "../assets/ui/BL_GUI_LargeButton.png");
        this.load.image('loading bar', "../assets/ui/BL_GUI_Progress-bar.png");
    }

    create() {

        this.background = this.add.image(center.x, center.y, 'main menu');
        this.background.setDisplaySize(this.cameras.main.width + 40, this.cameras.main.height + 20);

        // matchmaking button
        this.matchmakingBtnPressed = false;
        this.matchmakingBtn = createLargeBtn(this, center.x - 240, center.y - 100, "Matchmaking");
        setItemAlpha(this.matchmakingBtn);
        this.matchmakingBtn.on('pointerup', function() {
            this.matchmakingBtn.alpha = 0.9;

            // Auto join a room
            if(!this.matchmakingBtnPressed) {
                this.matchmakingBtnPressed = true;

                api.findCreateAndJoinMatch();
            }
        }, this);

        // create new room
        this.newRoomBtn = createLargeBtn(this, center.x + 150, center.y - 100, "New Room");
        setItemAlpha(this.newRoomBtn);
        this.newRoomBtn.on('pointerup', function() {
            this.newRoomBtn.alpha = 0.9;

            // Create new room and auto join the new room
            api.createMatch();
        }, this);

        if (!initMenuSocketCompleted) {
            initMenuSocketCompleted = true;
            initSocketListenerForMenu(this);
        }
    }
}

function initSocketListenerForMenu(game) {
    socket.on('matchCreated', function(data) {
        // Successfuly joined a room
        match.matchId = data.matchId;
        game.scene.stop("Menu").start('Room');
    });
    socket.on('joinSuccess', function(data) {
        // Successfuly joined a room
        match.matchId = data.matchId;
        game.scene.stop("Menu").start('Room');
    });
    socket.on('alreadyJoined', function(data) {
        // Successfuly joined a room
        match.matchId = data.matchId;
        game.scene.stop("Menu").start('Room');
    });
}

function createLargeBtn(game, x, y, btnName) {
    let btn = game.add.image(x, y, "large button");
    btn.setDisplaySize(350, 150);
    text = game.add.text(x - 110, y - 20, btnName, { fill: '#FFFFFF', fontSize: '32px' });
    return btn;
}

function setItemAlpha(item) {
    item.setInteractive();
    item.on('pointerover', function() {
        item.alpha = 0.9;
    }, item);
    item.on('pointerout', function() {
        item.alpha = 1;
    }, item);
    item.on('pointerdown', function() {
        item.alpha = 0.8;
    }, item);
}