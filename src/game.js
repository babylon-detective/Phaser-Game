import Phaser from "phaser";
import StartScene from "./scenes/StartScene";
import TownScene from "./scenes/TownScene";
import BattleScene from "./scenes/BattleScene";
import ShooterScene from "./scenes/ShooterScene";
import PlayerScene from "./scenes/PlayerScene";

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [StartScene, TownScene, BattleScene, ShooterScene, PlayerScene]
};

const game = new Phaser.Game(config);

window.addEventListener('resize', resizeGame);

function resizeGame() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    game.scale.resize(width, height);

    // Update the sky image dimensions
    if (game.scene.scenes.length > 0) {
        const scene = game.scene.scenes[0];
        if (scene.sky) {
            const aspectRatio = scene.sky.width / scene.sky.height;
            if (width / height > aspectRatio) {
                scene.sky.displayWidth = width;
                scene.sky.displayHeight = width / aspectRatio;
            } else {
                scene.sky.displayHeight = height;
                scene.sky.displayWidth = height * aspectRatio;
            }
            scene.sky.x = width / 2;
            scene.sky.y = height / 2;
        }
    }
}