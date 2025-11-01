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
        
        // Wave/parallax background layers
        this.waterLayers = [];
        
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
        
        // Create Mac System 7 style pseudo-3D water ground
        this.createWaterGround(height * 0.6);
        
        // Create parallax background (sky/horizon)
        this.createParallaxBackground();
        
        // Create player ship
        this.createPlayerShip(width, height);
        
        // Set up input
        this.setupInput();
        
        // Create HUD
        this.createHUD(width, height);
        
        console.log('[ShooterScene] Rail shooter initialized');
    }
    
    createWaterGround(groundY) {
        console.log('[ShooterScene] Creating Mac System 7 style pseudo-3D water');
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create graphics object for the water
        const water = this.add.graphics();
        water.setDepth(-10); // Behind everything
        
        // Mac System 7 style water colors (blues with wave pattern)
        const darkBlue = 0x1E90FF;
        const lightBlue = 0x87CEEB;
        const deepBlue = 0x0047AB;
        const horizonColor = 0x4682B4;
        
        // Define perspective parameters
        const horizonY = groundY - 100; // Horizon line
        const rows = 30; // More rows for smoother water
        const tilesPerRow = 24; // More tiles for better wave coverage
        
        // Store for animation
        this.waterGraphics = water;
        this.waterConfig = {
            horizonY,
            rows,
            tilesPerRow,
            width,
            height,
            darkBlue,
            lightBlue,
            deepBlue
        };
        
        // Initial draw
        this.updateWater(0);
        
        // Draw horizon line (water meets sky)
        water.lineStyle(3, horizonColor, 1);
        water.beginPath();
        water.moveTo(0, horizonY);
        water.lineTo(width, horizonY);
        water.strokePath();
        
        console.log('[ShooterScene] Pseudo-3D water created with wave animation');
    }
    
    updateWater(time) {
        if (!this.waterGraphics || !this.waterConfig) return;
        
        const { horizonY, rows, tilesPerRow, width, height, darkBlue, lightBlue, deepBlue } = this.waterConfig;
        
        // Clear and redraw water each frame for wave animation
        this.waterGraphics.clear();
        
        // Calculate wave offset for scrolling water effect
        const waveOffset = (time * 0.001) % 1;
        
        // Draw each row from horizon (far) to bottom (near)
        for (let row = 0; row < rows; row++) {
            // Calculate normalized depth (0 = horizon/far, 1 = near/bottom)
            const normalizedDepth = row / (rows - 1);
            
            // Use exponential curve for realistic depth
            const depthCurve = Math.pow(normalizedDepth, 1.5);
            
            // Calculate Y positions
            const currentY = horizonY + (height - horizonY) * depthCurve;
            const nextDepth = Math.min(1, (row + 1) / (rows - 1));
            const nextDepthCurve = Math.pow(nextDepth, 1.5);
            const nextY = horizonY + (height - horizonY) * nextDepthCurve;
            
            // Full width coverage
            const rowWidth = width;
            const tileWidth = rowWidth / tilesPerRow;
            
            // Draw each tile in this row
            for (let col = 0; col < tilesPerRow; col++) {
                // Wave pattern with scrolling effect
                const wavePhase = ((row + col + (waveOffset * tilesPerRow)) % 2) < 1;
                const isLight = wavePhase;
                const color = isLight ? lightBlue : darkBlue;
                
                // Darken tiles further away (depth fog)
                const depthFade = 0.3 + (normalizedDepth * 0.7);
                
                // Calculate tile positions
                const tileX = col * tileWidth;
                const nextTileX = col * tileWidth;
                
                // Draw water tile
                this.waterGraphics.fillStyle(color, depthFade);
                this.waterGraphics.beginPath();
                this.waterGraphics.moveTo(tileX, currentY);
                this.waterGraphics.lineTo(tileX + tileWidth, currentY);
                this.waterGraphics.lineTo(nextTileX + tileWidth, nextY);
                this.waterGraphics.lineTo(nextTileX, nextY);
                this.waterGraphics.closePath();
                this.waterGraphics.fillPath();
                
                // Add wave highlights (white caps on far tiles)
                if (normalizedDepth < 0.5 && isLight && Math.random() < 0.1) {
                    const lineAlpha = (0.5 - normalizedDepth) * 0.4;
                    this.waterGraphics.lineStyle(1, 0xFFFFFF, lineAlpha);
                    this.waterGraphics.strokePath();
                }
            }
        }
    }
    
    createParallaxBackground() {
        console.log('[ShooterScene] Creating parallax background layers');
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create sky gradient
        const sky = this.add.graphics();
        sky.setDepth(-20);
        
        // Gradient from light blue (top) to darker blue (horizon)
        const gradientSteps = 20;
        for (let i = 0; i < gradientSteps; i++) {
            const t = i / gradientSteps;
            const y = i * (height * 0.6) / gradientSteps;
            const nextY = (i + 1) * (height * 0.6) / gradientSteps;
            
            // Color interpolation from light to dark
            const r = Math.floor(135 + (30 - 135) * t);
            const g = Math.floor(206 + (144 - 206) * t);
            const b = Math.floor(235 + (255 - 235) * t);
            const color = (r << 16) | (g << 8) | b;
            
            sky.fillStyle(color, 1);
            sky.fillRect(0, y, width, nextY - y);
        }
        
        // Create distant clouds (slow parallax)
        for (let i = 0; i < 5; i++) {
            const cloudX = Math.random() * width;
            const cloudY = Math.random() * (height * 0.4);
            
            const cloud = this.add.ellipse(
                cloudX,
                cloudY,
                80 + Math.random() * 40,
                40 + Math.random() * 20,
                0xFFFFFF,
                0.4
            );
            cloud.setDepth(-15);
            
            // Store for parallax movement
            cloud.parallaxSpeed = 0.2;
            this.waterLayers.push(cloud);
        }
        
        console.log('[ShooterScene] Parallax background created');
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
        
        // Update water animation
        this.updateWater(time);
        
        // Update parallax background
        this.updateParallax(delta);
        
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
    
    updateParallax(delta) {
        // Move parallax layers
        this.waterLayers.forEach(layer => {
            layer.y += layer.parallaxSpeed * (delta / 16);
            
            // Wrap around
            if (layer.y > this.cameras.main.height) {
                layer.y = -50;
                layer.x = Math.random() * this.cameras.main.width;
            }
        });
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