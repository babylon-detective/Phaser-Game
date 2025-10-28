import Phaser from "phaser";

import SaveState from "../SaveState";
import PlayerManager from "../managers/PlayerManager";
import NpcManager from "../managers/NpcManager";
import PartyManager from "../managers/PartyManager";
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
        
        // Handle loaded game data
        this.loadedGame = data?.loadedGame || false;
        this.loadedPlayerPosition = data?.playerPosition || null;
        
        console.log('[WorldScene] Initial state:', {
            returnPosition: this.returnPosition,
            battleVictory: this.battleVictory,
            transitionType: this.transitionType,
            defeatedNpcIds: this.defeatedNpcIds,
            loadedGame: this.loadedGame,
            loadedPlayerPosition: this.loadedPlayerPosition
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

        // Create party manager (must be after NPC manager)
        this.partyManager = new PartyManager(this);
        this.partyManager.init();
        
        // Add recruitable NPCs to NPC Manager for battle triggering
        const recruitableNPCs = this.partyManager.getRecruitableNPCObjects();
        recruitableNPCs.forEach(npc => {
            this.npcManager.npcs.push(npc);
        });
        console.log('[WorldScene] Added recruitable NPCs to NPC manager:', recruitableNPCs.length);

        // Create HUD
        this.hudManager = new HUDManager(this);
        this.hudManager.create();
        
        // Initialize HUD with current game state from GameStateManager
        this.hudManager.updatePlayerStats();
        
        // Update NPC count based on current defeated NPCs
        const defeatedCount = this.defeatedNpcIds ? this.defeatedNpcIds.length : 0;
        const remainingCount = 15 - defeatedCount;
        console.log('[WorldScene] Updating HUD NPC count:', { 
            defeatedNpcIds: this.defeatedNpcIds,
            defeatedCount, 
            remainingCount 
        });
        this.hudManager.updateNPCCount(defeatedCount, remainingCount);
        
        // Set up party menu key (TAB key to view party)
        this.input.keyboard.on('keydown-TAB', () => {
            console.log('[WorldScene] TAB pressed - opening party menu');
            this.openPartyMenu();
        });

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
        if (this.loadedGame && this.loadedPlayerPosition && this.playerManager.player) {
            // Position player at loaded save point
            console.log('Setting player position from loaded game:', this.loadedPlayerPosition);
            this.playerManager.player.setPosition(this.loadedPlayerPosition.x, this.loadedPlayerPosition.y);
            this.cameras.main.centerOn(this.loadedPlayerPosition.x, this.loadedPlayerPosition.y);
        } else if (this.returnPosition && this.playerManager.player) {
            console.log('Setting player position to returnPosition:', this.returnPosition);
            this.playerManager.player.setPosition(this.returnPosition.x, this.returnPosition.y);
            this.cameras.main.centerOn(this.returnPosition.x, this.returnPosition.y);
        } else {
            console.log('Centering camera on map center');
            this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
        }

        // Create charge gauge bar for Shift button
        this.createChargeGauge();

        // Create save point with glowing effect
        this.createSavePoint(300, 300); // Position at (300, 300) - adjust as needed
        this.isOnSavePoint = false;

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
            console.log('[WorldScene] Player on save point:', this.isOnSavePoint);
            this.scene.pause();
            this.scene.launch('MenuScene', {
                playerPosition: this.playerManager.getPlayerPosition(),
                isOnSavePoint: this.isOnSavePoint
            });
        });

        // Set up Return (Enter) key to FULLY pause the game
        this.isPaused = false;
        const returnKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        returnKey.on('down', () => {
            this.toggleGamePause();
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
        
        // Process recruitment
        if (data.transitionType === 'recruitment' && data.recruitedNpcId) {
            console.log('[WorldScene] Processing recruitment:', data.recruitedNpcId);
            
            // Handle recruitment in PartyManager (makes NPC follow player)
            if (this.partyManager) {
                this.partyManager.handleRecruitmentSuccess(data.recruitedNpcId);
                console.log('[WorldScene] Party manager updated for recruitment');
            }
            
            // Remove recruited NPC from NPC manager's battle trigger list
            if (this.npcManager) {
                this.npcManager.npcs = this.npcManager.npcs.filter(npc => {
                    if (npc.npcData && npc.npcData.id === data.recruitedNpcId) {
                        console.log('[WorldScene] Removing recruited NPC from battle triggers:', npc.npcData.id);
                        return false;
                    }
                    return true;
                });
            }
            
            // Set player position
            if (data.returnPosition && this.playerManager && this.playerManager.player) {
                this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
                this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
            }
            
            // Apply battle end cooldown
            if (this.npcManager) {
                this.npcManager.handleBattleEnd();
            }
            
            return; // Early return for recruitment
        }
        
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

    createSavePoint(x, y) {
        // Create elliptical glow effect for save point
        const ellipseWidth = 80;
        const ellipseHeight = 40;
        
        // Create graphics for the save point
        this.savePointGlow = this.add.graphics();
        this.savePointGlow.setDepth(0); // Below player
        
        // Store position
        this.savePointPosition = { x, y };
        
        // Draw base ellipse (lighter inner glow)
        this.savePointGlow.fillStyle(0x00ffff, 0.3);
        this.savePointGlow.fillEllipse(x, y, ellipseWidth, ellipseHeight);
        
        // Draw middle glow
        this.savePointGlow.fillStyle(0x00ffff, 0.2);
        this.savePointGlow.fillEllipse(x, y, ellipseWidth + 20, ellipseHeight + 10);
        
        // Draw outer glow
        this.savePointGlow.fillStyle(0x00ffff, 0.1);
        this.savePointGlow.fillEllipse(x, y, ellipseWidth + 40, ellipseHeight + 20);
        
        // Add pulsing animation
        this.tweens.add({
            targets: this.savePointGlow,
            alpha: 0.5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Create a physics zone for collision detection
        this.savePointZone = this.add.zone(x, y, ellipseWidth, ellipseHeight);
        this.physics.add.existing(this.savePointZone);
        this.savePointZone.body.setAllowGravity(false);
        this.savePointZone.body.moves = false;
        
        console.log('[WorldScene] Save point created at:', { x, y });
    }

    update() {
        // Player update
        this.playerManager?.update();

        // Party update (recruited members follow player)
        this.partyManager?.update();

        // NPC update
        this.npcManager?.update();

        // Check for NPC interactions
        if (this.playerManager && this.playerManager.player) {
            this.npcManager.checkInteraction(this.playerManager.player);
        }
        
        // Update charge gauge
        this.updateChargeGauge();
        
        // Check if player is on save point
        if (this.playerManager && this.playerManager.player && this.savePointZone) {
            const distance = Phaser.Math.Distance.Between(
                this.playerManager.player.x,
                this.playerManager.player.y,
                this.savePointPosition.x,
                this.savePointPosition.y
            );
            
            // Player is on save point if within 50 pixels
            this.isOnSavePoint = distance < 50;
        }
        
        // Update HUD stats periodically (every second)
        if (!this.lastStatsUpdate) {
            this.lastStatsUpdate = 0;
        }
        
        if (this.time.now - this.lastStatsUpdate >= 1000 && this.hudManager) {
            this.hudManager.updatePlayerStats();
            this.lastStatsUpdate = this.time.now;
        }
    }

    toggleGamePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            console.log('[WorldScene] ⏸️ GAME FULLY PAUSED (Return key)');
            
            // Pause the game timer
            gameStateManager.pauseTimer();
            
            // Pause the scene
            this.scene.pause();
            
            // Create pause overlay
            this.createPauseOverlay();
            
        } else {
            console.log('[WorldScene] ▶️ GAME RESUMED (Return key)');
            
            // Resume the game timer
            gameStateManager.resumeTimer();
            
            // Resume the scene
            this.scene.resume();
            
            // Remove pause overlay
            this.removePauseOverlay();
        }
    }
    
    createPauseOverlay() {
        // Create DOM pause overlay
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.id = 'game-pause-overlay';
        this.pauseOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        this.pauseOverlay.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 72px; font-weight: bold; color: #FFD700; margin-bottom: 20px;">
                    ⏸️ PAUSED
                </div>
                <div style="font-size: 24px; color: #FFF; margin-bottom: 30px;">
                    Game time and all activity paused
                </div>
                <div style="font-size: 18px; color: #AAA;">
                    Press <span style="color: #FFD700; font-weight: bold;">ENTER</span> to resume
                </div>
            </div>
        `;
        
        document.body.appendChild(this.pauseOverlay);
        
        // Add DOM keyboard listener for unpause (works even when Phaser scene is paused)
        this.pauseKeyListener = (event) => {
            if (event.key === 'Enter') {
                console.log('[WorldScene] Enter key detected on pause overlay');
                this.toggleGamePause();
            }
        };
        document.addEventListener('keydown', this.pauseKeyListener);
    }
    
    removePauseOverlay() {
        if (this.pauseOverlay) {
            this.pauseOverlay.remove();
            this.pauseOverlay = null;
        }
        
        // Remove DOM keyboard listener
        if (this.pauseKeyListener) {
            document.removeEventListener('keydown', this.pauseKeyListener);
            this.pauseKeyListener = null;
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
        
        // Get party members for battle
        const partyMembers = this.partyManager ? this.partyManager.getPartyForBattle() : [];
        console.log('[WorldScene] Launching battle with party:', partyMembers);
        
        // Start battle scene with NPC state and party data
        this.scene.launch('BattleScene', {
            playerData,
            npcDataArray: npcs,
            npcState: npcState,
            partyMembers: partyMembers
        });
    }
    
    openPartyMenu() {
        console.log('[WorldScene] Opening party menu');
        
        // Get player stats
        const playerStats = gameStateManager.getPlayerStats();
        
        // Get party members
        const partyMembers = this.partyManager ? this.partyManager.partyMembers : [];
        
        // Create overlay
        const partyOverlay = document.createElement('div');
        partyOverlay.id = 'world-party-menu';
        partyOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: auto;
            font-family: Arial, sans-serif;
        `;
        
        let menuHTML = `
            <div style="max-width: 800px; padding: 30px; background: linear-gradient(135deg, #1a1a2e, #16213e); border: 3px solid #FFD700; border-radius: 15px; color: white; max-height: 80vh; overflow-y: auto;">
                <h2 style="color: #FFD700; margin: 0 0 20px 0; text-align: center;">⚔️ PARTY STATUS</h2>
                
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 0, 0, 0.1); border: 2px solid #ff0000; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 12px; height: 12px; background: #ff0000; border-radius: 3px;"></div>
                                <div style="font-size: 20px; font-weight: bold; color: #FFD700;">PLAYER</div>
                            </div>
                            <div style="font-size: 14px; color: #AAA; margin-top: 5px;">Level ${playerStats.level} • ${playerStats.experience} XP</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                        <div style="background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 5px;">
                            <div style="font-size: 12px; color: #888;">Health</div>
                            <div style="font-size: 18px; color: #00ff00;">${playerStats.health}</div>
                        </div>
                        <div style="background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 5px;">
                            <div style="font-size: 12px; color: #888;">Attack</div>
                            <div style="font-size: 18px; color: #ff9900;">${playerStats.attack}</div>
                        </div>
                        <div style="background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 5px;">
                            <div style="font-size: 12px; color: #888;">Defense</div>
                            <div style="font-size: 18px; color: #4A90E2;">${playerStats.defense}</div>
                        </div>
                        <div style="background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 5px;">
                            <div style="font-size: 12px; color: #888;">Speed</div>
                            <div style="font-size: 18px; color: #FFD700;">${playerStats.speed}</div>
                        </div>
                    </div>
                </div>
        `;
        
        // Add party members
        if (partyMembers && partyMembers.length > 0) {
            partyMembers.forEach((member, index) => {
                const colorHex = '#' + member.indicatorColor.toString(16).padStart(6, '0');
                
                menuHTML += `
                    <div style="margin-bottom: 20px; padding: 15px; background: rgba(${parseInt(colorHex.substr(1,2), 16)}, ${parseInt(colorHex.substr(3,2), 16)}, ${parseInt(colorHex.substr(5,2), 16)}, 0.1); border: 2px solid ${colorHex}; border-radius: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 12px; height: 12px; background: ${colorHex}; border-radius: 3px;"></div>
                                    <div style="font-size: 20px; font-weight: bold; color: ${colorHex};">${member.name.toUpperCase()}</div>
                                </div>
                                <div style="font-size: 14px; color: #AAA; margin-top: 5px;">Level ${member.stats.level}</div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                            <div style="background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px; color: #888;">Health</div>
                                <div style="font-size: 18px; color: #00ff00;">${member.stats.health}</div>
                            </div>
                            <div style="background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px; color: #888;">Attack</div>
                                <div style="font-size: 18px; color: #ff9900;">${member.stats.attack}</div>
                            </div>
                            <div style="background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px; color: #888;">Defense</div>
                                <div style="font-size: 18px; color: #4A90E2;">${member.stats.defense}</div>
                            </div>
                            <div style="background: rgba(0, 0, 0, 0.3); padding: 10px; border-radius: 5px;">
                                <div style="font-size: 12px; color: #888;">Speed</div>
                                <div style="font-size: 18px; color: #FFD700;">${member.stats.speed}</div>
                            </div>
                        </div>
                        <div style="margin-top: 10px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 5px;">
                            <div style="font-size: 12px; color: #888; margin-bottom: 5px;">Abilities</div>
                            <div style="font-size: 14px; color: #FFD700;">${member.abilities ? member.abilities.join(', ') : 'None'}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            menuHTML += `
                <div style="text-align: center; padding: 30px; color: #888; font-style: italic;">
                    No party members yet. Recruit allies during your journey!
                </div>
            `;
        }
        
        // Party size footer
        const totalParty = 1 + partyMembers.length;
        menuHTML += `
                <div style="text-align: center; padding: 15px; background: rgba(255, 215, 0, 0.1); border-radius: 8px; margin-top: 20px;">
                    <div style="font-size: 14px; color: #888; margin-bottom: 5px;">Party Size</div>
                    <div style="font-size: 24px; color: #FFD700; font-weight: bold;">${totalParty} / 4</div>
                </div>
                
                <div style="text-align: center; padding: 15px; margin-top: 15px;">
                    <p style="color: #FFD700; font-size: 14px; margin: 0;">Press TAB or ESC to close</p>
                    <button id="close-party-menu" style="background: #4A90E2; border: none; padding: 10px 30px; border-radius: 8px; color: white; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px;">Close</button>
                </div>
            </div>
        `;
        
        partyOverlay.innerHTML = menuHTML;
        document.body.appendChild(partyOverlay);
        
        // Close function
        const closeMenu = () => {
            partyOverlay.remove();
            document.removeEventListener('keydown', keydownHandler);
        };
        
        // Keyboard handler
        const keydownHandler = (event) => {
            if (event.key === 'Tab' || event.key === 'Escape') {
                event.preventDefault();
                closeMenu();
            }
        };
        document.addEventListener('keydown', keydownHandler);
        
        // Close button
        const closeBtn = document.getElementById('close-party-menu');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeMenu);
        }
    }
}

