export default class PartyManager {
    constructor(scene) {
        this.scene = scene;
        this.partyMembers = []; // Array of recruited party members
        this.maxPartySize = 4; // Player + 3 recruitable characters
        this.followDistance = 50; // Distance between following characters
        this.recruitableNPCs = new Map(); // Map of recruitable NPCs
    }

    init() {
        console.log('[PartyManager] Initializing party system');
        
        // Create recruitable NPCs in the world
        this.createRecruitableNPCs();
    }

    createRecruitableNPCs() {
        console.log('[PartyManager] Creating recruitable NPCs');

        // Define recruitable character data
        const recruitables = [
            {
                id: 'warrior',
                name: 'Warrior',
                color: 0x808080, // Gray body like player
                indicatorColor: 0x0000ff, // Blue indicator
                x: 500,
                y: 400,
                abilities: ['powerStrike', 'defend'],
                stats: {
                    health: 120,
                    attack: 15,
                    defense: 10,
                    level: 1
                },
                dialogue: {
                    initial: "Greetings traveler! I'm a warrior seeking adventure. Will you let me join your party?",
                    accept: "Excellent! I'll fight by your side!",
                    reject: "Very well, perhaps another time."
                }
            },
            {
                id: 'mage',
                name: 'Mage',
                color: 0x808080,
                indicatorColor: 0xffff00, // Yellow indicator
                x: 700,
                y: 500,
                abilities: ['fireball', 'heal'],
                stats: {
                    health: 80,
                    attack: 20,
                    defense: 5,
                    level: 1
                },
                dialogue: {
                    initial: "I sense great potential in you. May I join your journey?",
                    accept: "Together, our magic will be unstoppable!",
                    reject: "I understand. Safe travels."
                }
            },
            {
                id: 'ranger',
                name: 'Ranger',
                color: 0x808080,
                indicatorColor: 0x00ff00, // Green indicator
                x: 400,
                y: 600,
                abilities: ['quickShot', 'dodge'],
                stats: {
                    health: 100,
                    attack: 12,
                    defense: 8,
                    level: 1
                },
                dialogue: {
                    initial: "You look like you could use a skilled ranger. Want some company?",
                    accept: "Great! My bow is at your service!",
                    reject: "No problem, good luck out there."
                }
            }
        ];

        // Create each recruitable NPC
        recruitables.forEach(data => {
            this.createRecruitableNPC(data);
        });
    }

    createRecruitableNPC(data) {
        // Create NPC body (gray rectangle like player)
        const npc = this.scene.add.rectangle(data.x, data.y, 32, 64, data.color);
        this.scene.physics.add.existing(npc);
        npc.body.setCollideWorldBounds(true);
        npc.body.setImmovable(true);

        // Create direction indicator with unique color
        const indicator = this.scene.add.rectangle(
            data.x,
            data.y - 40,
            10,
            10,
            data.indicatorColor
        );
        indicator.setDepth(1000);

        // Create battle trigger zone (like regular NPCs) - circular with stroke
        const triggerRadius = 80;
        const triggerZone = this.scene.add.circle(data.x, data.y, triggerRadius);
        triggerZone.setStrokeStyle(2, data.indicatorColor, 0.5); // Visible circle
        this.scene.physics.add.existing(triggerZone);
        triggerZone.body.setAllowGravity(false);
        triggerZone.body.setImmovable(true);
        triggerZone.body.setCircle(triggerRadius);

        // Store NPC data in standard format for NPC manager compatibility
        npc.npcData = {
            id: data.id,
            type: data.name.toUpperCase(),
            name: data.name,
            health: data.stats.health,
            maxHealth: data.stats.health,
            level: data.stats.level,
            color: data.color,
            indicatorColor: data.indicatorColor,
            abilities: data.abilities,
            stats: data.stats,
            dialogue: data.dialogue,
            isRecruitableCharacter: true,
            isRecruited: false,
            triggerRadius: triggerRadius
        };

        npc.triggerZone = triggerZone;

        // Store in our map
        const npcData = {
            gameObject: npc,
            indicator: indicator,
            triggerZone: triggerZone,
            id: data.id,
            name: data.name,
            indicatorColor: data.indicatorColor,
            abilities: data.abilities,
            stats: data.stats,
            dialogue: data.dialogue,
            isRecruited: false,
            isRecruitableCharacter: true
        };

        this.recruitableNPCs.set(data.id, npcData);

        console.log(`[PartyManager] Created recruitable NPC: ${data.name} at (${data.x}, ${data.y})`);
    }

    // Called from BattleScene when player chooses to recruit
    recruitFromBattle(npcId) {
        console.log('[PartyManager] ========== RECRUIT FROM BATTLE ==========');
        console.log('[PartyManager] Attempting to recruit NPC ID:', npcId);
        console.log('[PartyManager] Current party members count:', this.partyMembers.length);
        
        const npcData = this.recruitableNPCs.get(npcId);
        if (!npcData) {
            console.error(`[PartyManager] ❌ Cannot find recruitable NPC: ${npcId}`);
            return { success: false, message: 'Character not found' };
        }

        console.log('[PartyManager] Found NPC data:', npcData.name);
        
        if (npcData.isRecruited) {
            console.log('[PartyManager] ⚠️ NPC already recruited');
            return { success: false, message: `${npcData.name} is already in your party!` };
        }

        // Check if party is full
        if (this.partyMembers.length >= this.maxPartySize - 1) {
            console.log('[PartyManager] ⚠️ Party is full');
            return { success: false, message: 'Your party is full!' };
        }

        // Mark as recruited
        npcData.isRecruited = true;
        npcData.gameObject.npcData.isRecruited = true;

        // Add to party members
        this.partyMembers.push(npcData);
        console.log('[PartyManager] ✅ Added to party members array');
        console.log('[PartyManager] New party members count:', this.partyMembers.length);

        // Completely disable and hide the trigger zone (no more battles)
        if (npcData.triggerZone) {
            npcData.triggerZone.setVisible(false);
            npcData.triggerZone.setActive(false);
            if (npcData.triggerZone.body) {
                npcData.triggerZone.body.enable = false;
                this.scene.physics.world.disable(npcData.triggerZone);
            }
            // Remove the stroke to make it completely invisible
            npcData.triggerZone.setStrokeStyle(0, 0x000000, 0);
        }

        // Position the character near the player for smooth follow start
        const player = this.scene.playerManager.player;
        if (player) {
            const followIndex = this.partyMembers.length;
            npcData.gameObject.setPosition(
                player.x - (followIndex * this.followDistance),
                player.y
            );
        }

        // Make sure they're visible and active
        npcData.gameObject.setVisible(true);
        npcData.gameObject.setActive(true);
        npcData.indicator.setVisible(true);
        npcData.indicator.setActive(true);

        console.log(`[PartyManager] Successfully recruited ${npcData.name}! Party size: ${this.partyMembers.length + 1}/4`);

        // Save to game state
        this.savePartyToGameState();

        return {
            success: true,
            message: `${npcData.name} joined your party!`,
            memberData: {
                id: npcData.id,
                name: npcData.name,
                indicatorColor: npcData.indicatorColor,
                abilities: npcData.abilities,
                stats: { ...npcData.stats },
                color: npcData.gameObject.fillColor
            }
        };
    }
    
    savePartyToGameState() {
        // Save party data to gameStateManager for persistence
        const partyData = this.partyMembers.map(member => ({
            id: member.id,
            name: member.name,
            indicatorColor: member.indicatorColor,
            abilities: member.abilities,
            stats: { ...member.stats }
        }));
        
        // This will be used when saving/loading the game
        console.log('[PartyManager] Saved party to state:', partyData);
    }

    // Get recruitable NPC by ID (for battle scene)
    getRecruitableNPC(npcId) {
        return this.recruitableNPCs.get(npcId);
    }

    // Check if NPC is recruitable
    isRecruitableNPC(npcId) {
        return this.recruitableNPCs.has(npcId);
    }

    getColorHex(color) {
        return '#' + color.toString(16).padStart(6, '0');
    }
    
    // Get all recruitable NPCs (for NPC manager integration)
    getRecruitableNPCObjects() {
        const npcs = [];
        this.recruitableNPCs.forEach((npcData) => {
            if (!npcData.isRecruited) {
                npcs.push(npcData.gameObject);
            }
        });
        return npcs;
    }

    update() {
        if (this.partyMembers.length === 0) return;

        const player = this.scene.playerManager.player;
        if (!player) return;

        // Update party member positions to follow player
        this.partyMembers.forEach((member, index) => {
            if (!member.gameObject || !member.gameObject.active) return;

            // Make sure recruited members are visible and following
            if (!member.gameObject.visible) {
                member.gameObject.setVisible(true);
                member.indicator.setVisible(true);
            }

            // Calculate follow position
            const followIndex = index + 1; // 0 is player
            const targetX = player.x - (followIndex * this.followDistance);
            const targetY = player.y;

            // Move towards target position
            const dx = targetX - member.gameObject.x;
            const dy = targetY - member.gameObject.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 10) {
                const speed = 0.1;
                member.gameObject.x += dx * speed;
                member.gameObject.y += dy * speed;

                // Update indicator position
                member.indicator.setPosition(
                    member.gameObject.x,
                    member.gameObject.y - 40
                );

                // Keep trigger zone hidden (they don't trigger battles anymore)
                // Trigger zone stays at original position but disabled
            }
        });
    }

    getPartyForBattle() {
        console.log('[PartyManager] ========== GET PARTY FOR BATTLE ==========');
        console.log('[PartyManager] Party members array:', this.partyMembers);
        console.log('[PartyManager] Party members count:', this.partyMembers.length);
        
        // Return array of party members for battle scene
        const battleData = this.partyMembers.map((member, index) => {
            console.log(`[PartyManager] Processing member ${index + 1}:`, member.name);
            console.log(`[PartyManager]   - ID: ${member.id}`);
            console.log(`[PartyManager]   - GameObject exists: ${!!member.gameObject}`);
            console.log(`[PartyManager]   - GameObject fillColor: 0x${member.gameObject?.fillColor?.toString(16)}`);
            console.log(`[PartyManager]   - Indicator color: 0x${member.indicatorColor?.toString(16)}`);
            console.log(`[PartyManager]   - Stats:`, member.stats);
            
            return {
                id: member.id,
                name: member.name,
                color: member.gameObject.fillColor,
                indicatorColor: member.indicatorColor,
                abilities: member.abilities,
                stats: { ...member.stats }
            };
        });
        
        console.log('[PartyManager] Battle data prepared:', battleData);
        console.log('[PartyManager] =============================================');
        
        return battleData;
    }
    
    /**
     * Handle recruitment success after returning from BattleScene
     * This method is called by WorldScene to update the world state
     * after a successful recruitment
     */
    handleRecruitmentSuccess(recruitedNpcId) {
        console.log(`[PartyManager] Handling recruitment success in WorldScene for: ${recruitedNpcId}`);
        
        const npcData = this.recruitableNPCs.get(recruitedNpcId);
        if (!npcData) {
            console.error(`[PartyManager] Cannot find recruited NPC: ${recruitedNpcId}`);
            return;
        }
        
        // IMPORTANT: Keep the NPC's game object and indicator VISIBLE
        // They need to be visible to follow the player!
        if (npcData.gameObject) {
            npcData.gameObject.setVisible(true);
            npcData.gameObject.setActive(true);
            
            // Position near player to start following
            const player = this.scene.playerManager?.player;
            if (player) {
                const followIndex = this.partyMembers.length;
                npcData.gameObject.setPosition(
                    player.x - (followIndex * this.followDistance),
                    player.y
                );
            }
        }
        
        if (npcData.indicator) {
            npcData.indicator.setVisible(true);
            npcData.indicator.setActive(true);
            
            // Position indicator above the character
            if (npcData.gameObject) {
                npcData.indicator.setPosition(
                    npcData.gameObject.x,
                    npcData.gameObject.y - 40
                );
            }
        }
        
        // Disable the trigger zone (no more battles with this NPC)
        if (npcData.triggerZone) {
            npcData.triggerZone.setVisible(false);
            npcData.triggerZone.setActive(false);
            npcData.triggerZone.setStrokeStyle(0, 0x000000, 0);
            if (npcData.triggerZone.body) {
                npcData.triggerZone.body.enable = false;
                this.scene.physics.world.disable(npcData.triggerZone);
            }
        }
        
        console.log(`[PartyManager] ${npcData.name} is now visible and following player in WorldScene`);
    }

    cleanup() {
        console.log('[PartyManager] Cleaning up');
        
        // Remove recruitment overlay if it exists
        const overlay = document.getElementById('recruitment-overlay');
        if (overlay) {
            overlay.remove();
        }

        // Clean up recruitable NPCs
        this.recruitableNPCs.forEach(npcData => {
            if (npcData.gameObject) npcData.gameObject.destroy();
            if (npcData.indicator) npcData.indicator.destroy();
            if (npcData.triggerZone) npcData.triggerZone.destroy();
        });

        this.recruitableNPCs.clear();
        this.partyMembers = [];
    }
}

