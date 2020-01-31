/* jshint esversion: 6 */
// import Phaser from 'phaser';
// import StartScene from './Scenes/StartScene';
// import SignupScene from './Scenes/SignupScene';
// import MenuScene from './Scenes/MenuScene';

const config = {
    type: Phaser.AUTO,
    parent: 'azure-revelation',
    width: 1080,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: {
        debug: false,
        gravity: { y: 0 }
        }
    },
    scene: [ Start, Signup, Menu, Room, MatchSetup, Match, Result ]
};
 
const game = new Phaser.Game(config);

// class Game extends Phaser.Game {
//     constructor () {
//       super(config);
//       this.scene.add('Start', StartScene);
//       this.scene.add('Signup', SignupScene);
//       this.scene.add('Menu', MenuScene);
//       this.scene.start('Start');
//     }
//   }
   
// window.game = new Game();