import Phaser from "phaser";

import SaveState from "../SaveState";
import PlayerManager from "../managers/PlayerManager";
import NpcManager from "../managers/NpcManager";
import HUDManager from "../ui/HUDManager";
import MapScene from "./MapScene";
import { gameStateManager } from "../managers/GameStateManager.js";

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WorldScene' });
    }

    init(data) {
        console.log('[WorldScene] Initializing with data:', data);
        
        // Initialize or update defeated NPCs
        if (data && data.defeatedNpcIds) {
            this.defeatedNpcIds = [...new Set(data.defeatedNpcIds)];
            console.log('[WorldScene] Initialized with defeated NPCs:', this.defeatedNpcIds);
        } else {
            this.defeatedNpcIds = [];
        }
        
        // Store return position if provided
        this.returnPosition = data?.returnPosition || null;
        this.battleVictory = data?.battleVictory || false;
        this.transitionType = data?.transitionType || null;
        
        console.log('[WorldScene] Initial state:', {
            returnPosition: this.returnPosition,
            battleVictory: this.battleVictory,
            transitionType: this.transitionType,
            defeatedNpcIds: this.defeatedNpcIds
        });
    }

    preload() {
        console.log('Loading tilemap...');
        this.load.image('tilesGrass', '/assets/tilesets/TX Tileset Grass.png');
        this.load.image('tilesStoneGround', '/assets/tilesets/TX Tileset Stone Ground.png');
        this.load.image('tilesWall', '/assets/tilesets/TX Tileset Wall.png');
        this.load.image('tilesStruct', '/assets/tilesets/TX Struct.png');
        this.load.image('tilesProps', '/assets/tilesets/TX Props.png');
        this.load.image('tilesPlants', '/assets/tilesets/TX Plants.png');
        this.load.image('tilesSea', '/assets/tilesets/TX Sea.png');
        this.load.tilemapTiledJSON('map', '/assets/tilemaps/TownScene.tmj');
    }

    create() {
        console.log('WorldScene create');
        
        // Create the tilemap
        this.map = this.make.tilemap({ key: 'map' });

        // Load tilesets
        const tilesets = {
            sea: this.map.addTilesetImage('TX Sea', 'tilesSea'),
            grass: this.map.addTilesetImage('TX Tileset Grass', 'tilesGrass'),
            stoneGround: this.map.addTilesetImage('TX Tileset Stone Ground', 'tilesStoneGround'),
            wall: this.map.addTilesetImage('TX Tileset Wall', 'tilesWall'),
            struct: this.map.addTilesetImage('TX Struct', 'tilesStruct'),
            props: this.map.addTilesetImage('TX Props', 'tilesProps'),
            plants: this.map.addTilesetImage('TX Plants', 'tilesPlants')
        };

        // Create layers
        const layers = {
            sea: this.map.createLayer('Sea', [tilesets.sea]),
            ground: this.map.createLayer('Ground', Object.values(tilesets)),
            walls: this.map.createLayer('Walls', Object.values(tilesets)),
            plants: this.map.createLayer('Plants', Object.values(tilesets)),
            props: this.map.createLayer('Props', Object.values(tilesets))
        };

        // Calculate exact tilemap dimensions
        const mapWidth = this.map.width * this.map.tileWidth;
        const mapHeight = this.map.height * this.map.tileHeight;
        
        console.log('Exact map dimensions:', { width: mapWidth, height: mapHeight });

        // Make world bounds larger than the map
        const worldPadding = 2800;
        const worldWidth = mapWidth + (worldPadding * 2);
        const worldHeight = mapHeight + (worldPadding * 2);

        // Set the larger bounds
        this.physics.world.setBounds(
            -worldPadding,
            -worldPadding,
            worldWidth,
            worldHeight
        );

        // Set camera bounds to match
        this.cameras.main.setBounds(
            -worldPadding,
            -worldPadding,
            worldWidth,
            worldHeight
        );

        // Add this after setting the bounds
        console.log('World bounds:', {
            map: { width: mapWidth, height: mapHeight },
            world: {
                x: -worldPadding,
                y: -worldPadding,
                width: worldWidth,
                height: worldHeight
            }
        });

        // Create player manager
        this.playerManager = new PlayerManager(this);
        this.playerManager.create();

        // Define NPC types
        this.npcTypes = {
            GUARD: {
                name: 'Guard',
                health: 100,
                level: 1,
                color: 0xff0000,
                size: { width: 32, height: 64 },
                behavior: 'patrol',
                patrolRadius: 100,
                triggerRadius: 80,
                spawnWeight: 2
            },
            MERCHANT: {
                name: 'Merchant',
                health: 80,
                level: 1,
                color: 0x00ff00,
                size: { width: 32, height: 64 },
                behavior: 'stationary',
                triggerRadius: 40,
                spawnWeight: 1
            },
            VILLAGER: {
                name: 'Villager',
                health: 60,
                level: 1,
                color: 0x0000ff,
                size: { width: 32, height: 64 },
                behavior: 'wander',
                wanderRadius: 50,
                triggerRadius: 40,
                spawnWeight: 3
            }
        };

        // Create NPC manager with proper configuration
        this.npcManager = new NpcManager(this);
        this.npcManager.init({
            npcTypes: this.npcTypes,
            spawnConfig: {
                totalNPCs: 5,
                minDistanceBetweenNPCs: 50,
                spawnAttempts: 50,
                spawnOnGroundOnly: true,
                spawnRadius: 100
            },
            defeatedNpcIds: this.defeatedNpcIds || []
        });
        this.npcManager.create();

        // Create HUD
        this.hudManager = new HUDManager(this);
        this.hudManager.create();
        
        // Initialize HUD with current game state from GameStateManager
        this.hudManager.updatePlayerStats();
        this.hudManager.updateNPCCount(
            this.defeatedNpcIds ? this.defeatedNpcIds.length : 0,
            15 - (this.defeatedNpcIds ? this.defeatedNpcIds.length : 0)
        );

        // Set up camera to follow player AFTER player is created
        if (this.playerManager.player) {
            // Make sure camera is following the player
            this.cameras.main.startFollow(this.playerManager.player, true, 0.1, 0.1);
        }

        // Set up collisions
        layers.walls.setCollisionByProperty({ collision: true });
        this.physics.add.collider(this.playerManager.player, layers.walls);

        // Enable world bounds collision for player
        if (this.playerManager.player) {
            this.playerManager.player.body.setCollideWorldBounds(true);
            this.playerManager.player.body.onWorldBounds = true;
        }

        // Add world bounds collision listener
        this.physics.world.on('worldbounds', (body) => {
            if (body.gameObject === this.playerManager.player && 
                this.playerManager.controls &&
                this.playerManager.controls.isRunning) {
                console.log('World bounds collision detected');
                this.playerManager.controls.resetState();
            }
        });

        // Position player and camera
        if (this.returnPosition && this.playerManager.player) {
            console.log('Setting player position to returnPosition:', this.returnPosition);
            this.playerManager.player.setPosition(this.returnPosition.x, this.returnPosition.y);
            this.cameras.main.centerOn(this.returnPosition.x, this.returnPosition.y);
        } else {
            console.log('Centering camera on map center');
            this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
        }

        // Create charge gauge bar for Shift button
        this.createChargeGauge();

        function adjustCameraForDevice() {
            const width = window.innerWidth;
            const height = window.innerHeight;

            if (width < 600) {
                // Mobile portrait
                this.cameras.main.setZoom(0.5);
            } else if (width < 900) {
                // Mobile landscape or small tablet
                this.cameras.main.setZoom(0.75);
            } else {
                // Tablet or desktop
                this.cameras.main.setZoom(1);
            }
        }

        window.addEventListener('resize', adjustCameraForDevice.bind(this));
        adjustCameraForDevice.call(this);
    
        // Set up M key to open the map
        this.input.keyboard.on('keydown-M', () => {
            console.log('[WorldScene] M key pressed, opening map');
            this.scene.pause();
            this.scene.launch('MapScene', {
                playerPosition: this.playerManager.getPlayerPosition()
            });
        });

        // Set up / key to open the menu (using keyCode 191 directly)
        const slashKey = this.input.keyboard.addKey(191); // Forward slash keyCode
        slashKey.on('down', () => {
            console.log('[WorldScene] / key pressed, opening menu');
            this.scene.pause();
            this.scene.launch('MenuScene', {
                playerPosition: this.playerManager.getPlayerPosition()
            });
        });

        // Add click debugging
        this.input.on('pointerdown', (pointer) => {
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            console.log('Click position:', {
                screen: { x: pointer.x, y: pointer.y },
                world: { x: worldPoint.x, y: worldPoint.y },
                tile: {
                    x: this.map.worldToTileX(worldPoint.x),
                    y: this.map.worldToTileY(worldPoint.y)
                }
            });
        });

        // Set up scene event listeners
        this.events.on('pause', () => {
            console.log('[WorldScene] EVENT: Scene paused, hiding HUD');
            if (this.hudManager) {
                this.hudManager.setVisible(false);
            }
        });

        this.events.on('resume', (scene, data) => {
            console.log('[WorldScene] EVENT: Scene resumed event fired');
            console.log('[WorldScene] EVENT: Resume event data:', data);
            
            // Show HUD when resuming
            if (this.hudManager) {
                this.hudManager.setVisible(true);
            }
            
            // Process the data if available
            if (data) {
                console.log('[WorldScene] EVENT: Processing resume event data', data);
                this.handleResumeData(data);
            }
        });

        // Listen for menu closed event to update HUD immediately
        this.events.on('menu-closed', () => {
            console.log('[WorldScene] EVENT: Menu closed, updating HUD stats');
            if (this.hudManager) {
                this.hudManager.updatePlayerStats();
            }
        });

        console.log('[WorldScene] Scene event listeners registered');
    }
    
    /**
     * Handle data when scene resumes
     * This is called both from the resume() lifecycle method and the resume event
     */
    handleResumeData(data) {
        console.log('[WorldScene] handleResumeData called with:', data);
        
        if (!data) return;
        
        // Process battle victory and defeated NPCs
        if (data.battleVictory && data.transitionType === 'victory') {
            console.log('[WorldScene] Processing battle victory in handleResumeData');
            
            // Set player position
            if (data.returnPosition && this.playerManager && this.playerManager.player) {
                console.log('[WorldScene] Setting player position:', data.returnPosition);
                this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
                this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
            }
            
            // Update defeated NPCs
            if (this.npcManager && data.defeatedNpcIds && data.defeatedNpcIds.length > 0) {
                console.log('[WorldScene] Removing newly defeated NPCs:', data.defeatedNpcIds);
                this.npcManager.updateDefeatedNpcs(data.defeatedNpcIds);
                
                // Add to our cumulative defeated list
                this.defeatedNpcIds = [...new Set([...this.defeatedNpcIds, ...data.defeatedNpcIds])];
                console.log('[WorldScene] Total defeated NPCs:', this.defeatedNpcIds);
                console.log('[WorldScene] Updating HUD - Defeated:', this.defeatedNpcIds.length, 'Remaining:', 15 - this.defeatedNpcIds.length);
                
                // Update HUD immediately
                if (this.hudManager) {
                    this.hudManager.updateNPCCount(
                        this.defeatedNpcIds.length,
                        15 - this.defeatedNpcIds.length
                    );
                }
            }
            
            // Apply battle end cooldown
            if (this.npcManager) {
                this.npcManager.handleBattleEnd();
            }
        } else if (data.transitionType === 'escape') {
            console.log('[WorldScene] Processing escape from battle');
            
            // Set player position
            if (data.returnPosition && this.playerManager && this.playerManager.player) {
                this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
                this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
            }
            
            // Update NPC health with data from battle
            if (this.npcManager && data.updatedNpcHealth) {
                console.log('[WorldScene] Updating NPC health from battle:', data.updatedNpcHealth);
                this.npcManager.updateNpcHealth(data.updatedNpcHealth);
            }
        }
    }

    createChargeGauge() {
        // Create charge gauge graphics
        this.chargeGaugeBackground = this.add.graphics();
        this.chargeGaugeFill = this.add.graphics();
        
        // Set depth to appear above player
        this.chargeGaugeBackground.setDepth(1000);
        this.chargeGaugeFill.setDepth(1001);
        
        // Gauge dimensions
        this.gaugeWidth = 60;
        this.gaugeHeight = 6;
        this.gaugeOffsetY = 48; // Distance below player
    }

    updateChargeGauge() {
        if (!this.playerManager || !this.playerManager.player || !this.playerManager.controls) return;
        
        const player = this.playerManager.player;
        const controls = this.playerManager.controls;
        const isCharging = controls.isCharging;
        
        // Position gauge below player
        const gaugeX = player.x - this.gaugeWidth / 2;
        const gaugeY = player.y + this.gaugeOffsetY;
        
        // Clear previous drawings
        this.chargeGaugeBackground.clear();
        this.chargeGaugeFill.clear();
        
        // Only show while Shift is being held (charging)
        if (isCharging) {
            // Calculate charge percentage
            const chargeTime = this.time.now - controls.chargeStartTime;
            const chargePercent = Math.min(chargeTime / controls.chargeRequired, 1);
            
            // Draw background (black with white border)
            this.chargeGaugeBackground.lineStyle(1, 0xffffff, 0.8);
            this.chargeGaugeBackground.fillStyle(0x000000, 0.6);
            this.chargeGaugeBackground.fillRect(gaugeX, gaugeY, this.gaugeWidth, this.gaugeHeight);
            this.chargeGaugeBackground.strokeRect(gaugeX, gaugeY, this.gaugeWidth, this.gaugeHeight);
            
            // Determine fill color based on charge level
            let fillColor;
            if (chargePercent >= 1) {
                fillColor = 0xffff00; // Yellow when fully charged
            } else {
                fillColor = 0xffffff; // White while charging
            }
            
            // Draw fill
            const fillWidth = this.gaugeWidth * chargePercent;
            this.chargeGaugeFill.fillStyle(fillColor, 0.9);
            this.chargeGaugeFill.fillRect(gaugeX, gaugeY, fillWidth, this.gaugeHeight);
        }
    }

    update() {
        // Player update
        this.playerManager?.update();

        // NPC update
        this.npcManager?.update();

        // Check for NPC interactions
        if (this.playerManager && this.playerManager.player) {
            this.npcManager.checkInteraction(this.playerManager.player);
        }
        
        // Update charge gauge
        this.updateChargeGauge();
        
        // Update HUD stats periodically (every second)
        if (!this.lastStatsUpdate) {
            this.lastStatsUpdate = 0;
        }
        
        if (this.time.now - this.lastStatsUpdate >= 1000 && this.hudManager) {
            this.hudManager.updatePlayerStats();
            this.lastStatsUpdate = this.time.now;
        }
    }

    wake(sys, data) {
        console.log('WorldScene wake with data:', data);
        if (data?.returnPosition && this.playerManager?.player) {
            this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
            this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
        }
    }

    resume(sys, data) {
        console.log('[WorldScene] ========== RESUME LIFECYCLE METHOD CALLED ==========');
        console.log('[WorldScene] Resume parameters - sys:', sys);
        console.log('[WorldScene] Resume parameters - data:', JSON.stringify(data, null, 2));
        console.log('[WorldScene] Current defeated NPCs before update:', this.defeatedNpcIds);
        
        // Ensure scene is properly initialized
        if (!this.scene.isActive()) {
            console.log('[WorldScene] Scene not active, restarting...');
            this.scene.restart();
            return;
        }
        
        // Show WorldScene HUD (it was hidden when scene paused)
        if (this.hudManager) {
            this.hudManager.setVisible(true);
        }
        
        // Re-enable input
        this.input.enabled = true;
        
        // Process the data using the centralized handler
        if (data) {
            this.handleResumeData(data);
        }
        
        // Update HUD with current stats from GameStateManager (always update after resume)
        if (this.hudManager) {
            console.log('[WorldScene] Resume: Updating player stats from GameStateManager');
            const stats = gameStateManager.getPlayerStats();
            console.log('[WorldScene] Current stats:', { level: stats.level, xp: stats.experience, health: stats.health });
            this.hudManager.updatePlayerStats();
            // Force a fresh update after a short delay to ensure UI reflects changes
            this.time.delayedCall(100, () => {
                if (this.hudManager) {
                    this.hudManager.updatePlayerStats();
                }
            });
        }
        
        // Re-enable physics and collisions
        if (this.physics && this.playerManager && this.playerManager.player) {
            this.physics.world.resume();
            this.physics.world.enable(this.playerManager.player);
            this.cameras.main.startFollow(this.playerManager.player);
        }
    }

    startDefeatedNpcAnimation(defeatedNpcIds) {
        console.log('[WorldScene] Starting defeated NPC animation for:', defeatedNpcIds);
        
        defeatedNpcIds.forEach(npcId => {
            const npc = this.npcManager.npcs.find(n => n.npcData.id === npcId);
            if (npc) {
                // Store original alpha
                const originalAlpha = npc.alpha;
                
                // Create blinking animation
                this.tweens.add({
                    targets: npc,
                    alpha: 0,
                    duration: 200,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        // After blinking, remove the NPC
                        if (npc.triggerZone) {
                            npc.triggerZone.destroy();
                        }
                        npc.destroy();
                        
                        // Remove from npcs array
                        this.npcManager.npcs = this.npcManager.npcs.filter(n => n.npcData.id !== npcId);
                        
                        console.log(`[WorldScene] Removed defeated NPC: ${npcId}`);
                    }
                });
            }
        });
    }

    pause() {
        console.log('WorldScene paused');
        // Optional: Pause any ongoing animations or timers
    }

    sleep() {
        console.log('WorldScene sleep');
        // Optional: Clean up any resources that shouldn't persist while sleeping
    }

    shutdown() {
        console.log('WorldScene shutdown');
        // Clean up any resources that shouldn't persist after shutdown
        if (this.playerManager) {
            // Clean up player manager resources
            this.playerManager = null;
        }
        if (this.npcManager) {
            // Clean up NPC manager resources
            this.npcManager = null;
        }
        
        // Clean up charge gauge graphics
        if (this.chargeGaugeBackground) {
            this.chargeGaugeBackground.destroy();
            this.chargeGaugeBackground = null;
        }
        if (this.chargeGaugeFill) {
            this.chargeGaugeFill.destroy();
            this.chargeGaugeFill = null;
        }
        
        // Call parent shutdown
        super.shutdown();
    }

    startBattle(npcDataArray) {
        console.log('[WorldScene] Starting battle with NPC data:', npcDataArray);
        
        if (!npcDataArray) {
            console.error('[WorldScene] No NPC data provided for battle');
            return;
        }

        const npcs = Array.isArray(npcDataArray) ? npcDataArray : [npcDataArray];
        const playerData = this.playerManager.getPlayerData();
        
        if (!playerData) {
            console.error('[WorldScene] No player data available');
            return;
        }

        // Store current NPC state
        const npcState = this.npcManager.getNpcData();
        
        // Pause this scene instead of stopping it
        this.scene.pause();
        
        // Start battle scene with NPC state
        this.scene.launch('BattleScene', {
            playerData,
            npcDataArray: npcs,
            npcState: npcState
        });
    }
}
