/**
 * DialogueManager - Dialogue and Negotiation System
 * Handles dialogue trees, negotiation mechanics, and battle alternatives
 */

import { moneyManager } from './MoneyManager.js';
import { itemsManager } from './ItemsManager.js';
import { statsManager } from './StatsManager.js';
import { gameStateManager } from './GameStateManager.js';

class DialogueManager {
    constructor() {
        if (DialogueManager.instance) {
            return DialogueManager.instance;
        }
        
        // Negotiation difficulty modifiers
        this.negotiationModifiers = {
            'GUARD': 0.8,     // Guards are harder to negotiate with
            'MERCHANT': 1.2,   // Merchants are easier
            'VILLAGER': 1.0    // Villagers are neutral
        };
        
        DialogueManager.instance = this;
    }
    
    /**
     * Calculate negotiation cost based on NPC type and level
     */
    calculateNegotiationCost(npcType, npcLevel, playerLevel) {
        const baseCost = 20;
        const levelDiff = Math.max(1, npcLevel - playerLevel + 1);
        const typeModifier = this.negotiationModifiers[npcType] || 1.0;
        
        const cost = Math.floor(baseCost * levelDiff * typeModifier);
        
        console.log(`[DialogueManager] Negotiation cost calculation:`, {
            npcType,
            npcLevel,
            playerLevel,
            levelDiff,
            typeModifier,
            cost
        });
        
        return cost;
    }
    
    /**
     * Calculate item gift value needed for negotiation
     */
    calculateItemGiftValue(npcType, npcLevel, playerLevel) {
        // Item gifts are worth 1.5x gold in negotiation
        return Math.floor(this.calculateNegotiationCost(npcType, npcLevel, playerLevel) * 1.5);
    }
    
    /**
     * Attempt money negotiation
     * @param {object} npcData - NPC data
     * @param {number} offeredAmount - Money offered
     * @returns {object} Result of negotiation
     */
    negotiateWithMoney(npcData, offeredAmount) {
        const playerLevel = gameStateManager.playerStats.level;
        const requiredAmount = this.calculateNegotiationCost(npcData.type, npcData.level, playerLevel);
        
        console.log(`[DialogueManager] Money negotiation attempt:`, {
            npcType: npcData.type,
            npcLevel: npcData.level,
            offeredAmount,
            requiredAmount
        });
        
        // Check if player has enough money
        if (!moneyManager.canAfford(offeredAmount)) {
            return {
                success: false,
                reason: 'insufficient_funds',
                message: `You don't have ${offeredAmount} gold!`
            };
        }
        
        // Check if offer is acceptable
        if (offeredAmount < requiredAmount) {
            return {
                success: false,
                reason: 'insufficient_offer',
                message: `${npcData.type} demands at least ${requiredAmount} gold!`,
                requiredAmount
            };
        }
        
        // Successful negotiation
        moneyManager.removeMoney(offeredAmount, `Negotiated with ${npcData.type}`);
        
        // Grant negotiation XP (50% of battle XP)
        const battleXp = statsManager.calculateBattleXp(npcData.level, playerLevel, npcData.type);
        const negotiationXp = Math.floor(battleXp * 0.5);
        const xpResult = statsManager.addPlayerExperience(negotiationXp);
        
        return {
            success: true,
            reason: 'negotiation_success',
            message: `${npcData.type} accepts your offer and leaves peacefully.`,
            xpGained: negotiationXp,
            leveledUp: xpResult.leveledUp,
            newLevel: xpResult.newLevel
        };
    }
    
    /**
     * Attempt item gift negotiation
     * @param {object} npcData - NPC data
     * @param {string} itemId - Item to gift
     * @returns {object} Result of negotiation
     */
    negotiateWithItem(npcData, itemId) {
        const playerLevel = gameStateManager.playerStats.level;
        const requiredValue = this.calculateItemGiftValue(npcData.type, npcData.level, playerLevel);
        
        // Check if player has the item
        if (!itemsManager.hasItem(itemId)) {
            return {
                success: false,
                reason: 'no_item',
                message: `You don't have that item!`
            };
        }
        
        // Get item info
        const itemInfo = itemsManager.getItemInfo(itemId);
        if (!itemInfo) {
            return {
                success: false,
                reason: 'invalid_item',
                message: `Invalid item!`
            };
        }
        
        console.log(`[DialogueManager] Item negotiation attempt:`, {
            npcType: npcData.type,
            npcLevel: npcData.level,
            itemName: itemInfo.name,
            itemValue: itemInfo.value,
            requiredValue
        });
        
        // Check if item value is sufficient
        if (itemInfo.value < requiredValue) {
            return {
                success: false,
                reason: 'insufficient_value',
                message: `${npcData.type} is not interested in ${itemInfo.name}. (Value: ${itemInfo.value}, Need: ${requiredValue})`,
                requiredValue
            };
        }
        
        // Remove item from inventory
        itemsManager.removeItem(itemId, 1);
        
        // Grant negotiation XP (50% of battle XP)
        const battleXp = statsManager.calculateBattleXp(npcData.level, playerLevel, npcData.type);
        const negotiationXp = Math.floor(battleXp * 0.5);
        const xpResult = statsManager.addPlayerExperience(negotiationXp);
        
        return {
            success: true,
            reason: 'negotiation_success',
            message: `${npcData.type} is pleased with your ${itemInfo.name} and leaves peacefully.`,
            xpGained: negotiationXp,
            leveledUp: xpResult.leveledUp,
            newLevel: xpResult.newLevel
        };
    }
    
    /**
     * Get dialogue options for NPC
     */
    getDialogueOptions(npcData) {
        const playerLevel = gameStateManager.playerStats.level;
        const moneyCost = this.calculateNegotiationCost(npcData.type, npcData.level, playerLevel);
        const itemValue = this.calculateItemGiftValue(npcData.type, npcData.level, playerLevel);
        
        return {
            greeting: this.getGreeting(npcData.type),
            options: [
                {
                    id: 'fight',
                    text: '⚔️ Fight',
                    description: 'Engage in combat'
                },
                {
                    id: 'negotiate_money',
                    text: `💰 Negotiate (${moneyCost} gold)`,
                    description: 'Offer money to avoid combat',
                    cost: moneyCost,
                    canAfford: moneyManager.canAfford(moneyCost)
                },
                {
                    id: 'negotiate_item',
                    text: `🎁 Gift Item (Value: ${itemValue}+)`,
                    description: 'Offer an item to avoid combat',
                    requiredValue: itemValue,
                    availableItems: this.getAvailableItemsForNegotiation(itemValue)
                },
                {
                    id: 'flee',
                    text: '🏃 Flee',
                    description: 'Try to escape'
                }
            ]
        };
    }
    
    /**
     * Get greeting message based on NPC type
     */
    getGreeting(npcType) {
        const greetings = {
            'GUARD': "Halt! You there! State your business!",
            'MERCHANT': "Greetings, traveler. Let's discuss terms.",
            'VILLAGER': "Hello... can we talk about this?"
        };
        return greetings[npcType] || "...";
    }
    
    /**
     * Get items that can be used for negotiation
     */
    getAvailableItemsForNegotiation(minValue) {
        const inventory = itemsManager.getInventory();
        return inventory
            .filter(item => item.value >= minValue)
            .map(item => ({
                id: item.id,
                name: item.name,
                value: item.value,
                quantity: item.quantity
            }));
    }
    
    /**
     * Calculate flee success chance
     */
    calculateFleeChance(playerLevel, npcLevel) {
        const baseChance = 0.5;
        const levelDiff = playerLevel - npcLevel;
        const levelModifier = levelDiff * 0.1;
        
        return Math.max(0.1, Math.min(0.9, baseChance + levelModifier));
    }
    
    /**
     * Attempt to flee
     */
    attemptFlee(npcData) {
        const playerLevel = gameStateManager.playerStats.level;
        const fleeChance = this.calculateFleeChance(playerLevel, npcData.level);
        const roll = Math.random();
        
        const success = roll < fleeChance;
        
        console.log(`[DialogueManager] Flee attempt:`, {
            playerLevel,
            npcLevel: npcData.level,
            fleeChance,
            roll,
            success
        });
        
        return {
            success,
            message: success 
                ? "You successfully escape!" 
                : "You failed to escape! Must fight!",
            fleeChance: Math.round(fleeChance * 100)
        };
    }
}

// Export singleton instance
export const dialogueManager = new DialogueManager();

