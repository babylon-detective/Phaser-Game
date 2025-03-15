import Phaser from "phaser";

export default class PlayerManager {
    constructor(scene) {
        // We'll store a reference to the existing scene
        this.scene = scene;

        // We'll keep references to the player & camera box
        this.player = null;
        this.cameraBox = null;
        this.cursors = null;
    }

    create() {
        // Ensure physics is available on the passed-in scene
        if (!this.scene.physics) {
            console.error("Physics system is not available in the provided scene");
            return;
        }

        // Place the player in the center of the current camera's viewport
        const playerX = this.scene.cameras.main.width / 2;
        const playerY = this.scene.cameras.main.height / 2;

        // Create a simple rectangle to represent the player
        this.player = this.scene.add.rectangle(playerX, playerY, 32, 64, 0x808080);
        this.scene.physics.add.existing(this.player);

        if (!this.player.body) {
            console.error("Player physics body not created!");
            return;
        }

        // Configure player body physics
        this.player.body.setCollideWorldBounds(false); // or true if you prefer
        this.player.body.setBounce(0.2);

        // Create a cameraBox for smooth camera following
        this.cameraBox = this.scene.add.rectangle(playerX, playerY, 200, 200, 0xffffff, 100);
        this.scene.physics.add.existing(this.cameraBox, false);
        this.cameraBox.body.setAllowGravity(false);
        this.cameraBox.body.moves = false;

        // When the player overlaps this box, camera follows the box (which tracks player position)
        this.scene.physics.add.collider(this.player, this.cameraBox, () => {
            this.scene.cameras.main.startFollow(this.cameraBox, true, 0.1, 0.1);
        });

        // Let other code know the player has been created
        this.scene.events.emit('playerCreated', this.player);

        // Setup keyboard input for movement (WASD & arrow keys)
        this.cursors = this.scene.input.keyboard.addKeys({
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

        // Reset velocity each frame
        this.player.body.setVelocity(0);

        const speed = 160;

        // Horizontal movement
        if (this.cursors.left.isDown || this.cursors.arrowLeft.isDown) {
            this.player.body.setVelocityX(-speed);
        } else if (this.cursors.right.isDown || this.cursors.arrowRight.isDown) {
            this.player.body.setVelocityX(speed);
        }

        // Vertical movement
        if (this.cursors.up.isDown || this.cursors.arrowUp.isDown) {
            this.player.body.setVelocityY(-speed);
        } else if (this.cursors.down.isDown || this.cursors.arrowDown.isDown) {
            this.player.body.setVelocityY(speed);
        }

        // Keep camera box centered on the player
        this.cameraBox.x = this.player.x;
        this.cameraBox.y = this.player.y;
    }
}
