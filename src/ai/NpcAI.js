/**
 * NPC Artificial Intelligence Module
 * Handles AI behaviors for NPCs in both WorldScene and BattleScene
 */

export class NpcAI {
    constructor() {
        // AI difficulty settings
        this.difficulty = {
            easy: { reactionTime: 1000, accuracy: 0.6, aggressiveness: 0.3 },
            normal: { reactionTime: 600, accuracy: 0.75, aggressiveness: 0.6 },
            hard: { reactionTime: 300, accuracy: 0.9, aggressiveness: 0.9 }
        };

        this.currentDifficulty = 'normal';
    }

    /**
     * Get AI profile for NPC type
     */
    getAIProfile(npcType) {
        const profiles = {
            GUARD: {
                worldBehavior: 'patrol',
                battleBehavior: 'aggressive',
                detectionRadius: 200,
                aggroRadius: 150,
                chaseSpeed: 1.2,
                combatStyle: 'tactical',
                attackFrequency: 0.7,
                dodgeChance: 0.4,
                preferredRange: 'close',
                intelligence: 'high'
            },
            MERCHANT: {
                worldBehavior: 'stationary',
                battleBehavior: 'defensive',
                detectionRadius: 150,
                aggroRadius: 80,
                chaseSpeed: 0.8,
                combatStyle: 'cautious',
                attackFrequency: 0.3,
                dodgeChance: 0.6,
                preferredRange: 'far',
                intelligence: 'medium'
            },
            VILLAGER: {
                worldBehavior: 'wander',
                battleBehavior: 'passive',
                detectionRadius: 120,
                aggroRadius: 60,
                chaseSpeed: 0.9,
                combatStyle: 'panic',
                attackFrequency: 0.2,
                dodgeChance: 0.3,
                preferredRange: 'far',
                intelligence: 'low'
            }
        };

        return profiles[npcType] || profiles.VILLAGER;
    }

    /**
     * Set AI difficulty
     */
    setDifficulty(difficulty) {
        if (this.difficulty[difficulty]) {
            this.currentDifficulty = difficulty;
            console.log('[NpcAI] Difficulty set to:', difficulty);
        }
    }

    /**
     * Get difficulty settings
     */
    getDifficulty() {
        return this.difficulty[this.currentDifficulty];
    }
}

// Singleton instance
export const npcAI = new NpcAI();

