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
        this.attackDuration = 50;
        this.attackSprite = null;
        this.attackOffset = 150;
        this.attackWidth = 200;
        this.attackHeight = 40;
        // Secondary attack properties
        this.secondaryAttackKey = null;
        this.isSecondaryAttacking = false;
        this.secondaryAttackDuration = 1500;
        this.projectileSpeed = 600;
        this.projectileSize = 45;
        this.projectileCount = 0;
        this.maxProjectiles = 3;
        this.projectileCooldown = 300;
        this.projectileResetCooldown = 800;
        this.canShootProjectile = true;
        this.projectiles = [];
        // Charging properties
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 800;
        this.chargeBar = null;
        this.chargeBarBackground = null;
        this.chargeStartTime = 0;
        this.chargeThreshold = 100;
        this.isKeyPressed = false; // Track if key is currently pressed
        // Charged projectile properties
        this.chargedProjectileSpeed = 800;
        this.chargedProjectileSize = 90;
        // Dash properties
        this.dashKey = null;
        this.isDashing = false;
        this.dashSpeed = 600;
        this.dashDuration = 150;
        this.dashCooldown = 50;
        this.canDash = true;
        this.enemyHealthTexts = []; // Array to store health display texts
        this.enemyLevelTexts = []; // Array to store level display texts
        this.victoryText = null;
        this.isVictorySequence = false;
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
            groundY - 150,
            96,
            192,
            0x808080
        );
        this.physics.add.existing(this.player);
        this.player.body.setBounce(0.2);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(96, 192);

        // Add collision between player and ground
        this.physics.add.collider(this.player, this.ground);

        // Clear any existing input listeners first
        this.input.keyboard.removeAllKeys(true);
        this.input.keyboard.removeAllListeners();

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

        // Add key press listeners with proper cleanup references
        this.attackListener = (event) => {
            if (event.key === ']') {
                console.log('[BattleScene] Right bracket detected!');
                this.attack();
            }
        };
        this.input.keyboard.on('keydown', this.attackListener);

        this.chargeStartListener = (event) => {
            if (event.key === '[' && !this.isKeyPressed) {
                this.isKeyPressed = true;
                this.chargeStartTime = this.time.now;
                console.log('[BattleScene] Left bracket pressed, starting timer');
            }
        };
        this.input.keyboard.on('keydown', this.chargeStartListener);

        this.chargeEndListener = (event) => {
            if (event.key === '[' && this.isKeyPressed) {
                this.isKeyPressed = false;
                const pressDuration = this.time.now - this.chargeStartTime;
                console.log('[BattleScene] Left bracket released, duration:', pressDuration);
                
                if (pressDuration < this.chargeThreshold) {
                    this.secondaryAttack();
                } else if (this.isCharging) {
                    this.releaseCharge();
                }
            }
        };
        this.input.keyboard.on('keyup', this.chargeEndListener);

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
                groundY - 150,
                96,
                192,
                enemyColor
            );

            // Add physics to enemy
            this.physics.add.existing(enemy);
            enemy.body.setBounce(0.2);
            enemy.body.setCollideWorldBounds(true);
            enemy.body.setSize(96, 192);

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

            // Calculate position for the text (centered above each enemy)
            const textX = enemy.x;
            const textY = enemy.y - enemy.height/2 - 30; // 30 pixels above the enemy

            // Create health text
            const healthText = this.add.text(
                textX,
                textY,
                `HP: ${enemy.enemyData.health}/${enemy.enemyData.maxHealth}`,
                {
                    fontSize: '16px',
                    fill: '#ff0000',
                    backgroundColor: '#000000',
                    padding: { x: 4, y: 2 }
                }
            ).setOrigin(0.5); // Center align the text

            // Create level text
            const levelText = this.add.text(
                textX,
                textY - 20, // 20 pixels above health text
                `Lvl ${enemy.enemyData.level}`,
                {
                    fontSize: '14px',
                    fill: '#ffff00',
                    backgroundColor: '#000000',
                    padding: { x: 4, y: 2 }
                }
            ).setOrigin(0.5);

            // Store references to the texts
            this.enemyHealthTexts.push(healthText);
            this.enemyLevelTexts.push(levelText);
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
        
        // Stop this scene completely
        this.scene.stop('BattleScene');
        
        // Start WorldScene fresh
        this.scene.start('WorldScene', { 
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
                this.player.body.setVelocityX(-300);
            } else if (this.wasdKeys.right.isDown) {
                this.player.body.setVelocityX(300);
            } else {
                this.player.body.setVelocityX(0);
            }
        }

        // Player jump with W
        if (this.wasdKeys.up.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-450);
        }

        // Update enemy health and level displays
        this.updateEnemyDisplays();
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
                const knockbackForce = 300;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-200);
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

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
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
                
                // Remove projectile from array and destroy it
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Secondary Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
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
                const knockbackForce = 400;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-250);
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

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Secondary Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
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

    updateEnemyDisplays() {
        // Add null check at the start
        if (!this.enemies || !this.enemyHealthTexts || !this.enemyLevelTexts) {
            return;
        }

        this.enemies.forEach((enemy, index) => {
            // Check if enemy and texts exist before updating
            if (enemy && enemy.active && 
                this.enemyHealthTexts[index] && this.enemyHealthTexts[index].active &&
                this.enemyLevelTexts[index] && this.enemyLevelTexts[index].active) {
                
                const healthText = this.enemyHealthTexts[index];
                const levelText = this.enemyLevelTexts[index];
                
                // Update health text position and content
                healthText.setPosition(enemy.x, enemy.y - enemy.height/2 - 30);
                healthText.setText(`HP: ${enemy.enemyData.health}/${enemy.enemyData.maxHealth}`);
                
                // Update health text color based on health percentage
                const healthPercentage = enemy.enemyData.health / enemy.enemyData.maxHealth;
                let healthColor = '#ff0000'; // Red
                if (healthPercentage > 0.6) {
                    healthColor = '#00ff00'; // Green
                } else if (healthPercentage > 0.3) {
                    healthColor = '#ffff00'; // Yellow
                }
                healthText.setColor(healthColor);

                // Update level text position
                levelText.setPosition(enemy.x, enemy.y - enemy.height/2 - 50);
            }
        });
    }

    cleanup() {
        console.log('[BattleScene] Running cleanup');
        
        // Clear all game objects first
        if (this.enemies) {
            this.enemies.forEach(enemy => {
                if (enemy && enemy.active) {
                    enemy.destroy();
                }
            });
            this.enemies = [];
        }

        // Clear all text displays
        if (this.enemyHealthTexts) {
            this.enemyHealthTexts.forEach(text => {
                if (text && text.active) {
                    text.destroy();
                }
            });
            this.enemyHealthTexts = [];
        }

        if (this.enemyLevelTexts) {
            this.enemyLevelTexts.forEach(text => {
                if (text && text.active) {
                    text.destroy();
                }
            });
            this.enemyLevelTexts = [];
        }

        // Remove specific key listeners
        if (this.attackListener) {
            this.input.keyboard.off('keydown', this.attackListener);
        }
        if (this.chargeStartListener) {
            this.input.keyboard.off('keydown', this.chargeStartListener);
        }
        if (this.chargeEndListener) {
            this.input.keyboard.off('keyup', this.chargeEndListener);
        }

        // Remove all keys
        if (this.escapeKey) {
            this.escapeKey.destroy();
        }
        if (this.attackKey) {
            this.attackKey.destroy();
        }
        if (this.secondaryAttackKey) {
            this.secondaryAttackKey.destroy();
        }
        if (this.dashKey) {
            this.dashKey.destroy();
        }
        if (this.wasdKeys) {
            Object.values(this.wasdKeys).forEach(key => {
                if (key) key.destroy();
            });
        }

        // Reset input flags
        this.isKeyPressed = false;
        this.isCharging = false;
        this.isAttacking = false;
        this.isDashing = false;
        this.canDash = true;
        this.canShootProjectile = true;

        // Existing cleanup code
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

        // Clean up health and level texts
        this.enemyHealthTexts.forEach(text => text.destroy());
        this.enemyLevelTexts.forEach(text => text.destroy());
        this.enemyHealthTexts = [];
        this.enemyLevelTexts = [];

        if (this.victoryText) {
            this.victoryText.destroy();
            this.victoryText = null;
        }

        // Reset all references
        this.player = null;
        this.enemies = [];
        this.ground = null;
        this.escapeKey = null;
        this.wasdKeys = null;
        this.attackKey = null;
        this.secondaryAttackKey = null;
        this.dashKey = null;
        this.isReturning = false;
        this.projectileCount = 0;
        this.isVictorySequence = false;

        // Clear any ongoing timers or tweens
        this.time.removeAllEvents();
        this.tweens.killAll();
    }

    shutdown() {
        this.cleanup();
        
        // Remove all keyboard listeners
        this.input.keyboard.removeAllKeys(true);
        this.input.keyboard.removeAllListeners();
        
        // Call parent shutdown
        super.shutdown();
    }

    handleEnemyDefeat(enemy) {
        console.log('[BattleScene] Handling enemy defeat:', enemy.enemyData.id);
        
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            // Remove displays
            if (this.enemyHealthTexts[index]) {
                this.enemyHealthTexts[index].destroy();
                this.enemyHealthTexts.splice(index, 1);
            }
            if (this.enemyLevelTexts[index]) {
                this.enemyLevelTexts[index].destroy();
                this.enemyLevelTexts.splice(index, 1);
            }
        }
        
        // Remove enemy
        enemy.destroy();
        this.enemies = this.enemies.filter(e => e !== enemy);

        // Log remaining enemies
        console.log('[BattleScene] Remaining enemies:', this.enemies.length);

        // Check if all enemies are defeated
        if (this.enemies.length === 0) {
            console.log('[BattleScene] All enemies defeated, triggering victory sequence');
            this.showVictorySequence();
        }
    }

    showVictorySequence() {
        console.log('[BattleScene] Starting victory sequence');
        
        if (this.isVictorySequence) {
            console.log('[BattleScene] Victory sequence already in progress');
            return;
        }
        
        this.isVictorySequence = true;

        // Disable all input during victory sequence
        this.input.keyboard.enabled = false;

        // Store defeated NPCs' IDs
        const defeatedNpcIds = this.npcDataArray.map(npc => npc.id);
        console.log('[BattleScene] Defeated NPC IDs:', defeatedNpcIds);

        // Center camera on player
        this.cameras.main.stopFollow();
        this.cameras.main.pan(
            this.player.x,
            this.player.y,
            1000,
            'Power2'
        );

        // Create victory text
        this.victoryText = this.add.text(
            this.cameras.main.worldView.centerX,
            this.cameras.main.worldView.centerY - 50,
            'VICTORY!',
            {
                fontSize: '64px',
                fontStyle: 'bold',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 6,
                shadow: { blur: 10, color: '#ff0000', fill: true }
            }
        ).setOrigin(0.5);

        // Add scale animation to victory text
        this.tweens.add({
            targets: this.victoryText,
            scaleX: [0, 1.2, 1],
            scaleY: [0, 1.2, 1],
            duration: 1000,
            ease: 'Back.out'
        });

        // Return to world after delay
        this.time.delayedCall(2000, () => {
            console.log('[BattleScene] Victory sequence complete, returning to world');
            
            // Stop this scene completely
            this.scene.stop('BattleScene');
            
            // Start WorldScene fresh with victory data
            this.scene.start('WorldScene', { 
                returnPosition: this.worldPosition,
                resumeFromBattle: true,
                battleVictory: true,
                defeatedNpcIds: defeatedNpcIds
            });
        });
    }
}
