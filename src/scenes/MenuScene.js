import Phaser from "phaser";
import { gameStateManager } from "../managers/GameStateManager.js";

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.menuContainer = null;
        this.timerInterval = null;
    }

    init(data) {
        console.log('[MenuScene] Initializing with data:', data);
        this.playerPosition = data?.playerPosition || null;
        this.worldScene = this.scene.get('WorldScene');
    }

    create() {
        console.log('[MenuScene] Creating menu scene');

        // Pause the game timer
        gameStateManager.pauseTimer();

        // Create dark overlay
        this.createOverlay();

        // Create zoom effect on player
        this.createPlayerZoom();

        // Create DOM UI
        this.createMenuUI();

        // Add / and ESC key handlers to close menu
        const slashKey = this.input.keyboard.addKey(191); // Forward slash keyCode
        slashKey.on('down', () => {
            console.log('[MenuScene] Closing menu with /');
            this.closeMenu();
        });
        
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey.on('down', () => {
            console.log('[MenuScene] Closing menu with ESC');
            this.closeMenu();
        });

        // Start timer update interval
        this.startTimerUpdate();
    }

    createOverlay() {
        // Create semi-transparent dark overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        overlay.setScrollFactor(0);
        overlay.setDepth(1000);
    }

    createPlayerZoom() {
        if (!this.worldScene || !this.worldScene.playerManager || !this.worldScene.playerManager.player) {
            console.warn('[MenuScene] No player found for visual representation');
            return;
        }

        const worldPlayer = this.worldScene.playerManager.player;
        
        // Hide the actual player sprite in WorldScene
        worldPlayer.setVisible(false);
        
        // Create a visual representation of the player in MenuScene (center, 2x size)
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Create player sprite representation (same color/size as world player)
        this.playerSprite = this.add.rectangle(
            centerX,
            centerY,
            worldPlayer.width * 2,  // Double size
            worldPlayer.height * 2, // Double size
            0x808080 // Gray color (same as player)
        );
        this.playerSprite.setDepth(2000); // Above overlay
        this.playerSprite.setAlpha(1);
        
        // Add a glow effect
        const glow = this.add.circle(centerX, centerY, 80, 0xffffff, 0.2);
        glow.setDepth(1999); // Just below player sprite
        this.playerGlow = glow;
        
        // Add a subtle floating animation (for both sprite and glow)
        this.tweens.add({
            targets: [this.playerSprite, glow],
            y: centerY - 10,
            duration: 1500,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });
        
        // Pulsing glow animation
        this.tweens.add({
            targets: glow,
            alpha: 0.4,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1500,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });

        console.log('[MenuScene] Player visual representation created');
    }

    createMenuUI() {
        // Create main menu container in DOM
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'game-menu';
        this.menuContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 2000;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(this.menuContainer);

        // Create timer display (upper right)
        this.timerElement = document.createElement('div');
        this.timerElement.id = 'game-timer';
        this.timerElement.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #FFD700;
            padding: 15px 25px;
            border: 2px solid #FFD700;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        `;
        this.timerElement.innerHTML = `
            <div style="font-size: 14px; color: #FFF; margin-bottom: 5px;">PLAY TIME</div>
            <div id="timer-value">00:00:00</div>
        `;
        this.menuContainer.appendChild(this.timerElement);

        // Create player stats panel (left column)
        this.statsPanel = document.createElement('div');
        this.statsPanel.id = 'player-stats-panel';
        this.statsPanel.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: #FFF;
            padding: 20px;
            border: 2px solid #4A90E2;
            border-radius: 10px;
            min-width: 250px;
            box-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
        `;
        
        this.updateStatsPanel();
        this.menuContainer.appendChild(this.statsPanel);

        console.log('[MenuScene] Menu UI created');
    }

    updateStatsPanel() {
        const playerStats = gameStateManager.getPlayerStats();
        const xpPercent = (playerStats.experience / playerStats.experienceToNextLevel) * 100;
        
        this.statsPanel.innerHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #4A90E2; border-bottom: 2px solid #4A90E2; padding-bottom: 10px;">
                PLAYER STATS
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="color: #FFD700; font-weight: bold; margin-bottom: 5px;">
                    Level ${playerStats.level}
                </div>
                <div style="font-size: 12px; color: #AAA; margin-bottom: 3px;">
                    XP: ${playerStats.experience} / ${playerStats.experienceToNextLevel}
                </div>
                <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div id="xp-progress-bar" style="background: linear-gradient(90deg, #4A90E2, #00D9FF); height: 100%; width: ${xpPercent}%; transition: width 0.3s;"></div>
                </div>
            </div>

            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #AAA;">Health:</span>
                <span style="color: #FF4757; font-weight: bold;">${playerStats.health} / ${playerStats.maxHealth}</span>
            </div>

            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #AAA;">Attack:</span>
                <span style="color: #FFA502; font-weight: bold;">${playerStats.attack}</span>
            </div>

            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #AAA;">Defense:</span>
                <span style="color: #57E389; font-weight: bold;">${playerStats.defense}</span>
            </div>

            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #AAA;">Speed:</span>
                <span style="color: #00D9FF; font-weight: bold;">${playerStats.speed}</span>
            </div>

            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #444; font-size: 12px; color: #888; text-align: center;">
                Press <span style="color: #FFD700;">/</span> or <span style="color: #FFD700;">ESC</span> to close
            </div>
        `;
    }

    startTimerUpdate() {
        // Update timer display every second
        this.timerInterval = setInterval(() => {
            const timerValue = document.getElementById('timer-value');
            if (timerValue) {
                timerValue.textContent = gameStateManager.getFormattedPlayTime();
            }
            
            // Also update stats periodically to reflect any changes
            this.updateStatsPanel();
        }, 100); // Update 10 times per second for smooth display
    }

    closeMenu() {
        // Stop timer interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Resume game timer
        gameStateManager.resumeTimer();

        // Show the actual player sprite in WorldScene again
        if (this.worldScene && this.worldScene.playerManager && this.worldScene.playerManager.player) {
            this.worldScene.playerManager.player.setVisible(true);
        }

        // Emit event to WorldScene to update HUD
        if (this.worldScene) {
            this.worldScene.events.emit('menu-closed');
        }

        // Clean up player sprite and glow
        if (this.playerSprite) {
            this.playerSprite.destroy();
            this.playerSprite = null;
        }
        if (this.playerGlow) {
            this.playerGlow.destroy();
            this.playerGlow = null;
        }

        // Clean up DOM
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }

        // Resume WorldScene
        this.scene.resume('WorldScene');
        
        // Stop this scene
        this.scene.stop();
    }

    shutdown() {
        console.log('[MenuScene] Shutting down');

        // Clean up timer interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Show the actual player sprite in WorldScene again (safety check)
        if (this.worldScene && this.worldScene.playerManager && this.worldScene.playerManager.player) {
            this.worldScene.playerManager.player.setVisible(true);
        }

        // Clean up player sprite and glow
        if (this.playerSprite) {
            this.playerSprite.destroy();
            this.playerSprite = null;
        }
        if (this.playerGlow) {
            this.playerGlow.destroy();
            this.playerGlow = null;
        }

        // Clean up DOM
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }

        // Remove keyboard listeners
        this.input.keyboard.removeAllKeys(true);
        this.input.keyboard.removeAllListeners();

        // Resume game timer if it was paused
        gameStateManager.resumeTimer();

        super.shutdown();
    }
}

