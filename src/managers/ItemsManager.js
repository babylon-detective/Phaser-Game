/**
 * ItemsManager - Universal Inventory System
 * Singleton pattern for managing player's items across all scenes
 */

class ItemsManager {
    constructor() {
        if (ItemsManager.instance) {
            return ItemsManager.instance;
        }
        
        this.inventory = [];
        this.maxInventorySize = 50;
        
        // Initialize with some starting items for testing
        this.initializeStartingItems();
        
        // Item database
        this.itemDatabase = {
            'health_potion': {
                id: 'health_potion',
                name: 'Health Potion',
                description: 'Restores 50 HP',
                type: 'consumable',
                value: 25,
                effect: { type: 'heal', amount: 50 }
            },
            'mana_potion': {
                id: 'mana_potion',
                name: 'Mana Potion',
                description: 'Restores 30 Mana',
                type: 'consumable',
                value: 20,
                effect: { type: 'mana', amount: 30 }
            },
            'attack_boost': {
                id: 'attack_boost',
                name: 'Attack Boost',
                description: 'Temporarily increases attack by 10',
                type: 'consumable',
                value: 30,
                effect: { type: 'attack', amount: 10, duration: 3 }
            },
            'defense_boost': {
                id: 'defense_boost',
                name: 'Defense Boost',
                description: 'Temporarily increases defense by 10',
                type: 'consumable',
                value: 30,
                effect: { type: 'defense', amount: 10, duration: 3 }
            },
            'ancient_scroll': {
                id: 'ancient_scroll',
                name: 'Ancient Scroll',
                description: 'Contains ancient knowledge',
                type: 'quest',
                value: 100,
                effect: null
            },
            'gold_ring': {
                id: 'gold_ring',
                name: 'Gold Ring',
                description: 'A valuable gold ring',
                type: 'valuable',
                value: 150,
                effect: null
            }
        };
        
        ItemsManager.instance = this;
    }
    
    /**
     * Get all items in inventory
     */
    getInventory() {
        return [...this.inventory];
    }
    
    /**
     * Get item count
     */
    getItemCount(itemId) {
        const item = this.inventory.find(i => i.id === itemId);
        return item ? item.quantity : 0;
    }
    
    /**
     * Add item to inventory
     * @param {string} itemId - Item ID from database
     * @param {number} quantity - Amount to add
     * @returns {boolean} Success status
     */
    addItem(itemId, quantity = 1) {
        if (!this.itemDatabase[itemId]) {
            console.error(`[ItemsManager] Unknown item: ${itemId}`);
            return false;
        }
        
        // Check inventory space
        const totalItems = this.inventory.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems + quantity > this.maxInventorySize) {
            console.warn('[ItemsManager] Inventory full!');
            return false;
        }
        
        // Find existing item
        const existingItem = this.inventory.find(i => i.id === itemId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.inventory.push({
                ...this.itemDatabase[itemId],
                quantity
            });
        }
        
        console.log(`[ItemsManager] Added ${quantity}x ${this.itemDatabase[itemId].name}`);
        return true;
    }
    
    /**
     * Remove item from inventory
     * @param {string} itemId - Item ID
     * @param {number} quantity - Amount to remove
     * @returns {boolean} Success status
     */
    removeItem(itemId, quantity = 1) {
        const itemIndex = this.inventory.findIndex(i => i.id === itemId);
        
        if (itemIndex === -1) {
            console.warn(`[ItemsManager] Item not found: ${itemId}`);
            return false;
        }
        
        const item = this.inventory[itemIndex];
        
        if (item.quantity < quantity) {
            console.warn(`[ItemsManager] Insufficient quantity: ${item.quantity} < ${quantity}`);
            return false;
        }
        
        item.quantity -= quantity;
        
        // Remove item if quantity reaches 0
        if (item.quantity === 0) {
            this.inventory.splice(itemIndex, 1);
        }
        
        console.log(`[ItemsManager] Removed ${quantity}x ${item.name}`);
        return true;
    }
    
    /**
     * Use an item
     * @param {string} itemId - Item ID
     * @param {object} target - Target to apply effect to (e.g., player stats)
     * @returns {object|null} Effect applied or null if failed
     */
    useItem(itemId, target) {
        const item = this.inventory.find(i => i.id === itemId);
        
        if (!item) {
            console.warn(`[ItemsManager] Cannot use item not in inventory: ${itemId}`);
            return null;
        }
        
        if (item.type !== 'consumable') {
            console.warn(`[ItemsManager] Item is not consumable: ${itemId}`);
            return null;
        }
        
        // Remove one unit of the item
        if (!this.removeItem(itemId, 1)) {
            return null;
        }
        
        console.log(`[ItemsManager] Used ${item.name}`);
        return item.effect;
    }
    
    /**
     * Check if player has item
     */
    hasItem(itemId, quantity = 1) {
        const item = this.inventory.find(i => i.id === itemId);
        return item && item.quantity >= quantity;
    }
    
    /**
     * Get item info from database
     */
    getItemInfo(itemId) {
        return this.itemDatabase[itemId] ? { ...this.itemDatabase[itemId] } : null;
    }
    
    /**
     * Get total inventory value
     */
    getInventoryValue() {
        return this.inventory.reduce((total, item) => total + (item.value * item.quantity), 0);
    }
    
    /**
     * Initialize starting items for new game
     */
    initializeStartingItems() {
        // Only initialize if inventory is empty
        if (this.inventory.length > 0) return;
        
        // Give player some starting items
        this.addItem('health_potion', 2);
        this.addItem('gold_ring', 1);
        console.log('[ItemsManager] Starting items initialized');
    }
    
    /**
     * Reset inventory
     */
    reset() {
        this.inventory = [];
        this.initializeStartingItems(); // Add starting items after reset
        console.log('[ItemsManager] Inventory reset with starting items');
    }
    
    /**
     * Get save data
     */
    getSaveData() {
        return {
            inventory: this.inventory.map(item => ({
                id: item.id,
                quantity: item.quantity
            }))
        };
    }
    
    /**
     * Load save data
     */
    loadSaveData(data) {
        if (data && data.inventory) {
            this.inventory = [];
            data.inventory.forEach(savedItem => {
                if (this.itemDatabase[savedItem.id]) {
                    this.inventory.push({
                        ...this.itemDatabase[savedItem.id],
                        quantity: savedItem.quantity
                    });
                }
            });
            console.log(`[ItemsManager] Loaded ${this.inventory.length} item types`);
        }
    }
}

// Export singleton instance
export const itemsManager = new ItemsManager();

