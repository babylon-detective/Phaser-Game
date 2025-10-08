import Phaser from "phaser";

export default class MapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapScene' });
        this.player = null;
        this.npcs = [];
        this.isTransitioning = false;
        this.transitionTimer = null;
        this.playerBlinkTween = null;
        // Simple color palette for different tile types
        this.tilePalette = {
            'TX Sea': 0x0066cc,        // Blue
            'TX Tileset Grass': 0x33cc33,  // Green
            'TX Tileset Stone Ground': 0x999999, // Gray
            'TX Tileset Wall': 0x663300,   // Brown
            'TX Props': 0xffff00,      // Yellow
        };
    }

    init(data) {
        console.log('[MapScene] Initializing with data:', data);
        this.returnPosition = data?.returnPosition || null;
        this.npcState = data?.npcState || null;
        this.isTransitioning = data?.isTransitioning || false;
        this.transitionType = data?.transitionType || null;
        this.playerPosition = data.playerPosition;
        this.worldScene = this.scene.get('WorldScene');
    }

    create() {
        console.log('[MapScene] Creating scene');
        
        // 1. First, let's verify we can access the tilemap
        const tilemap = this.worldScene.map;
        if (!tilemap) {
            console.error('[MapScene] No tilemap found!');
            return;
        }

        // 2. Log tilemap information
        console.log('[MapScene] Tilemap info:', {
            width: tilemap.width,
            height: tilemap.height,
            layers: tilemap.layers.map(l => l.name)
        });

        // Add basic UI elements
        this.add.text(10, 10, 'Map Scene (Press M to close)', {
            fontSize: '16px',
            color: '#ffffff'
        });

        // Draw only one map
        this.drawMinimap(tilemap);

        // Add M key handler
        this.input.keyboard.on('keydown-M', () => {
            console.log('[MapScene] Closing map');
            this.scene.resume('WorldScene');
            this.scene.stop();
        });

        // If we're transitioning, start the transition sequence
        if (this.isTransitioning) {
            this.startTransitionSequence();
        }
    }

    drawMainMap(tilemap) {
        // Main map settings
        const tileSize = 4;
        const mapWidth = tilemap.width * tileSize;
        const mapHeight = tilemap.height * tileSize;
        const centerX = this.cameras.main.centerX - (mapWidth / 2);
        const centerY = this.cameras.main.centerY - (mapHeight / 2);

        const mapGraphics = this.add.graphics();
        
        // Draw border
        mapGraphics.lineStyle(2, 0xffffff);
        mapGraphics.strokeRect(centerX - 2, centerY - 2, mapWidth + 4, mapHeight + 4);

        // Draw layers
        tilemap.layers.forEach(layer => {
            for (let y = 0; y < tilemap.height; y++) {
                for (let x = 0; x < tilemap.width; x++) {
                    const tile = layer.data[y][x];
                    if (tile && tile.index !== -1) {
                        const color = this.tilePalette[tile.tileset.name] || 0xcccccc;
                        mapGraphics.fillStyle(color, 1);
                        mapGraphics.fillRect(
                            centerX + (x * tileSize),
                            centerY + (y * tileSize),
                            tileSize,
                            tileSize
                        );
                    }
                }
            }
        });

        // Draw player on main map
        if (this.playerPosition) {
            const playerX = centerX + (this.playerPosition.x / tilemap.tileWidth) * tileSize;
            const playerY = centerY + (this.playerPosition.y / tilemap.tileHeight) * tileSize;
            mapGraphics.lineStyle(2, 0x000000);
            mapGraphics.fillStyle(0xffffff);
            mapGraphics.fillCircle(playerX, playerY, 3);
            mapGraphics.strokeCircle(playerX, playerY, 3);
        }
    }

    drawMinimap(tilemap) {
        // Minimap settings - significantly increased size
        const tileSize = 8; // Increased from 1 to 8 pixels per tile
        const minimapWidth = tilemap.width * tileSize;
        const minimapHeight = tilemap.height * tileSize;
        
        // Center the map in the viewport
        const minimapX = this.cameras.main.centerX - (minimapWidth / 2);
        const minimapY = this.cameras.main.centerY - (minimapHeight / 2);

        const minimapGraphics = this.add.graphics();
        
        // Draw minimap background with larger border and glow effect
        minimapGraphics.lineStyle(4, 0xffffff, 0.5); // Outer glow
        minimapGraphics.strokeRect(minimapX - 4, minimapY - 4, minimapWidth + 8, minimapHeight + 8);
        minimapGraphics.lineStyle(2, 0xffffff); // Inner border
        minimapGraphics.strokeRect(minimapX - 2, minimapY - 2, minimapWidth + 4, minimapHeight + 4);
        minimapGraphics.fillStyle(0x000000, 0.7);
        minimapGraphics.fillRect(minimapX, minimapY, minimapWidth, minimapHeight);

        // Draw minimap layers with enhanced visibility
        tilemap.layers.forEach((layer, index) => {
            // Add slight transparency for layering effect
            const alpha = 1 - (index * 0.1);
            for (let y = 0; y < tilemap.height; y++) {
                for (let x = 0; x < tilemap.width; x++) {
                    const tile = layer.data[y][x];
                    if (tile && tile.index !== -1) {
                        const color = this.tilePalette[tile.tileset.name] || 0xcccccc;
                        minimapGraphics.fillStyle(color, alpha);
                        minimapGraphics.fillRect(
                            minimapX + (x * tileSize),
                            minimapY + (y * tileSize),
                            tileSize,
                            tileSize
                        );
                    }
                }
            }
        });

        // Draw grid for better visibility
        minimapGraphics.lineStyle(1, 0xffffff, 0.1);
        for (let x = 0; x <= tilemap.width; x++) {
            minimapGraphics.beginPath();
            minimapGraphics.moveTo(minimapX + (x * tileSize), minimapY);
            minimapGraphics.lineTo(minimapX + (x * tileSize), minimapY + minimapHeight);
            minimapGraphics.strokePath();
        }
        for (let y = 0; y <= tilemap.height; y++) {
            minimapGraphics.beginPath();
            minimapGraphics.moveTo(minimapX, minimapY + (y * tileSize));
            minimapGraphics.lineTo(minimapX + minimapWidth, minimapY + (y * tileSize));
            minimapGraphics.strokePath();
        }

        // Draw player on minimap with enhanced visibility
        if (this.playerPosition) {
            const playerX = minimapX + (this.playerPosition.x / tilemap.tileWidth) * tileSize;
            const playerY = minimapY + (this.playerPosition.y / tilemap.tileHeight) * tileSize;
            
            // Add player glow effect
            minimapGraphics.lineStyle(6, 0xffffff, 0.3);
            minimapGraphics.strokeCircle(playerX, playerY, 8);
            minimapGraphics.lineStyle(4, 0xffffff, 0.5);
            minimapGraphics.strokeCircle(playerX, playerY, 6);
            
            // Draw player marker
            minimapGraphics.lineStyle(2, 0x000000);
            minimapGraphics.fillStyle(0xffffff);
            minimapGraphics.fillCircle(playerX, playerY, 4);
            minimapGraphics.strokeCircle(playerX, playerY, 4);
        }

        // Add enhanced minimap label - centered above the map
        const label = this.add.text(minimapX + (minimapWidth / 2), minimapY - 30, 'Map View', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        label.setOrigin(0.5, 0); // Center the text above the map
    }

    startTransitionSequence() {
        console.log('[MapScene] Starting transition sequence');
        this.isTransitioning = true;

        // Create black screen for fade in
        const blackScreen = this.add.graphics();
        blackScreen.fillStyle(0x000000, 1);
        blackScreen.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Fade in animation
        this.tweens.add({
            targets: blackScreen,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                blackScreen.destroy();
                // Start blinking effect after fade in
                this.startBlinkingEffect();
            }
        });
    }

    startBlinkingEffect() {
        if (!this.player) {
            console.error('[MapScene] No player found for blinking effect');
            this.isTransitioning = false;
            return;
        }

        // Create blinking effect
        this.playerBlinkTween = this.tweens.add({
            targets: this.player,
            alpha: 0.5,
            duration: 200,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                this.player.setAlpha(1);
                this.isTransitioning = false;
                this.playerBlinkTween = null;
            }
        });

        // Set transition timer
        this.transitionTimer = this.time.delayedCall(3000, () => {
            console.log('[MapScene] Transition period ended');
            this.isTransitioning = false;
            if (this.playerBlinkTween) {
                this.playerBlinkTween.stop();
                this.player.setAlpha(1);
                this.playerBlinkTween = null;
            }
        });
    }

    checkNpcInteraction() {
        // Don't check for interactions during transition
        if (this.isTransitioning) {
            console.log('[MapScene] Skipping NPC interaction check during transition');
            return;
        }

        if (!this.player || !this.npcs) return;

        this.npcs.forEach(npc => {
            if (!npc || !npc.active) return;

            // Calculate distance between player and NPC
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                npc.x,
                npc.y
            );

            // Check if player is within trigger radius
            if (distance <= npc.triggerRadius) {
                console.log('[MapScene] Player entered NPC trigger zone:', {
                    npcId: npc.id,
                    distance: distance,
                    triggerRadius: npc.triggerRadius
                });

                // Immediately start battle with this NPC
                this.startBattle(npc);
                return; // Exit the loop after finding first NPC in range
            }
        });
    }

    startBattle(npc) {
        console.log('[MapScene] Starting battle with NPC:', npc.id);
        
        // Store current NPC state
        const npcState = this.npcs.map(n => ({
            id: n.id,
            x: n.x,
            y: n.y,
            type: n.type
        }));

        // Create black mask for transition
        const mask = this.add.graphics();
        mask.fillStyle(0x000000, 1);
        mask.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Get player position in screen coordinates
        const playerScreenPos = this.cameras.main.getWorldPoint(this.player.x, this.player.y);

        // Animate mask scaling down to player position
        this.tweens.add({
            targets: mask,
            scaleX: 0.1,
            scaleY: 0.1,
            x: playerScreenPos.x,
            y: playerScreenPos.y,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Pause this scene
                this.scene.pause();
                
                // Launch battle scene
                this.scene.launch('BattleScene', {
                    playerData: {
                        x: this.player.x,
                        y: this.player.y,
                        health: 100
                    },
                    npcDataArray: [npc],
                    npcState: npcState,
                    transitionFrom: 'MapScene'
                });
            }
        });
    }

    returnToWorld() {
        console.log('[MapScene] Returning to world');
        
        // Store current NPC state
        const npcState = this.npcs.map(npc => ({
            id: npc.id,
            x: npc.x,
            y: npc.y,
            type: npc.type
        }));

        // Stop this scene
        this.scene.stop();
        
        // Resume WorldScene with NPC state
        this.scene.resume('WorldScene', {
            npcState: npcState,
            returnPosition: this.player ? { x: this.player.x, y: this.player.y } : null
        });
    }

    shutdown() {
        console.log('[MapScene] Running shutdown');
        
        // Clean up tweens and timers
        if (this.playerBlinkTween) {
            this.playerBlinkTween.stop();
            this.playerBlinkTween = null;
        }
        if (this.transitionTimer) {
            this.transitionTimer.destroy();
            this.transitionTimer = null;
        }

        // Remove all event listeners
        this.input.keyboard.removeAllKeys(true);
        this.input.keyboard.removeAllListeners();
        
        super.shutdown();
    }

    handleDefeatedNpcs(defeatedNpcIds) {
        console.log('[MapScene] Handling defeated NPCs:', defeatedNpcIds);
        
        defeatedNpcIds.forEach(npcId => {
            const npc = this.npcs.find(n => n.id === npcId);
            if (npc) {
                console.log(`[MapScene] Starting blink effect for NPC: ${npcId}`);
                
                // Create blink effect
                this.tweens.add({
                    targets: npc,
                    alpha: 0,
                    duration: 200,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        console.log(`[MapScene] Removing defeated NPC: ${npcId}`);
                        npc.destroy();
                        this.npcs = this.npcs.filter(n => n.id !== npcId);
                    }
                });
            }
        });
    }

    resume(sys, data) {
        console.log('[MapScene] Resuming with data:', data);
        
        // Re-enable input system
        this.input.keyboard.enabled = true;
        this.input.mouse.enabled = true;
        
        if (data?.isTransitioning) {
            console.log('[MapScene] Starting transition sequence');
            this.startTransitionSequence();
        }

        if (data?.returnPosition && this.player) {
            console.log('[MapScene] Setting player position to return position:', data.returnPosition);
            this.player.setPosition(data.returnPosition.x, data.returnPosition.y);
            this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
        }

        // If we have battle victory data, process it
        if (data?.battleVictory && data?.defeatedNpcIds) {
            console.log('[MapScene] Processing battle victory, removing defeated NPCs:', data.defeatedNpcIds);
            this.handleDefeatedNpcs(data.defeatedNpcIds);
        }

        // Reset transition state after a short delay
        this.time.delayedCall(1000, () => {
            this.isTransitioning = false;
            console.log('[MapScene] Transition complete, scene is now active');
        });
    }

    update() {
        // Don't update during transition
        if (this.isTransitioning) return;

        // ... rest of update code ...
    }
}