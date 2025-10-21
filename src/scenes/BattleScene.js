import Phaser from "phaser";
import HUDManager from "../ui/HUDManager";
import { gameStateManager } from "../managers/GameStateManager.js";
import { statsManager } from "../managers/StatsManager.js";
import { dialogueManager } from "../managers/DialogueManager.js";
import { moneyManager } from "../managers/MoneyManager.js";
import { itemsManager } from "../managers/ItemsManager.js";

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.player = null;
        this.enemies = []; // Array to store multiple enemies
        this.ground = null;
        this.escapeKey = null;
        this.wasdKeys = null;
        this.isReturning = false;
        this.attackKey = null;
        this.isAttacking = false;
        this.attackDuration = 50;
        this.attackSprite = null;
        this.attackOffset = 150;
        this.attackWidth = 200;
        this.attackHeight = 40;
        // Secondary attack properties
        this.secondaryAttackKey = null;
        this.isSecondaryAttacking = false;
        this.secondaryAttackDuration = 1500;
        this.projectileSpeed = 600;
        this.projectileSize = 45;
        this.projectileCount = 0;
        this.maxProjectiles = 3;
        this.projectileCooldown = 300;
        this.projectileResetCooldown = 800;
        this.canShootProjectile = true;
        this.projectiles = [];
        // Charging properties
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 800;
        this.chargeBar = null;
        this.chargeBarBackground = null;
        this.chargeStartTime = 0;
        this.chargeThreshold = 100;
        this.isKeyPressed = false; // Track if key is currently pressed
        // Charged projectile properties
        this.chargedProjectileSpeed = 800;
        this.chargedProjectileSize = 90;
        // Dash properties
        this.dashKey = null;
        this.isDashing = false;
        this.dashSpeed = 600;
        this.dashDuration = 150;
        this.dashCooldown = 50;
        this.canDash = true;
        this.enemyHealthTexts = []; // Array to store health display texts
        this.enemyLevelTexts = []; // Array to store level display texts
        this.textDisplays = []; // Array to store all text displays for cleanup
        this.victoryText = null;
        this.isVictorySequence = false;
        this.defeatedEnemyIds = []; // Track defeated enemy IDs during battle
        this.totalXpEarned = 0; // Track total XP earned this battle
        this.defeatedEnemiesData = []; // Store defeated enemy data for XP calculation
        // Dialogue system properties
        this.dialogueOverlay = null;
        this.dialogueChoice = null; // 'fight', 'negotiate_money', 'negotiate_item', 'flee'
        this.isDialogueActive = false;
    }

    init(data) {
        console.log('[BattleScene] Initializing with data:', data);
        
        // Validate required data
        if (!data || !data.playerData || !data.npcDataArray) {
            console.error('[BattleScene] Missing required data:', data);
            return;
        }

        this.playerData = data.playerData;
        this.npcDataArray = data.npcDataArray;
        
        // Ensure npcDataArray is an array
        if (!Array.isArray(this.npcDataArray)) {
            console.error('[BattleScene] npcDataArray is not an array:', this.npcDataArray);
            this.npcDataArray = [this.npcDataArray];
        }

        // Store the world position the player came from
        this.worldPosition = {
            x: this.playerData.x,
            y: this.playerData.y
        };

        console.log('[BattleScene] Initialized with:', {
            playerData: this.playerData,
            npcDataArray: this.npcDataArray,
            worldPosition: this.worldPosition
        });
    }

    preload() {
        // Load battle-specific assets if needed
    }

    create() {
        console.log('[BattleScene] Creating scene');
        
        // Validate data before proceeding
        if (!this.playerData || !this.npcDataArray || this.npcDataArray.length === 0) {
            console.error('[BattleScene] Missing required data for scene creation');
            return;
        }

        // Create black screen for fade in
        const blackScreen = this.add.graphics();
        blackScreen.fillStyle(0x000000, 1);
        blackScreen.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Fade in animation
        this.tweens.add({
            targets: blackScreen,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                blackScreen.destroy();
                // Start battle immediately (no dialogue at start)
                this.setupBattle();
            }
        });
    }

    setupBattle() {
        // Clean up any existing input listeners first
        this.cleanupInput();
        
        // Initialize/reset all state variables to ensure clean battle start
        this.isReturning = false;
        this.isAttacking = false;
        this.isSecondaryAttacking = false;
        this.isCharging = false;
        this.isDashing = false;
        this.canDash = true;
        this.canShootProjectile = true;
        this.isKeyPressed = false;
        this.projectileCount = 0;
        this.chargeTime = 0;
        this.chargeStartTime = 0;
        this.isVictorySequence = false;
        this.isBattleActive = true;
        this.defeatedEnemyIds = []; // Reset defeated enemy tracking
        this.totalXpEarned = 0; // Reset XP tracking
        this.defeatedEnemiesData = []; // Reset defeated enemies data

        // Set up background color to ensure WorldScene is hidden
        this.cameras.main.setBackgroundColor('#000000');
        
        // Set up world bounds and gravity
        this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);
        this.physics.world.gravity.y = 600;

        // Create ground platform (in the lower part of the screen)
        const groundY = this.cameras.main.height * 0.8;
        this.ground = this.add.rectangle(
            this.cameras.main.width / 2,
            groundY,
            this.cameras.main.width,
            10,
            0x00ff00
        );
        this.physics.add.existing(this.ground, true);

        // Create player
        const playerX = this.cameras.main.width * 0.3;
        this.player = this.add.rectangle(
            playerX,
            groundY - 150,
            96,
            192,
            0x808080
        );
        this.physics.add.existing(this.player);
        this.player.body.setBounce(0.2);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(96, 192);

        // Add collision between player and ground
        this.physics.add.collider(this.player, this.ground);

        // Initialize input keys
        this.initializeInput();

        // Create enemies using npcDataArray
        const totalEnemies = this.npcDataArray.length;
        const spacing = 100; // Space between enemies
        let startX = this.cameras.main.width * 0.7; // Start position for first enemy

        console.log('[BattleScene] Creating enemies:', {
            totalEnemies,
            spacing,
            startX,
            npcDataArray: this.npcDataArray
        });

        // Create enemies array if it doesn't exist
        this.enemies = [];

        this.npcDataArray.forEach((npcData, index) => {
            const enemyColor = npcData.color;
            // Position enemies based on their trigger radius
            const triggerRadius = npcData.triggerRadius || 100; // Default to 100 if not specified
            const enemyX = startX + (index * spacing) + triggerRadius; // Add trigger radius to initial position

            console.log(`[BattleScene] Creating enemy ${index + 1}:`, {
                type: npcData.type,
                triggerRadius,
                position: enemyX
            });

            // Create enemy rectangle
            const enemy = this.add.rectangle(
                enemyX,
                groundY - 150,
                96,
                192,
                enemyColor
            );

            // Add physics to enemy
            this.physics.add.existing(enemy);
            enemy.body.setBounce(0.2);
            enemy.body.setCollideWorldBounds(true);
            enemy.body.setSize(96, 192);

            // Store enemy data
            enemy.enemyData = {
                ...npcData,
                health: npcData.health || 100,
                maxHealth: npcData.health || 100
            };

            // Add collision between enemy and ground
            this.physics.add.collider(enemy, this.ground);

            // Add to enemies array
            this.enemies.push(enemy);

            // NPC stats are now only shown in DOM (HUD), not in Phaser layer
        });

        // Add collision between player and enemies
        this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);

        // Add collision between enemies and projectiles
        this.physics.add.collider(this.enemies, this.projectiles, this.handleProjectileEnemyCollision, null, this);

        // Add collision between enemies and attack sprite
        this.physics.add.collider(this.enemies, this.attackSprite, this.handleAttackEnemyCollision, null, this);

        // Create charge bar (initially hidden)
        this.createChargeBar();

        // Set up camera
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Create HUD using DOM-based UI
        this.hudManager = new HUDManager(this);
        this.hudManager.create();
        
        // Initialize HUD with player data from GameStateManager
        this.hudManager.updatePlayerStats();
        
        // Initialize enemy list in HUD
        this.updateEnemyHUD();

        // Set up scene event listeners for HUD management
        this.events.on('shutdown', () => {
            console.log('[BattleScene] Scene shutting down, destroying HUD');
            if (this.hudManager) {
                this.hudManager.destroy();
                this.hudManager = null;
            }
        });
    }

    initializeInput() {
        console.log('[BattleScene] Initializing input controls');
        
        // Clear any existing input listeners
        this.cleanupInput();

        // Initialize keyboard controls
        this.escapeKey = this.input.keyboard.addKey('ESC');
        this.attackKey = this.input.keyboard.addKey('RIGHT_BRACKET');
        this.secondaryAttackKey = this.input.keyboard.addKey('LEFT_BRACKET');
        this.dashKey = this.input.keyboard.addKey('SHIFT');
        this.wasdKeys = this.input.keyboard.addKeys({
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D'
        });

        // Add key press listeners
        this.attackListener = (event) => {
            if (event.key === ']') {
                // Don't attack if we're in enemy selection mode
                if (this.isEnemySelectionMode) {
                    return;
                }
                console.log('[BattleScene] Right bracket detected!');
                this.attack();
            }
        };
        this.input.keyboard.on('keydown', this.attackListener);

        this.chargeStartListener = (event) => {
            if (event.key === '[' && !this.isKeyPressed) {
                // Don't charge during enemy selection mode
                if (this.isEnemySelectionMode) {
                    return;
                }
                this.isKeyPressed = true;
                this.chargeStartTime = this.time.now;
                console.log('[BattleScene] Left bracket pressed, starting timer');
            }
        };
        this.input.keyboard.on('keydown', this.chargeStartListener);

        this.chargeEndListener = (event) => {
            if (event.key === '[' && this.isKeyPressed) {
                // Don't process charge release during enemy selection mode
                if (this.isEnemySelectionMode) {
                    return;
                }
                this.isKeyPressed = false;
                const pressDuration = this.time.now - this.chargeStartTime;
                console.log('[BattleScene] Left bracket released, duration:', pressDuration);
                
                if (pressDuration < this.chargeThreshold) {
                    this.secondaryAttack();
                } else if (this.isCharging) {
                    this.releaseCharge();
                }
            }
        };
        this.input.keyboard.on('keyup', this.chargeEndListener);

        // Add / key handler for BattleMenuScene
        this.slashKey = this.input.keyboard.addKey(191); // Forward slash keyCode
        this.slashKey.on('down', () => {
            console.log('[BattleScene] Opening Battle Menu with /');
            this.openBattleMenu();
        });

        // Enable input
        this.input.keyboard.enabled = true;
        this.input.mouse.enabled = true;
    }

    cleanupInput() {
        console.log('[BattleScene] Cleaning up input controls');
        
        // Remove all keyboard listeners
        if (this.attackListener) {
            this.input.keyboard.off('keydown', this.attackListener);
            this.attackListener = null;
        }
        if (this.chargeStartListener) {
            this.input.keyboard.off('keydown', this.chargeStartListener);
            this.chargeStartListener = null;
        }
        if (this.chargeEndListener) {
            this.input.keyboard.off('keyup', this.chargeEndListener);
            this.chargeEndListener = null;
        }

        // Remove all keys
        if (this.slashKey) {
            this.slashKey.destroy();
            this.slashKey = null;
        }
        if (this.escapeKey) {
            this.escapeKey.destroy();
            this.escapeKey = null;
        }
        if (this.attackKey) {
            this.attackKey.destroy();
            this.attackKey = null;
        }
        if (this.secondaryAttackKey) {
            this.secondaryAttackKey.destroy();
            this.secondaryAttackKey = null;
        }
        if (this.dashKey) {
            this.dashKey.destroy();
            this.dashKey = null;
        }
        if (this.wasdKeys) {
            Object.values(this.wasdKeys).forEach(key => {
                if (key) key.destroy();
            });
            this.wasdKeys = null;
        }

        // Remove all keyboard listeners
        this.input.keyboard.removeAllKeys(true);
        this.input.keyboard.removeAllListeners();
    }

    openBattleMenu() {
        console.log('[BattleScene] Opening Battle Menu');
        
        // Pause battle scene
        this.scene.pause();
        
        // Launch BattleMenuScene with enemy data
        this.scene.launch('BattleMenuScene', {
            enemies: this.enemies.map(enemy => ({
                id: enemy.enemyData.id,
                type: enemy.enemyData.type,
                level: enemy.enemyData.level,
                health: enemy.enemyData.health,
                maxHealth: enemy.enemyData.maxHealth
            }))
        });
    }

    startEnemySelection() {
        console.log('[BattleScene] Starting enemy selection mode');
        
        // Initialize enemy selection state FIRST
        this.isEnemySelectionMode = true;
        this.selectedEnemyIndex = 0;
        this.enemyHighlights = [];
        
        // Create highlights for all enemies
        this.enemies.forEach((enemy, index) => {
            const highlight = this.add.graphics();
            highlight.lineStyle(4, 0xffff00, 1);
            highlight.strokeCircle(0, 0, enemy.width * 0.6);
            highlight.setDepth(1000);
            highlight.setVisible(false);
            this.enemyHighlights.push(highlight);
        });
        
        // Set up input for enemy selection BEFORE resuming
        this.setupEnemySelectionInput();
        
        // Resume the scene so update() can run (for enemy selection input)
        // But battle logic is blocked by isEnemySelectionMode check
        console.log('[BattleScene] Resuming scene for enemy selection');
        this.scene.resume();
        
        // Ensure input is enabled
        this.input.enabled = true;
        this.input.keyboard.enabled = true;
        console.log('[BattleScene] Input enabled:', this.input.enabled, 'Keyboard enabled:', this.input.keyboard.enabled);
        
        // Highlight the first enemy
        this.updateEnemyHighlight();
        
        // Create DOM overlay for instructions
        this.createEnemySelectionUI();
        
        console.log('[BattleScene] Enemy selection mode ready');
    }
    
    updateEnemyHighlight() {
        // Hide all highlights
        this.enemyHighlights.forEach(h => h.setVisible(false));
        
        // Show highlight for selected enemy
        if (this.enemies[this.selectedEnemyIndex]) {
            const enemy = this.enemies[this.selectedEnemyIndex];
            const highlight = this.enemyHighlights[this.selectedEnemyIndex];
            
            // Position highlight on enemy
            highlight.setPosition(enemy.x, enemy.y);
            highlight.setVisible(true);
            
            // Add pulsing animation
            this.tweens.add({
                targets: highlight,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.7,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
            
            console.log(`[BattleScene] Highlighting enemy ${this.selectedEnemyIndex}:`, enemy.enemyData.type);
        }
    }
    
    createEnemySelectionUI() {
        const overlay = document.createElement('div');
        overlay.id = 'enemy-selection-ui';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            border: 3px solid gold;
            border-radius: 10px;
            padding: 20px 40px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 18px;
            text-align: center;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        `;
        
        const selectedEnemy = this.enemies[this.selectedEnemyIndex];
        overlay.innerHTML = `
            <div style="margin-bottom: 15px; color: gold; font-weight: bold; font-size: 24px;">
                💬 SELECT ENEMY TO TALK TO
            </div>
            <div style="margin-bottom: 15px; font-size: 20px;">
                <span style="color: #FFD700;">▶</span> ${selectedEnemy.enemyData.type} <span style="color: #FFD700;">◀</span>
            </div>
            <div style="margin-bottom: 10px; color: #4A90E2;">
                Level ${selectedEnemy.enemyData.level} | HP: ${selectedEnemy.enemyData.health}/${selectedEnemy.enemyData.maxHealth}
            </div>
            <div style="font-size: 16px; color: #FFD700; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 215, 0, 0.3);">
                A/D - Switch Enemy | ] - Confirm | ESC - Cancel
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    updateEnemySelectionUI() {
        const overlay = document.getElementById('enemy-selection-ui');
        if (overlay && this.enemies[this.selectedEnemyIndex]) {
            const selectedEnemy = this.enemies[this.selectedEnemyIndex];
            overlay.innerHTML = `
                <div style="margin-bottom: 15px; color: gold; font-weight: bold; font-size: 24px;">
                    💬 SELECT ENEMY TO TALK TO
                </div>
                <div style="margin-bottom: 15px; font-size: 20px;">
                    <span style="color: #FFD700;">▶</span> ${selectedEnemy.enemyData.type} <span style="color: #FFD700;">◀</span>
                </div>
                <div style="margin-bottom: 10px; color: #4A90E2;">
                    Level ${selectedEnemy.enemyData.level} | HP: ${selectedEnemy.enemyData.health}/${selectedEnemy.enemyData.maxHealth}
                </div>
                <div style="font-size: 16px; color: #FFD700; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 215, 0, 0.3);">
                    A/D - Switch Enemy | ] - Confirm | ESC - Cancel
                </div>
            `;
        }
    }
    
    setupEnemySelectionInput() {
        console.log('[BattleScene] Setting up enemy selection input');
        
        // Create key objects for navigation
        this.enemySelectionKeys = {
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            confirm: this.input.keyboard.addKey(221), // ] key
            cancel: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
        };
        
        // Also add DOM-level listener for ESC (works even when Phaser input issues occur)
        this.enemySelectionEscapeListener = (event) => {
            if (this.isEnemySelectionMode && event.key === 'Escape') {
                console.log('[BattleScene] ESC pressed via DOM listener - cancelling enemy selection');
                event.preventDefault();
                this.cancelEnemySelection();
            }
        };
        document.addEventListener('keydown', this.enemySelectionEscapeListener);
        
        console.log('[BattleScene] Enemy selection keys created:', this.enemySelectionKeys);
    }
    
    updateEnemySelection() {
        if (!this.isEnemySelectionMode) {
            console.log('[BattleScene] updateEnemySelection called but mode is not active');
            return;
        }
        
        if (!this.enemySelectionKeys) {
            console.log('[BattleScene] updateEnemySelection: no keys defined!');
            return;
        }
        
        const keys = this.enemySelectionKeys;
        
        // Navigate left (A)
        if (Phaser.Input.Keyboard.JustDown(keys.a)) {
            console.log('[BattleScene] A key pressed - navigating left');
            this.selectedEnemyIndex--;
            if (this.selectedEnemyIndex < 0) {
                this.selectedEnemyIndex = this.enemies.length - 1;
            }
            this.updateEnemyHighlight();
            this.updateEnemySelectionUI();
        }
        
        // Navigate right (D)
        if (Phaser.Input.Keyboard.JustDown(keys.d)) {
            console.log('[BattleScene] D key pressed - navigating right');
            this.selectedEnemyIndex++;
            if (this.selectedEnemyIndex >= this.enemies.length) {
                this.selectedEnemyIndex = 0;
            }
            this.updateEnemyHighlight();
            this.updateEnemySelectionUI();
        }
        
        // Confirm selection (])
        if (Phaser.Input.Keyboard.JustDown(keys.confirm)) {
            console.log('[BattleScene] ] key pressed - confirming selection');
            this.confirmEnemySelection();
        }
        
        // Cancel (ESC)
        if (Phaser.Input.Keyboard.JustDown(keys.cancel)) {
            console.log('[BattleScene] ESC key pressed - cancelling selection');
            this.cancelEnemySelection();
        }
    }
    
    confirmEnemySelection() {
        console.log('[BattleScene] Enemy selection confirmed:', this.selectedEnemyIndex);
        
        const selectedEnemy = this.enemies[this.selectedEnemyIndex];
        
        // Clean up enemy selection mode
        this.cleanupEnemySelection();
        
        // Start dialogue with selected enemy
        this.startDialogueWithEnemy(selectedEnemy);
    }
    
    cancelEnemySelection() {
        console.log('[BattleScene] Enemy selection cancelled');
        
        // Clean up enemy selection mode
        this.cleanupEnemySelection();
        
        // Resume battle normally
        this.scene.resume();
    }
    
    cleanupEnemySelection() {
        console.log('[BattleScene] Cleaning up enemy selection');
        
        // Remove highlights
        if (this.enemyHighlights) {
            this.enemyHighlights.forEach(h => {
                this.tweens.killTweensOf(h);
                h.destroy();
            });
            this.enemyHighlights = [];
        }
        
        // Remove UI overlay
        const overlay = document.getElementById('enemy-selection-ui');
        if (overlay) {
            overlay.remove();
        }
        
        // Remove DOM-level escape listener
        if (this.enemySelectionEscapeListener) {
            document.removeEventListener('keydown', this.enemySelectionEscapeListener);
            this.enemySelectionEscapeListener = null;
        }
        
        // Clean up input keys
        if (this.enemySelectionKeys) {
            Object.values(this.enemySelectionKeys).forEach(key => {
                if (key) key.destroy();
            });
            this.enemySelectionKeys = null;
        }
        
        // Reset state
        this.isEnemySelectionMode = false;
        this.selectedEnemyIndex = 0;
        
        console.log('[BattleScene] Enemy selection cleanup complete');
    }
    
    startDialogueWithEnemy(enemy) {
        console.log('[BattleScene] Starting dialogue with enemy:', enemy.enemyData);
        
        // Pause the battle scene
        this.scene.pause();
        
        // Launch dialogue manager with enemy data
        const npcData = {
            id: enemy.enemyData.id,
            type: enemy.enemyData.type,
            level: enemy.enemyData.level,
            health: enemy.enemyData.health,
            maxHealth: enemy.enemyData.maxHealth
        };
        
        // Create dialogue overlay (using existing dialogue system)
        this.showDialogueForEnemy(npcData);
    }
    
    showDialogueForEnemy(npcData) {
        // Get dialogue options from DialogueManager
        const dialogueOptions = dialogueManager.getDialogueOptions(npcData);
        
        console.log('[BattleScene] Dialogue options:', dialogueOptions);
        
        // Store dialogue state for keyboard navigation
        this.dialogueNpcData = npcData;
        this.dialogueOptions = dialogueOptions.options;
        this.selectedDialogueIndex = 0;
        
        // Find first available option as default selection
        for (let i = 0; i < this.dialogueOptions.length; i++) {
            if (this.dialogueOptions[i].available) {
                this.selectedDialogueIndex = i;
                break;
            }
        }
        
        // Create dialogue overlay DOM
        const dialogueOverlay = document.createElement('div');
        dialogueOverlay.id = 'dialogue-overlay';
        dialogueOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            pointer-events: auto;
        `;
        
        const dialogueBox = document.createElement('div');
        dialogueBox.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 3px solid gold;
            border-radius: 15px;
            padding: 30px;
            max-width: 600px;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        dialogueBox.innerHTML = `
            <h2 style="color: gold; margin: 0 0 20px 0; text-align: center;">
                ${npcData.type} (Level ${npcData.level})
            </h2>
            <p style="margin-bottom: 30px; font-size: 16px; line-height: 1.5;">
                ${dialogueOptions.greeting}
            </p>
            <div id="dialogue-choices"></div>
            <div style="margin-top: 20px; text-align: center; font-size: 14px; color: #aaa;">
                W/S - Navigate | ] - Select | <span style="color: #FFD700; font-weight: bold;">ESC - Cancel</span>
            </div>
        `;
        
        const choicesContainer = document.createElement('div');
        choicesContainer.id = 'dialogue-choices';
        choicesContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        
        // Add dialogue choices (DialogueManager returns 'options', not 'choices')
        this.dialogueOptions.forEach((choice, index) => {
            const button = document.createElement('div');
            button.id = `dialogue-choice-${index}`;
            button.style.cssText = `
                background: linear-gradient(135deg, #2c3e50, #34495e);
                border: 2px solid ${choice.available ? '#3498db' : '#555'};
                border-radius: 8px;
                padding: 15px;
                color: ${choice.available ? 'white' : '#888'};
                font-size: 16px;
                transition: all 0.3s;
                text-align: left;
                ${choice.available ? 'cursor: pointer;' : 'cursor: not-allowed;'}
            `;
            
            button.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">${choice.text}</div>
                ${choice.cost ? `<div style="font-size: 14px; color: #f39c12;">Cost: ${choice.cost} gold</div>` : ''}
                ${!choice.available ? `<div style="font-size: 12px; color: #e74c3c;">${choice.reason}</div>` : ''}
            `;
            
            // Keep mouse support
            if (choice.available) {
                button.addEventListener('mouseenter', () => {
                    this.selectedDialogueIndex = index;
                    this.updateDialogueSelection();
                });
                button.addEventListener('click', () => {
                    this.confirmDialogueChoice();
                });
            }
            
            choicesContainer.appendChild(button);
        });
        
        dialogueBox.querySelector('#dialogue-choices').replaceWith(choicesContainer);
        dialogueOverlay.appendChild(dialogueBox);
        document.body.appendChild(dialogueOverlay);
        
        // Set up keyboard controls for dialogue
        this.setupDialogueInput();
        
        // Update initial selection
        this.updateDialogueSelection();
        
        // Add DOM-level ESC listener for reliable cancel functionality
        this.dialogueEscapeListener = (event) => {
            if (this.isDialogueActive && event.key === 'Escape') {
                console.log('[BattleScene] ESC pressed - closing dialogue');
                event.preventDefault();
                this.closeDialogue();
            }
        };
        document.addEventListener('keydown', this.dialogueEscapeListener);
    }
    
    setupDialogueInput() {
        // Set up WASD navigation for dialogue
        this.dialogueKeys = {
            w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            confirm: this.input.keyboard.addKey(221), // ] key
            cancel: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
        };
        
        this.isDialogueActive = true;
    }
    
    updateDialogueNavigation() {
        if (!this.isDialogueActive || !this.dialogueKeys) return;
        
        const keys = this.dialogueKeys;
        
        // Navigate up (W)
        if (Phaser.Input.Keyboard.JustDown(keys.w)) {
            do {
                this.selectedDialogueIndex--;
                if (this.selectedDialogueIndex < 0) {
                    this.selectedDialogueIndex = this.dialogueOptions.length - 1;
                }
            } while (!this.dialogueOptions[this.selectedDialogueIndex].available);
            
            this.updateDialogueSelection();
        }
        
        // Navigate down (S)
        if (Phaser.Input.Keyboard.JustDown(keys.s)) {
            do {
                this.selectedDialogueIndex++;
                if (this.selectedDialogueIndex >= this.dialogueOptions.length) {
                    this.selectedDialogueIndex = 0;
                }
            } while (!this.dialogueOptions[this.selectedDialogueIndex].available);
            
            this.updateDialogueSelection();
        }
        
        // Confirm selection (])
        if (Phaser.Input.Keyboard.JustDown(keys.confirm)) {
            this.confirmDialogueChoice();
        }
        
        // Cancel / Close dialogue (ESC)
        if (Phaser.Input.Keyboard.JustDown(keys.cancel)) {
            console.log('[BattleScene] ESC key pressed - closing dialogue');
            this.closeDialogue();
        }
    }
    
    updateDialogueSelection() {
        // Update visual state of all options
        this.dialogueOptions.forEach((choice, index) => {
            const button = document.getElementById(`dialogue-choice-${index}`);
            if (button) {
                const isSelected = index === this.selectedDialogueIndex;
                const isAvailable = choice.available;
                
                if (isSelected && isAvailable) {
                    button.style.border = '2px solid gold';
                    button.style.transform = 'translateX(10px)';
                    button.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.5)';
                } else if (isAvailable) {
                    button.style.border = '2px solid #3498db';
                    button.style.transform = 'translateX(0)';
                    button.style.boxShadow = 'none';
                } else {
                    button.style.border = '2px solid #555';
                    button.style.transform = 'translateX(0)';
                    button.style.boxShadow = 'none';
                }
            }
        });
    }
    
    confirmDialogueChoice() {
        const selectedChoice = this.dialogueOptions[this.selectedDialogueIndex];
        if (selectedChoice && selectedChoice.available) {
            console.log('[BattleScene] Dialogue choice confirmed:', selectedChoice.id);
            this.handleDialogueChoice(selectedChoice.id, selectedChoice, this.dialogueNpcData);
        }
    }
    
    cleanupDialogueInput() {
        console.log('[BattleScene] Cleaning up dialogue input');
        
        // Remove DOM-level ESC listener
        if (this.dialogueEscapeListener) {
            document.removeEventListener('keydown', this.dialogueEscapeListener);
            this.dialogueEscapeListener = null;
        }
        
        // Clean up dialogue input keys
        if (this.dialogueKeys) {
            Object.values(this.dialogueKeys).forEach(key => {
                if (key) key.destroy();
            });
            this.dialogueKeys = null;
        }
        
        this.isDialogueActive = false;
        this.dialogueNpcData = null;
        this.dialogueOptions = null;
        this.selectedDialogueIndex = 0;
    }
    
    closeDialogue() {
        console.log('[BattleScene] Closing dialogue (cancelled)');
        
        // Clean up dialogue input
        this.cleanupDialogueInput();
        
        // Remove dialogue overlay
        const dialogueOverlay = document.getElementById('dialogue-overlay');
        if (dialogueOverlay) {
            dialogueOverlay.remove();
        }
        
        // Resume battle scene
        this.scene.resume();
        
        console.log('[BattleScene] Dialogue closed, battle resumed');
    }
    
    handleDialogueChoice(choiceId, optionData, npcData) {
        console.log('[BattleScene] Dialogue choice:', choiceId, optionData);
        
        // Clean up dialogue input first
        this.cleanupDialogueInput();
        
        // Remove dialogue overlay
        const dialogueOverlay = document.getElementById('dialogue-overlay');
        if (dialogueOverlay) {
            dialogueOverlay.remove();
        }
        
        // Handle the choice
        switch (choiceId) {
            case 'fight':
                // Resume battle
                this.scene.resume();
                break;
                
            case 'negotiate_money':
                this.handleMoneyNegotiation(optionData.cost, npcData);
                break;
                
            case 'negotiate_item':
                this.showItemSelectionDialog(optionData.availableItems, optionData.requiredValue, npcData);
                break;
                
            case 'flee':
                this.handleFleeAttempt(npcData);
                break;
        }
    }
    
    handleMoneyNegotiation(cost, npcData) {
        const result = dialogueManager.negotiateWithMoney(npcData, cost);
        console.log('[BattleScene] Money negotiation result:', result);
        
        this.showNegotiationResult(result, npcData);
    }
    
    showItemSelectionDialog(availableItems, requiredValue, npcData) {
        // Create item selection dialog
        const itemDialog = document.createElement('div');
        itemDialog.id = 'item-selection-dialog';
        itemDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 3px solid gold;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        dialogBox.innerHTML = `
            <h3 style="color: gold; margin: 0 0 20px 0;">Select Item to Gift</h3>
            <p style="margin-bottom: 20px; font-size: 14px;">
                Required value: ${requiredValue} gold
            </p>
            <div id="item-list"></div>
        `;
        
        const itemList = document.createElement('div');
        itemList.id = 'item-list';
        itemList.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
        
        availableItems.forEach(item => {
            const itemButton = document.createElement('button');
            itemButton.style.cssText = `
                background: linear-gradient(135deg, #2c3e50, #34495e);
                border: 2px solid #3498db;
                border-radius: 8px;
                padding: 10px;
                color: white;
                cursor: pointer;
                text-align: left;
                transition: all 0.3s;
            `;
            
            itemButton.innerHTML = `
                <div style="font-weight: bold;">${item.name}</div>
                <div style="font-size: 14px; color: #f39c12;">Value: ${item.value} gold</div>
            `;
            
            itemButton.addEventListener('mouseenter', () => {
                itemButton.style.border = '2px solid gold';
            });
            itemButton.addEventListener('mouseleave', () => {
                itemButton.style.border = '2px solid #3498db';
            });
            itemButton.addEventListener('click', () => {
                this.handleItemNegotiation(item.id, npcData);
            });
            
            itemList.appendChild(itemButton);
        });
        
        // Add cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
            background: #e74c3c;
            border: none;
            border-radius: 8px;
            padding: 10px;
            color: white;
            cursor: pointer;
            margin-top: 20px;
            width: 100%;
        `;
        cancelButton.addEventListener('click', () => {
            itemDialog.remove();
            this.scene.resume();
        });
        
        dialogBox.querySelector('#item-list').replaceWith(itemList);
        dialogBox.appendChild(cancelButton);
        itemDialog.appendChild(dialogBox);
        document.body.appendChild(itemDialog);
    }
    
    handleItemNegotiation(itemId, npcData) {
        const result = dialogueManager.negotiateWithItem(npcData, itemId);
        console.log('[BattleScene] Item negotiation result:', result);
        
        // Remove item dialog
        const itemDialog = document.getElementById('item-selection-dialog');
        if (itemDialog) {
            itemDialog.remove();
        }
        
        this.showNegotiationResult(result, npcData);
    }
    
    handleFleeAttempt(npcData) {
        const result = dialogueManager.attemptFlee(npcData);
        console.log('[BattleScene] Flee attempt result:', result);
        
        this.showFleeResult(result, () => {
            if (result.success) {
                this.returnToWorld();
            } else {
                this.scene.resume();
            }
        });
    }
    
    showNegotiationResult(result, npcData) {
        const resultOverlay = document.createElement('div');
        resultOverlay.id = 'negotiation-result';
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
        `;
        
        const resultBox = document.createElement('div');
        resultBox.style.cssText = `
            background: linear-gradient(135deg, ${result.success ? '#27ae60' : '#c0392b'}, #2c3e50);
            border: 3px solid ${result.success ? '#2ecc71' : '#e74c3c'};
            border-radius: 15px;
            padding: 30px;
            max-width: 400px;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        
        resultBox.innerHTML = `
            <h2 style="color: white; margin: 0 0 20px 0;">
                ${result.success ? '✓ Success!' : '✗ Failed'}
            </h2>
            <p style="margin-bottom: 20px; font-size: 16px;">
                ${result.message}
            </p>
            ${result.xpGained ? `<p style="color: cyan; font-size: 14px;">+${result.xpGained} XP</p>` : ''}
            <button id="result-continue" style="
                background: white;
                color: #2c3e50;
                border: none;
                border-radius: 8px;
                padding: 10px 30px;
                font-size: 16px;
                cursor: pointer;
                margin-top: 20px;
            ">Continue</button>
        `;
        
        resultOverlay.appendChild(resultBox);
        document.body.appendChild(resultOverlay);
        
        document.getElementById('result-continue').addEventListener('click', () => {
            resultOverlay.remove();
            
            if (result.success) {
                // Mark enemy as defeated through negotiation
                this.handleNegotiationVictory(npcData);
            } else {
                // Resume battle
                this.scene.resume();
            }
        });
    }
    
    showFleeResult(result, onComplete) {
        const resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
        `;
        
        const resultBox = document.createElement('div');
        resultBox.style.cssText = `
            background: linear-gradient(135deg, ${result.success ? '#f39c12' : '#c0392b'}, #2c3e50);
            border: 3px solid ${result.success ? '#f1c40f' : '#e74c3c'};
            border-radius: 15px;
            padding: 30px;
            max-width: 400px;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        
        resultBox.innerHTML = `
            <h2 style="color: white; margin: 0 0 20px 0;">
                ${result.success ? '✓ Escaped!' : '✗ Failed to Escape'}
            </h2>
            <p style="margin-bottom: 20px; font-size: 16px;">
                ${result.message}
            </p>
            <button id="flee-continue" style="
                background: white;
                color: #2c3e50;
                border: none;
                border-radius: 8px;
                padding: 10px 30px;
                font-size: 16px;
                cursor: pointer;
            ">Continue</button>
        `;
        
        resultOverlay.appendChild(resultBox);
        document.body.appendChild(resultOverlay);
        
        document.getElementById('flee-continue').addEventListener('click', () => {
            resultOverlay.remove();
            if (onComplete) onComplete();
        });
    }
    
    handleNegotiationVictory(npcData) {
        console.log('[BattleScene] Negotiation victory with:', npcData.id);
        
        // Find the enemy in the enemies array and mark as defeated
        const enemyIndex = this.enemies.findIndex(e => e.enemyData.id === npcData.id);
        if (enemyIndex !== -1) {
            const enemy = this.enemies[enemyIndex];
            
            // Track as defeated
            if (!this.defeatedEnemyIds.includes(npcData.id)) {
                this.defeatedEnemyIds.push(npcData.id);
                this.defeatedEnemiesData.push({
                    level: npcData.level,
                    type: npcData.type
                });
            }
            
            // Remove enemy from scene
            enemy.destroy();
            this.enemies.splice(enemyIndex, 1);
            
            console.log('[BattleScene] Enemy removed, remaining:', this.enemies.length);
        }
        
        // Check if all enemies defeated
        if (this.enemies.length === 0) {
            this.showVictorySequence();
        } else {
            this.scene.resume();
        }
    }

    returnToWorld() {
        if (this.isReturning) return;
        this.isReturning = true;

        console.log('[BattleScene] Returning to world');
        
        // Collect current NPC health data before cleanup
        const updatedNpcHealth = this.enemies.map(enemy => ({
            id: enemy.enemyData.id,
            health: enemy.enemyData.health,
            maxHealth: enemy.enemyData.maxHealth
        }));
        
        console.log('[BattleScene] NPC health on escape:', updatedNpcHealth);
        
        // Clean up all game objects and physics
        this.cleanup();

        // Create black screen for fade out
        const blackScreen = this.add.graphics();
        blackScreen.fillStyle(0x000000, 0);
        blackScreen.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Fade out animation
        this.tweens.add({
            targets: blackScreen,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Resume WorldScene with transition state AND updated NPC health
                this.scene.resume('WorldScene', { 
                    battleVictory: false,
                    returnPosition: this.worldPosition,
                    transitionType: 'escape',
                    updatedNpcHealth: updatedNpcHealth
                });
                this.scene.stop();
            }
        });
    }

    update() {
        // Handle dialogue navigation first (if dialogue is active)
        if (this.isDialogueActive) {
            this.updateDialogueNavigation();
            return; // Don't process other logic during dialogue
        }
        
        // Handle enemy selection mode (separate from normal battle update)
        if (this.isEnemySelectionMode) {
            // Debug: Log once per second instead of every frame
            if (!this.lastEnemySelectionLog || Date.now() - this.lastEnemySelectionLog > 1000) {
                console.log('[BattleScene] update() - in enemy selection mode');
                this.lastEnemySelectionLog = Date.now();
            }
            this.updateEnemySelection();
            return; // Don't process battle logic during enemy selection
        }
        
        if (!this.player || this.enemies.length === 0) return;

        // Check for escape key
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            console.log('[BattleScene] ESC key pressed, returning to world');
            this.returnToWorld();
            return;
        }

        // Check for attack key press
        if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
            console.log('[Update] Attack key pressed');
            this.attack();
        }

        // Handle charging
        if (this.isKeyPressed && !this.isCharging && this.canShootProjectile) {
            const pressDuration = this.time.now - this.chargeStartTime;
            if (pressDuration >= this.chargeThreshold) {
                this.startCharging();
            }
        }

        // Update charge bar if charging
        if (this.isCharging) {
            this.updateChargeBar();
        }

        // Check for secondary attack key press
        if (Phaser.Input.Keyboard.JustDown(this.secondaryAttackKey)) {
            console.log('[Update] Secondary attack key pressed');
            this.secondaryAttack();
        }

        // Handle dash
        if (Phaser.Input.Keyboard.JustDown(this.dashKey) && this.canDash && !this.isDashing) {
            console.log('[Update] Dash initiated');
            this.dash();
        }

        // Player movement with WASD (only if not dashing)
        if (!this.isDashing) {
        if (this.wasdKeys.left.isDown) {
                this.player.body.setVelocityX(-300);
        } else if (this.wasdKeys.right.isDown) {
                this.player.body.setVelocityX(300);
        } else {
            this.player.body.setVelocityX(0);
            }
        }

        // Player jump with W
        if (this.wasdKeys.up.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-450);
        }

        // Update enemy health and level displays
        this.updateEnemyDisplays();
    }

    dash() {
        this.isDashing = true;
        this.canDash = false;
        
        // Determine dash direction based on last movement or facing direction
        const dashDirection = this.wasdKeys.left.isDown ? -1 : 
                            this.wasdKeys.right.isDown ? 1 : 
                            this.player.x < this.enemies[0].x ? 1 : -1;
        
        // Apply dash velocity
        this.player.body.setVelocityX(this.dashSpeed * dashDirection);
        
        // Visual feedback - make player slightly transparent during dash
        this.player.setAlpha(0.7);
        
        console.log('[Dash] Executing dash:', {
            direction: dashDirection,
            speed: this.dashSpeed
        });

        // Reset dash after duration
        this.time.delayedCall(this.dashDuration, () => {
            this.isDashing = false;
            this.player.setAlpha(1);
            this.player.body.setVelocityX(0);
            console.log('[Dash] Dash completed');
        });

        // Reset dash cooldown
        this.time.delayedCall(this.dashCooldown, () => {
            this.canDash = true;
            console.log('[Dash] Dash cooldown reset');
        });
    }

    attack() {
        if (this.isAttacking) {
            console.log('[Attack] Attack already in progress, ignoring');
            return;
        }
        
        console.log('[Attack] Starting new attack');
        this.isAttacking = true;

        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const attackOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create attack hitbox
        const attackX = this.player.x + attackOffset;
        const attackY = this.player.y;
        
        console.log('[Attack] Creating attack hitbox at:', { 
            x: attackX, 
            y: attackY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right',
            playerX: this.player.x,
            enemyX: closestEnemy.x
        });
        
        this.attackSprite = this.add.rectangle(
            attackX,
            attackY,
            this.attackWidth,
            this.attackHeight,
            0xFFFFFF
        );

        // Add physics to attack
        this.physics.add.existing(this.attackSprite);
        this.attackSprite.body.setAllowGravity(false);
        this.attackSprite.body.setBounce(0.1);
        this.attackSprite.body.setCollideWorldBounds(true);
        console.log('[Attack] Attack hitbox physics initialized');

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(this.attackSprite, enemy, () => {
                console.log('[Attack] Hit detected on enemy!');
                
                // Apply knockback to enemy
                const knockbackForce = 300;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-200);
                }
                
                // Visual feedback - flash yellow briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xffff00);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                console.log('[Attack] Applied knockback to enemy:', {
                    force: knockbackForce,
                    direction: isPlayerRightOfEnemy ? 'left' : 'right'
                });

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
            });
        });

        // Remove attack after duration
        this.time.delayedCall(this.attackDuration, () => {
            console.log('[Attack] Attack duration expired, cleaning up');
            if (this.attackSprite) {
                this.attackSprite.destroy();
                this.attackSprite = null;
                console.log('[Attack] Attack hitbox destroyed');
            }
            this.isAttacking = false;
            console.log('[Attack] Attack state reset');
        });
    }

    findClosestEnemy() {
        let closestEnemy = null;
        let closestDistance = Infinity;

        this.enemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                enemy.x,
                enemy.y
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
    }

    secondaryAttack() {
        if (!this.canShootProjectile) {
            console.log('[Secondary Attack] On cooldown, waiting...');
            return;
        }

        if (this.projectileCount >= this.maxProjectiles) {
            console.log('[Secondary Attack] Max projectiles reached, starting reset cooldown');
            this.canShootProjectile = false;
            this.time.delayedCall(this.projectileResetCooldown, () => {
                this.projectileCount = 0;
                this.canShootProjectile = true;
                console.log('[Secondary Attack] Projectile count reset, ready to shoot again');
            });
            return;
        }
        
        console.log('[Secondary Attack] Starting new projectile attack');
        this.isSecondaryAttacking = true;
        this.projectileCount++;

        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const projectileOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create projectile
        const projectileX = this.player.x + projectileOffset;
        const projectileY = this.player.y;
        
        console.log('[Secondary Attack] Creating projectile at:', { 
            x: projectileX, 
            y: projectileY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right',
            playerX: this.player.x,
            enemyX: closestEnemy.x,
            projectileCount: this.projectileCount
        });
        
        const projectile = this.add.rectangle(
            projectileX,
            projectileY,
            this.projectileSize,
            this.projectileSize,
            0xff0000
        );

        // Add physics to projectile
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        projectile.body.setBounce(0.1);
        projectile.body.setCollideWorldBounds(true);
        console.log('[Secondary Attack] Projectile physics initialized');

        // Set projectile velocity
        const direction = isPlayerRightOfEnemy ? -1 : 1;
        projectile.body.setVelocityX(this.projectileSpeed * direction);

        // Add to projectiles array
        this.projectiles.push(projectile);

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(projectile, enemy, () => {
                console.log('[Secondary Attack] Hit detected on enemy!');
                
                // Apply knockback to enemy
                const knockbackForce = 200;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-150);
                }
                
                // Visual feedback - flash yellow briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xffff00);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                // Remove projectile from array and destroy it
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Secondary Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
            });
        });

        // Remove projectile after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            console.log('[Secondary Attack] Projectile duration expired, cleaning up');
            if (projectile && projectile.active) {
                // Remove projectile from array
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();
                console.log('[Secondary Attack] Projectile destroyed');
            }
        });

        // Start cooldown for next shot
        this.canShootProjectile = false;
        this.time.delayedCall(this.projectileCooldown, () => {
            this.canShootProjectile = true;
            console.log('[Secondary Attack] Ready for next shot');
        });
    }

    startCharging() {
        if (this.isCharging) return;
        
        this.isCharging = true;
        this.chargeTime = 0;
        console.log('[Secondary Attack] Started charging');
    }

    updateChargeBar() {
        this.chargeTime = Math.min(this.chargeTime + 16, this.maxChargeTime); // 16ms per frame
        const chargePercent = this.chargeTime / this.maxChargeTime;
        
        // Position bars 5 pixels below the player
        const barX = this.player.x;
        const barY = this.player.y + (this.player.height / 2) + 25;
        
        // Show and position background bar
        this.chargeBarBackground.setPosition(barX, barY);
        this.chargeBarBackground.setVisible(true);
        
        // Update charge bar width and position
        this.chargeBar.width = this.chargeBarWidth * chargePercent;
        this.chargeBar.setPosition(barX - this.chargeBarWidth / 2, barY);
        this.chargeBar.setVisible(true);
        
        // Update charge bar color based on charge level
        if (chargePercent < 0.5) {
            this.chargeBar.setFillStyle(0x00ff00); // Green
        } else if (chargePercent < 0.8) {
            this.chargeBar.setFillStyle(0xffff00); // Yellow
        } else {
            this.chargeBar.setFillStyle(0xff0000); // Red
        }
    }

    releaseCharge() {
        if (!this.isCharging) return;
        
        const chargePercent = this.chargeTime / this.maxChargeTime;
        console.log('[Secondary Attack] Released charge:', chargePercent);
        
        if (chargePercent >= 0.8) { // Only shoot if charged at least 80%
            this.shootChargedProjectile();
        }
        
        this.isCharging = false;
        this.chargeTime = 0;
        this.chargeBar.width = 0;
        
        // Hide the charge bars
        this.chargeBarBackground.setVisible(false);
        this.chargeBar.setVisible(false);
    }

    shootChargedProjectile() {
        // Find closest enemy
        const closestEnemy = this.findClosestEnemy();
        if (!closestEnemy) return;

        // Determine attack direction based on player position relative to enemy
        const isPlayerRightOfEnemy = this.player.x > closestEnemy.x;
        const projectileOffset = isPlayerRightOfEnemy ? -this.attackOffset : this.attackOffset;
        
        // Create charged projectile
        const projectileX = this.player.x + projectileOffset;
        const projectileY = this.player.y;
        
        console.log('[Secondary Attack] Creating charged projectile at:', { 
            x: projectileX, 
            y: projectileY,
            direction: isPlayerRightOfEnemy ? 'left' : 'right'
        });
        
        const projectile = this.add.rectangle(
            projectileX,
            projectileY,
            this.chargedProjectileSize,
            this.chargedProjectileSize,
            0xff00ff // Purple color for charged projectile
        );

        // Add physics to projectile
        this.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        projectile.body.setBounce(0.1);
        projectile.body.setCollideWorldBounds(true);

        // Set projectile velocity
        const direction = isPlayerRightOfEnemy ? -1 : 1;
        projectile.body.setVelocityX(this.chargedProjectileSpeed * direction);

        // Add to projectiles array
        this.projectiles.push(projectile);

        // Add collision with all enemies
        this.enemies.forEach(enemy => {
            this.physics.add.overlap(projectile, enemy, () => {
                console.log('[Secondary Attack] Charged hit detected on enemy!');
                
                // Apply stronger knockback to enemy
                const knockbackForce = 400;
                const knockbackX = isPlayerRightOfEnemy ? -knockbackForce : knockbackForce;
                
                // Apply horizontal knockback
                enemy.body.setVelocityX(knockbackX);
                
                // Apply upward knockback if enemy is on ground
                if (enemy.body.touching.down) {
                    enemy.body.setVelocityY(-250);
                }
                
                // Visual feedback - flash purple briefly
                const originalColor = enemy.enemyData.color;
                enemy.setFillStyle(0xff00ff);
                this.time.delayedCall(100, () => {
                    enemy.setFillStyle(originalColor);
                });
                
                // Remove projectile from array and destroy it
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();

                // Update enemy health
                const damage = 20;
                enemy.enemyData.health = Math.max(0, enemy.enemyData.health - damage);
                
                // Check for defeat with logging
                if (enemy.enemyData.health <= 0) {
                    console.log('[Secondary Attack] Enemy defeated:', enemy.enemyData.id);
                    this.handleEnemyDefeat(enemy);
                }
            });
        });

        // Remove projectile after duration
        this.time.delayedCall(this.secondaryAttackDuration, () => {
            if (projectile && projectile.active) {
                const index = this.projectiles.indexOf(projectile);
                if (index > -1) {
                    this.projectiles.splice(index, 1);
                }
                projectile.destroy();
            }
        });

        // Start cooldown
        this.canShootProjectile = false;
        this.time.delayedCall(this.projectileCooldown, () => {
            this.canShootProjectile = true;
        });
    }

    createChargeBar() {
        // Create charge bar background (positioned relative to player)
        const barWidth = 100;
        const barHeight = 10;
        
        this.chargeBarWidth = barWidth;
        this.chargeBarHeight = barHeight;
        
        this.chargeBarBackground = this.add.rectangle(
            0,
            0,
            barWidth,
            barHeight,
            0x333333
        );
        this.chargeBarBackground.setVisible(false);
        
        this.chargeBar = this.add.rectangle(
            0,
            0,
            0,
            barHeight,
            0x00ff00
        );
        this.chargeBar.setOrigin(0, 0.5);
        this.chargeBar.setVisible(false);
    }

    updateEnemyDisplays() {
        // Now handled by HUD system
        this.updateEnemyHUD();
    }

    /**
     * Update enemy HUD display with current enemy data
     */
    updateEnemyHUD() {
        if (!this.hudManager || !this.enemies) return;
        
        // Map enemy data for HUD display
        const enemyData = this.enemies
            .filter(enemy => enemy && enemy.active && enemy.enemyData)
            .map(enemy => ({
                type: enemy.enemyData.type || 'Enemy',
                health: enemy.enemyData.health,
                maxHealth: enemy.enemyData.maxHealth,
                level: enemy.enemyData.level || 1
            }));
        
        this.hudManager.updateEnemyList(enemyData);
    }

    cleanup() {
        console.log('[BattleScene] Cleaning up scene');
        
        // Destroy HUD
        if (this.hudManager) {
            this.hudManager.destroy();
            this.hudManager = null;
        }
        
        // Destroy all enemies (no text displays to clean up - using DOM only)
        this.enemies.forEach(enemy => {
            if (enemy && enemy.destroy) enemy.destroy();
        });
        this.enemies = [];
        
        // Destroy all projectiles
        if (this.projectiles && Array.isArray(this.projectiles)) {
            this.projectiles.forEach(projectile => {
                if (projectile && projectile.destroy) projectile.destroy();
            });
        }
        this.projectiles = [];
        
        // Destroy all text displays (victory text only now)
        if (this.textDisplays && Array.isArray(this.textDisplays)) {
            this.textDisplays.forEach(display => {
                if (display && display.destroy) display.destroy();
            });
        }
        this.textDisplays = [];
        
        // Reset state variables
        this.isBattleActive = false;
        this.currentTurn = 'player';
        this.selectedEnemy = null;
        this.selectedAbility = null;
        
        // Reset input and action states
        this.isReturning = false;
        this.isAttacking = false;
        this.isSecondaryAttacking = false;
        this.isCharging = false;
        this.isDashing = false;
        this.canDash = true;
        this.canShootProjectile = true;
        this.isKeyPressed = false;
        this.projectileCount = 0;
        this.chargeTime = 0;
        this.chargeStartTime = 0;
        this.isVictorySequence = false;
        this.defeatedEnemyIds = [];
        
        // Hide charge bars
        if (this.chargeBarBackground) this.chargeBarBackground.setVisible(false);
        if (this.chargeBar) this.chargeBar.setVisible(false);
        
        // Clear all tweens and timers
        this.tweens.killAll();
        
        // Clear all delayed calls/timers
        if (this.time && this.time.removeAllEvents) {
            this.time.removeAllEvents();
        }
        
        console.log('[BattleScene] Cleanup complete');
    }

    shutdown() {
        console.log('[BattleScene] Running shutdown');
        this.cleanupInput();
        this.cleanup();
        
        // Disable input
        this.input.keyboard.enabled = false;
        this.input.mouse.enabled = false;
        
        // Call parent shutdown
        super.shutdown();
    }

    /**
     * ====================================================================
     * DIALOGUE SYSTEM METHODS
     * ====================================================================
     */

    showDialogueOptions() {
        console.log('[BattleScene] Showing dialogue options');
        this.isDialogueActive = true;
        
        // Get dialogue data for the first NPC (leader of the group)
        const leadNpc = this.npcDataArray[0];
        const dialogueData = dialogueManager.getDialogueOptions(leadNpc);
        
        console.log('[BattleScene] Dialogue data:', dialogueData);
        
        // Create DOM overlay for dialogue
        this.dialogueOverlay = document.createElement('div');
        this.dialogueOverlay.id = 'battle-dialogue-overlay';
        this.dialogueOverlay.style.cssText = `
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
            animation: fadeIn 0.5s ease-in;
        `;
        
        // Create dialogue content
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 600px;
            padding: 30px;
            background: rgba(0, 0, 0, 0.7);
            border: 3px solid #FFD700;
            border-radius: 15px;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        `;
        
        // NPC greeting
        const greeting = document.createElement('div');
        greeting.style.cssText = `
            font-size: 24px;
            color: #FFF;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
        `;
        greeting.innerHTML = `
            <div style="font-size: 32px; color: #FFD700; margin-bottom: 10px;">
                ${leadNpc.type}
            </div>
            <div style="font-size: 18px; font-style: italic; color: #AAA;">
                "${dialogueData.greeting}"
            </div>
        `;
        content.appendChild(greeting);
        
        // Money display
        const moneyDisplay = document.createElement('div');
        moneyDisplay.style.cssText = `
            font-size: 18px;
            color: #FFD700;
            text-align: center;
            margin: 15px 0;
            padding: 10px;
            background: rgba(255, 215, 0, 0.1);
            border-radius: 5px;
        `;
        moneyDisplay.textContent = `💰 Your Gold: ${moneyManager.getMoney()}`;
        content.appendChild(moneyDisplay);
        
        // Options container
        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 20px;
        `;
        
        // Create buttons for each option
        dialogueData.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.style.cssText = `
                padding: 15px 20px;
                font-size: 18px;
                font-weight: bold;
                color: ${this.getOptionColor(option.id)};
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid ${this.getOptionColor(option.id)};
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: left;
            `;
            
            // Check if option is disabled
            const isDisabled = (option.id === 'negotiate_money' && !option.canAfford) ||
                             (option.id === 'negotiate_item' && option.availableItems.length === 0);
            
            if (isDisabled) {
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
                button.disabled = true;
            }
            
            let buttonText = `${option.text}`;
            if (option.description) {
                buttonText += `<br><span style="font-size: 14px; font-style: italic;">${option.description}</span>`;
            }
            
            if (option.id === 'negotiate_money' && !option.canAfford) {
                buttonText += `<br><span style="font-size: 14px; color: #FF4444;">Insufficient funds!</span>`;
            }
            
            if (option.id === 'negotiate_item' && option.availableItems.length === 0) {
                buttonText += `<br><span style="font-size: 14px; color: #FF4444;">No suitable items!</span>`;
            }
            
            button.innerHTML = buttonText;
            
            // Hover effects
            if (!isDisabled) {
                button.addEventListener('mouseenter', () => {
                    button.style.background = this.getOptionColor(option.id);
                    button.style.color = '#000';
                    button.style.transform = 'scale(1.05)';
                });
                button.addEventListener('mouseleave', () => {
                    button.style.background = 'rgba(0, 0, 0, 0.8)';
                    button.style.color = this.getOptionColor(option.id);
                    button.style.transform = 'scale(1)';
                });
                
                button.addEventListener('click', () => {
                    this.handleDialogueChoice(option.id, option);
                });
            }
            
            optionsContainer.appendChild(button);
        });
        
        content.appendChild(optionsContainer);
        this.dialogueOverlay.appendChild(content);
        document.body.appendChild(this.dialogueOverlay);
    }
    
    getOptionColor(optionId) {
        const colors = {
            'fight': '#FF4444',
            'negotiate_money': '#FFD700',
            'negotiate_item': '#00D9FF',
            'flee': '#888888'
        };
        return colors[optionId] || '#FFFFFF';
    }
    
    handleDialogueChoice(choiceId, optionData) {
        console.log('[BattleScene] Player chose:', choiceId);
        this.dialogueChoice = choiceId;
        
        // Remove dialogue overlay
        if (this.dialogueOverlay) {
            this.dialogueOverlay.remove();
            this.dialogueOverlay = null;
        }
        
        this.isDialogueActive = false;
        
        // Handle the choice
        switch (choiceId) {
            case 'fight':
                // Proceed to battle
                this.setupBattle();
                break;
                
            case 'negotiate_money':
                this.handleMoneyNegotiation(optionData.cost);
                break;
                
            case 'negotiate_item':
                this.showItemSelectionDialog(optionData.availableItems, optionData.requiredValue);
                break;
                
            case 'flee':
                this.handleFleeAttempt();
                break;
        }
    }
    
    handleMoneyNegotiation(cost) {
        const leadNpc = this.npcDataArray[0];
        const result = dialogueManager.negotiateWithMoney(leadNpc, cost);
        
        console.log('[BattleScene] Money negotiation result:', result);
        
        this.showNegotiationResult(result);
    }
    
    showItemSelectionDialog(availableItems, requiredValue) {
        console.log('[BattleScene] Showing item selection dialog');
        
        // Create item selection overlay
        const itemOverlay = document.createElement('div');
        itemOverlay.id = 'item-selection-overlay';
        itemOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10001;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 500px;
            padding: 20px;
            background: rgba(20, 20, 40, 0.95);
            border: 2px solid #00D9FF;
            border-radius: 10px;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 24px;
            color: #00D9FF;
            text-align: center;
            margin-bottom: 15px;
            font-weight: bold;
        `;
        title.textContent = `Select Item to Gift (Min Value: ${requiredValue})`;
        content.appendChild(title);
        
        // Item list
        const itemList = document.createElement('div');
        itemList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 400px;
            overflow-y: auto;
        `;
        
        availableItems.forEach(item => {
            const itemButton = document.createElement('button');
            itemButton.style.cssText = `
                padding: 12px;
                background: rgba(0, 217, 255, 0.1);
                border: 1px solid #00D9FF;
                border-radius: 5px;
                color: #FFF;
                cursor: pointer;
                text-align: left;
                transition: all 0.3s ease;
            `;
            
            itemButton.innerHTML = `
                <div style="font-weight: bold;">${item.name} (Value: ${item.value})</div>
                <div style="font-size: 14px; color: #AAA;">Quantity: ${item.quantity}</div>
            `;
            
            itemButton.addEventListener('mouseenter', () => {
                itemButton.style.background = '#00D9FF';
                itemButton.style.color = '#000';
            });
            itemButton.addEventListener('mouseleave', () => {
                itemButton.style.background = 'rgba(0, 217, 255, 0.1)';
                itemButton.style.color = '#FFF';
            });
            
            itemButton.addEventListener('click', () => {
                itemOverlay.remove();
                this.handleItemNegotiation(item.id);
            });
            
            itemList.appendChild(itemButton);
        });
        
        content.appendChild(itemList);
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: #444;
            border: 1px solid #888;
            border-radius: 5px;
            color: #FFF;
            cursor: pointer;
            width: 100%;
        `;
        cancelButton.textContent = 'Cancel (Fight Instead)';
        cancelButton.addEventListener('click', () => {
            itemOverlay.remove();
            this.setupBattle();
        });
        content.appendChild(cancelButton);
        
        itemOverlay.appendChild(content);
        document.body.appendChild(itemOverlay);
    }
    
    handleItemNegotiation(itemId) {
        const leadNpc = this.npcDataArray[0];
        const result = dialogueManager.negotiateWithItem(leadNpc, itemId);
        
        console.log('[BattleScene] Item negotiation result:', result);
        
        this.showNegotiationResult(result);
    }
    
    handleFleeAttempt() {
        const leadNpc = this.npcDataArray[0];
        const result = dialogueManager.attemptFlee(leadNpc);
        
        console.log('[BattleScene] Flee attempt result:', result);
        
        if (result.success) {
            // Successfully fled
            this.showFleeResult(result);
        } else {
            // Failed to flee, must fight
            this.showFleeResult(result, () => {
                this.setupBattle();
            });
        }
    }
    
    showNegotiationResult(result) {
        // Create result overlay
        const resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10002;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 500px;
            padding: 30px;
            background: ${result.success ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'};
            border: 3px solid ${result.success ? '#00FF00' : '#FF4444'};
            border-radius: 15px;
            text-align: center;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 32px;
            font-weight: bold;
            color: ${result.success ? '#00FF00' : '#FF4444'};
            margin-bottom: 20px;
        `;
        title.textContent = result.success ? '✓ Success!' : '✗ Failed';
        content.appendChild(title);
        
        const message = document.createElement('div');
        message.style.cssText = `
            font-size: 18px;
            color: #FFF;
            margin-bottom: 20px;
        `;
        message.textContent = result.message;
        content.appendChild(message);
        
        if (result.success && result.xpGained) {
            const xpDisplay = document.createElement('div');
            xpDisplay.style.cssText = `
                font-size: 20px;
                color: #00D9FF;
                margin: 15px 0;
            `;
            xpDisplay.textContent = `+${result.xpGained} XP earned`;
            content.appendChild(xpDisplay);
            
            if (result.leveledUp) {
                const levelUp = document.createElement('div');
                levelUp.style.cssText = `
                    font-size: 24px;
                    color: #FFD700;
                    font-weight: bold;
                `;
                levelUp.textContent = `🎉 Level Up! Now Level ${result.newLevel}`;
                content.appendChild(levelUp);
            }
        }
        
        resultOverlay.appendChild(content);
        document.body.appendChild(resultOverlay);
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            resultOverlay.remove();
            if (result.success) {
                // Return to world
                this.handleNegotiationVictory();
            } else {
                // Must fight
                this.setupBattle();
            }
        }, 3000);
    }
    
    showFleeResult(result, onComplete = null) {
        const resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10002;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 400px;
            padding: 30px;
            background: ${result.success ? 'rgba(0, 217, 255, 0.1)' : 'rgba(255, 68, 68, 0.1)'};
            border: 3px solid ${result.success ? '#00D9FF' : '#FF4444'};
            border-radius: 15px;
            text-align: center;
        `;
        
        const message = document.createElement('div');
        message.style.cssText = `
            font-size: 24px;
            color: ${result.success ? '#00D9FF' : '#FF4444'};
            font-weight: bold;
        `;
        message.textContent = result.message;
        content.appendChild(message);
        
        resultOverlay.appendChild(content);
        document.body.appendChild(resultOverlay);
        
        setTimeout(() => {
            resultOverlay.remove();
            if (result.success) {
                this.returnToWorld();
            } else if (onComplete) {
                onComplete();
            }
        }, 2000);
    }
    
    handleNegotiationVictory() {
        console.log('[BattleScene] Negotiation successful, returning to world');
        
        // Mark NPCs as defeated (negotiated away)
        this.defeatedEnemyIds = this.npcDataArray.map(npc => npc.id);
        
        const transitionData = {
            battleVictory: true,
            returnPosition: this.worldPosition,
            defeatedNpcIds: this.defeatedEnemyIds,
            transitionType: 'negotiation'
        };
        
        console.log('[BattleScene] Negotiation victory transition data:', transitionData);
        
        // Clean up and return
        this.cleanup();
        this.scene.resume('WorldScene', transitionData);
        this.scene.stop();
    }

    animateXpCounter(xpText, totalXp) {
        console.log(`[BattleScene] Animating XP counter from 0 to ${totalXp}`);
        
        let currentXp = 0;
        const incrementSpeed = Math.max(1, Math.floor(totalXp / 60)); // Complete in ~1 second at 60fps
        
        // Create a timer to count up the XP
        const xpTimer = this.time.addEvent({
            delay: 16, // ~60fps
            repeat: Math.ceil(totalXp / incrementSpeed),
            callback: () => {
                currentXp = Math.min(currentXp + incrementSpeed, totalXp);
                xpText.setText(`EXP: ${currentXp}`);
                
                // When finished, apply XP to player
                if (currentXp >= totalXp) {
                    console.log(`[BattleScene] XP animation complete, applying ${totalXp} XP to player`);
                    
                    // Apply XP to player and check for level up
                    const result = statsManager.addPlayerExperience(totalXp);
                    
                    if (result.leveledUp) {
                        console.log(`[BattleScene] 🎉 PLAYER LEVELED UP to ${result.newLevel}!`);
                        console.log(`[BattleScene] Stats gained:`, result.statsGained);
                        
                        // Show level up notification
                        this.showLevelUpNotification(result.newLevel, result.statsGained);
                    }
                }
            }
        });
    }

    showLevelUpNotification(newLevel, statsGained) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Create level up text
        const levelUpText = this.add.text(
            centerX,
            centerY + 120,
            `LEVEL UP!\nLevel ${newLevel}`,
            {
                fontSize: '40px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#FFD700',
                stroke: '#FF6B00',
                strokeThickness: 4,
                align: 'center'
            }
        ).setOrigin(0.5).setAlpha(0);
        this.textDisplays.push(levelUpText);
        
        // Dramatic appearance
        this.tweens.add({
            targets: levelUpText,
            alpha: 1,
            scale: 1.3,
            duration: 500,
            ease: 'Back.Out'
        });
        
        // Pulse effect
        this.tweens.add({
            targets: levelUpText,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 800,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });
        
        console.log('[BattleScene] Level up notification displayed');
    }

    handleEnemyDefeat(enemy) {
        console.log('[BattleScene] Handling enemy defeat:', enemy.enemyData.id);
        
        // IMPORTANT: Store the defeated enemy ID AND data BEFORE removing the enemy
        if (enemy.enemyData && enemy.enemyData.id) {
            this.defeatedEnemyIds.push(enemy.enemyData.id);
            
            // Store enemy data for XP calculation
            this.defeatedEnemiesData.push({
                id: enemy.enemyData.id,
                type: enemy.enemyData.type,
                level: enemy.enemyData.level
            });
            
            console.log('[BattleScene] Stored defeated enemy ID:', enemy.enemyData.id);
            console.log('[BattleScene] Total defeated in this battle:', this.defeatedEnemyIds);
        }
        
        // Remove enemy (no Phaser text displays to clean up - using DOM only)
        enemy.destroy();
        this.enemies = this.enemies.filter(e => e !== enemy);

        // Log remaining enemies
        console.log('[BattleScene] Remaining enemies:', this.enemies.length);

        // Check if all enemies are defeated
        if (this.enemies.length === 0) {
            console.log('[BattleScene] All enemies defeated, triggering victory sequence');
            this.showVictorySequence();
        }
    }

    showVictorySequence() {
        console.log('[BattleScene] Starting victory sequence');
        
        // Disable input during victory sequence
        this.input.enabled = false;
        
        // Use the defeatedEnemyIds that were collected during battle
        // (this.enemies array is empty by the time we get here)
        console.log('[BattleScene] Defeated NPC IDs:', this.defeatedEnemyIds);
        
        // Calculate total XP from defeated enemies
        const playerLevel = gameStateManager.playerStats.level;
        this.totalXpEarned = 0;
        
        this.defeatedEnemiesData.forEach(enemy => {
            const xp = statsManager.calculateBattleXp(enemy.level, playerLevel, enemy.type);
            this.totalXpEarned += xp;
            console.log(`[BattleScene] XP from ${enemy.type} (Lvl ${enemy.level}): ${xp}`);
        });
        
        console.log(`[BattleScene] Total XP earned: ${this.totalXpEarned}`);
        
        // Center camera on screen center
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        
        // Create dramatic glowing gold victory text
        const victoryText = this.add.text(
            centerX,
            centerY - 50,
            'VICTORY!',
            {
                fontSize: '96px',
                fontFamily: 'Arial Black, Arial',
                fontStyle: 'bold',
                color: '#FFD700', // Gold color
                stroke: '#B8860B', // Dark goldenrod stroke
                strokeThickness: 8,
                shadow: {
                    offsetX: 0,
                    offsetY: 0,
                    color: '#FFD700',
                    blur: 20,
                    fill: true
                }
            }
        ).setOrigin(0.5).setAlpha(0).setScale(0.5);
        this.textDisplays.push(victoryText);
        
        // Create XP counter text
        const xpText = this.add.text(
            centerX,
            centerY + 50,
            `EXP: 0`,
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#00D9FF', // Cyan color
                stroke: '#0066CC',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setAlpha(0);
        this.textDisplays.push(xpText);
        
        // Dramatic entrance animation with glowing effect
        this.tweens.add({
            targets: victoryText,
            scale: 1.2,
            alpha: 1,
            duration: 800,
            ease: 'Elastic.Out',
            yoyo: false
        });
        
        // Pulsing glow effect
        this.tweens.add({
            targets: victoryText,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 1000,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: 1
        });
        
        // Fade in XP text
        this.tweens.add({
            targets: xpText,
            alpha: 1,
            duration: 500,
            delay: 800,
            onComplete: () => {
                // Start XP countdown animation
                this.animateXpCounter(xpText, this.totalXpEarned);
            }
        });
        
        // Fade out and exit animation
        this.time.delayedCall(3500, () => {
            this.tweens.add({
                targets: victoryText,
                y: victoryText.y - 50,
                alpha: 0,
                scale: 0.8,
                duration: 1000,
                ease: 'Power2.In',
                onComplete: () => {
                    victoryText.destroy();
                    
                    // Create black rectangle for fade out
                    const fadeRect = this.add.rectangle(
                        0, 0,
                        this.cameras.main.width,
                        this.cameras.main.height,
                        0x000000
                    ).setOrigin(0).setDepth(1000);
                    
                    // Fade to black
                    this.tweens.add({
                        targets: fadeRect,
                        alpha: 1,
                        duration: 1000,
                        onComplete: () => {
                            // Prepare transition data
                            const transitionData = {
                                battleVictory: true,
                                returnPosition: this.worldPosition,
                                defeatedNpcIds: this.defeatedEnemyIds,
                                transitionType: 'victory'
                            };
                            
                            console.log('[BattleScene] ========== VICTORY TRANSITION ==========');
                            console.log('[BattleScene] Defeated enemy IDs collected:', this.defeatedEnemyIds);
                            console.log('[BattleScene] Transition data:', JSON.stringify(transitionData, null, 2));
                            
                            // Clean up the scene
                            this.cleanup();
                            
                            // Resume WorldScene first (which was paused), THEN stop this scene
                            this.scene.resume('WorldScene', transitionData);
                            this.scene.stop();
                        }
                    });
                }
            });
        });
    }
}
