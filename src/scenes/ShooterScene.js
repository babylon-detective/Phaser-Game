import Phaser from "phaser";
import { gameStateManager } from "../managers/GameStateManager.js";

export default class ShooterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShooterScene' });
        
        // M7 style player system
        this.player = null;
        this.angle = 0;
        this.horizonTilt = 0;
        
        // Time limit
        this.timeLimit = 60000; // 60 seconds
        this.startTime = 0;
        this.timeText = null;
        
        // Score
        this.score = 0;
        this.scoreText = null;
    }

    init(data) {
        console.log('[ShooterScene] Initializing with data:', data);
        this.returnPosition = data?.returnPosition || { x: 400, y: 300 };
    }

    create() {
        console.log('[ShooterScene] Creating M7 style rail shooter scene');
        
        // Start timer
        this.startTime = this.time.now;
        
        // Set up camera
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create Mac System 7 style pseudo-3D ground with track
        this.createWaterGround(height * 0.6);
        
        // Create M7 style player (two rectangles)
        this.createM7Player(width, height);
        
        // Set up input
        this.setupInput();
        
        // Create HUD
        this.createHUD(width, height);
        
        console.log('[ShooterScene] M7 rail shooter initialized');
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
            GRADIENT_INTENSITY: 1.5,
            MAX_HORIZON_TILT: 0.3,
            HORIZON_VERTICAL_MARGIN: 200
        };
        
        // Position for scrolling effect
        this.scrollOffset = 0;
        this.position = { x: 0, y: 0, z: 0 };
        
        console.log('[ShooterScene] M7-style ground with track created');
    }
    
    createM7Player(width, height) {
        console.log('[ShooterScene] Creating M7-style player (two rectangles)');
        
        // Player object with M7 control system
        this.player = {
            // Main (larger) rectangle
            x: width / 2,
            y: height * 0.45,   // Position at 45% from top (above horizon)
            size: Math.min(width, height) * 0.15,
            angle: 0,
            speed: 0,
            maxSpeed: 64,
            moveSpeed: 64,
            acceleration: 4.0,
            deceleration: 1.6,
            worldX: 0,
            worldY: 0,
            
            // Leading (smaller) rectangle
            leader: {
                x: width / 2,
                y: height * 0.45,
                size: Math.min(width, height) * 0.06,
                maxDistance: 320,
                moveSpeed: 96
            }
        };
        
        console.log('[ShooterScene] M7 player created');
    }
    
    updateGround(time) {
        if (!this.groundGraphics || !this.groundConfig || !this.player) return;
        
        const config = this.groundConfig;
        const { horizonY, width, height } = config;
        
        // Update scroll offset for forward movement
        this.scrollOffset = (this.scrollOffset + 2) % 100;
        
        // Calculate vertical movement compensation (M7 style)
        const verticalMovement = (this.player.y - (height * 0.45)) / (height * 0.45);
        const horizonOffset = -verticalMovement * config.HORIZON_VERTICAL_MARGIN;
        const compensatedHorizon = horizonY + horizonOffset;
        
        // Update horizon tilt based on movement (M7 style)
        const targetTilt = (this.player.leader.x - this.player.x) / this.player.leader.maxDistance * -config.MAX_HORIZON_TILT;
        this.horizonTilt = Phaser.Math.Linear(this.horizonTilt, targetTilt, 0.2);
        
        // Calculate tilted horizon points
        const horizonPoints = [];
        for (let x = 0; x <= width; x += config.SCANLINE_SPACING) {
            const xProgress = (x - width / 2) / (width / 2);
            const y = compensatedHorizon + Math.sin(this.horizonTilt) * (width / 2) * xProgress;
            horizonPoints.push({ x, y });
        }
        
        // Clear and redraw
        this.groundGraphics.clear();
        
        // Draw tilted sky (M7 style)
        this.groundGraphics.fillStyle(0x87CEEB);
        this.groundGraphics.beginPath();
        this.groundGraphics.moveTo(0, 0);
        this.groundGraphics.lineTo(width, 0);
        this.groundGraphics.lineTo(width, horizonPoints[horizonPoints.length - 1].y);
        this.groundGraphics.lineTo(0, horizonPoints[0].y);
        this.groundGraphics.closePath();
        this.groundGraphics.fill();
        
        // Pre-calculate tilt factors
        const tiltAngle = this.horizonTilt;
        const cosTheta = Math.cos(tiltAngle);
        const sinTheta = Math.sin(tiltAngle);
        
        // Draw ground from tilted horizon using M7 algorithm
        for (let i = 0; i < horizonPoints.length - 1; i++) {
            const startX = horizonPoints[i].x;
            const endX = horizonPoints[i + 1].x;
            const startY = horizonPoints[i].y;
            
            for (let screenY = Math.floor(startY); screenY < height; screenY += config.SCANLINE_SPACING) {
                const distanceFromHorizon = screenY - startY;
                if (distanceFromHorizon <= 0) continue;
                
                // Calculate perspective
                const z = (distanceFromHorizon * config.baseScale) + this.position.z;
                const scaleLine = config.cameraHeight / distanceFromHorizon * config.PERSPECTIVE_SCALE;
                
                // Calculate tilt offset for this scanline
                const verticalProgress = (screenY - compensatedHorizon) / (height - compensatedHorizon);
                const xOffset = Math.sin(this.horizonTilt) * (width / 2) * verticalProgress;
                
                // Draw segment
                for (let screenX = startX; screenX < endX; screenX += config.SCANLINE_SPACING) {
                    const xProgress = (screenX - width / 2) / (width / 2);
                    
                    // Apply horizon tilt to world coordinates
                    let worldX = (screenX - width / 2 - xOffset * xProgress) * scaleLine;
                    let worldY = z;
                    
                    // Apply rotation and tilt transformation
                    let tiltedX = worldX * cosTheta - worldY * sinTheta;
                    let tiltedY = worldX * sinTheta + worldY * cosTheta;
                    
                    let rotatedX = tiltedX * Math.cos(this.angle) - tiltedY * Math.sin(this.angle);
                    let rotatedY = tiltedX * Math.sin(this.angle) + tiltedY * Math.cos(this.angle);
                    
                    let finalX = rotatedX - this.position.x;
                    let finalY = rotatedY - this.position.y;
                    
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
                        const gradientProgress = Math.min(1, distanceFromHorizon / (height - compensatedHorizon) * config.GRADIENT_INTENSITY);
                        
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
        
        // Draw tilted horizon line
        this.groundGraphics.lineStyle(2, 0xFF0000);
        this.groundGraphics.beginPath();
        this.groundGraphics.moveTo(0, horizonPoints[0].y);
        this.groundGraphics.lineTo(width, horizonPoints[horizonPoints.length - 1].y);
        this.groundGraphics.strokePath();
    }
    
    setupInput() {
        // WASD movement (M7 style)
        this.wasdKeys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });
        
        // ESC to exit early
        this.escapeKey = this.input.keyboard.addKey('ESC');
    }
    
    drawPlayer(graphics) {
        if (!this.player) return;
        
        // Draw leading (smaller) rectangle - Yellow
        graphics.lineStyle(2, 0xFFFF00);
        graphics.fillStyle(0xFFFF00, 0.7);
        graphics.fillRect(
            this.player.leader.x - this.player.leader.size/2,
            this.player.leader.y - this.player.leader.size/2,
            this.player.leader.size,
            this.player.leader.size
        );
        
        // Draw main (larger) rectangle - Red
        graphics.lineStyle(2, 0xFF0000);
        graphics.fillStyle(0xFF0000, 1.0);
        graphics.fillRect(
            this.player.x - this.player.size/2,
            this.player.y - this.player.size/2,
            this.player.size,
            this.player.size
        );
        
        // Draw line connecting the rectangles
        graphics.lineStyle(1, 0xFFFFFF, 0.5);
        graphics.beginPath();
        graphics.moveTo(this.player.x, this.player.y);
        graphics.lineTo(this.player.leader.x, this.player.leader.y);
        graphics.strokePath();
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
        
        // Instructions
        this.instructionText = this.add.text(
            20,
            20,
            'WASD: Move | ESC: Exit',
            {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setDepth(200);
    }
    
    update(time, delta) {
        if (!this.player) return;
        
        // Handle M7-style player input
        this.handlePlayerInput();
        
        // Update ground (M7 style with tilting horizon)
        this.updateGround(time);
        
        // Create new graphics for this frame
        if (!this.playerGraphics) {
            this.playerGraphics = this.add.graphics();
            this.playerGraphics.setDepth(1000);
        } else {
            this.playerGraphics.clear();
        }
        
        // Draw player (M7 style two rectangles)
        this.drawPlayer(this.playerGraphics);
        
        // Update HUD
        this.updateHUD(time);
        
        // Check time limit
        this.checkTimeLimit(time);
        
        // Check for escape
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            this.exitShooterScene();
        }
    }
    
    handlePlayerInput() {
        if (!this.player) return;
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        let dx = 0;
        let dy = 0;
        
        // Calculate movement direction for leader (M7 style)
        if (this.wasdKeys.W.isDown) {
            dy = -1;
        }
        if (this.wasdKeys.S.isDown) {
            dy = 1;
        }
        if (this.wasdKeys.A.isDown) {
            dx = -1;
        }
        if (this.wasdKeys.D.isDown) {
            dx = 1;
        }
        
        // Move leader
        if (dx !== 0 || dy !== 0) {
            // Normalize diagonal movement
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = dx / length;
            dy = dy / length;
            
            // Normal movement
            this.player.leader.x += dx * this.player.leader.moveSpeed;
            this.player.leader.y += dy * this.player.leader.moveSpeed;
            
            // Calculate angle based on movement direction
            this.player.angle = Math.atan2(dy, dx);
        }
        
        // Keep leader within maximum distance of main rectangle
        const deltaX = this.player.leader.x - this.player.x;
        const deltaY = this.player.leader.y - this.player.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.player.leader.maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            this.player.leader.x = this.player.x + Math.cos(angle) * this.player.leader.maxDistance;
            this.player.leader.y = this.player.y + Math.sin(angle) * this.player.leader.maxDistance;
        }
        
        // Move main rectangle towards leader
        if (distance > 5) {
            const angle = Math.atan2(deltaY, deltaX);
            this.player.x += Math.cos(angle) * this.player.moveSpeed * (distance / this.player.leader.maxDistance);
            this.player.y += Math.sin(angle) * this.player.moveSpeed * (distance / this.player.leader.maxDistance);
        }
        
        // Calculate viewport margins based on player size
        const viewportMargin = this.player.size * 1.5;
        
        // Keep both rectangles on screen with margin
        this.player.x = Phaser.Math.Clamp(this.player.x, viewportMargin, width - viewportMargin);
        this.player.y = Phaser.Math.Clamp(this.player.y, viewportMargin, height - viewportMargin);
        this.player.leader.x = Phaser.Math.Clamp(this.player.leader.x, viewportMargin, width - viewportMargin);
        this.player.leader.y = Phaser.Math.Clamp(this.player.leader.y, viewportMargin, height - viewportMargin);
        
        // Update world position based on leader's movement
        if (distance > 0) {
            const moveAngle = Math.atan2(deltaY, deltaX);
            this.position.x -= Math.cos(moveAngle) * (distance / this.player.leader.maxDistance) * this.player.maxSpeed;
            this.position.y -= Math.sin(moveAngle) * (distance / this.player.leader.maxDistance) * this.player.maxSpeed;
        }
    }
    
    updateHUD(time) {
        // Update time
        const elapsed = time - this.startTime;
        const remaining = Math.max(0, Math.ceil((this.timeLimit - elapsed) / 1000));
        this.timeText.setText(`TIME: ${remaining}`);
    }
    
    checkTimeLimit(time) {
        const elapsed = time - this.startTime;
        
        if (elapsed >= this.timeLimit) {
            this.handleSuccess();
        }
    }
    
    handleSuccess() {
        console.log('[ShooterScene] Time limit reached!');
        
        // Show completion message
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        const successText = this.add.text(
            centerX,
            centerY,
            'TIME COMPLETE!',
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
    
    exitShooterScene() {
        console.log('[ShooterScene] Exiting to WorldScene');
        
        // Clean up graphics
        if (this.groundGraphics) {
            this.groundGraphics.destroy();
        }
        if (this.playerGraphics) {
            this.playerGraphics.destroy();
        }
        
        // Return to WorldScene
        this.scene.stop();
        this.scene.resume('WorldScene', {
            returnPosition: this.returnPosition
        });
    }
}