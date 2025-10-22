/**
 * DialogueIntegration - Example of how to integrate the new dialogue system
 * This shows how to use the DialogueSystem with the DialogueCard
 */

import { dialogueSystem } from '../managers/DialogueSystem.js';
import DialogueCard from '../ui/DialogueCard.js';

class DialogueIntegration {
    constructor(scene) {
        this.scene = scene;
        this.dialogueCard = new DialogueCard(scene);
    }
    
    /**
     * Start a dialogue with an NPC using the new system
     */
    startNPCDialogue(npcId, context = {}) {
        const dialogueData = dialogueSystem.getDialogueOptions(npcId, context);
        
        // Convert dialogue system format to DialogueCard format
        const choices = dialogueData.responses.map(response => ({
            id: response.id,
            text: response.text,
            description: response.description || '',
            available: response.available,
            cost: response.cost || 0
        }));
        
        // Show dialogue card
        this.dialogueCard.show(
            dialogueData.npc,
            dialogueData.greeting,
            choices,
            (choice) => this.handleDialogueChoice(npcId, choice),
            () => this.closeDialogue()
        );
    }
    
    /**
     * Handle dialogue choice selection
     */
    handleDialogueChoice(npcId, choice) {
        const result = dialogueSystem.processDialogueChoice(npcId, choice.id);
        
        if (result.success) {
            // Show result message
            this.showDialogueResult(result.message);
            
            // Continue dialogue if there are more options
            if (result.continue) {
                this.startNPCDialogue(npcId);
            } else {
                this.closeDialogue();
            }
        } else {
            // Show error message
            this.showDialogueError(result.message);
        }
    }
    
    /**
     * Show dialogue result message
     */
    showDialogueResult(message) {
        // This could be a simple alert or a more sophisticated notification system
        console.log('[DialogueIntegration] Result:', message);
        
        // For now, just show in console - in a real game, you'd show this in the UI
        if (message) {
            // You could create a notification system here
            this.showNotification(message);
        }
    }
    
    /**
     * Show dialogue error message
     */
    showDialogueError(message) {
        console.log('[DialogueIntegration] Error:', message);
        this.showNotification(message, 'error');
    }
    
    /**
     * Show notification (placeholder for UI notification system)
     */
    showNotification(message, type = 'info') {
        // This is a placeholder - in a real game, you'd have a proper notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#e74c3c' : '#2ecc71'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10001;
            font-family: Arial, sans-serif;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    /**
     * Close dialogue
     */
    closeDialogue() {
        this.dialogueCard.hide();
    }
    
    /**
     * Get available NPCs in current area
     */
    getAvailableNPCs(areaId) {
        return dialogueSystem.getAvailableNPCs(areaId);
    }
    
    /**
     * Get story progress
     */
    getStoryProgress() {
        return dialogueSystem.getStoryProgress();
    }
}

export default DialogueIntegration;
