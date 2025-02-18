import Phaser from "phaser";

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
    }

    preload() {
        // Load assets if any
    }

    create() {
        this.add.text(100, 100, 'Battle Scene', { fontSize: '32px', fill: '#fff' });
        // Add logic for battle system
    }
}