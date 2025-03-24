import Phaser from "phaser";

export default class MapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapScene' });
    }

    init(data) {
        this.playerPosition = data.playerPosition;
    }

    create() {
        // Draw the map background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000)
            .setOrigin(0, 0)
            .setAlpha(0.8); // Semi-transparent background

        // Draw the map (placeholder)
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Map', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);

        // Add a blinking indicator for the player's position
        this.blinkingIndicator = this.add.circle(this.playerPosition.x, this.playerPosition.y, 10, 0xff0000);
        this.time.addEvent({
            delay: 500,
            callback: () => {
                this.blinkingIndicator.setVisible(!this.blinkingIndicator.visible);
            },
            loop: true
        });

        // Add key input to close the map
        this.input.keyboard.on('keydown-M', () => {
            this.scene.stop();
            this.scene.resume('WorldScene');
        });
    }
}