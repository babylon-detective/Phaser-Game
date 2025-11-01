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
        this.npcTypes = [];
        this.defeatedNpcIds = new Set(); // Track defeated NPCs
        this.lastBattleTime = 0;
        this.battleCooldownTime = 5000; // 5 seconds cooldown between battles

        // Default spawn configuration
        this.spawnConfig = {
            totalNPCs: 5,
            minDistanceBetweenNPCs: 50,
            spawnAttempts: 50,
            spawnOnGroundOnly: true,
            spawnRadius: 100
        };

        console.log('NpcManager: Initialized with default spawn config:', this.spawnConfig);

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

        // Fixed NPC Spawn Locations - These NPCs will always spawn at the same positions
        // Each NPC has a permanent unique ID based on its position in this array
        this.fixedNpcSpawns = [
            // Area 1: Village Center
            { id: 'npc_village_guard_1', type: 'GUARD', x: 200, y: 250, behavior: 'patrol' },
            { id: 'npc_village_merchant_1', type: 'MERCHANT', x: 350, y: 280, behavior: 'stationary' },
            { id: 'npc_village_villager_1', type: 'VILLAGER', x: 450, y: 220, behavior: 'wander' },
            { id: 'npc_village_villager_2', type: 'VILLAGER', x: 280, y: 180, behavior: 'wander' },
            
            // Area 2: East Side
            { id: 'npc_east_guard_1', type: 'GUARD', x: 650, y: 300, behavior: 'patrol' },
            { id: 'npc_east_villager_1', type: 'VILLAGER', x: 750, y: 250, behavior: 'wander' },
            { id: 'npc_east_merchant_1', type: 'MERCHANT', x: 850, y: 320, behavior: 'stationary' },
            
            // Area 3: South Side  
            { id: 'npc_south_guard_1', type: 'GUARD', x: 400, y: 500, behavior: 'patrol' },
            { id: 'npc_south_villager_1', type: 'VILLAGER', x: 300, y: 450, behavior: 'wander' },
            { id: 'npc_south_villager_2', type: 'VILLAGER', x: 500, y: 480, behavior: 'wander' },
            
            // Area 4: North Side
            { id: 'npc_north_guard_1', type: 'GUARD', x: 600, y: 100, behavior: 'patrol' },
            { id: 'npc_north_villager_1', type: 'VILLAGER', x: 450, y: 80, behavior: 'wander' },
            { id: 'npc_north_merchant_1', type: 'MERCHANT', x: 750, y: 120, behavior: 'stationary' },
            
            // Area 5: Southeast Outpost (1800px lower-right from South cluster) - Large Settlement
            // Guards (6) - Patrol perimeter
            { id: 'npc_southeast_guard_1', type: 'GUARD', x: 2150, y: 1450, behavior: 'patrol' },
            { id: 'npc_southeast_guard_2', type: 'GUARD', x: 2280, y: 1380, behavior: 'patrol' },
            { id: 'npc_southeast_guard_3', type: 'GUARD', x: 2100, y: 1550, behavior: 'patrol' },
            { id: 'npc_southeast_guard_4', type: 'GUARD', x: 2320, y: 1500, behavior: 'patrol' },
            { id: 'npc_southeast_guard_5', type: 'GUARD', x: 2180, y: 1350, behavior: 'patrol' },
            { id: 'npc_southeast_guard_6', type: 'GUARD', x: 2250, y: 1580, behavior: 'patrol' },
            
            // Merchants (3) - Stationary market area
            { id: 'npc_southeast_merchant_1', type: 'MERCHANT', x: 2220, y: 1520, behavior: 'stationary' },
            { id: 'npc_southeast_merchant_2', type: 'MERCHANT', x: 2160, y: 1480, behavior: 'stationary' },
            { id: 'npc_southeast_merchant_3', type: 'MERCHANT', x: 2280, y: 1450, behavior: 'stationary' },
            
            // Villagers (9) - Wander throughout settlement
            { id: 'npc_southeast_villager_1', type: 'VILLAGER', x: 2080, y: 1500, behavior: 'wander' },
            { id: 'npc_southeast_villager_2', type: 'VILLAGER', x: 2350, y: 1470, behavior: 'wander' },
            { id: 'npc_southeast_villager_3', type: 'VILLAGER', x: 2200, y: 1420, behavior: 'wander' },
            { id: 'npc_southeast_villager_4', type: 'VILLAGER', x: 2140, y: 1540, behavior: 'wander' },
            { id: 'npc_southeast_villager_5', type: 'VILLAGER', x: 2300, y: 1380, behavior: 'wander' },
            { id: 'npc_southeast_villager_6', type: 'VILLAGER', x: 2190, y: 1560, behavior: 'wander' },
            { id: 'npc_southeast_villager_7', type: 'VILLAGER', x: 2120, y: 1430, behavior: 'wander' },
            { id: 'npc_southeast_villager_8', type: 'VILLAGER', x: 2330, y: 1520, behavior: 'wander' },
            { id: 'npc_southeast_villager_9', type: 'VILLAGER', x: 2240, y: 1410, behavior: 'wander' },
            
            // Additional NPCs for variety
            { id: 'npc_extra_villager_1', type: 'VILLAGER', x: 150, y: 400, behavior: 'wander' },
            { id: 'npc_extra_guard_1', type: 'GUARD', x: 900, y: 200, behavior: 'patrol' }
        ];
        
        console.log(`NpcManager: Loaded ${this.fixedNpcSpawns.length} fixed NPC spawn locations`);

        console.log('NpcManager: Configuration loaded', {
            npcTypes: Object.keys(this.npcTypes),
            spawnConfig: this.spawnConfig
        });
    }

    init(config) {
        console.log('NpcManager: Initializing with config:', config);
        this.npcTypes = config.npcTypes || [];
        this.spawnConfig = {
            ...this.spawnConfig, // Keep default values
            ...config.spawnConfig // Override with provided values
        };
        
        // Convert defeatedNpcIds array to Set if provided
        if (config.defeatedNpcIds) {
            this.defeatedNpcIds = new Set(config.defeatedNpcIds);
            console.log('NpcManager: Initialized with defeated NPCs:', Array.from(this.defeatedNpcIds));
        } else {
            this.defeatedNpcIds = new Set();
        }
        
        console.log('NpcManager: Updated spawn config:', this.spawnConfig);
    }

    create() {
        console.log('[NpcManager] Create method called');
        
        // Clear existing NPCs if any
        if (this.npcs) {
            this.npcs.forEach(npc => {
                if (npc.triggerZone) npc.triggerZone.destroy();
                npc.destroy();
            });
            this.npcs = [];
        }

        console.log('[NpcManager] Starting fixed NPC generation from predefined spawn points');
        console.log('[NpcManager] Total spawn points:', this.fixedNpcSpawns.length);
        console.log('[NpcManager] Defeated NPCs:', Array.from(this.defeatedNpcIds));
        
        // Spawn NPCs from fixed spawn locations
        let spawnedCount = 0;
        
        this.fixedNpcSpawns.forEach((spawnData, index) => {
            // Check if this NPC was previously defeated
            if (this.defeatedNpcIds.has(spawnData.id)) {
                console.log(`[NpcManager] Skipping defeated NPC: ${spawnData.id}`);
                return;
            }
            
            // Spawn the NPC at its fixed location
            const npc = this.spawnFixedNPC(spawnData);
            if (npc) {
                this.npcs.push(npc);
                spawnedCount++;
                console.log(`[NpcManager] Spawned ${spawnData.type} at (${spawnData.x}, ${spawnData.y}) - ID: ${spawnData.id}`);
            }
        });

        console.log(`[NpcManager] Generation complete. Spawned ${spawnedCount} out of ${this.fixedNpcSpawns.length} NPCs`);
        console.log(`[NpcManager] Active NPCs: ${this.npcs.length}, Defeated: ${this.defeatedNpcIds.size}`);
    }

    isValidSpawnPosition(worldX, worldY, playerX, playerY) {
        // Check if position is within map bounds
        if (!this.scene.physics.world.bounds.contains(worldX, worldY)) {
            return false;
        }

        // Check if position is too close to player
        const distanceToPlayer = Phaser.Math.Distance.Between(worldX, worldY, playerX, playerY);
        if (distanceToPlayer < this.minimumDistanceFromPlayer) {
            return false;
        }

        // Check if position is on a valid ground tile
        if (this.spawnConfig.spawnOnGroundOnly) {
            const groundLayer = this.scene.map.getLayer('Ground').tilemapLayer;
            const tile = groundLayer.getTileAtWorldXY(worldX, worldY);
            if (!tile || tile.index === -1) {
                return false;
            }
        }

        // Check if position is not on a wall
        const wallsLayer = this.scene.map.getLayer('Walls').tilemapLayer;
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
        if (!this.npcTypes || Object.keys(this.npcTypes).length === 0) {
            console.error('NpcManager: No NPC types available');
            return 'GUARD'; // Default fallback
        }

        const types = Object.keys(this.npcTypes);
        const weights = types.map(type => this.npcTypes[type].spawnWeight || 1);
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
        if (!this.npcTypes || !this.npcTypes[npcType]) {
            console.error(`NpcManager: Invalid NPC type: ${npcType}`);
            return 'stationary'; // Default fallback
        }

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

    spawnFixedNPC(spawnData) {
        const { id, type, x, y, behavior } = spawnData;
        console.log(`NpcManager: Creating fixed NPC ${id} of type ${type} at (${x}, ${y})`);
        
        const npcConfig = this.npcTypes[type];
        if (!npcConfig) {
            console.error(`NpcManager: Unknown NPC type: ${type}`);
            return null;
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

        // Add unique properties to the NPC with FIXED ID
        npc.npcData = {
            id: id, // Use the fixed ID from spawn data
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

        console.log(`NpcManager: Fixed NPC created successfully - ID: ${id}, Type: ${type}, Position: (${x}, ${y})`);
        return npc;
    }
    
    // Legacy method kept for backward compatibility (but not used in fixed spawn system)
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
            id: `npc_random_${Date.now()}_${Math.random()}`,
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

        console.log(`NpcManager: NPC created successfully - ID: ${npc.npcData.id}, Type: ${type}, Position: (${x.toFixed(0)}, ${y.toFixed(0)})`);
        return npc;
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

        // Check battle cooldown
        const currentTime = this.scene.time.now;
        if (currentTime - this.lastBattleTime < this.battleCooldownTime) {
            return;
        }

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

        // Set battle cooldown
        this.lastBattleTime = this.scene.time.now;
        
        console.log(`[NpcManager] Starting battle with ${availableNPCs.length} NPCs:`, 
            availableNPCs.map(npc => `${npc.npcData.type} (ID: ${npc.npcData.id})`));
        
        // Call WorldScene.startBattle() which handles party data
        const npcDataArray = availableNPCs.map(npc => npc.npcData);
        this.scene.startBattle(npcDataArray);

        // Set cooldown for all participating NPCs
        availableNPCs.forEach(npc => {
            this.cooldowns.set(npc.npcData.id, this.cooldownDuration);
            this.scene.time.delayedCall(this.cooldownDuration, () => {
                this.cooldowns.delete(npc.npcData.id);
            });
        });
    }

    handleBattleEnd() {
        console.log('[NpcManager] Handling battle end - setting cooldown');
        
        // Set the flag to prevent immediate battle trigger
        this.isReturningFromBattle = true;
        
        // Reset the battle cooldown timer to NOW (when battle ended)
        // This ensures the full cooldown period applies from battle end, not start
        this.lastBattleTime = this.scene.time.now;
        
        // Remove the flag after a short delay to allow player to move away
        this.scene.time.delayedCall(1000, () => {
            this.isReturningFromBattle = false;
            console.log('[NpcManager] Battle return flag cleared');
        });
    }
    
    resetNpcs() {
        console.log('[NpcManager] Resetting NPCs after escape');
        // This is called when player escapes from battle
        // Just need to handle the battle end cooldown
        this.handleBattleEnd();
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

    // Add method to remove defeated NPCs
    removeDefeatedNpcs(defeatedNpcIds) {
        console.log('[NpcManager] Removing defeated NPCs:', defeatedNpcIds);
        
        // Add new defeated NPCs to the set
        defeatedNpcIds.forEach(id => this.defeatedNpcIds.add(id));
        console.log('[NpcManager] Updated defeated NPCs set:', Array.from(this.defeatedNpcIds));
        
        defeatedNpcIds.forEach(id => {
            const npcIndex = this.npcs.findIndex(npc => npc.npcData.id === id);
            if (npcIndex !== -1) {
                const npc = this.npcs[npcIndex];
                
                // Remove trigger zone if it exists
                if (npc.triggerZone) {
                    npc.triggerZone.destroy();
                }
                
                // Remove the NPC
                npc.destroy();
                
                // Remove from array
                this.npcs.splice(npcIndex, 1);
                
                // Remove from cooldowns
                this.cooldowns.delete(id);
                
                console.log(`[NpcManager] Removed NPC with ID: ${id}`);
            }
        });
        
        console.log(`[NpcManager] Remaining NPCs: ${this.npcs.length}`);
    }

    markNpcAsDefeated(npcId) {
        console.log(`[NpcManager] Marking NPC ${npcId} as defeated`);
        
        // Add the NPC ID to the defeated set
        this.defeatedNpcIds.add(npcId);
        console.log('[NpcManager] Updated defeated NPCs:', Array.from(this.defeatedNpcIds));
        
        // Remove the NPC from the scene
        const npc = this.npcs.find(n => n.npcData.id === npcId);
        if (npc) {
            // Remove trigger zone if it exists
            if (npc.triggerZone) {
                npc.triggerZone.destroy();
            }
            
            // Destroy the NPC
            npc.destroy();
            
            // Remove from array
            this.npcs = this.npcs.filter(n => n.npcData.id !== npcId);
            
            // Remove from cooldowns
            this.cooldowns.delete(npcId);
            
            console.log(`[NpcManager] Successfully removed NPC ${npcId} from scene`);
        } else {
            console.log(`[NpcManager] NPC ${npcId} not found in scene`);
        }
    }

    getNpcData() {
        return {
            npcTypes: this.npcTypes,
            spawnConfig: this.spawnConfig,
            defeatedNpcIds: Array.from(this.defeatedNpcIds)
        };
    }

    updateDefeatedNpcs(defeatedNpcIds) {
        console.log('[NpcManager] Updating defeated NPCs:', defeatedNpcIds);
        console.log('[NpcManager] Current NPCs in scene:', this.npcs.map(n => n.npcData.id));
        
        // Add new defeated NPCs to the set
        defeatedNpcIds.forEach(id => this.defeatedNpcIds.add(id));
        console.log('[NpcManager] Updated defeated NPCs set:', Array.from(this.defeatedNpcIds));
        
        // Remove defeated NPCs from the scene immediately
        const npcsToRemove = this.npcs.filter(npc => {
            const shouldRemove = defeatedNpcIds.includes(npc.npcData.id);
            console.log(`[NpcManager] NPC ${npc.npcData.id}: shouldRemove = ${shouldRemove}`);
            return shouldRemove;
        });
        
        console.log(`[NpcManager] Found ${npcsToRemove.length} NPCs to remove:`, npcsToRemove.map(n => n.npcData.id));
        
        npcsToRemove.forEach(npc => {
            console.log(`[NpcManager] Removing defeated NPC from scene: ${npc.npcData.id} at position (${npc.x}, ${npc.y})`);
            
            // Remove trigger zone if it exists
            if (npc.triggerZone) {
                console.log(`[NpcManager] Destroying trigger zone for ${npc.npcData.id}`);
                npc.triggerZone.destroy();
            }
            
            // Destroy the NPC sprite
            console.log(`[NpcManager] Destroying sprite for ${npc.npcData.id}`);
            npc.destroy();
            
            // Remove from cooldowns
            this.cooldowns.delete(npc.npcData.id);
        });
        
        // Update the NPCs array to exclude defeated NPCs
        const beforeLength = this.npcs.length;
        this.npcs = this.npcs.filter(npc => !defeatedNpcIds.includes(npc.npcData.id));
        const afterLength = this.npcs.length;
        
        console.log(`[NpcManager] Removed ${npcsToRemove.length} defeated NPCs. NPCs array: ${beforeLength} -> ${afterLength}`);
        console.log(`[NpcManager] Remaining NPC IDs:`, this.npcs.map(n => n.npcData.id));
    }

    /**
     * Update NPC health after battle
     * @param {Array} healthUpdates - Array of {id, health, maxHealth} objects
     */
    updateNpcHealth(healthUpdates) {
        console.log('[NpcManager] Updating NPC health:', healthUpdates);
        
        healthUpdates.forEach(update => {
            const npc = this.npcs.find(n => n.npcData.id === update.id);
            
            if (npc) {
                const oldHealth = npc.npcData.health;
                npc.npcData.health = update.health;
                npc.npcData.maxHealth = update.maxHealth;
                
                console.log(`[NpcManager] Updated NPC ${update.id} health: ${oldHealth} -> ${update.health}/${update.maxHealth}`);
                
                // Optional: Visual feedback for damaged NPCs
                if (update.health < update.maxHealth) {
                    // Tint the NPC slightly red to indicate damage
                    const damagePercent = update.health / update.maxHealth;
                    if (damagePercent < 0.5) {
                        npc.setAlpha(0.8); // More transparent when heavily damaged
                    }
                }
            } else {
                console.warn(`[NpcManager] Could not find NPC with ID: ${update.id}`);
            }
        });
        
        console.log('[NpcManager] Health update complete');
    }
}
