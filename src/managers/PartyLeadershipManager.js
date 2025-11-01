/**
 * PartyLeadershipManager - Centralized party order and leadership system
 * Manages character hierarchy, leadership rotation, and data sync across scenes
 * Works as singleton to ensure consistent state
 */

export default class PartyLeadershipManager {
    constructor() {
        // Singleton pattern
        if (PartyLeadershipManager.instance) {
            return PartyLeadershipManager.instance;
        }
        PartyLeadershipManager.instance = this;

        /**
         * Party array - ordered list of all characters
         * Index 0 is ALWAYS the current leader
         * Structure: [
         *   { 
         *     id: 'player' or npcId,
         *     name: 'Player' or NPC name,
         *     type: 'player' or 'npc',
         *     sprite: gameObject reference (set by scene),
         *     indicator: indicator reference (set by scene),
         *     stats: { health, maxHealth, attack, defense, level },
         *     abilities: ['ability1', 'ability2'],
         *     color: 0xHEXCOLOR,
         *     indicatorColor: 0xHEXCOLOR
         *   },
         *   ...
         * ]
         */
        this.party = [];

        /**
         * Original player data - stored permanently
         * This is the character created at game start
         */
        this.originalPlayerData = {
            id: 'player',
            name: 'Player',
            type: 'player',
            stats: {
                health: 100,
                maxHealth: 100,
                attack: 10,
                defense: 5,
                level: 1
            },
            abilities: ['quick_strike'],
            color: 0x808080,
            indicatorColor: 0xff0000
        };

        console.log('[PartyLeadershipManager] Initialized singleton instance');
    }

    /**
     * Initialize party with player as leader
     * Called by WorldScene on create
     */
    initializeParty(playerSprite, playerIndicator) {
        if (this.party.length === 0) {
            // First time initialization - player is leader
            this.party.push({
                ...this.originalPlayerData,
                sprite: playerSprite,
                indicator: playerIndicator
            });
            console.log('[PartyLeadershipManager] Party initialized with Player as leader');
        } else {
            // Re-entering scene - update sprite references
            this.party.forEach(member => {
                if (member.id === 'player') {
                    member.sprite = playerSprite;
                    member.indicator = playerIndicator;
                }
                // NPC sprites will be updated when they're recruited/restored
            });
            console.log('[PartyLeadershipManager] Party sprite references updated');
        }
        this.logPartyOrder();
    }

    /**
     * Add a new party member (recruited NPC)
     * They're added to the END of the party array
     */
    addPartyMember(npcData) {
        if (this.party.length >= 4) {
            console.warn('[PartyLeadershipManager] Party is full!');
            return false;
        }

        // Check if already in party
        if (this.party.some(m => m.id === npcData.id)) {
            console.warn(`[PartyLeadershipManager] ${npcData.name} is already in party`);
            return false;
        }

        // Add to party
        this.party.push({
            id: npcData.id,
            name: npcData.name,
            type: 'npc',
            sprite: npcData.gameObject || npcData.sprite,
            indicator: npcData.indicator,
            stats: { ...npcData.stats },
            abilities: [...npcData.abilities],
            color: npcData.color || 0x808080,
            indicatorColor: npcData.indicatorColor || 0x00ff00
        });

        console.log(`[PartyLeadershipManager] ✅ ${npcData.name} joined the party!`);
        this.logPartyOrder();
        return true;
    }

    /**
     * Rotate leadership left (Q key / D-pad Left)
     * Current leader moves to the back, next member becomes leader
     */
    rotateLeft() {
        if (this.party.length < 2) {
            console.log('[PartyLeadershipManager] Need at least 2 party members to rotate');
            return null;
        }

        // Move first character to end
        const formerLeader = this.party.shift();
        this.party.push(formerLeader);

        console.log(`[PartyLeadershipManager] ⬅️ Rotated left: ${this.getLeader().name} is now leader`);
        this.logPartyOrder();

        return this.getLeader();
    }

    /**
     * Rotate leadership right (E key / D-pad Right)
     * Last member becomes leader, current leader moves back one position
     */
    rotateRight() {
        if (this.party.length < 2) {
            console.log('[PartyLeadershipManager] Need at least 2 party members to rotate');
            return null;
        }

        // Move last character to front
        const newLeader = this.party.pop();
        this.party.unshift(newLeader);

        console.log(`[PartyLeadershipManager] ➡️ Rotated right: ${this.getLeader().name} is now leader`);
        this.logPartyOrder();

        return this.getLeader();
    }

    /**
     * Get current leader (always index 0)
     */
    getLeader() {
        return this.party[0] || null;
    }

    /**
     * Get all followers (everyone except index 0)
     */
    getFollowers() {
        return this.party.slice(1);
    }

    /**
     * Get full party array
     */
    getParty() {
        return [...this.party];
    }

    /**
     * Get party size
     */
    getPartySize() {
        return this.party.length;
    }

    /**
     * Update sprite reference for a specific party member
     * Used when transitioning between scenes
     */
    updateSpriteReference(memberId, sprite, indicator = null) {
        const member = this.party.find(m => m.id === memberId);
        if (member) {
            member.sprite = sprite;
            if (indicator) {
                member.indicator = indicator;
            }
            console.log(`[PartyLeadershipManager] Updated sprite for ${member.name}`);
        }
    }

    /**
     * Update stats for a party member
     */
    updateMemberStats(memberId, stats) {
        const member = this.party.find(m => m.id === memberId);
        if (member) {
            member.stats = { ...member.stats, ...stats };
            console.log(`[PartyLeadershipManager] Updated stats for ${member.name}:`, member.stats);
        }
    }

    /**
     * Get party data for BattleScene
     * Returns array in leadership order (leader first)
     */
    getPartyForBattle() {
        return this.party.map(member => ({
            id: member.id,
            name: member.name,
            type: member.type,
            stats: { ...member.stats },
            abilities: [...member.abilities],
            color: member.color,
            indicatorColor: member.indicatorColor
        }));
    }

    /**
     * Get save data for persistence
     */
    getSaveData() {
        return {
            party: this.party.map(member => ({
                id: member.id,
                name: member.name,
                type: member.type,
                stats: { ...member.stats },
                abilities: [...member.abilities],
                color: member.color,
                indicatorColor: member.indicatorColor
                // Note: sprite references are NOT saved - they're scene-specific
            })),
            originalPlayerData: { ...this.originalPlayerData }
        };
    }

    /**
     * Load save data
     */
    loadSaveData(data) {
        if (data.party) {
            this.party = data.party.map(member => ({
                ...member,
                sprite: null, // Will be set by scene
                indicator: null // Will be set by scene
            }));
            console.log('[PartyLeadershipManager] Loaded party data:', this.party.length, 'members');
        }
        if (data.originalPlayerData) {
            this.originalPlayerData = { ...data.originalPlayerData };
        }
        this.logPartyOrder();
    }

    /**
     * Debug: log current party order
     */
    logPartyOrder() {
        console.log('[PartyLeadershipManager] ========== PARTY ORDER ==========');
        this.party.forEach((member, index) => {
            const role = index === 0 ? '👑 LEADER' : `   Follower ${index}`;
            console.log(`  [${index}] ${role}: ${member.name} (${member.id})`);
        });
        console.log('[PartyLeadershipManager] =====================================');
    }

    /**
     * Reset party to initial state (player only)
     */
    reset() {
        this.party = [];
        this.originalPlayerData = {
            id: 'player',
            name: 'Player',
            type: 'player',
            stats: {
                health: 100,
                maxHealth: 100,
                attack: 10,
                defense: 5,
                level: 1
            },
            abilities: ['quick_strike'],
            color: 0x808080,
            indicatorColor: 0xff0000
        };
        console.log('[PartyLeadershipManager] Party reset to initial state');
    }
}

// Create singleton instance
const partyLeadershipManager = new PartyLeadershipManager();
export { partyLeadershipManager };

