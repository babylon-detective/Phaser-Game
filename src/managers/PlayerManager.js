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

        // Add shift key
        this.shiftKey = scene.input.keyboard.addKey('SHIFT');
        
        // Running state properties
        this.isCharging = false;
        this.isRunning = false;
        this.chargeStartTime = 0;
        this.chargeRequired = 1500; // 1.5 seconds to charge
        this.normalSpeed = 260;
        this.runSpeed = 400;
        
        // Direction indicator
        this.directionIndicator = scene.add.rectangle(
            player.x,
            player.y - 40,
            10,
            10,
            0xff0000
        );

        // Store running direction and velocity
        this.runDirection = { x: 0, y: -1 };
        this.runVelocity = { x: 0, y: 0 };

        // Add shift key listeners
        this.shiftKey.on('down', () => {
            if (!this.isRunning) {
                this.startCharging();
            } else {
                this.resetState();
            }
        });

        this.shiftKey.on('up', () => {
            if (this.isCharging) {
                this.releaseCharge();
            }
        });

        // Add collision callback
        player.body.onCollide = true;
        scene.physics.world.on('collide', this.handleCollision, this);

        // Configure physics body for smooth movement
        player.body.setDrag(0, 0);
        player.body.setBounce(0);
        player.body.setFriction(0, 0);

        // Add frame counter for debugging
        this.frameCount = 0;
        
        // Debug interval to watch movement
        this.debugInterval = scene.time.addEvent({
            delay: 500,  // 500ms interval
            callback: () => {
                if (this.isRunning) {
                    console.log('Debug position:', { 
                        x: this.player.x, 
                        y: this.player.y,
                        direction: this.runDirection,
                        frame: this.frameCount
                    });
                }
            },
            loop: true
        });

        // Add direct world bounds collision listener
        this.player.body.onWorldBounds = true;
        this.scene.physics.world.on('worldbounds', this.handleWorldBoundCollision, this);
    }

    update() {
        this.frameCount++;
        
        // Normal WASD input
        let dx = 0;
        let dy = 0;

        if (this.wasdKeys.left.isDown) dx = -1;
        if (this.wasdKeys.right.isDown) dx = 1;
        if (this.wasdKeys.up.isDown) dy = -1;
        if (this.wasdKeys.down.isDown) dy = 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(2);
            dx /= length;
            dy /= length;
        }

        if (this.isRunning) {
            // HANDLE RUNNING STATE
            
            // Update direction if steering
            if (dx !== 0 || dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                this.runDirection.x = dx / length;
                this.runDirection.y = dy / length;
            }
            
            // IMPORTANT: Apply direct position change instead of velocity
            const moveSpeed = this.runSpeed * (1/60); // 60fps assumed
            this.player.x += this.runDirection.x * moveSpeed;
            this.player.y += this.runDirection.y * moveSpeed;
            
            // Move the physics body to match
            this.player.body.reset(this.player.x, this.player.y);
            
            // Every 10 frames, log the position
            if (this.frameCount % 10 === 0) {
                console.log('Running position:', {
                    x: this.player.x,
                    y: this.player.y,
                    direction: this.runDirection,
                    frame: this.frameCount
                });
            }

            // Add these checks while running
            this.checkWorldBounds();
            this.checkNpcProximity();
        } else {
            // NORMAL MOVEMENT
            if (!this.isCharging) {
                this.player.body.setVelocity(
                    dx * this.normalSpeed,
                    dy * this.normalSpeed
                );
            }

            // Store direction for running
            if (dx !== 0 || dy !== 0) {
                this.runDirection.x = dx;
                this.runDirection.y = dy;
            }
        }

        // Update direction indicator
        const distance = 40;
        this.directionIndicator.setPosition(
            this.player.x + this.runDirection.x * distance,
            this.player.y + this.runDirection.y * distance
        );
    }

    startCharging() {
        this.isCharging = true;
        this.chargeStartTime = this.scene.time.now;
        this.player.setFillStyle(0xffff00);
        console.log('Charging started');
    }

    releaseCharge() {
        const chargeTime = this.scene.time.now - this.chargeStartTime;
        console.log('Charge released:', { time: chargeTime, required: this.chargeRequired });
        
        if (chargeTime >= this.chargeRequired) {
            this.startRunning();
        }
        this.isCharging = false;
    }

    startRunning() {
        this.isRunning = true;
        this.player.setFillStyle(0xff0000);
        console.log('Started running with direction:', this.runDirection);
        
        // Debug log all active colliders
        console.log('Active collision objects:', 
            this.scene.physics.world.colliders.getActive()
        );
    }

    resetState() {
        this.isCharging = false;
        this.isRunning = false;
        this.player.setFillStyle(0x808080);
        console.log('Reset state');
    }

    handleCollision(gameObject1, gameObject2) {
        console.log('Collision detected between:', gameObject1, gameObject2);
        
        // Ignore collisions with the cameraBox
        if ((gameObject1 === this.cameraBox || gameObject2 === this.cameraBox)) {
            return;
        }
        
        if (gameObject1 === this.player || gameObject2 === this.player) {
            if (this.isRunning) {
                console.log('Collision stopping run');
                this.resetState();
            }
        }
    }

    checkWorldBounds() {
        if (!this.isRunning) return;
        
        const worldBounds = this.scene.physics.world.bounds;
        const padding = 5; // Small padding
        
        // Player center and dimensions
        const px = this.player.x;
        const py = this.player.y;
        const pw = this.player.width / 2;
        const ph = this.player.height / 2;
        
        // Check if any edge is outside bounds
        const hitLeft = px - pw <= worldBounds.x + padding;
        const hitRight = px + pw >= worldBounds.x + worldBounds.width - padding;
        const hitTop = py - ph <= worldBounds.y + padding;
        const hitBottom = py + ph >= worldBounds.y + worldBounds.height - padding;
        
        if (hitLeft || hitRight || hitTop || hitBottom) {
            console.log('Player hit world edge:', { left: hitLeft, right: hitRight, top: hitTop, bottom: hitBottom });
            this.resetState();
        }
    }
    
    checkNpcProximity() {
        if (!this.isRunning || !this.scene.npcManager) return;
        
        const npcManager = this.scene.npcManager;
        const npcs = npcManager.npcs;
        
        if (!npcs) return;
        
        for (const npc of npcs) {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                npc.x, npc.y
            );
            
            if (distance <= (npc.triggerRadius || 100)) {
                console.log('Player in NPC trigger radius, stopping run');
                this.resetState();
                return;
            }
        }
    }

    handleWorldBoundCollision(body) {
        if (body.gameObject === this.player && this.isRunning) {
            console.log('Physics worldbounds event triggered');
            this.resetState();
        }
    }

    destroy() {
        if (this.directionIndicator) {
            this.directionIndicator.destroy();
        }
        if (this.shiftKey) {
            this.shiftKey.removeAllListeners();
        }
        if (this.debugInterval) {
            this.debugInterval.remove();
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

        // Create direction indicator (red square)
        this.directionIndicator = scene.add.rectangle(
            player.x,
            player.y - 40, // Start at top of player
            10,            // Width of indicator
            10,            // Height of indicator
            0xff0000      // Red color
        );

        // Store the current facing direction
        this.facing = 'up'; // Default facing direction
    }

    update() {
        this.resetVelocity();
        const speed = 160;
        let dx = 0;
        let dy = 0;

        // Calculate movement direction
        if (this.wasdKeys.left.isDown) dx = -1;
        if (this.wasdKeys.right.isDown) dx = 1;
        if (this.wasdKeys.up.isDown) dy = -1;
        if (this.wasdKeys.down.isDown) dy = 1;

        // Apply velocity
        this.player.body.setVelocityX(speed * dx);
        this.player.body.setVelocityY(speed * dy);

        // Update direction indicator position based on movement
        if (dx !== 0 || dy !== 0) {
            // Calculate angle based on movement direction
            const angle = Math.atan2(dy, dx);
            
            // Position the indicator around the player based on the angle
            const distance = 40; // Distance from player center
            const indicatorX = this.player.x + Math.cos(angle) * distance;
            const indicatorY = this.player.y + Math.sin(angle) * distance;
            
            this.directionIndicator.setPosition(indicatorX, indicatorY);

            // Store facing direction
            this.facing = this.getFacingDirection(angle);
        }
    }

    getFacingDirection(angle) {
        // Convert angle to degrees and normalize to 0-360
        const degrees = (angle * 180 / Math.PI + 360) % 360;
        
        // Define direction ranges
        if (degrees >= 337.5 || degrees < 22.5) return 'right';
        if (degrees >= 22.5 && degrees < 67.5) return 'down-right';
        if (degrees >= 67.5 && degrees < 112.5) return 'down';
        if (degrees >= 112.5 && degrees < 157.5) return 'down-left';
        if (degrees >= 157.5 && degrees < 202.5) return 'left';
        if (degrees >= 202.5 && degrees < 247.5) return 'up-left';
        if (degrees >= 247.5 && degrees < 292.5) return 'up';
        if (degrees >= 292.5 && degrees < 337.5) return 'up-right';
        return 'up'; // Default direction
    }

    // Clean up method to remove the direction indicator
    destroy() {
        if (this.directionIndicator) {
            this.directionIndicator.destroy();
        }
    }
}

export default class PlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.player = null;
        this.cameraBox = null;
        this.controls = null;
        
        // Add this dummy map object to prevent errors
        this.map = {
            width: 100,
            height: 100,
            tileWidth: 32,
            tileHeight: 32
        };
    }

    create() {
        console.log("PlayerManager create method running");
        
        // Ensure physics is available
        if (!this.scene.physics) {
            console.error("Physics system is not available in the provided scene");
            return;
        }

        // Place the player in the center of the viewport
        const playerX = this.scene.cameras.main.width / 2;
        const playerY = this.scene.cameras.main.height / 2;

        // Create player rectangle
        this.player = this.scene.add.rectangle(playerX, playerY, 32, 64, 0x808080);
        this.scene.physics.add.existing(this.player);

        if (!this.player.body) {
            console.error("Player physics body not created!");
            return;
        }

        // Configure physics
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setBounce(0.2);

        // Create camera box
        this.cameraBox = this.scene.add.rectangle(this.player.x, this.player.y, 200, 200, 0xffffff, 0);
        this.scene.physics.add.existing(this.cameraBox, false);
        this.cameraBox.body.setAllowGravity(false);
        this.cameraBox.body.moves = false;

        // IMPORTANT: Use overlap instead of collider, and start following immediately
        this.scene.physics.add.overlap(this.player, this.cameraBox, () => {
            this.scene.cameras.main.startFollow(this.cameraBox, true, 0.1, 0.1);
        });

        // And also start following immediately
        this.scene.cameras.main.startFollow(this.cameraBox, true, 0.1, 0.1);

        // Let other code know the player has been created
        this.scene.events.emit('playerCreated', this.player);

        // Initialize controls
        if (this.scene.scene.key === 'WorldScene') {
            this.controls = new WorldControls(this.player, this.scene);
        } else if (this.scene.scene.key === 'BattleScene') {
            this.controls = new BattleControls(this.player, this.scene);
        }
        
        console.log("PlayerManager create completed");
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

    getPlayerPosition() {
        if (this.player) {
            return { x: this.player.x, y: this.player.y };
        }
        return { x: 0, y: 0 }; // Default position if player is not initialized
    }

    update() {
        if (this.controls) {
            this.controls.update();
        }

        // IMPORTANT: Always keep camera box centered on player
        if (this.cameraBox && this.player) {
            this.cameraBox.x = this.player.x;
            this.cameraBox.y = this.player.y;
        }
    }

    cleanup() {
        if (this.controls && this.controls.destroy) {
            this.controls.destroy();
        }
        if (this.player) {
            this.player.destroy();
        }
        if (this.cameraBox) {
            this.cameraBox.destroy();
        }
    }

    setWorldBounds(bounds) {
        this.worldBounds = bounds;
        if (this.controls && this.controls instanceof WorldControls) {
            this.controls.worldBounds = bounds;
        }
    }
}
