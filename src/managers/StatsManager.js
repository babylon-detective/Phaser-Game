/**
 * StatsManager - Experience and Leveling System
 * Handles XP calculation, level-ups, stat scaling
 */
import { gameStateManager } from './GameStateManager.js';

export default class StatsManager {
    constructor() {
        // Experience formulas
        this.playerXpMultiplier = 1.5;
        this.npcXpMultiplier = 1.3;
        
        // Stat growth rates per level
        this.playerStatGrowth = {
            maxHealth: 10,      // +10 HP per level
            attack: 2,          // +2 attack per level
            defense: 1,         // +1 defense per level
            speed: 5            // +5 speed per level
        };
        
        this.npcStatGrowth = {
            maxHealth: 8,
            attack: 1.5,
            defense: 0.5,
            speed: 3
        };

        // XP rewards
        this.battleXpBase = 50;
        this.negotiationXpBase = 30;
        this.levelDifferenceMultiplier = 0.2; // +20% XP per level difference
        
        // NPC type XP multipliers
        this.npcTypeXpMultipliers = {
            VILLAGER: 1.0,   // Base XP
            MERCHANT: 1.3,   // 30% more XP
            GUARD: 1.5       // 50% more XP
        };
    }

    /**
     * Calculate experience required for next level
     * @param {number} currentLevel 
     * @param {boolean} isPlayer 
     */
    calculateXpForNextLevel(currentLevel, isPlayer = true) {
        const multiplier = isPlayer ? this.playerXpMultiplier : this.npcXpMultiplier;
        return Math.floor(100 * Math.pow(currentLevel, multiplier));
    }

    /**
     * Calculate XP reward from battle
     * @param {number} defeatedLevel - Level of defeated entity
     * @param {number} victorLevel - Level of victor
     * @param {string} defeatedType - Type of defeated NPC (VILLAGER, MERCHANT, GUARD)
     */
    calculateBattleXp(defeatedLevel, victorLevel, defeatedType = 'VILLAGER') {
        const levelDiff = defeatedLevel - victorLevel;
        const levelMultiplier = 1 + (levelDiff * this.levelDifferenceMultiplier);
        const typeMultiplier = this.npcTypeXpMultipliers[defeatedType] || 1.0;
        
        const xp = Math.floor(
            this.battleXpBase * 
            defeatedLevel * 
            Math.max(0.5, levelMultiplier) * 
            typeMultiplier
        );
        
        console.log(`[StatsManager] XP Calculation:`, {
            baseXP: this.battleXpBase,
            defeatedLevel,
            defeatedType,
            levelMultiplier: Math.max(0.5, levelMultiplier),
            typeMultiplier,
            finalXP: Math.max(10, xp)
        });
        
        return Math.max(10, xp); // Minimum 10 XP
    }

    /**
     * Calculate XP reward from negotiation
     * @param {number} npcLevel 
     * @param {number} playerLevel 
     * @param {string} outcome - 'success' or 'failure'
     */
    calculateNegotiationXp(npcLevel, playerLevel, outcome = 'success') {
        const baseXp = outcome === 'success' ? this.negotiationXpBase : this.negotiationXpBase * 0.5;
        const levelDiff = npcLevel - playerLevel;
        const multiplier = 1 + (levelDiff * this.levelDifferenceMultiplier);
        return Math.floor(baseXp * Math.max(0.5, multiplier));
    }

    /**
     * Add experience to player and check for level up
     * @param {number} xpGained 
     * @returns {object} { leveledUp: boolean, newLevel: number, statsGained: object }
     */
    addPlayerExperience(xpGained) {
        const playerStats = gameStateManager.playerStats;
        playerStats.experience += xpGained;
        
        console.log(`[StatsManager] Player gained ${xpGained} XP (${playerStats.experience}/${playerStats.experienceToNextLevel})`);

        // Check for level up
        const result = {
            leveledUp: false,
            newLevel: playerStats.level,
            statsGained: {},
            xpGained: xpGained
        };

        while (playerStats.experience >= playerStats.experienceToNextLevel) {
            result.leveledUp = true;
            playerStats.experience -= playerStats.experienceToNextLevel;
            playerStats.level += 1;
            result.newLevel = playerStats.level;

            // Apply stat increases
            const oldMaxHealth = playerStats.maxHealth;
            playerStats.maxHealth += this.playerStatGrowth.maxHealth;
            playerStats.attack += this.playerStatGrowth.attack;
            playerStats.defense += this.playerStatGrowth.defense;
            playerStats.speed += this.playerStatGrowth.speed;
            
            // Heal to new max health
            playerStats.health = playerStats.maxHealth;

            // Calculate next level XP requirement
            playerStats.experienceToNextLevel = this.calculateXpForNextLevel(playerStats.level, true);

            result.statsGained = {
                maxHealth: playerStats.maxHealth - oldMaxHealth,
                attack: this.playerStatGrowth.attack,
                defense: this.playerStatGrowth.defense,
                speed: this.playerStatGrowth.speed
            };

            console.log(`[StatsManager] 🎉 PLAYER LEVEL UP! Level ${result.newLevel}`, result.statsGained);
        }

        return result;
    }

    /**
     * Add experience to NPC and check for level up
     * @param {string} npcId 
     * @param {number} xpGained 
     * @returns {object} { leveledUp: boolean, newLevel: number, statsGained: object }
     */
    addNpcExperience(npcId, xpGained) {
        const npcStats = gameStateManager.getNpcStats(npcId);
        if (!npcStats) {
            console.warn(`[StatsManager] NPC ${npcId} not found in game state`);
            return { leveledUp: false };
        }

        npcStats.experience += xpGained;
        
        console.log(`[StatsManager] NPC ${npcId} gained ${xpGained} XP (${npcStats.experience}/${npcStats.experienceToNextLevel})`);

        const result = {
            leveledUp: false,
            newLevel: npcStats.level,
            statsGained: {},
            xpGained: xpGained
        };

        while (npcStats.experience >= npcStats.experienceToNextLevel) {
            result.leveledUp = true;
            npcStats.experience -= npcStats.experienceToNextLevel;
            npcStats.level += 1;
            result.newLevel = npcStats.level;

            // Apply stat increases
            const oldMaxHealth = npcStats.maxHealth;
            npcStats.maxHealth += this.npcStatGrowth.maxHealth;
            npcStats.attack += this.npcStatGrowth.attack;
            npcStats.defense += this.npcStatGrowth.defense;
            npcStats.speed += this.npcStatGrowth.speed;
            
            // Heal to new max health
            npcStats.health = npcStats.maxHealth;

            // Calculate next level XP requirement
            npcStats.experienceToNextLevel = this.calculateXpForNextLevel(npcStats.level, false);

            result.statsGained = {
                maxHealth: npcStats.maxHealth - oldMaxHealth,
                attack: this.npcStatGrowth.attack,
                defense: this.npcStatGrowth.defense,
                speed: this.npcStatGrowth.speed
            };

            console.log(`[StatsManager] 🎉 NPC ${npcId} LEVEL UP! Level ${result.newLevel}`, result.statsGained);
        }

        return result;
    }

    /**
     * Process battle rewards (XP to both sides)
     * @param {object} battleResult 
     * @returns {object} XP and level up information
     */
    processBattleRewards(battleResult) {
        const { victor, defeated, victorIsPlayer } = battleResult;
        
        // Calculate XP with type multiplier
        const xpReward = this.calculateBattleXp(
            defeated.level, 
            victor.level, 
            defeated.type || 'VILLAGER'
        );
        
        let victorResult, defeatedResult;
        
        if (victorIsPlayer) {
            victorResult = this.addPlayerExperience(xpReward);
            defeatedResult = this.addNpcExperience(defeated.id, Math.floor(xpReward * 0.3)); // Defeated gets 30% XP
        } else {
            victorResult = this.addNpcExperience(victor.id, xpReward);
            defeatedResult = this.addPlayerExperience(Math.floor(xpReward * 0.3));
        }

        return {
            victor: victorResult,
            defeated: defeatedResult,
            xpReward: xpReward
        };
    }

    /**
     * Process negotiation rewards
     * @param {object} negotiationResult 
     * @returns {object} XP information
     */
    processNegotiationRewards(negotiationResult) {
        const { playerLevel, npcId, npcLevel, outcome } = negotiationResult;
        
        const xpReward = this.calculateNegotiationXp(npcLevel, playerLevel, outcome);
        
        const playerResult = this.addPlayerExperience(xpReward);
        const npcResult = this.addNpcExperience(npcId, Math.floor(xpReward * 0.5));

        return {
            player: playerResult,
            npc: npcResult,
            xpReward: xpReward
        };
    }

    /**
     * Calculate damage with level and stats
     * @param {number} baseAttack 
     * @param {number} attackerLevel 
     * @param {number} defenderDefense 
     * @param {number} defenderLevel 
     */
    calculateDamage(baseAttack, attackerLevel, defenderDefense, defenderLevel) {
        // Base damage with level scaling
        const levelScaling = 1 + (attackerLevel * 0.05); // +5% per level
        const scaledAttack = baseAttack * levelScaling;
        
        // Defense reduction
        const defenseReduction = defenderDefense * (1 + (defenderLevel * 0.03)); // +3% per level
        
        // Final damage (minimum 1)
        const damage = Math.max(1, Math.floor(scaledAttack - defenseReduction));
        
        console.log(`[StatsManager] Damage calc: ${baseAttack} ATK (Lvl ${attackerLevel}) vs ${defenderDefense} DEF (Lvl ${defenderLevel}) = ${damage} damage`);
        
        return damage;
    }

    /**
     * Get player's current stats with level bonuses
     */
    getPlayerCombatStats() {
        const stats = gameStateManager.getPlayerStats();
        return {
            health: stats.health,
            maxHealth: stats.maxHealth,
            attack: stats.attack,
            defense: stats.defense,
            speed: stats.speed,
            level: stats.level
        };
    }

    /**
     * Get NPC's current stats with level bonuses
     */
    getNpcCombatStats(npcId) {
        const stats = gameStateManager.getNpcStats(npcId);
        if (!stats) return null;
        
        return {
            health: stats.health,
            maxHealth: stats.maxHealth,
            attack: stats.attack,
            defense: stats.defense,
            speed: stats.speed,
            level: stats.level
        };
    }
}

// Export singleton instance
const statsManager = new StatsManager();
export { statsManager };

