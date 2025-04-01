import Phaser from "phaser";

export default class NpcManager {
    constructor(scene) {
        this.scene = scene;
        this.npcs = [];
        this.interactionRadius = 100; // Radius for NPC interaction
        this.battleCooldown = false; // Add cooldown flag
        this.cooldownDuration = 4000; // 4 seconds cooldown
        this.cooldowns = new Map();
        this.isReturningFromBattle = false;
        this.playerStartPosition = { x: 100, y: 100 }; // Example player start position
        this.minimumDistanceFromPlayer = 200; // Minimum distance from player

        console.log('NpcManager: Initialized');

        // NPC Types Configuration
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
                spawnWeight: 2 // Higher weight means more likely to spawn
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

        // NPC Placement Configuration
        this.npcPlacements = {
            // Single NPCs at specific locations
            SINGLE_NPCS: [
                { type: 'GUARD', x: 500, y: 350, behavior: 'patrol' },
                { type: 'MERCHANT', x: 1200, y: 350, behavior: 'stationary' }
            ],
            // NPC Clusters with overlapping trigger zones
            CLUSTERS: [
                {
                    center: { x: 800, y: 400 },
                    radius: 100,
                    npcs: [
                        { type: 'VILLAGER', count: 3, spacing: 40 },
                        { type: 'GUARD', count: 1, spacing: 60 }
                    ]
                },
                {
                    center: { x: 1200, y: 600 },
                    radius: 150,
                    npcs: [
                        { type: 'VILLAGER', count: 5, spacing: 35 },
                        { type: 'GUARD', count: 2, spacing: 50 }
                    ]
                }
            ]
        };

        // Spawn configuration
        this.spawnConfig = {
            totalNPCs: 5, // Reduced for testing
            minDistanceBetweenNPCs: 50,
            spawnAttempts: 50,
            spawnOnGroundOnly: true,
            spawnRadius: 100 // Reduced radius to keep NPCs closer
        };

        console.log('NpcManager: Configuration loaded', {
            npcTypes: Object.keys(this.npcTypes),
            spawnConfig: this.spawnConfig
        });
    }

    create() {
        console.log('NpcManager: Create method called');
        if (!this.scene.map) {
            console.error('NpcManager: No map found in scene!');
            return;
        }
        console.log('NpcManager: Map found, starting NPC generation');
        
        // Store map reference for later use
        this.map = this.scene.map;
        
        // Generate random NPCs
        this.generateRandomNPCs();
    }

    generateRandomNPCs() {
        console.log('NpcManager: Starting random NPC generation');
        if (!this.map) {
            console.error('NpcManager: No tilemap found in scene');
            return;
        }

        const groundLayer = this.map.getLayer('Ground').tilemapLayer;
        const wallsLayer = this.map.getLayer('Walls').tilemapLayer;
        
        if (!groundLayer || !wallsLayer) {
            console.error('NpcManager: Missing required map layers!');
            return;
        }

        console.log('NpcManager: Map layers found, proceeding with spawn');
        
        let spawnedCount = 0;
        let attempts = 0;

        // Get player position for relative spawning
        const playerPosition = this.scene.playerManager.getPlayerPosition();
        const playerX = playerPosition.x;
        const playerY = playerPosition.y;

        console.log(`NpcManager: Player position - X: ${playerX}, Y: ${playerY}`);

        while (spawnedCount < this.spawnConfig.totalNPCs && attempts < this.spawnConfig.spawnAttempts) {
            // Generate position relative to player
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.spawnConfig.spawnRadius + this.minimumDistanceFromPlayer;
            const worldX = playerX + Math.cos(angle) * distance;
            const worldY = playerY + Math.sin(angle) * distance;

            console.log(`NpcManager: Attempting spawn at X: ${worldX.toFixed(0)}, Y: ${worldY.toFixed(0)}`);

            // Check if position is valid
            if (this.isValidSpawnPosition(worldX, worldY, groundLayer, wallsLayer)) {
                const npcType = this.getRandomNPCType();
                console.log(`NpcManager: Selected NPC type: ${npcType}`);
                this.spawnNPC(worldX, worldY, npcType, this.getRandomBehavior(npcType));
                spawnedCount++;
                console.log(`NpcManager: Successfully spawned ${npcType} at (${worldX.toFixed(0)}, ${worldY.toFixed(0)})`);
            } else {
                console.log('NpcManager: Invalid spawn position, trying another location');
            }

            attempts++;
        }

        console.log(`NpcManager: Generation complete. Spawned ${spawnedCount} NPCs after ${attempts} attempts`);
        console.log('NpcManager: Current NPCs:', this.npcs.map(npc => ({
            type: npc.npcData.type,
            position: `(${npc.x.toFixed(0)}, ${npc.y.toFixed(0)})`
        })));
    }

    isValidSpawnPosition(worldX, worldY, groundLayer, wallsLayer) {
        // Check if position is within map bounds
        if (!this.scene.physics.world.bounds.contains(worldX, worldY)) {
            return false;
        }

        // Check if position is on a valid ground tile
        if (this.spawnConfig.spawnOnGroundOnly) {
            const tile = groundLayer.getTileAtWorldXY(worldX, worldY);
            if (!tile || tile.index === -1) {
                return false;
            }
        }

        // Check if position is not on a wall
        const wallTile = wallsLayer.getTileAtWorldXY(worldX, worldY);
        if (wallTile && wallTile.index !== -1) {
            return false;
        }

        // Check distance from other NPCs
        for (const npc of this.npcs) {
            const distance = Phaser.Math.Distance.Between(worldX, worldY, npc.x, npc.y);
            if (distance < this.spawnConfig.minDistanceBetweenNPCs) {
                return false;
            }
        }

        return true;
    }

    getRandomNPCType() {
        const types = Object.keys(this.npcTypes);
        const weights = types.map(type => this.npcTypes[type].spawnWeight);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        
        let random = Math.random() * totalWeight;
        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return types[i];
            }
        }
        
        return types[types.length - 1]; // Fallback to last type
    }

    getRandomBehavior(npcType) {
        const npcConfig = this.npcTypes[npcType];
        const behaviors = ['patrol', 'wander', 'stationary'];
        
        // If NPC type has a default behavior, use it 70% of the time
        if (npcConfig.behavior && Math.random() < 0.7) {
            return npcConfig.behavior;
        }
        
        // Otherwise, choose random behavior
        return behaviors[Math.floor(Math.random() * behaviors.length)];
    }

    spawnCluster(clusterConfig) {
        const { center, radius, npcs } = clusterConfig;
        
        npcs.forEach(npcConfig => {
            for (let i = 0; i < npcConfig.count; i++) {
                // Calculate position in a circle around the center
                const angle = (i * 2 * Math.PI) / npcConfig.count;
                const distance = radius * (0.5 + Math.random() * 0.5); // Random distance between 50% and 100% of radius
                const x = center.x + Math.cos(angle) * distance;
                const y = center.y + Math.sin(angle) * distance;
                
                this.spawnNPC(x, y, npcConfig.type, 'wander');
            }
        });
    }

    spawnNPC(x, y, type, behavior) {
        console.log(`NpcManager: Creating NPC of type ${type} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
        
        const npcConfig = this.npcTypes[type];
        if (!npcConfig) {
            console.error(`NpcManager: Unknown NPC type: ${type}`);
            return;
        }

        const npc = this.scene.add.rectangle(
            x,
            y,
            npcConfig.size.width,
            npcConfig.size.height,
            npcConfig.color
        );

        // Make NPCs more visible
        npc.setStrokeStyle(2, 0xffffff);
        npc.setDepth(1);
        npc.setAlpha(1);
        npc.setOrigin(0.5); // Center the rectangle

        this.scene.physics.add.existing(npc);
        npc.body.setCollideWorldBounds(true);
        npc.body.setBounce(0.1);
        npc.body.setDamping(true);
        npc.body.setDrag(0.95);

        // Add unique properties to the NPC
        npc.npcData = {
            id: `npc_${this.npcs.length}`,
            type: type,
            health: npcConfig.health,
            level: npcConfig.level,
            behavior: behavior,
            triggerRadius: npcConfig.triggerRadius,
            patrolRadius: npcConfig.patrolRadius,
            originalX: x,
            originalY: y,
            lastMoveTime: 0,
            moveDirection: 1,
            color: npcConfig.color
        };

        // Add trigger zone visualization
        const triggerZone = this.scene.add.circle(x, y, npcConfig.triggerRadius, 0x00ff00, 0.2);
        triggerZone.setDepth(0);
        npc.triggerZone = triggerZone;

        this.npcs.push(npc);
        console.log(`NpcManager: NPC created successfully - ID: ${npc.npcData.id}, Type: ${type}, Position: (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }

    update() {
        this.npcs.forEach(npc => {
            this.updateNPCBehavior(npc);
            this.updateTriggerZone(npc);
        });
    }

    updateNPCBehavior(npc) {
        const { behavior, patrolRadius, originalX, originalY } = npc.npcData;
        const currentTime = this.scene.time.now;

        switch (behavior) {
            case 'patrol':
                // Patrol behavior
                const distanceFromOrigin = Phaser.Math.Distance.Between(
                    npc.x, npc.y,
                    originalX, originalY
                );

                if (distanceFromOrigin > patrolRadius) {
                    npc.npcData.moveDirection *= -1;
                }

                npc.body.setVelocityX(100 * npc.npcData.moveDirection);
                break;

            case 'wander':
                // Wander behavior
                if (currentTime - npc.npcData.lastMoveTime > 3000) {
                    npc.npcData.moveDirection = Math.random() > 0.5 ? 1 : -1;
                    npc.npcData.lastMoveTime = currentTime;
                }
                npc.body.setVelocityX(50 * npc.npcData.moveDirection);
                break;

            case 'stationary':
                // Stationary behavior
                npc.body.setVelocityX(0);
                break;
        }
    }

    updateTriggerZone(npc) {
        if (npc.triggerZone) {
            npc.triggerZone.setPosition(npc.x, npc.y);
        }
    }

    checkInteraction(player) {
        if (this.isReturningFromBattle) {
            return;
        }

        // console.log('[NpcManager] Checking interactions with player at:', {
        //     x: player.x,
        //     y: player.y
        // });

        // Find all NPCs that are connected through overlapping trigger radii
        const connectedNPCs = this.findConnectedNPCs(player);
        
        if (connectedNPCs.length > 0) {
            console.log(`[NpcManager] Found ${connectedNPCs.length} connected NPCs:`, 
                connectedNPCs.map(npc => `${npc.npcData.type} (ID: ${npc.npcData.id})`));
            this.startBattle(connectedNPCs);
        }
    }

    findConnectedNPCs(player) {
        const connectedNPCs = new Set();
        const queue = [];
        
        // First, find NPCs directly overlapping with player
        const initialNPCs = this.npcs.filter(npc => {
            const distance = Phaser.Math.Distance.Between(
                player.x, player.y,
                npc.x, npc.y
            );
            return distance <= npc.npcData.triggerRadius;
        });

        // Add initial NPCs to queue and connected set
        initialNPCs.forEach(npc => {
            queue.push(npc);
            connectedNPCs.add(npc);
        });

        // Process queue to find all connected NPCs
        while (queue.length > 0) {
            const currentNPC = queue.shift();
            
            // Find all NPCs that overlap with current NPC
            this.npcs.forEach(otherNPC => {
                if (!connectedNPCs.has(otherNPC)) {
                    const distance = Phaser.Math.Distance.Between(
                        currentNPC.x, currentNPC.y,
                        otherNPC.x, otherNPC.y
                    );
                    
                    // Check if trigger radii overlap
                    const combinedRadius = currentNPC.npcData.triggerRadius + otherNPC.npcData.triggerRadius;
                    if (distance <= combinedRadius) {
                        connectedNPCs.add(otherNPC);
                        queue.push(otherNPC);
                    }
                }
            });
        }

        return Array.from(connectedNPCs);
    }

    startBattle(npcs) {
        // Check if any of the NPCs are on cooldown
        const availableNPCs = npcs.filter(npc => !this.cooldowns.has(npc.npcData.id));
        
        if (availableNPCs.length === 0) {
            console.log('[NpcManager] All overlapping NPCs are on cooldown');
            return;
        }

        console.log(`[NpcManager] Starting battle with ${availableNPCs.length} NPCs:`, 
            availableNPCs.map(npc => `${npc.npcData.type} (ID: ${npc.npcData.id})`));
        
        // Store player data for battle
        const playerData = {
            x: this.scene.playerManager.player.x,
            y: this.scene.playerManager.player.y,
            health: 100,
            level: 1
        };

        // Start battle scene with all available NPCs
        this.scene.scene.pause('WorldScene');
        this.scene.scene.launch('BattleScene', { 
            playerData: playerData,
            npcDataArray: availableNPCs.map(npc => npc.npcData)
        });

        // Set cooldown for all participating NPCs
        availableNPCs.forEach(npc => {
            this.cooldowns.set(npc.npcData.id, this.cooldownDuration);
            this.scene.time.delayedCall(this.cooldownDuration, () => {
                this.cooldowns.delete(npc.npcData.id);
            });
        });
    }

    handleBattleEnd() {
        this.isReturningFromBattle = true;
        this.scene.time.delayedCall(1000, () => {
            this.isReturningFromBattle = false;
        });
    }

    spawnRandomNPC() {
        let x, y;
        do {
            x = Phaser.Math.Between(0, this.scene.physics.world.bounds.width);
            y = Phaser.Math.Between(0, this.scene.physics.world.bounds.height);
        } while (this.isTooCloseToPlayer(x, y));

        const type = Phaser.Math.RND.pick(['red', 'green']);
        const behavior = Phaser.Math.RND.pick(['patrol', 'idle']);
        this.spawnNPC(x, y, type, behavior);
    }

    isTooCloseToPlayer(x, y) {
        const dx = x - this.playerStartPosition.x;
        const dy = y - this.playerStartPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.minimumDistanceFromPlayer;
    }

    isPlayerInTriggerRadius() {
        if (!this.player || !this.npcs) return false;
        
        for (const npc of this.npcs) {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                npc.x, npc.y
            );
            
            // Check if player is within this NPC's trigger radius
            if (distance <= npc.triggerRadius) {
                return true;
            }
        }
        
        return false;
    }
}
