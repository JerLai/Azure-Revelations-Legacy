/* jshint esversion: 6 */

let initSignupSocketCompleted = false;

class Signup extends Phaser.Scene {
    constructor() {
        super({key:"Signup"});
    }

    preload() {
        currentScene = "Signtup";
        this.load.image('inputBar', "../assets/ui/BL_GUI_Input.png");
        this.load.image('signUpSubmitBtn', "../assets/ui/BL_GUI_SmallButton.png");
    }
     
    create() {
        
        // background
        this.background = this.add.image(center.x, center.y, 'background');
        this.background.setDisplaySize(1080, 720);

        // inputBar
        this.add.text(300, 290, "Enter your prefer Username:", { fill: '#0886ca', strokeThickness: 8, fontSize: '32px', fontStyle: 'bold italic'});
        this.inputBar = this.add.image(center.x, center.y, 'inputBar');
        this.inputBar.setDisplaySize(900, 80);

        this.inputFieldText = "";
        this.inputField = this.add.text(160, 343, "", { fill: '#a4977c', fontSize: '32px', strokeThickness: 5 });
    
        // To Menu Scene or Signup Scene
        this.input.keyboard.on('keyup', function(e) {
            if((e.key !== "Shift") && (e.key !== "CapsLock")) {

                if (e.key === "Backspace") {
                    this.inputFieldText = this.inputFieldText.substring(0, this.inputFieldText.length - 1);

                } else if (e.key.match(/^[0-9a-zA-Z]+$/)) {
                    this.inputFieldText += e.key;

                } else if (e.key === " ") {
                    this.inputFieldText += " ";
                }
            }
        }, this);

        // Submit button creation
        this.signUpSubmitBtn = this.add.image(520, 450, 'signUpSubmitBtn');
        this.signUpSubmitBtn.setDisplaySize(250, 100);
        this.signUpSubmitBtnText = this.add.text(460, 430, "Submit", { fill: '#FFFFFF', fontSize: '32px' });
        
        // Submit button interactive
        this.signUpSubmitBtn.setInteractive();

        this.signUpSubmitBtn.on('pointerover', function() {
             this.signUpSubmitBtn.alpha = 0.9;
        }, this);

        this.signUpSubmitBtn.on('pointerout', function() {
            this.signUpSubmitBtn.alpha = 1;
        }, this);

        this.errorDialog = this.add.text(300, 200, "", { fill: '#FF0000', fontSize: '32px' });
        this.signUpSubmitBtn.on('pointerdown', function() {
            this.signUpSubmitBtn.alpha = 0.8;
        }, this);

        let game = this;
        this.signUpSubmitBtn.on('pointerup', function() {
            this.errorDialog.text = "";
            this.signUpSubmitBtn.alpha = 0.9;
            if (this.inputFieldText === "") {
                this.errorDialog.text = "Your name can not be empty";

            } else {
                api.signupNewPlayer(this.inputFieldText);
            }
        }, this);

        // only init socket listener once
        if (!initSignupSocketCompleted) {
            initSignupSocketCompleted = true;

            initSocketListenerForSignup(this);
        }
    }
     
    update(time, delta) {
        // player input username
        this.inputField.text = this.inputFieldText;
    }
}

function initSocketListenerForSignup(game) {
    // status = "accepted" or "rejected"
    socket.on('new player signup', function(status) {
        // if 'accepted' then go to Menu Scene
        if(status === "accepted") {
            api.notifyUserListeners();
            currPlayer.username = game.inputFieldText;
            game.scene.stop("Signup").start("Menu");

        // else stay and tell player to change username
        } else {
            game.errorDialog.text = "Username already exist";
            game.inputFieldText = "";
        }
    });
}