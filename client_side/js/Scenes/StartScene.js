/* jshint esversion: 6 */

let currPlayer;
let center;
let currentScene;

class Start extends Phaser.Scene {
    constructor() {
        super({key:"Start"});
    }

    preload() {
        // init global variables
        currPlayer = {
            databaseId: null,
            username: null,
            readyToPlay: false,
            colour: null
        };
        center = {
            x: null,
            y: null
        };
        currentScene = "Start";

        this.load.image('background', "../assets/start/Azure_Revelations_Title_Final.png");
        this.load.image('input', "../assets/ui/BL_GUI_Input.png");
        this.load.audio('titleBGM', '../assets/game/music/Title_Theme.mp3');

        api.getCurrentPlayer(function(player) {
            if(player) {
                currPlayer.databaseId = player.databaseId;
                currPlayer.username = player.username;

            } else {
                currPlayer.databaseId = null;
                currPlayer.username = null;
            }
            currPlayer.readyToPlay = false;

            api.setUpSocketInfo(currPlayer.databaseId, currPlayer.username);
        });
    }
     
    create() {
        center.x = this.cameras.main.width / 2;
        center.y = this.cameras.main.height / 2;

        // BGM
        this.titleBGM = this.sound.add('titleBGM');
        this.titleBGM.play();

        // background
        this.background = this.add.image(center.x, center.y, 'background');
        //this.background.setDisplaySize(1080, 720);
    
        // text
        this.text = this.add.text(290, 600, '', { fill: '#0080FF', fontSize: '32px' });

        // To Menu Scene or Signup Scene
        this.input.keyboard.on('keyup', function(e) {
            if(currPlayer.databaseId) {
                this.titleBGM.stop();
                if (!currPlayer.username) { // if the username is null
                    // if the currUser is new then let the user enter their username
                    this.scene.stop("Start").start("Signup");

                } else {
                    this.scene.stop("Start").start("Menu");
                }
            }
        }, this);
    }
     
    update(time, delta) {
        // text
        if(!currPlayer.databaseId) this.text.text = "Please Login First";
        else this.text.text = 'Press Any key to Start Game';
    }
}