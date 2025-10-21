import Phaser from "phaser";
import { gameStateManager } from "../managers/GameStateManager.js";
import { dialogueManager } from "../managers/DialogueManager.js";

export default class BattleMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleMenuScene' });
        this.selectedIconIndex = 0;
        this.icons = [];
        this.timerInterval = null;
    }

    init(data) {
        console.log('[BattleMenuScene] Initializing with data:', data);
        this.enemies = data?.enemies || [];
        this.battleScene = this.scene.get('BattleScene');
    }

    create() {
        console.log('[BattleMenuScene] Creating battle menu scene');

        // Note: Game timer continues running in BattleMenuScene
        // Only BattleScene is paused (combat action)
        
        // Create dark overlay
        this.createOverlay();

        // Create DOM UI
        this.createMenuUI();

        // Set up keyboard controls
        this.wasdKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        
        // Add ] key for selection/activation
        this.actionKey = this.input.keyboard.addKey(221); // ] key
        
        // Add / and ESC key handlers to close menu
        const slashKey = this.input.keyboard.addKey(191); // Forward slash keyCode
        slashKey.on('down', () => {
            console.log('[BattleMenuScene] Closing menu with /');
            this.closeMenu();
        });
        
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey.on('down', () => {
            console.log('[BattleMenuScene] Closing menu with ESC');
            this.closeMenu();
        });

        // Start timer update interval
        this.startTimerUpdate();
    }
    
    update() {
        // Handle icon navigation with WASD (left/right only)
        if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.left) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.up)) {
            this.selectedIconIndex = (this.selectedIconIndex - 1 + this.icons.length) % this.icons.length;
            this.updateIconSelection();
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.right) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.down)) {
            this.selectedIconIndex = (this.selectedIconIndex + 1) % this.icons.length;
            this.updateIconSelection();
        }
        
        // Handle icon activation with ] key
        if (Phaser.Input.Keyboard.JustDown(this.actionKey)) {
            this.activateCurrentIcon();
        }
    }

    createOverlay() {
        // Create semi-transparent dark overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    createMenuUI() {
        // Create main container
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'battle-menu-container';
        this.menuContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9000;
            pointer-events: none;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(this.menuContainer);

        // Timer display (top-right corner)
        this.timerDisplay = document.createElement('div');
        this.timerDisplay.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px 20px;
            border: 2px solid #FFD700;
            border-radius: 10px;
            color: #FFD700;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            pointer-events: auto;
        `;
        this.timerDisplay.innerHTML = `
            <div style="font-size: 14px; margin-bottom: 5px; color: #AAA;">Game Time</div>
            <div id="battle-menu-timer">00:00:00</div>
        `;
        this.menuContainer.appendChild(this.timerDisplay);

        // Icon container (left side)
        this.iconContainer = document.createElement('div');
        this.iconContainer.style.cssText = `
            position: absolute;
            left: 30px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 20px;
            pointer-events: auto;
        `;
        this.menuContainer.appendChild(this.iconContainer);

        // Define icons
        this.icons = [
            { id: 'talk', label: '💬', name: 'Talk', description: 'Negotiate with enemies' },
            { id: 'items', label: '🎒', name: 'Items', description: 'Use items' },
            { id: 'macros', label: '⚡', name: 'Macros', description: 'Execute custom action combos' }
        ];

        // Create icon elements
        this.icons.forEach((icon, index) => {
            const iconElement = document.createElement('div');
            iconElement.id = `battle-icon-${icon.id}`;
            iconElement.style.cssText = `
                width: 80px;
                height: 80px;
                background: rgba(0, 0, 0, 0.9);
                border: 3px solid ${index === 0 ? '#FFD700' : '#666'};
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: ${index === 0 ? '0 0 20px rgba(255, 215, 0, 0.5)' : 'none'};
            `;
            
            iconElement.innerHTML = `
                <div style="font-size: 36px; margin-bottom: 5px;">${icon.label}</div>
                <div style="font-size: 10px; color: #AAA;">${icon.name}</div>
            `;
            
            iconElement.addEventListener('click', () => {
                this.selectedIconIndex = index;
                this.updateIconSelection();
                this.activateCurrentIcon();
            });
            
            this.iconContainer.appendChild(iconElement);
        });

        // Description panel (bottom-left)
        this.descriptionPanel = document.createElement('div');
        this.descriptionPanel.style.cssText = `
            position: absolute;
            left: 30px;
            bottom: 30px;
            background: rgba(0, 0, 0, 0.9);
            padding: 15px 20px;
            border: 2px solid #FFD700;
            border-radius: 10px;
            color: #FFF;
            max-width: 300px;
            pointer-events: auto;
        `;
        this.descriptionPanel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #FFD700;">
                ${this.icons[0].name}
            </div>
            <div style="font-size: 12px; color: #AAA;">
                ${this.icons[0].description}
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 10px;">
                WASD - Navigate | ] - Select | / or ESC - Close
            </div>
        `;
        this.menuContainer.appendChild(this.descriptionPanel);
    }

    updateIconSelection() {
        const currentIcon = this.icons[this.selectedIconIndex];
        
        // Update icon borders and shadows
        this.icons.forEach((icon, index) => {
            const iconElement = document.getElementById(`battle-icon-${icon.id}`);
            if (iconElement) {
                const isSelected = index === this.selectedIconIndex;
                iconElement.style.borderColor = isSelected ? '#FFD700' : '#666';
                iconElement.style.boxShadow = isSelected ? '0 0 20px rgba(255, 215, 0, 0.5)' : 'none';
                iconElement.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
            }
        });
        
        // Update description
        this.descriptionPanel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #FFD700;">
                ${currentIcon.name}
            </div>
            <div style="font-size: 12px; color: #AAA;">
                ${currentIcon.description}
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 10px;">
                WASD - Navigate | ] - Select | / or ESC - Close
            </div>
        `;
    }

    activateCurrentIcon() {
        const currentIcon = this.icons[this.selectedIconIndex];
        console.log('[BattleMenuScene] Activating icon:', currentIcon.id);
        
        switch (currentIcon.id) {
            case 'talk':
                this.openTalkDialog();
                break;
            case 'items':
                this.showItemsNotImplemented();
                break;
            case 'macros':
                this.showMacrosNotImplemented();
                break;
        }
    }

    openTalkDialog() {
        console.log('[BattleMenuScene] Opening talk dialog');
        
        // Close this menu
        this.closeMenu();
        
        // Start enemy selection mode in BattleScene
        this.startEnemySelectionMode();
    }
    
    startEnemySelectionMode() {
        console.log('[BattleMenuScene] Starting enemy selection mode');
        
        // Launch enemy selection in BattleScene with highlighting
        this.battleScene.startEnemySelection();
        
        // Stop this scene
        this.scene.stop();
    }

    showEnemySelection() {
        // Create enemy selection overlay
        const selectionOverlay = document.createElement('div');
        selectionOverlay.id = 'enemy-selection-overlay';
        selectionOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 600px;
            padding: 30px;
            background: rgba(20, 20, 40, 0.95);
            border: 3px solid #FFD700;
            border-radius: 15px;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 28px;
            color: #FFD700;
            text-align: center;
            margin-bottom: 20px;
            font-weight: bold;
        `;
        title.textContent = 'Select Enemy to Talk To';
        content.appendChild(title);
        
        // Enemy list
        const enemyList = document.createElement('div');
        enemyList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
        `;
        
        this.enemies.forEach((enemy, index) => {
            const enemyButton = document.createElement('button');
            enemyButton.style.cssText = `
                padding: 15px 20px;
                background: rgba(255, 215, 0, 0.1);
                border: 2px solid #FFD700;
                border-radius: 10px;
                color: #FFF;
                cursor: pointer;
                text-align: left;
                transition: all 0.3s ease;
            `;
            
            enemyButton.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 18px; font-weight: bold; color: #FFD700;">${enemy.type}</div>
                        <div style="font-size: 14px; color: #AAA;">Level ${enemy.level} | HP: ${enemy.health}/${enemy.maxHealth}</div>
                    </div>
                    <div style="font-size: 32px;">💬</div>
                </div>
            `;
            
            enemyButton.addEventListener('mouseenter', () => {
                enemyButton.style.background = '#FFD700';
                enemyButton.style.color = '#000';
            });
            enemyButton.addEventListener('mouseleave', () => {
                enemyButton.style.background = 'rgba(255, 215, 0, 0.1)';
                enemyButton.style.color = '#FFF';
            });
            
            enemyButton.addEventListener('click', () => {
                selectionOverlay.remove();
                this.startDialogue(enemy);
            });
            
            enemyList.appendChild(enemyButton);
        });
        
        content.appendChild(enemyList);
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.style.cssText = `
            padding: 12px 24px;
            background: #444;
            border: 2px solid #888;
            border-radius: 8px;
            color: #FFF;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        `;
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            selectionOverlay.remove();
            // Reopen battle menu
            this.scene.restart();
        });
        content.appendChild(cancelButton);
        
        selectionOverlay.appendChild(content);
        document.body.appendChild(selectionOverlay);
    }

    startDialogue(enemy) {
        console.log('[BattleMenuScene] Starting dialogue with:', enemy);
        
        // Get full NPC data from BattleScene
        const npcData = {
            id: enemy.id,
            type: enemy.type,
            level: enemy.level,
            health: enemy.health,
            maxHealth: enemy.maxHealth
        };
        
        // Show dialogue options (reuse from BattleScene)
        const dialogueData = dialogueManager.getDialogueOptions(npcData);
        
        this.showDialogueOptions(npcData, dialogueData);
    }

    showDialogueOptions(npcData, dialogueData) {
        // This reuses the dialogue UI from BattleScene but triggered from menu
        // Import the dialogue methods from BattleScene or create them here
        
        // For now, show a simple implementation
        const dialogueOverlay = document.createElement('div');
        dialogueOverlay.id = 'battle-dialogue-from-menu';
        dialogueOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 20, 60, 0.95));
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        dialogueOverlay.innerHTML = `
            <div style="max-width: 600px; padding: 30px; background: rgba(0, 0, 0, 0.7); border: 3px solid #FFD700; border-radius: 15px; text-align: center;">
                <div style="font-size: 28px; color: #FFD700; margin-bottom: 15px;">
                    ${npcData.type} (Level ${npcData.level})
                </div>
                <div style="font-size: 18px; color: #FFF; font-style: italic; margin-bottom: 20px;">
                    "${dialogueData.greeting}"
                </div>
                <div style="font-size: 16px; color: #AAA;">
                    Full dialogue system integration coming next...
                </div>
                <button onclick="document.getElementById('battle-dialogue-from-menu').remove()" style="margin-top: 20px; padding: 12px 24px; background: #FFD700; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(dialogueOverlay);
    }

    showItemsNotImplemented() {
        alert('Items menu coming soon!');
    }

    showMacrosNotImplemented() {
        alert('Macros system coming soon! Create custom action combinations to execute complex strategies with a single button press.');
    }

    startTimerUpdate() {
        const updateTimer = () => {
            const formattedTime = gameStateManager.getFormattedPlayTime();
            const timerElement = document.getElementById('battle-menu-timer');
            if (timerElement) {
                timerElement.textContent = formattedTime;
            }
        };
        
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 100);
    }

    closeMenu() {
        console.log('[BattleMenuScene] Closing battle menu');
        
        // Stop timer update
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Remove DOM elements
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }
        
        // Resume battle scene
        this.scene.resume('BattleScene');
        
        // Stop this scene
        this.scene.stop();
    }

    shutdown() {
        console.log('[BattleMenuScene] Shutting down');
        
        // Clean up timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Clean up DOM
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }
        
        // Clean up keyboard listeners
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllKeys(true);
            this.input.keyboard.removeAllListeners();
        }
    }
}

