import Phaser from "phaser";
import SaveState from "../SaveState";
import { gameStateManager } from "../managers/GameStateManager.js";

export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
        this.selectedIndex = 0;
        this.menuItems = [];
    }

    preload() {
        this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
    }

    create() {
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0.5, 0.5);

        // Initialize text objects before calling resizeGame
        this.titleText = this.add.text(this.scale.width / 2, this.scale.height / 4, 'NAGEEX', { fontSize: '262px', fill: '#fff' }).setOrigin(0.5, 0.5);
        
        // Create menu items with bullet points
        const menuY = this.scale.height / 2;
        this.menuItems = [
            this.add.text(this.scale.width / 2, menuY, '• Start', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0.5),
            this.add.text(this.scale.width / 2, menuY + 50, '• Continue', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5, 0.5)
        ];

        // Set up keyboard controls
        this.wasdKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER
        });

        // Set up click handlers
        this.menuItems[0].setInteractive().on('pointerdown', () => this.selectMenuItem(0));
        this.menuItems[1].setInteractive().on('pointerdown', () => this.selectMenuItem(1));

        // Highlight initial selection
        this.updateSelection();

        // Call resizeGame after initializing text objects
        this.resizeGame();

        window.addEventListener('resize', this.resizeGame.bind(this));
    }

    update() {
        // Handle menu navigation
        if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.up)) {
            this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
            this.updateSelection();
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.down)) {
            this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
            this.updateSelection();
        }

        // Handle selection
        if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.enter)) {
            this.selectMenuItem(this.selectedIndex);
        }
    }

    updateSelection() {
        // Update all menu items
        this.menuItems.forEach((item, index) => {
            const text = item.text;
            if (index === this.selectedIndex) {
                item.setStyle({ fill: '#ffff00' }); // Highlight selected item
                item.setText('> ' + text.substring(2)); // Replace bullet with arrow
            } else {
                item.setStyle({ fill: '#fff' });
                item.setText('• ' + text.substring(2)); // Restore bullet
            }
        });
    }

    selectMenuItem(index) {
        if (index === 0) {
            // Start new game
            SaveState.clear(); // Clear any existing save state
            gameStateManager.resetGame(); // Reset game state
            gameStateManager.startTimer(); // Start gameplay timer
            console.log('[StartScene] Starting new game, timer initialized');
            this.scene.start('WorldScene');
        } else if (index === 1) {
            // Continue game
            const gameState = SaveState.load();
            const loaded = gameStateManager.loadGame(); // Load saved game state
            if (loaded) {
                gameStateManager.startTimer(); // Resume timer
                console.log('[StartScene] Continuing game, timer resumed');
            } else {
                // No save found, start new game
                gameStateManager.resetGame();
                gameStateManager.startTimer();
                console.log('[StartScene] No save found, starting new game');
            }
            
            if (gameState) {
                this.scene.start(gameState.scene, gameState.data);
            } else {
                this.scene.start('WorldScene');
            }
        }
    }

    resizeGame() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.scale.resize(width, height);

        const aspectRatio = this.sky.width / this.sky.height;
        if (width / height > aspectRatio) {
            this.sky.displayWidth = width;
            this.sky.displayHeight = width / aspectRatio;
        } else {
            this.sky.displayHeight = height;
            this.sky.displayWidth = height * aspectRatio;
        }
        this.sky.x = width / 2;
        this.sky.y = height / 2;

        // Center the text elements
        this.titleText.setPosition(width / 2, height / 4);
        this.menuItems[0].setPosition(width / 2, height / 2);
        this.menuItems[1].setPosition(width / 2, height / 2 + 50);
    }

    startBattle(npcData) {
        this.scene.start('BattleScene', {
            playerData: this.playerManager.getPlayerData(),
            npcData: npcData // Pass the npcData including triggerRadius
        });
    }
}