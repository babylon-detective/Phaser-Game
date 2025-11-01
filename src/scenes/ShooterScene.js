import Phaser from "phaser";
import { gameStateManager } from "../managers/GameStateManager.js";

export default class ShooterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShooterScene' });
        
        // Rail shooter properties
        this.scrollSpeed = 3;
        this.playerShip = null;
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        
        // Time limit
        this.timeLimit = 60000; // 60 seconds
        this.startTime = 0;
        this.timeText = null;
        
        // Score
        this.score = 0;
        this.scoreText = null;
        
        // Enemy spawn
        this.lastEnemySpawn = 0;
        this.enemySpawnInterval = 1500; // 1.5 seconds
    }

    init(data) {
        console.log('[ShooterScene] Initializing with data:', data);
        this.returnPosition = data?.returnPosition || { x: 400, y: 300 };
    }

    create() {
        console.log('[ShooterScene] Creating rail shooter scene');
        
        // Start timer
        this.startTime = this.time.now;
        
        // Set up camera
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create Mac System 7 style pseudo-3D ground with track
        this.createWaterGround(height * 0.6);
        
        // Create player ship
        this.createPlayerShip(width, height);
        
        // Set up input
        this.setupInput();
        
        // Create HUD
        this.createHUD(width, height);
        
        console.log('[ShooterScene] Rail shooter initialized');
    }
    
    createWaterGround(groundY) {
        console.log('[ShooterScene] Creating Mac System 7 style pseudo-3D ground with track');
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create graphics object for the ground
        this.groundGraphics = this.add.graphics();
        this.groundGraphics.setDepth(-10); // Behind everything
        
        // M7 style colors (matching the example)
        const horizonY = Math.floor(height * 0.65); // Horizon at 65% from top
        
        // Store configuration for rendering
        this.groundConfig = {
            horizonY,
            width,
            height,
            // Colors from M7 example
            GROUND_COLOR_NEAR: 0x00FF00,  // Bright green near
            GROUND_COLOR_FAR: 0x003300,   // Dark green far
            TRACK_COLOR: 0x333333,        // Dark gray track
            TRACK_BORDER_COLOR: 0xFFFFFF, // White borders
            TRACK_CENTER_COLOR: 0xFFFFFF, // White center line
            TRACK_WIDTH: 200,
            TRACK_BORDER_WIDTH: 20,
            TRACK_CENTER_LINE_WIDTH: 4,
            TRACK_PATTERN_LENGTH: 100,
            SCANLINE_SPACING: 2,
            baseScale: 16,
            cameraHeight: 200,
            PERSPECTIVE_SCALE: 0.5,
            GRADIENT_INTENSITY: 1.5
        };
        
        // Position for scrolling effect
        this.scrollOffset = 0;
        this.position = { x: 0, y: 0, z: 0 };
        
        console.log('[ShooterScene] M7-style ground with track created');
    }
    
    updateGround(time) {
        if (!this.groundGraphics || !this.groundConfig) return;
        
        const config = this.groundConfig;
        const { horizonY, width, height } = config;
        
        // Update scroll offset for forward movement
        this.scrollOffset = (this.scrollOffset + 2) % 100;
        
        // Clear and redraw
        this.groundGraphics.clear();
        
        // Draw sky
        this.groundGraphics.fillStyle(0x87CEEB); // Light blue sky
        this.groundGraphics.fillRect(0, 0, width, horizonY);
        
        // Draw horizon line
        this.groundGraphics.lineStyle(2, 0xFF0000);
        this.groundGraphics.beginPath();
        this.groundGraphics.moveTo(0, horizonY);
        this.groundGraphics.lineTo(width, horizonY);
        this.groundGraphics.strokePath();
        
        // Draw ground using scanlines (M7 style)
        for (let screenY = Math.floor(horizonY); screenY < height; screenY += config.SCANLINE_SPACING) {
            const distanceFromHorizon = screenY - horizonY;
            if (distanceFromHorizon <= 0) continue;
            
            // Calculate perspective
            const z = (distanceFromHorizon * config.baseScale) + this.position.z;
            const scaleLine = config.cameraHeight / distanceFromHorizon * config.PERSPECTIVE_SCALE;
            
            // Draw scanline
            for (let screenX = 0; screenX < width; screenX += config.SCANLINE_SPACING) {
                // Calculate world position
                let worldX = (screenX - width / 2) * scaleLine;
                let worldY = z;
                
                let finalX = worldX - this.position.x;
                let finalY = worldY - this.position.y;
                
                const adjustedY = finalY + this.scrollOffset;
                
                // Calculate distance from track center
                const distanceFromCenter = Math.abs(finalX);
                
                // Determine if pixel is on track
                const isOnTrack = distanceFromCenter < config.TRACK_WIDTH / 2;
                const isOnBorder = distanceFromCenter >= (config.TRACK_WIDTH / 2 - config.TRACK_BORDER_WIDTH) && 
                                 distanceFromCenter <= config.TRACK_WIDTH / 2;
                const isOnCenterLine = Math.abs(distanceFromCenter) < config.TRACK_CENTER_LINE_WIDTH / 2;
                
                // Calculate dashed center line pattern
                const dashPattern = Math.floor(adjustedY / config.TRACK_PATTERN_LENGTH) % 2 === 0;
                
                // Set color
                if (isOnBorder) {
                    this.groundGraphics.fillStyle(config.TRACK_BORDER_COLOR);
                } else if (isOnCenterLine && dashPattern) {
                    this.groundGraphics.fillStyle(config.TRACK_CENTER_COLOR);
                } else if (isOnTrack) {
                    this.groundGraphics.fillStyle(config.TRACK_COLOR);
                } else {
                    // Green gradient for off-track areas
                    const gradientProgress = Math.min(1, distanceFromHorizon / (height - horizonY) * config.GRADIENT_INTENSITY);
                    
                    const r = Math.floor(((config.GROUND_COLOR_NEAR >> 16) & 0xFF) * (1 - gradientProgress) + 
                                        ((config.GROUND_COLOR_FAR >> 16) & 0xFF) * gradientProgress);
                    const g = Math.floor(((config.GROUND_COLOR_NEAR >> 8) & 0xFF) * (1 - gradientProgress) + 
                                        ((config.GROUND_COLOR_FAR >> 8) & 0xFF) * gradientProgress);
                    const b = Math.floor((config.GROUND_COLOR_NEAR & 0xFF) * (1 - gradientProgress) + 
                                        (config.GROUND_COLOR_FAR & 0xFF) * gradientProgress);
                    
                    const color = (r << 16) | (g << 8) | b;
                    this.groundGraphics.fillStyle(color);
                }
                
                this.groundGraphics.fillRect(screenX, screenY, config.SCANLINE_SPACING, config.SCANLINE_SPACING);
            }
        }
    }
    
    createPlayerShip(width, height) {
        console.log('[ShooterScene] Creating player ship');
        
        // Player ship (red triangle pointing up)
        const shipX = width / 2;
        const shipY = height - 150;
        
        this.playerShip = this.add.triangle(
            shipX,
            shipY,
            0, 40,    // Bottom left
            20, 0,    // Top
            40, 40,   // Bottom right
            0xFF0000
        );
        
        this.physics.add.existing(this.playerShip);
        this.playerShip.body.setCollideWorldBounds(true);
        this.playerShip.body.setSize(40, 40);
        this.playerShip.setDepth(100);
        
        // Player properties
        this.playerShip.health = 100;
        this.playerShip.maxHealth = 100;
        this.playerShip.moveSpeed = 400;
        
        // Shooting properties
        this.canShoot = true;
        this.shootCooldown = 200; // ms
        
        console.log('[ShooterScene] Player ship created');
    }
    
    setupInput() {
        // WASD movement
        this.wasdKeys = this.input.keyboard.addKeys({
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D'
        });
        
        // U key to shoot
        this.shootKey = this.input.keyboard.addKey('U');
        
        // ESC to exit early
        this.escapeKey = this.input.keyboard.addKey('ESC');
    }
    
    createHUD(width, height) {
        // Time remaining
        this.timeText = this.add.text(
            width / 2,
            20,
            'TIME: 60',
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5, 0).setDepth(200);
        
        // Score
        this.scoreText = this.add.text(
            20,
            20,
            'SCORE: 0',
            {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setDepth(200);
        
        // Health bar
        this.healthBarBg = this.add.rectangle(
            width - 120,
            20,
            100,
            15,
            0x333333
        ).setOrigin(0, 0).setDepth(200);
        
        this.healthBar = this.add.rectangle(
            width - 120,
            20,
            100,
            15,
            0x00FF00
        ).setOrigin(0, 0).setDepth(201);
        
        this.healthText = this.add.text(
            width - 70,
            27,
            'HP',
            {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(202);
    }
    
    update(time, delta) {
        if (!this.playerShip || !this.playerShip.active) return;
        
        // Update ground (M7 style with track)
        this.updateGround(time);
        
        // Handle player movement
        this.handlePlayerMovement();
        
        // Handle shooting
        this.handleShooting();
        
        // Update projectiles
        this.updateProjectiles();
        
        // Spawn enemies
        this.spawnEnemies(time);
        
        // Update enemies
        this.updateEnemies();
        
        // Update enemy projectiles
        this.updateEnemyProjectiles();
        
        // Check collisions
        this.checkCollisions();
        
        // Update HUD
        this.updateHUD(time);
        
        // Check time limit
        this.checkTimeLimit(time);
        
        // Check for escape
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            this.exitShooterScene();
        }
    }
    
    handlePlayerMovement() {
        if (!this.playerShip || !this.playerShip.body) return;
        
        const body = this.playerShip.body;
        
        // Reset velocity
        body.setVelocity(0, 0);
        
        // WASD movement
        if (this.wasdKeys.left.isDown) {
            body.setVelocityX(-this.playerShip.moveSpeed);
        } else if (this.wasdKeys.right.isDown) {
            body.setVelocityX(this.playerShip.moveSpeed);
        }
        
        if (this.wasdKeys.up.isDown) {
            body.setVelocityY(-this.playerShip.moveSpeed);
        } else if (this.wasdKeys.down.isDown) {
            body.setVelocityY(this.playerShip.moveSpeed);
        }
    }
    
    handleShooting() {
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && this.canShoot) {
            this.shootProjectile();
            this.canShoot = false;
            
            this.time.delayedCall(this.shootCooldown, () => {
                this.canShoot = true;
            });
        }
    }
    
    shootProjectile() {
        if (!this.playerShip) return;
        
        const projectile = this.add.rectangle(
            this.playerShip.x,
            this.playerShip.y - 30,
            8,
            20,
            0xFFFF00
        );
        
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        projectile.body.setVelocityY(-600);
        projectile.setDepth(50);
        
        this.projectiles.push(projectile);
    }
    
    updateProjectiles() {
        this.projectiles = this.projectiles.filter(projectile => {
            if (!projectile.active || projectile.y < -50) {
                projectile.destroy();
                return false;
            }
            return true;
        });
    }
    
    spawnEnemies(time) {
        if (time - this.lastEnemySpawn > this.enemySpawnInterval) {
            this.lastEnemySpawn = time;
            
            const width = this.cameras.main.width;
            const enemyX = Phaser.Math.Between(50, width - 50);
            
            // Create enemy (red square)
            const enemy = this.add.rectangle(
                enemyX,
                -50,
                30,
                30,
                0xFF4444
            );
            
            this.physics.add.existing(enemy);
            enemy.body.setAllowGravity(false);
            enemy.body.setVelocityY(150 + Math.random() * 100);
            enemy.setDepth(50);
            
            enemy.health = 30;
            enemy.lastShot = 0;
            
            this.enemies.push(enemy);
        }
    }
    
    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            if (!enemy.active || enemy.y > this.cameras.main.height + 50) {
                enemy.destroy();
                return false;
            }
            
            // Enemy shooting
            const now = this.time.now;
            if (now - enemy.lastShot > 2000) {
                enemy.lastShot = now;
                this.enemyShoot(enemy);
            }
            
            return true;
        });
    }
    
    enemyShoot(enemy) {
        if (!this.playerShip) return;
        
        const projectile = this.add.rectangle(
            enemy.x,
            enemy.y + 20,
            6,
            15,
            0xFF0000
        );
        
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        
        // Aim at player
        const angle = Phaser.Math.Angle.Between(
            enemy.x, enemy.y,
            this.playerShip.x, this.playerShip.y
        );
        
        const speed = 300;
        projectile.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
        projectile.setDepth(50);
        
        this.enemyProjectiles.push(projectile);
    }
    
    updateEnemyProjectiles() {
        this.enemyProjectiles = this.enemyProjectiles.filter(projectile => {
            const height = this.cameras.main.height;
            const width = this.cameras.main.width;
            
            if (!projectile.active || 
                projectile.y < -50 || projectile.y > height + 50 ||
                projectile.x < -50 || projectile.x > width + 50) {
                projectile.destroy();
                return false;
            }
            return true;
        });
    }
    
    checkCollisions() {
        // Player projectiles vs enemies
        this.projectiles.forEach(projectile => {
            this.enemies.forEach(enemy => {
                if (this.physics.overlap(projectile, enemy)) {
                    enemy.health -= 10;
                    projectile.destroy();
                    this.projectiles = this.projectiles.filter(p => p !== projectile);
                    
                    if (enemy.health <= 0) {
                        enemy.destroy();
                        this.enemies = this.enemies.filter(e => e !== enemy);
                        this.score += 100;
                    }
                }
            });
        });
        
        // Enemy projectiles vs player
        this.enemyProjectiles.forEach(projectile => {
            if (this.playerShip && this.physics.overlap(projectile, this.playerShip)) {
                this.playerShip.health -= 10;
                projectile.destroy();
                this.enemyProjectiles = this.enemyProjectiles.filter(p => p !== projectile);
                
                // Flash player red
                this.playerShip.setFillStyle(0xFFFFFF);
                this.time.delayedCall(100, () => {
                    if (this.playerShip) {
                        this.playerShip.setFillStyle(0xFF0000);
                    }
                });
                
                if (this.playerShip.health <= 0) {
                    this.handlePlayerDefeat();
                }
            }
        });
    }
    
    updateHUD(time) {
        // Update time
        const elapsed = time - this.startTime;
        const remaining = Math.max(0, Math.ceil((this.timeLimit - elapsed) / 1000));
        this.timeText.setText(`TIME: ${remaining}`);
        
        // Update score
        this.scoreText.setText(`SCORE: ${this.score}`);
        
        // Update health bar
        if (this.playerShip) {
            const healthPercent = this.playerShip.health / this.playerShip.maxHealth;
            this.healthBar.width = 100 * healthPercent;
            
            // Change color based on health
            if (healthPercent > 0.5) {
                this.healthBar.setFillStyle(0x00FF00);
            } else if (healthPercent > 0.25) {
                this.healthBar.setFillStyle(0xFFFF00);
            } else {
                this.healthBar.setFillStyle(0xFF0000);
            }
        }
    }
    
    checkTimeLimit(time) {
        const elapsed = time - this.startTime;
        
        if (elapsed >= this.timeLimit) {
            this.handleSuccess();
        }
    }
    
    handleSuccess() {
        console.log('[ShooterScene] Mission complete!');
        
        // Show success message
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        const successText = this.add.text(
            centerX,
            centerY,
            `MISSION COMPLETE!\nSCORE: ${this.score}`,
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                color: '#00FF00',
                stroke: '#000000',
                strokeThickness: 6,
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(300);
        
        // Return after delay
        this.time.delayedCall(3000, () => {
            this.exitShooterScene();
        });
    }
    
    handlePlayerDefeat() {
        console.log('[ShooterScene] Player defeated');
        
        if (this.playerShip) {
            this.playerShip.destroy();
            this.playerShip = null;
        }
        
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        const defeatText = this.add.text(
            centerX,
            centerY,
            'DEFEATED!',
            {
                fontSize: '64px',
                fontFamily: 'Arial',
                color: '#FF0000',
                stroke: '#000000',
                strokeThickness: 8
            }
        ).setOrigin(0.5).setDepth(300);
        
        // Return after delay
        this.time.delayedCall(3000, () => {
            this.exitShooterScene();
        });
    }
    
    exitShooterScene() {
        console.log('[ShooterScene] Exiting to WorldScene');
        
        // Clean up
        this.enemies.forEach(e => e.destroy());
        this.projectiles.forEach(p => p.destroy());
        this.enemyProjectiles.forEach(p => p.destroy());
        
        // Return to WorldScene
        this.scene.stop();
        this.scene.resume('WorldScene', {
            returnPosition: this.returnPosition
        });
    }
}