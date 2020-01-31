class Result extends Phaser.Scene {
    constructor() {
        super({key:"Result"});
    }

    preload() {
        currentScene = "Result";

        this.load.audio('victoryBGM', '../assets/game/music/Victory.mp3');
    }
     
    create() {
        // BGM
        this.victoryBGM = this.sound.add('victoryBGM');
        this.victoryBGM.play();

        this.add.text(center.x - 400, center.y, victoryMessage, { fill: '#FF0000', fontStyle: 'bold italic', strokeThickness: 8, fontSize: '40px' });
    
        createBackToMenuButton(this);
    }
}

/**
 * Create a back to menu button for the current player
 * @param {scene} game 
 */
function createBackToMenuButton(game) {
    let btnAndText = createSmallBtn(game, center.x + 320, center.y + 320, "Menu");
    let btn = btnAndText.btn;
    setItemAlpha(btn);

    btn.on('pointerup', function() {
        btn.alpha = 0.9;
        game.victoryBGM.stop();
        game.scene.stop("Result").start('Menu');
    });

    return {btn: btn, btnText: btnAndText.btnText};
}