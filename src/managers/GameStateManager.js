/**
 * GameStateManager - Centralized game state management
 * Tracks universal gameplay time, player stats, NPC states
 * Persists across all scenes
 */

// Import managers for persistence
import { moneyManager } from './MoneyManager.js';
import { itemsManager } from './ItemsManager.js';

export default class GameStateManager {
    constructor() {
        // Initialize as singleton
        if (GameStateManager.instance) {
            return GameStateManager.instance;
        }
        GameStateManager.instance = this;

        // Gameplay timer
        this.gameStartTime = null;
        this.totalPlayTime = 0; // in milliseconds
        this.isPaused = false;
        this.pauseStartTime = null;

        // Player state
        this.playerStats = {
            level: 1,
            experience: 0,
            experienceToNextLevel: 100,
            health: 100,
            maxHealth: 100,
            attack: 10,
            defense: 5,
            speed: 100,
            // Position tracking
            x: 0,
            y: 0
        };

        // NPC states (keyed by NPC ID)
        this.npcStats = {};

        // Defeated NPCs tracking
        this.defeatedNpcIds = new Set();

        // Battle/negotiation history
        this.battleHistory = [];
        this.negotiationHistory = [];

        console.log('[GameStateManager] Initialized singleton instance');
    }

    /**
     * Start the gameplay timer
     */
    startTimer() {
        if (!this.gameStartTime) {
            this.gameStartTime = Date.now();
            console.log('[GameStateManager] Gameplay timer started');
        }
    }

    /**
     * Pause the timer (e.g., when in menus)
     */
    pauseTimer() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pauseStartTime = Date.now();
            console.log('[GameStateManager] Timer paused');
        }
    }

    /**
     * Resume the timer
     */
    resumeTimer() {
        if (this.isPaused) {
            const pauseDuration = Date.now() - this.pauseStartTime;
            this.totalPlayTime += pauseDuration;
            this.isPaused = false;
            this.pauseStartTime = null;
            console.log('[GameStateManager] Timer resumed');
        }
    }

    /**
     * Get current play time in milliseconds
     */
    getPlayTime() {
        if (!this.gameStartTime) return this.totalPlayTime;
        
        const currentTime = Date.now();
        const sessionTime = currentTime - this.gameStartTime;
        
        if (this.isPaused) {
            const pauseDuration = currentTime - this.pauseStartTime;
            return this.totalPlayTime + sessionTime - pauseDuration;
        }
        
        return this.totalPlayTime + sessionTime;
    }

    /**
     * Get formatted play time as HH:MM:SS
     */
    getFormattedPlayTime() {
        const totalSeconds = Math.floor(this.getPlayTime() / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Initialize NPC stats if not already present
     */
    initializeNpcStats(npcId, npcType, baseStats) {
        if (!this.npcStats[npcId]) {
            this.npcStats[npcId] = {
                id: npcId,
                type: npcType,
                level: baseStats.level || 1,
                experience: 0,
                experienceToNextLevel: 50, // NPCs level faster
                health: baseStats.health || 100,
                maxHealth: baseStats.maxHealth || 100,
                attack: baseStats.attack || 8,
                defense: baseStats.defense || 3,
                color: baseStats.color,
                triggerRadius: baseStats.triggerRadius
            };
            console.log(`[GameStateManager] Initialized NPC stats for ${npcId}:`, this.npcStats[npcId]);
        }
        return this.npcStats[npcId];
    }

    /**
     * Get NPC stats by ID
     */
    getNpcStats(npcId) {
        return this.npcStats[npcId] || null;
    }

    /**
     * Update NPC health
     */
    updateNpcHealth(npcId, health) {
        if (this.npcStats[npcId]) {
            this.npcStats[npcId].health = Math.max(0, health);
            console.log(`[GameStateManager] Updated NPC ${npcId} health to ${health}`);
        }
    }

    /**
     * Mark NPC as defeated
     */
    markNpcDefeated(npcId) {
        this.defeatedNpcIds.add(npcId);
        if (this.npcStats[npcId]) {
            this.npcStats[npcId].health = 0;
        }
        console.log(`[GameStateManager] Marked NPC ${npcId} as defeated`);
    }

    /**
     * Check if NPC is defeated
     */
    isNpcDefeated(npcId) {
        return this.defeatedNpcIds.has(npcId);
    }

    /**
     * Get player stats
     */
    getPlayerStats() {
        return { ...this.playerStats };
    }

    /**
     * Update player position
     */
    updatePlayerPosition(x, y) {
        this.playerStats.x = x;
        this.playerStats.y = y;
    }

    /**
     * Update player health
     */
    updatePlayerHealth(health) {
        this.playerStats.health = Math.max(0, Math.min(health, this.playerStats.maxHealth));
        console.log(`[GameStateManager] Player health updated to ${this.playerStats.health}/${this.playerStats.maxHealth}`);
    }

    /**
     * Get all game state data
     */
    getGameState() {
        return {
            playTime: this.getPlayTime(),
            formattedPlayTime: this.getFormattedPlayTime(),
            playerStats: this.getPlayerStats(),
            npcStats: { ...this.npcStats },
            defeatedNpcIds: Array.from(this.defeatedNpcIds),
            battleHistory: [...this.battleHistory],
            negotiationHistory: [...this.negotiationHistory]
        };
    }

    /**
     * Save game state to localStorage
     * @param {Object} playerPosition - {x, y} coordinates of player
     */
    saveGame(playerPosition = null) {
        console.log('[GameStateManager] ========== SAVING GAME ==========');
        console.log('[GameStateManager] Player position to save:', playerPosition);
        
        // Get money and items data
        const mm = moneyManager;
        const im = itemsManager;
        
        const gameState = {
            playTime: this.getPlayTime(),
            playerStats: this.playerStats,
            npcStats: this.npcStats,
            defeatedNpcIds: Array.from(this.defeatedNpcIds),
            battleHistory: this.battleHistory,
            negotiationHistory: this.negotiationHistory,
            playerPosition: playerPosition,
            money: mm ? mm.getSaveData() : { money: 100, transactionHistory: [] },
            items: im ? im.getSaveData() : { inventory: [] },
            savedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem('gameState', JSON.stringify(gameState));
            console.log('[GameStateManager] ✅ Game saved successfully:', gameState);
            console.log('[GameStateManager] LocalStorage key "gameState" set');
            
            // Verify save
            const verification = localStorage.getItem('gameState');
            console.log('[GameStateManager] Verification - data exists in localStorage:', !!verification);
            
            return true;
        } catch (e) {
            console.error('[GameStateManager] ❌ Failed to save game:', e);
            return false;
        } finally {
            console.log('[GameStateManager] =====================================');
        }
    }

    /**
     * Load game state from localStorage
     * @returns {Object|null} - Loaded game state with player position, or null if no save exists
     */
    loadGame() {
        console.log('[GameStateManager] ========== LOADING GAME ==========');
        const savedState = localStorage.getItem('gameState');
        
        if (savedState) {
            const gameState = JSON.parse(savedState);
            console.log('[GameStateManager] Raw loaded data:', gameState);
            
            this.totalPlayTime = gameState.playTime || 0;
            this.playerStats = gameState.playerStats || this.playerStats;
            this.npcStats = gameState.npcStats || {};
            this.defeatedNpcIds = new Set(gameState.defeatedNpcIds || []);
            this.battleHistory = gameState.battleHistory || [];
            this.negotiationHistory = gameState.negotiationHistory || [];
            
            // Restore money and items
            const mm = moneyManager;
            const im = itemsManager;
            
            if (mm && gameState.money) {
                mm.loadSaveData(gameState.money);
            }
            
            if (im && gameState.items) {
                im.loadSaveData(gameState.items);
            }
            
            console.log('[GameStateManager] ✅ State restored:');
            console.log('  - Play time:', this.totalPlayTime, 'ms');
            console.log('  - Player stats:', this.playerStats);
            console.log('  - Defeated NPCs:', Array.from(this.defeatedNpcIds));
            console.log('  - Player position:', gameState.playerPosition);
            console.log('  - Money:', mm ? mm.getMoney() : 'N/A');
            console.log('  - Items:', im ? im.getInventory().length : 'N/A', 'types');
            console.log('[GameStateManager] =====================================');
            
            return {
                success: true,
                playerPosition: gameState.playerPosition || null,
                defeatedNpcIds: Array.from(this.defeatedNpcIds)
            };
        }
        
        console.log('[GameStateManager] ⚠️ No save data found');
        console.log('[GameStateManager] =====================================');
        return { success: false };
    }

    /**
     * Reset game state
     */
    resetGame() {
        this.gameStartTime = null;
        this.totalPlayTime = 0;
        this.isPaused = false;
        this.pauseStartTime = null;
        
        this.playerStats = {
            level: 1,
            experience: 0,
            experienceToNextLevel: 100,
            health: 100,
            maxHealth: 100,
            attack: 10,
            defense: 5,
            speed: 100,
            x: 0,
            y: 0
        };
        
        this.npcStats = {};
        this.defeatedNpcIds = new Set();
        this.battleHistory = [];
        this.negotiationHistory = [];
        
        // Reset money and items
        const mm = moneyManager;
        const im = itemsManager;
        
        if (mm) mm.reset();
        if (im) im.reset();
        
        localStorage.removeItem('gameState');
        console.log('[GameStateManager] Game state reset (including money and items)');
    }
}

// Create singleton instance
const gameStateManager = new GameStateManager();
export { gameStateManager };

