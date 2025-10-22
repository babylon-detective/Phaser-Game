/**
 * DialogueSystem - Advanced dialogue and event management system
 * Handles NPC interactions, story progression, and game state changes
 */

import { gameStateManager } from './GameStateManager.js';
import { moneyManager } from './MoneyManager.js';
import { itemsManager } from './ItemsManager.js';
import { statsManager } from './StatsManager.js';

class DialogueSystem {
    constructor() {
        if (DialogueSystem.instance) {
            return DialogueSystem.instance;
        }
        
        // Story progression tracking
        this.storyFlags = new Map();
        this.completedEvents = new Set();
        this.unlockedAreas = new Set(['village']); // Start with village unlocked
        this.availableNPCs = new Map();
        
        // Dialogue trees and responses
        this.dialogueTrees = new Map();
        this.npcPersonalities = new Map();
        this.eventTriggers = new Map();
        
        // Initialize default content
        this.initializeDefaultContent();
        
        DialogueSystem.instance = this;
    }
    
    /**
     * Initialize default dialogue content and NPCs
     */
    initializeDefaultContent() {
        // Initialize story flags
        this.storyFlags.set('game_started', true);
        this.storyFlags.set('first_battle', false);
        this.storyFlags.set('merchant_met', false);
        this.storyFlags.set('guard_trust', 0);
        this.storyFlags.set('village_rep', 0);
        
        // Initialize NPC personalities and dialogue trees
        this.initializeNPCs();
        this.initializeDialogueTrees();
        this.initializeEventTriggers();
    }
    
    /**
     * Initialize NPC personalities and basic data
     */
    initializeNPCs() {
        // Village Guard
        this.npcPersonalities.set('village_guard', {
            id: 'village_guard',
            name: 'Village Guard',
            type: 'GUARD',
            personality: 'stern',
            trust: 0,
            maxTrust: 100,
            dialogueMood: 'neutral',
            specialFlags: ['can_arrest', 'patrols_village'],
            inventory: [],
            quests: ['patrol_duty', 'investigate_strangers']
        });
        
        // Traveling Merchant
        this.npcPersonalities.set('traveling_merchant', {
            id: 'traveling_merchant',
            name: 'Traveling Merchant',
            type: 'MERCHANT',
            personality: 'greedy',
            trust: 0,
            maxTrust: 100,
            dialogueMood: 'friendly',
            specialFlags: ['sells_items', 'trades_goods'],
            inventory: ['health_potion', 'magic_ring', 'ancient_scroll'],
            quests: ['deliver_goods', 'find_rare_items']
        });
        
        // Village Elder
        this.npcPersonalities.set('village_elder', {
            id: 'village_elder',
            name: 'Village Elder',
            type: 'VILLAGER',
            personality: 'wise',
            trust: 0,
            maxTrust: 100,
            dialogueMood: 'cautious',
            specialFlags: ['knows_history', 'grants_permissions'],
            inventory: [],
            quests: ['ancient_knowledge', 'village_protection']
        });
        
        // Mysterious Stranger
        this.npcPersonalities.set('mysterious_stranger', {
            id: 'mysterious_stranger',
            name: 'Mysterious Stranger',
            type: 'UNKNOWN',
            personality: 'mysterious',
            trust: 0,
            maxTrust: 50,
            dialogueMood: 'hostile',
            specialFlags: ['knows_secrets', 'dangerous'],
            inventory: ['dark_artifact'],
            quests: ['ancient_prophecy', 'hidden_treasure']
        });
    }
    
    /**
     * Initialize dialogue trees for different NPCs
     */
    initializeDialogueTrees() {
        // GUARD dialogue tree
        this.dialogueTrees.set('GUARD', {
            greeting: {
                neutral: "Halt! State your business here!",
                friendly: "Ah, it's you. How can I help?",
                hostile: "You again! I'm watching you closely."
            },
            responses: {
                introduce: {
                    text: "I'm a traveler looking for work.",
                    effects: { trust: 5, mood: 'friendly' },
                    next: 'introduction_accepted'
                },
                ask_about_village: {
                    text: "Tell me about this place.",
                    effects: { trust: 2, mood: 'neutral' },
                    next: 'village_info'
                },
                ask_about_danger: {
                    text: "Is there any danger around here?",
                    effects: { trust: 3, mood: 'friendly' },
                    next: 'danger_info'
                },
                bribe: {
                    text: "Maybe we can work something out...",
                    effects: { trust: -15, mood: 'hostile' },
                    cost: 50,
                    next: 'bribe_attempt'
                },
                report_suspicious: {
                    text: "I saw something suspicious earlier.",
                    effects: { trust: 8, mood: 'friendly' },
                    next: 'suspicious_report'
                }
            },
            branches: {
                introduction_accepted: {
                    text: "Well, we could use some help. Check with the elder in the village center.",
                    effects: { storyFlag: 'guard_introduction', area: 'village_center' }
                },
                village_info: {
                    text: "This is a peaceful village. We value honesty and hard work. Stay out of trouble.",
                    effects: { trust: 3 }
                },
                danger_info: {
                    text: "There have been some bandit sightings to the east. Stay alert if you're heading that way.",
                    effects: { trust: 5, storyFlag: 'bandit_warning' }
                },
                bribe_attempt: {
                    text: "I don't take bribes! You're under arrest!",
                    effects: { storyFlag: 'arrested', battle: true }
                },
                suspicious_report: {
                    text: "Thank you for the information. I'll investigate immediately. Here's a small reward for your vigilance.",
                    effects: { trust: 10, money: 25, storyFlag: 'helpful_citizen' }
                }
            }
        });
        
        // MERCHANT dialogue tree
        this.dialogueTrees.set('MERCHANT', {
            greeting: {
                neutral: "Welcome! I have the finest goods from across the realm.",
                friendly: "Ah, a returning customer! What can I get you today?",
                hostile: "I don't trust you. Show me your coin first."
            },
            responses: {
                browse_goods: {
                    text: "What do you have for sale?",
                    effects: { trust: 1, mood: 'friendly' },
                    next: 'show_inventory'
                },
                sell_items: {
                    text: "I have some items to sell.",
                    effects: { trust: 2, mood: 'friendly' },
                    next: 'buy_items'
                },
                ask_about_quests: {
                    text: "Do you have any work for me?",
                    effects: { trust: 2 },
                    next: 'quest_offer'
                },
                negotiate: {
                    text: "Can we make a deal?",
                    effects: { trust: 0, mood: 'neutral' },
                    next: 'negotiation'
                },
                ask_about_rumors: {
                    text: "Any interesting rumors lately?",
                    effects: { trust: 3, mood: 'friendly' },
                    next: 'rumors'
                },
                nothing: {
                    text: "Just looking around.",
                    effects: { trust: 0, mood: 'neutral' },
                    next: 'just_looking'
                }
            },
            branches: {
                show_inventory: {
                    text: "Here's what I have available...",
                    effects: { shop: 'buy', items: ['health_potion', 'magic_ring', 'ancient_scroll', 'iron_sword'] }
                },
                buy_items: {
                    text: "Let me see what you have to offer...",
                    effects: { shop: 'sell', playerInventory: true }
                },
                quest_offer: {
                    text: "I need someone to deliver goods to the next town. The pay is 100 gold. Interested?",
                    effects: { quest: 'deliver_goods', reward: 100, storyFlag: 'merchant_quest_available' }
                },
                negotiation: {
                    text: "Everything is negotiable... for the right price. I can offer a 10% discount if you're a regular customer.",
                    effects: { shop: 'buy', discount: 0.1 }
                },
                rumors: {
                    text: "I heard there's treasure in the old ruins north of here. But be careful - it's dangerous.",
                    effects: { trust: 5, storyFlag: 'treasure_rumor', area: 'ancient_ruins' }
                },
                just_looking: {
                    text: "Take your time. Let me know if you need anything.",
                    effects: { trust: 1 }
                }
            }
        });
        
        // VILLAGER dialogue tree
        this.dialogueTrees.set('VILLAGER', {
            greeting: {
                neutral: "Hello there! Can I help you with something?",
                friendly: "Oh, it's you! How are you doing?",
                hostile: "What do you want? I'm busy."
            },
            responses: {
                ask_for_help: {
                    text: "Do you need any help?",
                    effects: { trust: 3, mood: 'friendly' },
                    next: 'help_offered'
                },
                ask_about_problems: {
                    text: "Are there any problems around here?",
                    effects: { trust: 2, mood: 'neutral' },
                    next: 'problems_info'
                },
                offer_gift: {
                    text: "I have something for you.",
                    effects: { trust: 5, mood: 'friendly' },
                    next: 'gift_offered'
                },
                ask_about_rumors: {
                    text: "Any interesting news lately?",
                    effects: { trust: 2, mood: 'friendly' },
                    next: 'rumors'
                },
                ask_for_information: {
                    text: "Can you tell me about this area?",
                    effects: { trust: 1, mood: 'neutral' },
                    next: 'area_info'
                },
                nothing: {
                    text: "Just passing through.",
                    effects: { trust: 0, mood: 'neutral' },
                    next: 'passing_through'
                }
            },
            branches: {
                help_offered: {
                    text: "That's very kind of you! I could use help gathering herbs from the forest. I'll pay you 30 gold.",
                    effects: { quest: 'gather_herbs', reward: 30, storyFlag: 'villager_quest_available' }
                },
                problems_info: {
                    text: "Well, there have been some strange noises coming from the old well at night. It's quite unsettling.",
                    effects: { trust: 4, storyFlag: 'well_mystery', area: 'old_well' }
                },
                gift_offered: {
                    text: "How thoughtful! Thank you so much. Here, take this small token of my appreciation.",
                    effects: { trust: 8, item: 'village_amulet', storyFlag: 'gift_given' }
                },
                rumors: {
                    text: "I heard the merchant found some ancient coins in the ruins. Maybe there's more treasure there!",
                    effects: { trust: 3, storyFlag: 'treasure_rumor', area: 'ancient_ruins' }
                },
                area_info: {
                    text: "This is a peaceful village. The guard keeps us safe, and the merchant brings us goods from far away.",
                    effects: { trust: 2, storyFlag: 'village_info' }
                },
                passing_through: {
                    text: "Safe travels then! Watch out for bandits on the eastern road.",
                    effects: { trust: 1, storyFlag: 'bandit_warning' }
                }
            }
        });
        
        // ELDER dialogue tree (special villager type)
        this.dialogueTrees.set('ELDER', {
            greeting: {
                neutral: "Greetings, traveler. I am the village elder.",
                friendly: "Ah, the helpful one returns! What brings you here?",
                hostile: "I don't have time for troublemakers."
            },
            responses: {
                ask_for_wisdom: {
                    text: "I seek your wisdom.",
                    effects: { trust: 5, mood: 'friendly' },
                    next: 'wisdom_offered'
                },
                ask_about_history: {
                    text: "Tell me about this village's history.",
                    effects: { trust: 3, mood: 'friendly' },
                    next: 'history_lesson'
                },
                ask_for_permission: {
                    text: "May I explore the ancient ruins?",
                    effects: { trust: 4, mood: 'neutral' },
                    next: 'ruins_permission'
                },
                report_achievements: {
                    text: "I've been helping around the village.",
                    effects: { trust: 6, mood: 'friendly' },
                    next: 'achievements_recognized'
                },
                ask_about_magic: {
                    text: "Do you know anything about magic?",
                    effects: { trust: 4, mood: 'friendly' },
                    next: 'magic_knowledge'
                }
            },
            branches: {
                wisdom_offered: {
                    text: "True strength comes from helping others. I can see you have a good heart. Here, take this blessing.",
                    effects: { trust: 10, item: 'elder_blessing', storyFlag: 'elder_blessed' }
                },
                history_lesson: {
                    text: "This village was founded by ancient mages who sought to protect the realm. The ruins hold their secrets.",
                    effects: { trust: 5, storyFlag: 'ancient_history', area: 'ancient_ruins' }
                },
                ruins_permission: {
                    text: "The ruins are dangerous, but if you're prepared, I'll grant you permission. Here's a map.",
                    effects: { trust: 8, item: 'ruins_map', storyFlag: 'ruins_permission', area: 'ancient_ruins' }
                },
                achievements_recognized: {
                    text: "The village speaks highly of you. You're welcome here anytime. Here's a small reward.",
                    effects: { trust: 12, money: 50, storyFlag: 'village_hero' }
                },
                magic_knowledge: {
                    text: "Magic flows through this land. The ancient ones left their knowledge in the ruins. Be careful if you seek it.",
                    effects: { trust: 6, storyFlag: 'magic_knowledge', area: 'ancient_ruins' }
                }
            }
        });
    }
    
    /**
     * Initialize event triggers and consequences
     */
    initializeEventTriggers() {
        // Trust-based events
        this.eventTriggers.set('guard_trust_50', {
            condition: () => this.storyFlags.get('guard_trust') >= 50,
            effect: () => {
                this.storyFlags.set('village_access', true);
                this.unlockedAreas.add('village_center');
                return "The guard trusts you now. You can access the village center.";
            }
        });
        
        this.eventTriggers.set('merchant_trust_30', {
            condition: () => this.npcPersonalities.get('traveling_merchant').trust >= 30,
            effect: () => {
                this.storyFlags.set('merchant_discount', true);
                return "The merchant offers you a 10% discount on all goods.";
            }
        });
        
        // Story progression events
        this.eventTriggers.set('first_battle_won', {
            condition: () => this.storyFlags.get('first_battle') === true,
            effect: () => {
                this.storyFlags.set('village_rep', this.storyFlags.get('village_rep') + 10);
                return "Your victory has earned you respect in the village.";
            }
        });
        
        // Area unlock events
        this.eventTriggers.set('elder_meeting', {
            condition: () => this.storyFlags.get('village_access') === true,
            effect: () => {
                this.unlockedAreas.add('ancient_ruins');
                return "The elder tells you about ancient ruins to the north.";
            }
        });
    }
    
    /**
     * Get dialogue options for an NPC
     */
    getDialogueOptions(npcId, context = {}) {
        const npc = this.npcPersonalities.get(npcId);
        const dialogueTree = this.dialogueTrees.get(npcId);
        
        if (!npc || !dialogueTree) {
            return this.getDefaultDialogue(npcId);
        }
        
        const mood = npc.dialogueMood;
        const greeting = dialogueTree.greeting[mood] || dialogueTree.greeting.neutral;
        
        // Filter available responses based on trust, story flags, etc.
        const availableResponses = Object.entries(dialogueTree.responses)
            .filter(([key, response]) => this.canUseResponse(npc, response, context))
            .map(([key, response]) => ({
                id: key,
                text: response.text,
                effects: response.effects,
                cost: response.cost || 0,
                available: true
            }));
        
        return {
            greeting,
            responses: availableResponses,
            npc: npc
        };
    }
    
    /**
     * Check if a response can be used
     */
    canUseResponse(npc, response, context) {
        // Check trust requirements
        if (response.trustRequired && npc.trust < response.trustRequired) {
            return false;
        }
        
        // Check story flag requirements
        if (response.requiresFlag && !this.storyFlags.get(response.requiresFlag)) {
            return false;
        }
        
        // Check cost requirements
        if (response.cost && !moneyManager.canAfford(response.cost)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Process a dialogue choice and its effects
     */
    processDialogueChoice(npcId, choiceId, context = {}) {
        const npc = this.npcPersonalities.get(npcId);
        const dialogueTree = this.dialogueTrees.get(npcId);
        
        if (!npc || !dialogueTree) {
            return { success: false, message: "I don't understand." };
        }
        
        const choice = dialogueTree.responses[choiceId];
        if (!choice) {
            return { success: false, message: "That's not an option." };
        }
        
        // Apply immediate effects
        const effects = choice.effects || {};
        const result = this.applyEffects(npc, effects, context);
        
        // Get next dialogue branch
        const nextBranch = dialogueTree.branches[choice.next];
        if (nextBranch) {
            result.message = nextBranch.text;
            const branchEffects = nextBranch.effects || {};
            this.applyEffects(npc, branchEffects, context);
        }
        
        // Check for triggered events
        this.checkEventTriggers();
        
        return result;
    }
    
    /**
     * Apply effects from dialogue choices
     */
    applyEffects(npc, effects, context) {
        const result = { success: true, message: "" };
        
        // Trust changes
        if (effects.trust) {
            npc.trust = Math.max(0, Math.min(npc.maxTrust, npc.trust + effects.trust));
            if (effects.trust > 0) {
                result.message += `\n+${effects.trust} trust with ${npc.name}`;
            }
        }
        
        // Mood changes
        if (effects.mood) {
            npc.dialogueMood = effects.mood;
        }
        
        // Story flag changes
        if (effects.storyFlag) {
            this.storyFlags.set(effects.storyFlag, true);
        }
        
        // Area unlocks
        if (effects.area) {
            this.unlockedAreas.add(effects.area);
            result.message += `\nNew area unlocked: ${effects.area}`;
        }
        
        // Money costs
        if (effects.cost) {
            if (moneyManager.canAfford(effects.cost)) {
                moneyManager.removeMoney(effects.cost, `Dialogue with ${npc.name}`);
                result.message += `\n-${effects.cost} gold`;
            } else {
                result.success = false;
                result.message = "You don't have enough gold.";
                return result;
            }
        }
        
        // Quest offers
        if (effects.quest) {
            result.message += `\nNew quest available: ${effects.quest}`;
        }
        
        // Shop access
        if (effects.shop) {
            result.message += `\nShop opened`;
        }
        
        return result;
    }
    
    /**
     * Check for triggered events
     */
    checkEventTriggers() {
        for (const [triggerId, trigger] of this.eventTriggers) {
            if (!this.completedEvents.has(triggerId) && trigger.condition()) {
                const message = trigger.effect();
                this.completedEvents.add(triggerId);
                console.log(`[DialogueSystem] Event triggered: ${triggerId} - ${message}`);
            }
        }
    }
    
    /**
     * Get default dialogue for unknown NPCs
     */
    getDefaultDialogue(npcId) {
        return {
            greeting: "Hello there. Can I help you?",
            responses: [
                {
                    id: 'greet',
                    text: "Hello!",
                    effects: { trust: 1 },
                    available: true
                },
                {
                    id: 'ask_about_work',
                    text: "Do you have any work?",
                    effects: {},
                    available: true
                }
            ],
            npc: { name: 'Unknown', type: 'UNKNOWN' }
        };
    }
    
    /**
     * Get available NPCs in current area
     */
    getAvailableNPCs(areaId) {
        return Array.from(this.npcPersonalities.values())
            .filter(npc => this.isNPCInArea(npc, areaId));
    }
    
    /**
     * Check if NPC is in specific area
     */
    isNPCInArea(npc, areaId) {
        // This would be expanded based on your area system
        return npc.areas && npc.areas.includes(areaId);
    }
    
    /**
     * Get story progression summary
     */
    getStoryProgress() {
        return {
            flags: Object.fromEntries(this.storyFlags),
            completedEvents: Array.from(this.completedEvents),
            unlockedAreas: Array.from(this.unlockedAreas),
            npcTrust: Object.fromEntries(
                Array.from(this.npcPersonalities.entries())
                    .map(([id, npc]) => [id, npc.trust])
            )
        };
    }
    
    /**
     * Reset dialogue system (for new game)
     */
    reset() {
        this.storyFlags.clear();
        this.completedEvents.clear();
        this.unlockedAreas.clear();
        this.unlockedAreas.add('village');
        this.initializeDefaultContent();
    }
}

// Export singleton instance
export const dialogueSystem = new DialogueSystem();
