import Phaser from "phaser";
import SaveState from "../SaveState";

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    preload() {
        this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
    }

    create() {
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0.5, 0.5);

        // Initialize text objects before calling resizeGame
        this.titleText = this.add.text(this.scale.width / 2, this.scale.height / 4, 'NAGEEX', { fontSize: '262px', fill: '#fff' }).setOrigin(0.5, 0.5);
        this.startText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Start', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0.5).setInteractive();
        this.continueText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Continue', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0.5).setInteractive();

        this.startText.on('pointerdown', () => {
            SaveState.clear(); // Clear any existing save state
            this.scene.start('TownScene');
        });

        this.continueText.on('pointerdown', () => {
            const gameState = SaveState.load();
            if (gameState) {
                this.scene.start(gameState.scene, gameState.data);
            } else {
                this.scene.start('TownScene');
            }
        });

        // Call resizeGame after initializing text objects
        this.resizeGame();

        window.addEventListener('resize', this.resizeGame.bind(this));
    }

    resizeGame() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.scale.resize(width, height);

        const aspectRatio = this.sky.width / this.sky.height;
        if (width / height > aspectRatio) {
            this.sky.displayWidth = width;
            this.sky.displayHeight = width / aspectRatio;
        } else {
            this.sky.displayHeight = height;
            this.sky.displayWidth = height * aspectRatio;
        }
        this.sky.x = width / 2;
        this.sky.y = height / 2;

        // Center the text elements
        this.titleText.setPosition(width / 2, height / 4);
        this.startText.setPosition(width / 2, height / 2);
        this.continueText.setPosition(width / 2, height / 2 + 50);
    }
}