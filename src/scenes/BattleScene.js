import Phaser from "phaser";

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.player = null;
        this.enemy = null;
        this.ground = null;
        this.escapeKey = null;
        this.wasdKeys = null;
        this.isReturning = false;
    }

    init(data) {
        this.playerData = data.playerData;
        this.npcData = data.npcData;
        // Store the world position the player came from
        this.worldPosition = {
            x: this.playerData.x,
            y: this.playerData.y
        };
    }

    preload() {
        // Load battle-specific assets if needed
    }

    create() {
        // Set up background color to ensure WorldScene is hidden
        this.cameras.main.setBackgroundColor('#000000');
        
        // Set up world bounds and gravity
        this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);
        this.physics.world.gravity.y = 300;

        // Create ground platform (in the lower part of the screen)
        const groundY = this.cameras.main.height * 0.8;
        this.ground = this.add.rectangle(
            this.cameras.main.width / 2,
            groundY,
            this.cameras.main.width,
            10,
            0x00ff00
        );
        this.physics.add.existing(this.ground, true);

        // Create player (left side)
        this.player = this.add.rectangle(
            this.cameras.main.width * 0.2,
            groundY - 50,
            32,
            64,
            0x808080
        );
        this.physics.add.existing(this.player);
        this.player.body.setBounce(0.2);
        this.player.body.setCollideWorldBounds(true);

        // Create enemy (right side)
        this.enemy = this.add.rectangle(
            this.cameras.main.width * 0.8,
            groundY - 50,
            32,
            64,
            0xff0000
        );
        this.physics.add.existing(this.enemy);
        this.enemy.body.setBounce(0.2);
        this.enemy.body.setCollideWorldBounds(true);

        // Add collisions
        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.enemy, this.ground);
        this.physics.add.collider(this.player, this.enemy);

        // Battle UI
        this.add.text(16, 16, 'Battle Scene', { fontSize: '32px', fill: '#fff' });
        
        // Player stats
        this.add.text(16, 60, `Player HP: ${this.playerData.health}`, { fontSize: '16px', fill: '#fff' });
        this.add.text(16, 80, `Level: ${this.playerData.level}`, { fontSize: '16px', fill: '#fff' });
        
        // Enemy stats
        this.add.text(this.cameras.main.width - 150, 60, `Enemy HP: ${this.npcData.health}`, { fontSize: '16px', fill: '#fff' });
        this.add.text(this.cameras.main.width - 150, 80, `Level: ${this.npcData.level}`, { fontSize: '16px', fill: '#fff' });

        // Controls instruction text
        this.add.text(
            this.cameras.main.width / 2,
            16,
            'WASD to move, W to jump, DELETE to escape',
            { fontSize: '16px', fill: '#fff' }
        ).setOrigin(0.5, 0);

        // Return button (top right)
        const returnButton = this.add.text(
            this.cameras.main.width - 150, 
            16, 
            'Return to World', 
            { fontSize: '16px', fill: '#fff' }
        )
        .setInteractive()
        .on('pointerdown', () => {
            this.returnToWorld();
        });

        // Set up WASD keys
        this.wasdKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        
        // Set up escape key (ESC)
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    returnToWorld() {
        console.log('Attempting to return to WorldScene');
        // Prevent multiple calls
        if (this.isReturning) {
            console.log('Already returning, aborting.');
            return;
        }
        this.isReturning = true;

        console.log('Resetting NPC battle state');
        // Reset the battle state of the NPC first
        if (this.npcData) {
            const worldScene = this.scene.get('WorldScene');
            if (worldScene && worldScene.npcManager) {
                worldScene.npcManager.npcs.forEach(npc => {
                    if (npc.x === this.npcData.x && npc.y === this.npcData.y) {
                        npc.isInBattle = false;
                    }
                });
            }
        }

        console.log('Stopping input and physics');
        // Stop input and physics in BattleScene
        this.input.keyboard.enabled = false;
        this.input.mouse.enabled = false;
        this.physics.pause();

        console.log('Waking up WorldScene');
        // Wake up WorldScene with the return position
        this.scene.wake('WorldScene', { 
            returnPosition: this.worldPosition,
            resumeFromBattle: true  // Flag to indicate we're returning from battle
        });

        console.log('Making WorldScene active and visible');
        // Make WorldScene active and visible
        this.scene.setActive(true, 'WorldScene');
        this.scene.setVisible(true, 'WorldScene');
        this.scene.bringToTop('WorldScene');

        console.log('Scheduling cleanup and stop');
        // Delay cleanup and stop to ensure WorldScene is active
        this.time.delayedCall(100, () => {
            console.log('Cleaning up and stopping BattleScene');
            this.cleanup();
            this.scene.stop();
        });
    }

    update() {
        if (!this.player || !this.enemy) return;

        // Check for escape key
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            this.returnToWorld();
            return;
        }

        // Player movement with WASD
        if (this.wasdKeys.left.isDown) {
            this.player.body.setVelocityX(-160);
        } else if (this.wasdKeys.right.isDown) {
            this.player.body.setVelocityX(160);
        } else {
            this.player.body.setVelocityX(0);
        }

        // Player jump with W
        if (this.wasdKeys.up.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-300);
        }
    }

    cleanup() {
        // Disable input first
        if (this.input) {
            this.input.keyboard.enabled = false;
            this.input.mouse.enabled = false;
        }

        // Stop physics
        if (this.physics && this.physics.world) {
            this.physics.world.pause();
            this.physics.world.colliders.destroy();
        }

        // Destroy all game objects
        if (this.children) {
            this.children.list.slice().forEach(child => {
                if (child && child.destroy) {
                    child.destroy();
                }
            });
        }
        
        // Clear all events
        this.events.removeAllListeners();
        
        // Reset all references
        this.player = null;
        this.enemy = null;
        this.ground = null;
        this.escapeKey = null;
        this.wasdKeys = null;
        this.isReturning = false;
    }
}