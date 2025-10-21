/**
 * Skills Manager
 * Manages player and NPC skills/abilities across all game states
 * Singleton pattern for universal access
 */

class SkillsManager {
    constructor() {
        if (SkillsManager.instance) {
            return SkillsManager.instance;
        }
        SkillsManager.instance = this;

        // Skill database
        this.skillDatabase = {
            // Basic Combat Skills
            'quick_strike': {
                id: 'quick_strike',
                name: 'Quick Strike',
                type: 'combat',
                description: 'A fast attack that deals moderate damage',
                damage: 20,
                cooldown: 1000,
                cost: 5, // Stamina/Energy cost
                unlockLevel: 1,
                icon: '⚡'
            },
            'power_attack': {
                id: 'power_attack',
                name: 'Power Attack',
                type: 'combat',
                description: 'A heavy attack that deals high damage',
                damage: 40,
                cooldown: 3000,
                cost: 15,
                unlockLevel: 3,
                icon: '💥'
            },
            'dash_strike': {
                id: 'dash_strike',
                name: 'Dash Strike',
                type: 'combat',
                description: 'Dash forward and strike the enemy',
                damage: 25,
                cooldown: 2000,
                cost: 10,
                unlockLevel: 5,
                icon: '🗡️'
            },

            // Defensive Skills
            'block': {
                id: 'block',
                name: 'Block',
                type: 'defense',
                description: 'Reduce incoming damage by 50%',
                damageReduction: 0.5,
                duration: 2000,
                cooldown: 5000,
                cost: 8,
                unlockLevel: 2,
                icon: '🛡️'
            },
            'dodge_roll': {
                id: 'dodge_roll',
                name: 'Dodge Roll',
                type: 'defense',
                description: 'Quickly evade attacks',
                duration: 500,
                cooldown: 3000,
                cost: 7,
                unlockLevel: 4,
                icon: '🌀'
            },

            // Utility Skills
            'heal': {
                id: 'heal',
                name: 'Heal',
                type: 'utility',
                description: 'Restore 50 HP',
                healing: 50,
                cooldown: 10000,
                cost: 20,
                unlockLevel: 6,
                icon: '💚'
            },
            'energy_burst': {
                id: 'energy_burst',
                name: 'Energy Burst',
                type: 'utility',
                description: 'Restore 30 energy instantly',
                energyRestore: 30,
                cooldown: 8000,
                cost: 0,
                unlockLevel: 7,
                icon: '⚡'
            },

            // Special Skills
            'fireball': {
                id: 'fireball',
                name: 'Fireball',
                type: 'magic',
                description: 'Launch a fireball projectile',
                damage: 35,
                cooldown: 4000,
                cost: 25,
                unlockLevel: 8,
                icon: '🔥'
            },
            'ice_blast': {
                id: 'ice_blast',
                name: 'Ice Blast',
                type: 'magic',
                description: 'Freeze enemies and deal damage',
                damage: 30,
                slow: 0.5, // 50% slow
                duration: 3000,
                cooldown: 5000,
                cost: 25,
                unlockLevel: 10,
                icon: '❄️'
            }
        };

        // Player's unlocked and equipped skills
        this.playerSkills = {
            unlocked: ['quick_strike'], // Start with basic attack
            equipped: ['quick_strike'], // Currently equipped skills (max 4)
            maxEquipped: 4,
            cooldowns: {} // Track cooldowns per skill
        };

        // Energy system (for skills)
        this.playerEnergy = {
            current: 100,
            max: 100,
            regenRate: 2 // per second
        };

        console.log('[SkillsManager] Initialized');
    }

    /**
     * Get all skills in database
     */
    getAllSkills() {
        return Object.values(this.skillDatabase);
    }

    /**
     * Get skill by ID
     */
    getSkill(skillId) {
        return this.skillDatabase[skillId] || null;
    }

    /**
     * Get player's unlocked skills
     */
    getUnlockedSkills() {
        return this.playerSkills.unlocked.map(id => this.skillDatabase[id]).filter(Boolean);
    }

    /**
     * Get player's equipped skills
     */
    getEquippedSkills() {
        return this.playerSkills.equipped.map(id => this.skillDatabase[id]).filter(Boolean);
    }

    /**
     * Unlock a skill for the player
     */
    unlockSkill(skillId) {
        const skill = this.skillDatabase[skillId];
        if (!skill) {
            console.warn(`[SkillsManager] Skill ${skillId} not found`);
            return false;
        }

        if (this.playerSkills.unlocked.includes(skillId)) {
            console.log(`[SkillsManager] Skill ${skillId} already unlocked`);
            return false;
        }

        this.playerSkills.unlocked.push(skillId);
        console.log(`[SkillsManager] Unlocked skill: ${skill.name}`);
        return true;
    }

    /**
     * Equip a skill (add to hotbar)
     */
    equipSkill(skillId) {
        const skill = this.skillDatabase[skillId];
        if (!skill) {
            console.warn(`[SkillsManager] Skill ${skillId} not found`);
            return { success: false, message: 'Skill not found' };
        }

        if (!this.playerSkills.unlocked.includes(skillId)) {
            return { success: false, message: 'Skill not unlocked' };
        }

        if (this.playerSkills.equipped.includes(skillId)) {
            return { success: false, message: 'Skill already equipped' };
        }

        if (this.playerSkills.equipped.length >= this.playerSkills.maxEquipped) {
            return { success: false, message: 'All skill slots full' };
        }

        this.playerSkills.equipped.push(skillId);
        console.log(`[SkillsManager] Equipped skill: ${skill.name}`);
        return { success: true, message: `Equipped ${skill.name}` };
    }

    /**
     * Unequip a skill (remove from hotbar)
     */
    unequipSkill(skillId) {
        const index = this.playerSkills.equipped.indexOf(skillId);
        if (index === -1) {
            return { success: false, message: 'Skill not equipped' };
        }

        this.playerSkills.equipped.splice(index, 1);
        const skill = this.skillDatabase[skillId];
        console.log(`[SkillsManager] Unequipped skill: ${skill.name}`);
        return { success: true, message: `Unequipped ${skill.name}` };
    }

    /**
     * Check if player can use skill
     */
    canUseSkill(skillId) {
        const skill = this.skillDatabase[skillId];
        if (!skill) return false;

        // Check if unlocked
        if (!this.playerSkills.unlocked.includes(skillId)) {
            return false;
        }

        // Check energy cost
        if (this.playerEnergy.current < skill.cost) {
            return false;
        }

        // Check cooldown
        if (this.isOnCooldown(skillId)) {
            return false;
        }

        return true;
    }

    /**
     * Use a skill (deduct energy, start cooldown)
     */
    useSkill(skillId) {
        const skill = this.skillDatabase[skillId];
        if (!skill) {
            return { success: false, message: 'Skill not found' };
        }

        if (!this.canUseSkill(skillId)) {
            if (this.playerEnergy.current < skill.cost) {
                return { success: false, message: 'Not enough energy' };
            }
            if (this.isOnCooldown(skillId)) {
                const remaining = this.getCooldownRemaining(skillId);
                return { success: false, message: `On cooldown (${(remaining / 1000).toFixed(1)}s)` };
            }
            return { success: false, message: 'Cannot use skill' };
        }

        // Deduct energy
        this.playerEnergy.current -= skill.cost;

        // Start cooldown
        this.playerSkills.cooldowns[skillId] = Date.now() + skill.cooldown;

        console.log(`[SkillsManager] Used skill: ${skill.name}`);
        return { success: true, skill: skill };
    }

    /**
     * Check if skill is on cooldown
     */
    isOnCooldown(skillId) {
        const cooldownEnd = this.playerSkills.cooldowns[skillId];
        if (!cooldownEnd) return false;
        return Date.now() < cooldownEnd;
    }

    /**
     * Get remaining cooldown time in ms
     */
    getCooldownRemaining(skillId) {
        const cooldownEnd = this.playerSkills.cooldowns[skillId];
        if (!cooldownEnd) return 0;
        return Math.max(0, cooldownEnd - Date.now());
    }

    /**
     * Get cooldown progress (0-1)
     */
    getCooldownProgress(skillId) {
        const skill = this.skillDatabase[skillId];
        if (!skill) return 1;

        const remaining = this.getCooldownRemaining(skillId);
        if (remaining === 0) return 1;

        return 1 - (remaining / skill.cooldown);
    }

    /**
     * Regenerate energy (call this every frame/update)
     */
    updateEnergy(deltaTime) {
        const regenAmount = (this.playerEnergy.regenRate * deltaTime) / 1000;
        this.playerEnergy.current = Math.min(
            this.playerEnergy.max,
            this.playerEnergy.current + regenAmount
        );
    }

    /**
     * Get current energy
     */
    getEnergy() {
        return {
            current: Math.floor(this.playerEnergy.current),
            max: this.playerEnergy.max,
            percent: this.playerEnergy.current / this.playerEnergy.max
        };
    }

    /**
     * Restore energy
     */
    restoreEnergy(amount) {
        this.playerEnergy.current = Math.min(
            this.playerEnergy.max,
            this.playerEnergy.current + amount
        );
    }

    /**
     * Auto-unlock skills based on player level
     */
    checkLevelUnlocks(playerLevel) {
        const newUnlocks = [];

        Object.values(this.skillDatabase).forEach(skill => {
            if (skill.unlockLevel <= playerLevel && !this.playerSkills.unlocked.includes(skill.id)) {
                if (this.unlockSkill(skill.id)) {
                    newUnlocks.push(skill);
                }
            }
        });

        return newUnlocks;
    }

    /**
     * Get save data
     */
    getSaveData() {
        return {
            playerSkills: this.playerSkills,
            playerEnergy: this.playerEnergy
        };
    }

    /**
     * Load save data
     */
    loadSaveData(data) {
        if (data.playerSkills) {
            this.playerSkills = { ...this.playerSkills, ...data.playerSkills };
        }
        if (data.playerEnergy) {
            this.playerEnergy = { ...this.playerEnergy, ...data.playerEnergy };
        }
        console.log('[SkillsManager] Loaded save data');
    }

    /**
     * Reset to starting state
     */
    reset() {
        this.playerSkills = {
            unlocked: ['quick_strike'],
            equipped: ['quick_strike'],
            maxEquipped: 4,
            cooldowns: {}
        };
        this.playerEnergy = {
            current: 100,
            max: 100,
            regenRate: 2
        };
        console.log('[SkillsManager] Reset to starting state');
    }
}

// Create and export singleton instance
export const skillsManager = new SkillsManager();

