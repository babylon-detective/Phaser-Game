/**
 * MoneyManager - Universal Currency System
 * Singleton pattern for managing player's money across all scenes
 */

class MoneyManager {
    constructor() {
        if (MoneyManager.instance) {
            return MoneyManager.instance;
        }
        
        this.money = 150; // Starting money (enough for some negotiations)
        this.transactionHistory = [];
        
        MoneyManager.instance = this;
    }
    
    /**
     * Get current money amount
     */
    getMoney() {
        return this.money;
    }
    
    /**
     * Set money amount (used for loading saved games)
     */
    setMoney(amount) {
        this.money = Math.max(0, amount);
        console.log(`[MoneyManager] Money set to: ${this.money}`);
    }
    
    /**
     * Add money
     * @param {number} amount - Amount to add
     * @param {string} reason - Reason for transaction
     * @returns {number} New total
     */
    addMoney(amount, reason = 'Unknown') {
        if (amount <= 0) {
            console.warn(`[MoneyManager] Attempted to add non-positive amount: ${amount}`);
            return this.money;
        }
        
        this.money += amount;
        this.logTransaction('ADD', amount, reason);
        console.log(`[MoneyManager] +${amount} gold (${reason}) | Total: ${this.money}`);
        return this.money;
    }
    
    /**
     * Remove money
     * @param {number} amount - Amount to remove
     * @param {string} reason - Reason for transaction
     * @returns {boolean} Success status
     */
    removeMoney(amount, reason = 'Unknown') {
        if (amount <= 0) {
            console.warn(`[MoneyManager] Attempted to remove non-positive amount: ${amount}`);
            return false;
        }
        
        if (this.money < amount) {
            console.warn(`[MoneyManager] Insufficient funds: ${this.money} < ${amount}`);
            return false;
        }
        
        this.money -= amount;
        this.logTransaction('REMOVE', amount, reason);
        console.log(`[MoneyManager] -${amount} gold (${reason}) | Total: ${this.money}`);
        return true;
    }
    
    /**
     * Check if player can afford amount
     */
    canAfford(amount) {
        return this.money >= amount;
    }
    
    /**
     * Log transaction to history
     */
    logTransaction(type, amount, reason) {
        this.transactionHistory.push({
            type,
            amount,
            reason,
            timestamp: Date.now(),
            balanceAfter: this.money
        });
        
        // Keep only last 50 transactions
        if (this.transactionHistory.length > 50) {
            this.transactionHistory.shift();
        }
    }
    
    /**
     * Get transaction history
     */
    getTransactionHistory() {
        return [...this.transactionHistory];
    }
    
    /**
     * Reset money to starting amount
     */
    reset() {
        this.money = 100;
        this.transactionHistory = [];
        console.log('[MoneyManager] Reset to starting amount');
    }
    
    /**
     * Get save data
     */
    getSaveData() {
        return {
            money: this.money,
            transactionHistory: this.transactionHistory
        };
    }
    
    /**
     * Load save data
     */
    loadSaveData(data) {
        if (data) {
            this.money = data.money || 100;
            this.transactionHistory = data.transactionHistory || [];
            console.log(`[MoneyManager] Loaded save data: ${this.money} gold`);
        }
    }
}

// Export singleton instance
export const moneyManager = new MoneyManager();

