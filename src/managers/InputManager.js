import Phaser from "phaser";

/**
 * InputManager - Centralized input handling for the game
 * Manages all keyboard and input controls across different scenes
 */
export default class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.keys = {};
        this.listeners = [];
    }

    /**
     * Initialize input keys for a specific context (world, battle, map, etc.)
     * @param {string} context - The context for inputs ('world', 'battle', 'map')
     */
    init(context = 'world') {
        console.log(`[InputManager] Initializing inputs for context: ${context}`);
        
        // Clear any existing keys and listeners
        this.cleanup();
        
        // Set up keys based on context
        switch (context) {
            case 'world':
                this.initWorldControls();
                break;
            case 'battle':
                this.initBattleControls();
                break;
            case 'map':
                this.initMapControls();
                break;
            default:
                console.warn(`[InputManager] Unknown context: ${context}`);
        }
    }

    /**
     * Initialize world scene controls
     */
    initWorldControls() {
        // WASD movement keys
        this.keys.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Sprint/Run key
        this.keys.shift = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        // Map toggle key
        this.keys.map = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        console.log('[InputManager] World controls initialized');
    }

    /**
     * Initialize battle scene controls
     */
    initBattleControls() {
        // WASD movement keys
        this.keys.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Combat keys
        this.keys.primaryAttack = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CLOSE_BRACKET); // ]
        this.keys.secondaryAttack = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET); // [
        
        // Dash key
        this.keys.dash = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        
        // Escape key
        this.keys.escape = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        console.log('[InputManager] Battle controls initialized');
    }

    /**
     * Initialize map scene controls
     */
    initMapControls() {
        // Map close key
        this.keys.map = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.keys.escape = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        console.log('[InputManager] Map controls initialized');
    }

    /**
     * Add a custom key binding
     * @param {string} name - Name for the key binding
     * @param {number} keyCode - Phaser keycode
     * @returns {Phaser.Input.Keyboard.Key} The created key
     */
    addKey(name, keyCode) {
        if (this.keys[name]) {
            console.warn(`[InputManager] Key "${name}" already exists, overwriting`);
        }
        
        this.keys[name] = this.scene.input.keyboard.addKey(keyCode);
        return this.keys[name];
    }

    /**
     * Add a key listener
     * @param {string} keyName - Name of the key to listen to
     * @param {string} event - Event type ('down', 'up', 'press')
     * @param {Function} callback - Callback function
     */
    on(keyName, event, callback) {
        if (!this.keys[keyName]) {
            console.warn(`[InputManager] Key "${keyName}" not found`);
            return;
        }

        this.keys[keyName].on(event, callback);
        this.listeners.push({ key: keyName, event, callback });
    }

    /**
     * Remove a key listener
     * @param {string} keyName - Name of the key
     * @param {string} event - Event type
     * @param {Function} callback - Callback function
     */
    off(keyName, event, callback) {
        if (!this.keys[keyName]) {
            return;
        }

        this.keys[keyName].off(event, callback);
        this.listeners = this.listeners.filter(
            l => !(l.key === keyName && l.event === event && l.callback === callback)
        );
    }

    /**
     * Get a key by name
     * @param {string} name - Name of the key
     * @returns {Phaser.Input.Keyboard.Key|Object}
     */
    getKey(name) {
        return this.keys[name];
    }

    /**
     * Check if a key is currently pressed
     * @param {string} name - Name of the key
     * @returns {boolean}
     */
    isKeyDown(name) {
        return this.keys[name] && this.keys[name].isDown;
    }

    /**
     * Check if a key was just pressed
     * @param {string} name - Name of the key
     * @returns {boolean}
     */
    isKeyJustDown(name) {
        return this.keys[name] && Phaser.Input.Keyboard.JustDown(this.keys[name]);
    }

    /**
     * Check if a key was just released
     * @param {string} name - Name of the key
     * @returns {boolean}
     */
    isKeyJustUp(name) {
        return this.keys[name] && Phaser.Input.Keyboard.JustUp(this.keys[name]);
    }

    /**
     * Get WASD movement input as a normalized vector
     * @returns {{x: number, y: number}} Normalized direction vector
     */
    getMovementInput() {
        if (!this.keys.wasd) {
            return { x: 0, y: 0 };
        }

        let dx = 0;
        let dy = 0;

        if (this.keys.wasd.left.isDown) dx = -1;
        if (this.keys.wasd.right.isDown) dx = 1;
        if (this.keys.wasd.up.isDown) dy = -1;
        if (this.keys.wasd.down.isDown) dy = 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(2);
            dx /= length;
            dy /= length;
        }

        return { x: dx, y: dy };
    }

    /**
     * Enable all input
     */
    enable() {
        if (this.scene.input) {
            this.scene.input.enabled = true;
            console.log('[InputManager] Input enabled');
        }
    }

    /**
     * Disable all input
     */
    disable() {
        if (this.scene.input) {
            this.scene.input.enabled = false;
            console.log('[InputManager] Input disabled');
        }
    }

    /**
     * Clean up all keys and listeners
     */
    cleanup() {
        console.log('[InputManager] Cleaning up inputs');
        
        // Remove all listeners
        this.listeners.forEach(({ key, event, callback }) => {
            if (this.keys[key]) {
                this.keys[key].off(event, callback);
            }
        });
        this.listeners = [];

        // Remove all keys
        Object.keys(this.keys).forEach(keyName => {
            if (this.keys[keyName] && this.keys[keyName].destroy) {
                this.keys[keyName].destroy();
            }
        });
        this.keys = {};
    }

    /**
     * Destroy the input manager
     */
    destroy() {
        this.cleanup();
        this.scene = null;
    }
}

