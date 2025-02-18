import Phaser from "phaser";

export default class ShooterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShooterScene' });
    }

    preload() {
        // Load assets if any
    }

    create() {
        this.add.text(100, 100, 'Shooter Scene', { fontSize: '32px', fill: '#fff' });
        // Add logic for rail shooter
    }
}