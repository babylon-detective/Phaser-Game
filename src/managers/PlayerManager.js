import Phaser from "phaser";

// Base class for shared functionality
class BaseControls {
    constructor(player, scene) {
        this.player = player;
        this.scene = scene;
    }

    // Shared methods
    resetVelocity() {
        this.player.body.setVelocity(0);
    }

    // Add more shared methods as needed
}

// World controls
class WorldControls extends BaseControls {
    constructor(player, scene) {
        super(player, scene);
        this.wasdKeys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    update() {
        this.resetVelocity();
        const speed = 160;

        if (this.wasdKeys.left.isDown) {
            this.player.body.setVelocityX(-speed);
        } else if (this.wasdKeys.right.isDown) {
            this.player.body.setVelocityX(speed);
        }

        if (this.wasdKeys.up.isDown) {
            this.player.body.setVelocityY(-speed);
        } else if (this.wasdKeys.down.isDown) {
            this.player.body.setVelocityY(speed);
        }
    }
}

// Battle controls
class BattleControls extends BaseControls {
    constructor(player, scene) {
        super(player, scene);
        this.wasdKeys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    update() {
        this.resetVelocity();
        const speed = 160;

        if (this.wasdKeys.left.isDown) {
            this.player.body.setVelocityX(-speed);
        } else if (this.wasdKeys.right.isDown) {
            this.player.body.setVelocityX(speed);
        }

        if (this.wasdKeys.up.isDown) {
            this.player.body.setVelocityY(-speed);
        }
    }
}

export default class PlayerManager {
    constructor(scene) {
        // We'll store a reference to the existing scene
        this.scene = scene;

        // We'll keep references to the player & camera box
        this.player = null;
        this.cameraBox = null;
        this.controls = null;
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

        // Initialize controls based on scene
        if (this.scene.scene.key === 'WorldScene') {
            this.controls = new WorldControls(this.player, this.scene);
        } else if (this.scene.scene.key === 'BattleScene') {
            this.controls = new BattleControls(this.player, this.scene);
        }
    }

    getPlayerData() {
        if (!this.player) return null;
        
        return {
            x: this.player.x,
            y: this.player.y,
            // Add any other player properties you want to pass to battle
            health: 100, // example property
            level: 1,    // example property
        };
    }

    update() {
        if (this.controls) {
            this.controls.update();
        }

        // Keep camera box centered on the player
        this.cameraBox.x = this.player.x;
        this.cameraBox.y = this.player.y;
    }
}
