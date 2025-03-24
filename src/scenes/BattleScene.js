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
        this.attackKey = null;
        this.isAttacking = false;
        this.attackDuration = 100;
        this.attackSprite = null;
        this.attackOffset = 40;
        this.attackWidth = 60;
        this.attackHeight = 10;
        // Dash properties
        this.dashKey = null;
        this.isDashing = false;
        this.dashSpeed = 400;
        this.dashDuration = 200; // milliseconds
        this.dashCooldown = 100; // 1 second cooldown
        this.canDash = true;
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
        this.physics.world.gravity.y = 600;

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

        // Determine initial distance based on triggerRadius
        const triggerRadius = this.npcData.triggerRadius;
        let baseDistance; // Use let to allow dynamic assignment

        // Set baseDistance based on NPC type
        switch (this.npcData.type) {
            case 'VILLAGER':
            case 'MERCHANT':
                baseDistance = 0.4; // Smallest distance for VILLAGER and MERCHANT
                break;
            case 'GUARD':
                baseDistance = 0.2; // Larger distance for GUARD
                break;
            default:
                baseDistance = 0.3; // Default distance for other types
                break;
        }

        // Calculate distanceFactor based on triggerRadius
        const distanceFactor = triggerRadius / 1000; // Adjust this factor as needed

        // Fine-tune the positions based on baseDistance and distanceFactor
        const playerXFactor = baseDistance - (distanceFactor * 0.5); // Adjust multiplier for finer control
        const enemyXFactor = 1 - baseDistance + (distanceFactor * 0.5); // Adjust multiplier for finer control

        // Create player
        this.player = this.add.rectangle(
            this.cameras.main.width * playerXFactor, // Adjusted position based on triggerRadius
            groundY - 50,
            32,
            64,
            0x808080
        );
        this.physics.add.existing(this.player);
        this.player.body.setBounce(0.2);
        this.player.body.setCollideWorldBounds(true);

        // Create enemy using npcData
        const enemyColor = this.npcData.color;

        this.enemy = this.add.rectangle(
            this.cameras.main.width * enemyXFactor, // Adjusted position based on triggerRadius
            groundY - 50,
            32,
            64,
            enemyColor
        );
        this.physics.add.existing(this.enemy);
        this.enemy.body.setBounce(0.1);
        this.enemy.body.setCollideWorldBounds(true);
        this.enemy.body.setDamping(true);
        this.enemy.body.setDrag(0.95);

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
            'WASD to move, W to jump, ESC to escape, ] to attack, SHIFT to dash',
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

        // Set up attack key with explicit key code
        this.attackKey = this.input.keyboard.addKey('RIGHT_BRACKET');
        console.log('[BattleScene] Attack key initialized:', {
            key: this.attackKey,
            keyCode: this.attackKey.keyCode,
            isDown: this.attackKey.isDown
        });

        // Set up dash key (Shift)
        this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        console.log('[BattleScene] Dash key initialized');

        // Add key press listener for debugging
        this.input.keyboard.on('keydown', (event) => {
            console.log('[BattleScene] Key pressed:', event.key);
            if (event.key === ']') {
                console.log('[BattleScene] Right bracket detected!');
                this.attack();
            }
        });

        // Attack method
        this.attack = () => {
            if (this.isAttacking) {
                console.log('[Attack] Attack already in progress, ignoring');
                return;
            }
            
            console.log('[Attack] Starting new attack');
            this.isAttacking = true;

            // Determine attack direction based on player position relative to enemy
            const isPlayerRightOfEnemy = this.player.x > this.enemy.x;
            const attackOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
            
            // Create attack hitbox
            const attackX = this.player.x + attackOffset;
            const attackY = this.player.y;
            
            console.log('[Attack] Creating attack hitbox at:', { 
                x: attackX, 
                y: attackY,
                direction: isPlayerRightOfEnemy ? 'left' : 'right',
                playerX: this.player.x,
                enemyX: this.enemy.x
            });
            
            this.attackSprite = this.add.rectangle(
                attackX,
                attackY,
                this.attackWidth,
                this.attackHeight,
                0xFFFFFF
            );

            // Add physics to attack
            this.physics.add.existing(this.attackSprite);
            this.attackSprite.body.setAllowGravity(false);
            this.attackSprite.body.setBounce(0.1);
            this.attackSprite.body.setCollideWorldBounds(true);
            console.log('[Attack] Attack hitbox physics initialized');

            // Add collision with enemy using overlap instead of collider
            this.physics.add.overlap(this.attackSprite, this.enemy, () => {
                console.log('[Attack] Hit detected on enemy!');
                
                // Apply knockback to enemy
                const knockbackForce = 200;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                this.enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (this.enemy.body.touching.down) {
                    this.enemy.body.setVelocityY(-150);
                }
                
                // Visual feedback - flash red briefly
                const originalColor = this.npcData.color; // Store the original color
                this.enemy.setFillStyle(0xffff00);
                this.time.delayedCall(100, () => {
                    this.enemy.setFillStyle(originalColor); // Reset to original color
                });
                
                console.log('[Attack] Applied knockback to enemy:', {
                    force: knockbackForce,
                    direction: isPlayerRightOfEnemy ? 'left' : 'right'
                });
            });

            // Remove attack after duration
            this.time.delayedCall(this.attackDuration, () => {
                console.log('[Attack] Attack duration expired, cleaning up');
                if (this.attackSprite) {
                    this.attackSprite.destroy();
                    this.attackSprite = null;
                    console.log('[Attack] Attack hitbox destroyed');
                }
                this.isAttacking = false;
                console.log('[Attack] Attack state reset');
            });
        };
        
        // Set up escape key (ESC)
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    returnToWorld() {
        if (this.isReturning) return;
        this.isReturning = true;
        console.log('Starting return to world process');
    
        // Reset the battle state and trigger cooldown
        if (this.npcData) {
            const worldScene = this.scene.get('WorldScene');
            if (worldScene && worldScene.npcManager) {
                console.log('Handling battle end in NPC manager');
                worldScene.npcManager.handleBattleEnd();
            }
        }
    
        // Clean up the battle scene
        this.cleanup();
    
        // Stop this scene first
        this.scene.stop();

        // Then resume WorldScene with return data
        this.scene.resume('WorldScene', { 
            returnPosition: this.worldPosition,
            resumeFromBattle: true
        });
    }

    update() {
        if (!this.player || !this.enemy) return;

        // Check for escape key
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            this.returnToWorld();
            return;
        }

        // Check for attack key press
        if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
            console.log('[Update] Attack key pressed');
            this.attack();
        }

        // Handle dash
        if (Phaser.Input.Keyboard.JustDown(this.dashKey) && this.canDash && !this.isDashing) {
            console.log('[Update] Dash initiated');
            this.dash();
        }

        // Player movement with WASD (only if not dashing)
        if (!this.isDashing) {
            if (this.wasdKeys.left.isDown) {
                this.player.body.setVelocityX(-160);
            } else if (this.wasdKeys.right.isDown) {
                this.player.body.setVelocityX(160);
            } else {
                this.player.body.setVelocityX(0);
            }
        }

        // Player jump with W
        if (this.wasdKeys.up.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-300);
        }
    }

    dash() {
        this.isDashing = true;
        this.canDash = false;
        
        // Determine dash direction based on last movement or facing direction
        const dashDirection = this.wasdKeys.left.isDown ? -1 : 
                            this.wasdKeys.right.isDown ? 1 : 
                            this.player.x < this.enemy.x ? 1 : -1;
        
        // Apply dash velocity
        this.player.body.setVelocityX(this.dashSpeed * dashDirection);
        
        // Visual feedback - make player slightly transparent during dash
        this.player.setAlpha(0.7);
        
        console.log('[Dash] Executing dash:', {
            direction: dashDirection,
            speed: this.dashSpeed
        });

        // Reset dash after duration
        this.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            this.player.setAlpha(1);
            this.player.body.setVelocityX(0);
            console.log('[Dash] Dash completed');
        });

        // Reset dash cooldown
        this.time.delayedCall(this.dashCooldown, () => {
            this.canDash = true;
            console.log('[Dash] Dash cooldown reset');
        });
    }

    cleanup() {
        // Disable input first
        if (this.input && !this.isReturning) {
            this.input.keyboard.enabled = false;
            this.input.mouse.enabled = false;
        }

        // Stop physics
        if (this.physics && this.physics.world) {
            this.physics.world.pause();
        }

        // Reset all references
        this.player = null;
        this.enemy = null;
        this.ground = null;
        this.escapeKey = null;
        this.wasdKeys = null;
        this.isReturning = false;
    }

    shutdown() {
        // Clear any remaining input listeners
        if (this.escapeKey) {
            this.escapeKey.removeAllListeners();
        }
        if (this.wasdKeys) {
            Object.values(this.wasdKeys).forEach(key => {
                if (key) key.removeAllListeners();
            });
        }
        
        // Reset all scene variables
        this.player = null;
        this.enemy = null;
        this.ground = null;
        this.escapeKey = null;
        this.wasdKeys = null;
        this.isReturning = false;
        
        // Call parent shutdown
        super.shutdown();
    }
}
