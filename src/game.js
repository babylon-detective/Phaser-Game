import Phaser from "phaser";

import StartScene from "./scenes/StartScene";
import WorldScene from "./scenes/WorldScene";
import BattleScene from "./scenes/BattleScene";
import BattleMenuScene from "./scenes/BattleMenuScene";
import ShooterScene from "./scenes/ShooterScene";
import MapScene from "./scenes/MapScene";
import MenuScene from "./scenes/MenuScene";

import PlayerManager from "./managers/PlayerManager";
import NpcManager from "./managers/NpcManager";

// Prevent zooming
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
    }
});

// Prevent pinch zoom on mobile
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [StartScene, WorldScene, BattleScene, BattleMenuScene, ShooterScene, MapScene, MenuScene]
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
