import Phaser from "phaser";

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.player = null;
        this.enemies = []; // Array to store multiple enemies
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
        // Secondary attack properties
        this.secondaryAttackKey = null;
        this.isSecondaryAttacking = false;
        this.secondaryAttackDuration = 2000;
        this.projectileSpeed = 400;
        this.projectileSize = 15;
        this.projectileCount = 0;
        this.maxProjectiles = 3;
        this.projectileCooldown = 500;
        this.projectileResetCooldown = 1000;
        this.canShootProjectile = true;
        this.projectiles = [];
        // Charging properties
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 1000; // 1 second to fully charge
        this.chargeBar = null;
        this.chargeBarBackground = null;
        this.chargeStartTime = 0;
        this.chargeThreshold = 150; // milliseconds to distinguish between tap and hold
        this.isKeyPressed = false; // Track if key is currently pressed
        // Charged projectile properties
        this.chargedProjectileSpeed = 600;
        this.chargedProjectileSize = 30;
        // Dash properties
        this.dashKey = null;
        this.isDashing = false;
        this.dashSpeed = 400;
        this.dashDuration = 200;
        this.dashCooldown = 100;
        this.canDash = true;
    }

    init(data) {
        console.log('[BattleScene] Initializing with data:', data);
        
        // Validate required data
        if (!data || !data.playerData || !data.npcDataArray) {
            console.error('[BattleScene] Missing required data:', data);
            return;
        }

        this.playerData = data.playerData;
        this.npcDataArray = data.npcDataArray;
        
        // Ensure npcDataArray is an array
        if (!Array.isArray(this.npcDataArray)) {
            console.error('[BattleScene] npcDataArray is not an array:', this.npcDataArray);
            this.npcDataArray = [this.npcDataArray];
        }

        // Store the world position the player came from
        this.worldPosition = {
            x: this.playerData.x,
            y: this.playerData.y
        };

        console.log('[BattleScene] Initialized with:', {
            playerData: this.playerData,
            npcDataArray: this.npcDataArray,
            worldPosition: this.worldPosition
        });
    }

    preload() {
        // Load battle-specific assets if needed
    }

    create() {
        console.log('[BattleScene] Creating scene');
        
        // Validate data before proceeding
        if (!this.playerData || !this.npcDataArray || this.npcDataArray.length === 0) {
            console.error('[BattleScene] Missing required data for scene creation');
            return;
        }

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
        this.physics.add.existing(this.ground, true); // true makes it static by default

        // Create player
        const playerX = this.cameras.main.width * 0.3; // Position player on the left side
        this.player = this.add.rectangle(
            playerX,
            groundY - 50,
            32,
            64,
            0x808080
        );
        this.physics.add.existing(this.player);
        this.player.body.setBounce(0.2);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(32, 64); // Set explicit collision size

        // Add collision between player and ground
        this.physics.add.collider(this.player, this.ground);

        // Initialize input keys
        this.escapeKey = this.input.keyboard.addKey('ESC');
        this.attackKey = this.input.keyboard.addKey('RIGHT_BRACKET');
        this.secondaryAttackKey = this.input.keyboard.addKey('LEFT_BRACKET');
        this.dashKey = this.input.keyboard.addKey('SHIFT');
        this.wasdKeys = this.input.keyboard.addKeys({
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D'
        });

        // Debug logging for attack key
        console.log('[BattleScene] Attack key initialized:', {
            key: this.attackKey,
            keyCode: this.attackKey.keyCode,
            isDown: this.attackKey.isDown
        });

        // Add key press listener for debugging
        this.input.keyboard.on('keydown', (event) => {
            console.log('[BattleScene] Key pressed:', event.key);
            if (event.key === ']') {
                console.log('[BattleScene] Right bracket detected!');
                this.attack();
            }
        });

        // Add key press listener for charging
        this.input.keyboard.on('keydown', (event) => {
            if (event.key === '[' && !this.isKeyPressed) {
                this.isKeyPressed = true;
                this.chargeStartTime = this.time.now;
                console.log('[BattleScene] Left bracket pressed, starting timer');
            }
        });

        // Add key release listener
        this.input.keyboard.on('keyup', (event) => {
            if (event.key === '[' && this.isKeyPressed) {
                this.isKeyPressed = false;
                const pressDuration = this.time.now - this.chargeStartTime;
                console.log('[BattleScene] Left bracket released, duration:', pressDuration);
                
                if (pressDuration < this.chargeThreshold) {
                    // This was a tap, fire regular projectile
                    this.secondaryAttack();
                } else if (this.isCharging) {
                    // This was a hold, release charge
                    this.releaseCharge();
                }
            }
        });

        // Create enemies using npcDataArray
        const totalEnemies = this.npcDataArray.length;
        const spacing = 100; // Space between enemies
        let startX = this.cameras.main.width * 0.7; // Start position for first enemy

        console.log('[BattleScene] Creating enemies:', {
            totalEnemies,
            spacing,
            startX,
            npcDataArray: this.npcDataArray
        });

        // Create enemies array if it doesn't exist
        this.enemies = [];

        this.npcDataArray.forEach((npcData, index) => {
            const enemyColor = npcData.color;
            // Position enemies based on their trigger radius
            const triggerRadius = npcData.triggerRadius || 100; // Default to 100 if not specified
            const enemyX = startX + (index * spacing) + triggerRadius; // Add trigger radius to initial position

            console.log(`[BattleScene] Creating enemy ${index + 1}:`, {
                type: npcData.type,
                triggerRadius,
                position: enemyX
            });

            // Create enemy rectangle
            const enemy = this.add.rectangle(
                enemyX,
                groundY - 50,
                32,
                64,
                enemyColor
            );

            // Add physics to enemy
            this.physics.add.existing(enemy);
            enemy.body.setBounce(0.2);
            enemy.body.setCollideWorldBounds(true);
            enemy.body.setSize(32, 64);

            // Store enemy data
            enemy.enemyData = {
                ...npcData,
                health: npcData.health || 100,
                maxHealth: npcData.health || 100
            };

            // Add collision between enemy and ground
            this.physics.add.collider(enemy, this.ground);

            // Add to enemies array
            this.enemies.push(enemy);
        });

        // Add collision between player and enemies
        this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);

        // Add collision between enemies and projectiles
        this.physics.add.collider(this.enemies, this.projectiles, this.handleProjectileEnemyCollision, null, this);

        // Add collision between enemies and attack sprite
        this.physics.add.collider(this.enemies, this.attackSprite, this.handleAttackEnemyCollision, null, this);

        // Create charge bar
        this.createChargeBar();

        // Set up camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Battle UI
        this.add.text(16, 16, 'Battle Scene', { fontSize: '32px', fill: '#fff' });
        
        // Player stats
        this.add.text(16, 60, `Player HP: ${this.playerData.health}`, { fontSize: '16px', fill: '#fff' });
        this.add.text(16, 80, `Level: ${this.playerData.level}`, { fontSize: '16px', fill: '#fff' });

        // Controls instruction text
        this.add.text(
            this.cameras.main.width / 2,
            16,
            'WASD to move, W to jump, ESC to escape, ] to attack, [ to secondary attack, SHIFT to dash',
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
    }

    returnToWorld() {
        if (this.isReturning) return;
        this.isReturning = true;
        console.log('Starting return to world process');
    
        // Reset the battle state and trigger cooldown
        if (this.npcDataArray) {
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
        if (!this.player || this.enemies.length === 0) return;

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

        // Handle charging
        if (this.isKeyPressed && !this.isCharging && this.canShootProjectile) {
            const pressDuration = this.time.now - this.chargeStartTime;
            if (pressDuration >= this.chargeThreshold) {
                this.startCharging();
            }
        }

        // Update charge bar if charging
        if (this.isCharging) {
            this.updateChargeBar();
        }

        // Check for secondary attack key press
        if (Phaser.Input.Keyboard.JustDown(this.secondaryAttackKey)) {
            console.log('[Update] Secondary attack key pressed');
            this.secondaryAttack();
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
                            this.player.x < this.enemies[0].x ? 1 : -1;
        
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

    attack() {
        if (this.isAttacking) {
            console.log('[Attack] Attack already in progress, ignoring');
            return;
        }
        
        console.log('[Attack] Starting new attack');
        this.isAttacking = true;

        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const attackOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create attack hitbox
        const attackX = this.player.x + attackOffset;
        const attackY = this.player.y;
        
        console.log('[Attack] Creating attack hitbox at:', { 
            x: attackX, 
            y: attackY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right',
            playerX: this.player.x,
            enemyX: closestEnemy.x
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

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(this.attackSprite, enemy, () => {
                console.log('[Attack] Hit detected on enemy!');
                
                // Apply knockback to enemy
                const knockbackForce = 200;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-150);
                }
                
                // Visual feedback - flash yellow briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xffff00);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                console.log('[Attack] Applied knockback to enemy:', {
                    force: knockbackForce,
                    direction: isPlayerRightOfEnemy ? 'left' : 'right'
                });
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
    }

    findClosestEnemy() {
        let closestEnemy = null;
        let closestDistance = Infinity;

        this.enemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                enemy.x,
                enemy.y
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
    }

    secondaryAttack() {
        if (!this.canShootProjectile) {
            console.log('[Secondary Attack] On cooldown, waiting...');
            return;
        }

        if (this.projectileCount >= this.maxProjectiles) {
            console.log('[Secondary Attack] Max projectiles reached, starting reset cooldown');
            this.canShootProjectile = false;
            this.time.delayedCall(this.projectileResetCooldown, () => {
                this.projectileCount = 0;
                this.canShootProjectile = true;
                console.log('[Secondary Attack] Projectile count reset, ready to shoot again');
            });
            return;
        }
        
        console.log('[Secondary Attack] Starting new projectile attack');
        this.isSecondaryAttacking = true;
        this.projectileCount++;

        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const projectileOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create projectile
        const projectileX = this.player.x + projectileOffset;
        const projectileY = this.player.y;
        
        console.log('[Secondary Attack] Creating projectile at:', { 
            x: projectileX, 
            y: projectileY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right',
            playerX: this.player.x,
            enemyX: closestEnemy.x,
            projectileCount: this.projectileCount
        });
        
        const projectile = this.add.rectangle(
            projectileX,
            projectileY,
            this.projectileSize,
            this.projectileSize,
            0xff0000
        );

        // Add physics to projectile
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        projectile.body.setBounce(0.1);
        projectile.body.setCollideWorldBounds(true);
        console.log('[Secondary Attack] Projectile physics initialized');

        // Set projectile velocity
        const direction = isPlayerRightOfEnemy ? -1 : 1;
        projectile.body.setVelocityX(this.projectileSpeed * direction);

        // Add to projectiles array
        this.projectiles.push(projectile);

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(projectile, enemy, () => {
                console.log('[Secondary Attack] Hit detected on enemy!');
                
                // Apply knockback to enemy
                const knockbackForce = 150;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-100);
                }
                
                // Visual feedback - flash yellow briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xffff00);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                // Remove projectile from array and destroy it
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();
            });
        });

        // Remove projectile after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            console.log('[Secondary Attack] Projectile duration expired, cleaning up');
            if (projectile && projectile.active) {
                // Remove projectile from array
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();
                console.log('[Secondary Attack] Projectile destroyed');
            }
        });

        // Start cooldown for next shot
        this.canShootProjectile = false;
        this.time.delayedCall(this.projectileCooldown, () => {
            this.canShootProjectile = true;
            console.log('[Secondary Attack] Ready for next shot');
        });
    }

    startCharging() {
        if (this.isCharging) return;
        
        this.isCharging = true;
        this.chargeTime = 0;
        console.log('[Secondary Attack] Started charging');
    }

    updateChargeBar() {
        this.chargeTime = Math.min(this.chargeTime + 16, this.maxChargeTime); // 16ms per frame
        const chargePercent = this.chargeTime / this.maxChargeTime;
        
        // Update charge bar width
        const barWidth = 100;
        this.chargeBar.width = barWidth * chargePercent;
        
        // Update charge bar color based on charge level
        if (chargePercent < 0.5) {
            this.chargeBar.setFillStyle(0x00ff00); // Green
        } else if (chargePercent < 0.8) {
            this.chargeBar.setFillStyle(0xffff00); // Yellow
        } else {
            this.chargeBar.setFillStyle(0xff0000); // Red
        }
    }

    releaseCharge() {
        if (!this.isCharging) return;
        
        const chargePercent = this.chargeTime / this.maxChargeTime;
        console.log('[Secondary Attack] Released charge:', chargePercent);
        
        if (chargePercent >= 0.8) { // Only shoot if charged at least 80%
            this.shootChargedProjectile();
        }
        
        this.isCharging = false;
        this.chargeTime = 0;
        this.chargeBar.width = 0;
    }

    shootChargedProjectile() {
        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const projectileOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create charged projectile
        const projectileX = this.player.x + projectileOffset;
        const projectileY = this.player.y;
        
        console.log('[Secondary Attack] Creating charged projectile at:', { 
            x: projectileX, 
            y: projectileY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right'
        });
        
        const projectile = this.add.rectangle(
            projectileX,
            projectileY,
            this.chargedProjectileSize,
            this.chargedProjectileSize,
            0xff00ff // Purple color for charged projectile
        );

        // Add physics to projectile
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        projectile.body.setBounce(0.1);
        projectile.body.setCollideWorldBounds(true);

        // Set projectile velocity
        const direction = isPlayerRightOfEnemy ? -1 : 1;
        projectile.body.setVelocityX(this.chargedProjectileSpeed * direction);

        // Add to projectiles array
        this.projectiles.push(projectile);

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(projectile, enemy, () => {
                console.log('[Secondary Attack] Charged hit detected on enemy!');
                
                // Apply stronger knockback to enemy
                const knockbackForce = 300;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-200);
                }
                
                // Visual feedback - flash purple briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xff00ff);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                // Remove projectile from array and destroy it
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();
            });
        });

        // Remove projectile after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            if (projectile && projectile.active) {
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();
            }
        });

        // Start cooldown
        this.canShootProjectile = false;
        this.time.delayedCall(this.projectileCooldown, () => {
            this.canShootProjectile = true;
        });
    }

    createChargeBar() {
        // Create charge bar background
        const barWidth = 100;
        const barHeight = 10;
        const barX = this.cameras.main.width / 2;
        const barY = 50;
        
        this.chargeBarBackground = this.add.rectangle(
            barX,
            barY,
            barWidth,
            barHeight,
            0x333333
        );
        
        this.chargeBar = this.add.rectangle(
            barX - barWidth/2,
            barY,
            0,
            barHeight,
            0x00ff00
        );
        this.chargeBar.setOrigin(0, 0.5);
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

        // Clean up all projectiles
        this.projectiles.forEach(projectile => {
            if (projectile && projectile.active) {
                projectile.destroy();
            }
        });
        this.projectiles = [];

        // Reset all references
        this.player = null;
        this.enemies = [];
        this.ground = null;
        this.escapeKey = null;
        this.wasdKeys = null;
        this.isReturning = false;
        this.projectileCount = 0;
        this.canShootProjectile = true;
        this.isKeyPressed = false;
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
        this.enemies = [];
        this.ground = null;
        this.escapeKey = null;
        this.wasdKeys = null;
        this.isReturning = false;
        
        // Call parent shutdown
        super.shutdown();
    }
}
