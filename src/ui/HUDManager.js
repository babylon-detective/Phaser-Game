/**
 * HUDManager - Manages all DOM-based HUD elements
 * Uses HTML/CSS for better styling and performance
 */
import { gameStateManager } from '../managers/GameStateManager.js';

export default class HUDManager {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.elements = {};
        this.isVisible = true;
    }

    /**
     * Create the HUD container and all UI elements
     */
    create() {
        console.log('[HUDManager] Creating HUD');
        
        // Get scene key for unique container
        const sceneKey = this.scene.scene.key;
        
        // Create main HUD container with scene-specific ID
        this.container = document.createElement('div');
        this.container.id = `game-hud-${sceneKey.toLowerCase()}`;
        this.container.className = 'hud-container';
        document.body.appendChild(this.container);

        // Create HUD sections based on scene
        if (sceneKey === 'WorldScene') {
            this.createWorldHUD();
        } else if (sceneKey === 'BattleScene') {
            this.createBattleHUD();
        }

        console.log('[HUDManager] HUD created for scene:', sceneKey);
    }

    /**
     * Create HUD elements for WorldScene
     */
    createWorldHUD() {
        // Get player stats from GameStateManager
        const playerStats = gameStateManager.getPlayerStats();

        // Player Stats Panel - HP and Level only
        this.elements.statsPanel = this.createPanel('stats-panel', 'top-left');
        this.elements.statsPanel.innerHTML = `
            <div class="hud-title">Player</div>
            <div class="stat-row">
                <span class="stat-label">HP:</span>
                <div class="stat-bar-container">
                    <div class="stat-bar health-bar" id="player-health-bar"></div>
                </div>
                <span class="stat-value" id="player-health-text">${playerStats.health}/${playerStats.maxHealth}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Level:</span>
                <span class="stat-value" id="player-level">${playerStats.level}</span>
            </div>
        `;

        // Controls Help Panel
        this.elements.controlsPanel = this.createPanel('controls-panel', 'bottom-left');
        this.elements.controlsPanel.innerHTML = `
            <div class="hud-title">Controls</div>
            <div class="control-row"><kbd>WASD</kbd> Move</div>
            <div class="control-row"><kbd>Shift</kbd> Sprint (Hold & Release)</div>
            <div class="control-row"><kbd>M</kbd> Map (time continues)</div>
            <div class="control-row"><kbd>/</kbd> Menu (time continues)</div>
            <div class="control-row"><kbd>Enter</kbd> Pause Game</div>
        `;

        // Mini Status Display (top-right)
        this.elements.statusPanel = this.createPanel('status-panel', 'top-right');
        this.elements.statusPanel.innerHTML = `
            <div class="status-item">
                <span class="status-label">NPCs Defeated:</span>
                <span class="status-value" id="npcs-defeated">0</span>
            </div>
            <div class="status-item">
                <span class="status-label">NPCs Remaining:</span>
                <span class="status-value" id="npcs-remaining">15</span>
            </div>
        `;
    }

    /**
     * Create HUD elements for BattleScene
     */
    createBattleHUD() {
        // Get player stats from GameStateManager
        const playerStats = gameStateManager.getPlayerStats();
        
        // Player Stats (left side) - HP and Level only
        this.elements.playerPanel = this.createPanel('player-panel', 'top-left');
        this.elements.playerPanel.innerHTML = `
            <div class="hud-title">Player</div>
            <div class="stat-row">
                <span class="stat-label">HP:</span>
                <div class="stat-bar-container">
                    <div class="stat-bar health-bar" id="battle-player-health-bar"></div>
                </div>
                <span class="stat-value" id="battle-player-health">${playerStats.health}/${playerStats.maxHealth}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Level:</span>
                <span class="stat-value" id="battle-player-level">${playerStats.level}</span>
            </div>
        `;

        // Enemy Stats (right side) - will be populated dynamically
        this.elements.enemiesPanel = this.createPanel('enemies-panel', 'top-right');
        this.elements.enemiesPanel.innerHTML = `
            <div class="hud-title">Enemies</div>
            <div id="enemy-list"></div>
        `;

        // Battle Controls (bottom-left to match WorldScene)
        this.elements.battleControlsPanel = this.createPanel('battle-controls-panel', 'bottom-left');
        this.elements.battleControlsPanel.innerHTML = `
            <div class="hud-title">Controls</div>
            <div class="control-row"><kbd>WASD</kbd> Move</div>
            <div class="control-row"><kbd>]</kbd> Attack</div>
            <div class="control-row"><kbd>[</kbd> Special (Hold to Charge)</div>
            <div class="control-row"><kbd>Shift</kbd> Dash</div>
            <div class="control-row"><kbd>ESC</kbd> Escape Battle</div>
        `;
    }

    /**
     * Create a panel with specific positioning
     * @param {string} id - Panel ID
     * @param {string} position - Position class (top-left, top-right, bottom-left, etc.)
     * @returns {HTMLElement}
     */
    createPanel(id, position) {
        const panel = document.createElement('div');
        panel.id = id;
        panel.className = `hud-panel ${position}`;
        this.container.appendChild(panel);
        return panel;
    }

    /**
     * Update player health display
     * @param {number} current - Current health
     * @param {number} max - Maximum health
     */
    updatePlayerHealth(current, max) {
        const percentage = (current / max) * 100;
        
        // Update world scene health
        const worldHealthBar = document.getElementById('player-health-bar');
        const worldHealthText = document.getElementById('player-health-text');
        if (worldHealthBar) {
            worldHealthBar.style.width = `${percentage}%`;
        }
        if (worldHealthText) {
            worldHealthText.textContent = `${current}/${max}`;
        }

        // Update battle scene health
        const battleHealthBar = document.getElementById('battle-player-health-bar');
        const battleHealthText = document.getElementById('battle-player-health');
        if (battleHealthBar) {
            battleHealthBar.style.width = `${percentage}%`;
        }
        if (battleHealthText) {
            battleHealthText.textContent = `${current}/${max}`;
        }
    }

    /**
     * Update player level display
     * @param {number} level - Player level
     */
    updatePlayerLevel(level) {
        const levelElement = document.getElementById('player-level');
        const battleLevelElement = document.getElementById('battle-player-level');
        
        if (levelElement) {
            levelElement.textContent = level;
        }
        if (battleLevelElement) {
            battleLevelElement.textContent = level;
        }
    }

    /**
     * Update all player stats from GameStateManager
     * Only updates HP and Level for WorldScene/BattleScene HUDs
     */
    updatePlayerStats() {
        const playerStats = gameStateManager.getPlayerStats();
        
        // Update level
        this.updatePlayerLevel(playerStats.level);
        
        // Update health
        this.updatePlayerHealth(playerStats.health, playerStats.maxHealth);
    }

    /**
     * Update NPC counter
     * @param {number} defeated - Number of defeated NPCs
     * @param {number} remaining - Number of remaining NPCs
     */
    updateNPCCount(defeated, remaining) {
        console.log(`[HUDManager] Updating NPC count: ${defeated} defeated, ${remaining} remaining`);
        
        const defeatedElement = document.getElementById('npcs-defeated');
        const remainingElement = document.getElementById('npcs-remaining');
        
        if (defeatedElement) {
            defeatedElement.textContent = defeated;
            console.log(`[HUDManager] Updated defeated element to: ${defeated}`);
        } else {
            console.warn('[HUDManager] Could not find defeated element');
        }
        
        if (remainingElement) {
            remainingElement.textContent = remaining;
            console.log(`[HUDManager] Updated remaining element to: ${remaining}`);
        } else {
            console.warn('[HUDManager] Could not find remaining element');
        }
    }

    /**
     * Update enemy list in battle
     * @param {Array} enemies - Array of enemy data objects
     */
    updateEnemyList(enemies) {
        const enemyList = document.getElementById('enemy-list');
        if (!enemyList) return;

        enemyList.innerHTML = '';
        
        enemies.forEach((enemy, index) => {
            const enemyElement = document.createElement('div');
            enemyElement.className = 'enemy-item';
            enemyElement.innerHTML = `
                <div class="enemy-name">${enemy.type || 'Enemy'} ${index + 1}</div>
                <div class="stat-row-small">
                    <span class="stat-label-small">HP:</span>
                    <div class="stat-bar-container-small">
                        <div class="stat-bar health-bar" style="width: ${(enemy.health / enemy.maxHealth) * 100}%"></div>
                    </div>
                    <span class="stat-value-small">${enemy.health}/${enemy.maxHealth}</span>
                </div>
                <div class="stat-row-small">
                    <span class="stat-label-small">Lvl:</span>
                    <span class="stat-value-small">${enemy.level || 1}</span>
                </div>
            `;
            enemyList.appendChild(enemyElement);
        });
    }

    /**
     * Show a message notification
     * @param {string} message - Message to display
     * @param {string} type - Message type (info, success, warning, error)
     * @param {number} duration - Duration in ms (0 = permanent)
     */
    showMessage(message, type = 'info', duration = 3000) {
        const messageElement = document.createElement('div');
        messageElement.className = `hud-message message-${type}`;
        messageElement.textContent = message;
        
        this.container.appendChild(messageElement);
        
        // Fade in
        setTimeout(() => messageElement.classList.add('show'), 10);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                messageElement.classList.remove('show');
                setTimeout(() => messageElement.remove(), 300);
            }, duration);
        }
        
        return messageElement;
    }

    /**
     * Show victory message
     */
    showVictory() {
        const victoryElement = document.createElement('div');
        victoryElement.className = 'victory-overlay';
        victoryElement.innerHTML = `
            <div class="victory-content">
                <h1 class="victory-title">VICTORY!</h1>
                <p class="victory-subtitle">All enemies defeated</p>
            </div>
        `;
        this.container.appendChild(victoryElement);
        
        setTimeout(() => victoryElement.classList.add('show'), 10);
        
        return victoryElement;
    }

    /**
     * Show/hide the entire HUD
     * @param {boolean} visible - Whether to show the HUD
     */
    setVisible(visible) {
        this.isVisible = visible;
        if (this.container) {
            this.container.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Clean up and remove all HUD elements
     */
    destroy() {
        console.log('[HUDManager] Destroying HUD');
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        this.elements = {};
    }
}

