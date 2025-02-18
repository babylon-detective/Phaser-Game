import Phaser from "phaser";

export default class PlayerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayerScene' });
    }

    create() {
        if (!this.physics) {
            console.error("Physics system is not available in PlayerScene");
            return;
        }

        const playerX = this.cameras.main.width / 2;
        const playerY = this.cameras.main.height / 2;

        this.player = this.add.rectangle(playerX, playerY, 32, 64, 0x808080);
        this.physics.add.existing(this.player);

        if (!this.player.body) {
            console.error("Player physics body not created!");
            return;
        }

        this.player.body.setCollideWorldBounds(false);
        this.player.body.setBounce(0.2);

        this.cameraBox = this.add.rectangle(playerX, playerY, 200, 200, 0xffffff, 100);
        this.physics.add.existing(this.cameraBox, false);

        this.cameraBox.body.setAllowGravity(false);
        this.cameraBox.body.moves = false;

        this.physics.add.collider(this.player, this.cameraBox, () => {
            this.cameras.main.startFollow(this.cameraBox, true, 0.1, 0.1);
        });

        this.events.emit('playerCreated', this.player);

        this.cursors = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            arrowUp: Phaser.Input.Keyboard.KeyCodes.UP,
            arrowDown: Phaser.Input.Keyboard.KeyCodes.DOWN,
            arrowLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
            arrowRight: Phaser.Input.Keyboard.KeyCodes.RIGHT
        });
    }

    update() {
        if (!this.player || !this.player.body) return;

        this.player.body.setVelocity(0);

        const speed = 160;
        if (this.cursors.left.isDown || this.cursors.arrowLeft.isDown) {
            this.player.body.setVelocityX(-speed);
        } else if (this.cursors.right.isDown || this.cursors.arrowRight.isDown) {
            this.player.body.setVelocityX(speed);
        }

        if (this.cursors.up.isDown || this.cursors.arrowUp.isDown) {
            this.player.body.setVelocityY(-speed);
        } else if (this.cursors.down.isDown || this.cursors.arrowDown.isDown) {
            this.player.body.setVelocityY(speed);
        }

        this.cameraBox.x = this.player.x;
        this.cameraBox.y = this.player.y;
    }
}
