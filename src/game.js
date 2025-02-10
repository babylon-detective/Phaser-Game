import Phaser from "phaser";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
}

function create() {
    this.add.image(400, 300, 'sky');
}

function update() {}
