/**
 * DialogueDatabase - Centralized dialogue content for all NPCs
 * Contains multi-paragraph dialogues, statements, warnings, and ultimatums
 */

class DialogueDatabase {
    constructor() {
        this.dialogues = new Map();
        this.initializeDialogues();
    }
    
    /**
     * Initialize all dialogue content
     */
    initializeDialogues() {
        this.initializeGuardDialogues();
        this.initializeMerchantDialogues();
        this.initializeVillagerDialogues();
        this.initializeElderDialogues();
    }
    
    /**
     * Initialize GUARD dialogues
     */
    initializeGuardDialogues() {
        this.dialogues.set('GUARD', {
            // Initial encounter
            initial: {
                paragraphs: [
                    "Halt! You there! State your business in this area!",
                    "I don't recognize you, and we've had trouble with strangers lately.",
                    "You better have a good reason for being here, or you'll be answering to the captain."
                ],
                hasChoices: true,
                choices: [
                    { id: 'introduce', text: "I'm a traveler looking for work.", available: true },
                    { id: 'ask_about_trouble', text: "What kind of trouble have you had?", available: true },
                    { id: 'bribe', text: "Maybe we can work something out...", available: true }
                ]
            },
            
            // Warning dialogue
            warning: {
                paragraphs: [
                    "Listen carefully, stranger. This village is under my protection.",
                    "I've seen your type before - troublemakers who think they can do as they please.",
                    "One wrong move, and you'll be spending the night in our cells.",
                    "I suggest you mind your manners and keep your hands where I can see them."
                ],
                hasChoices: false,
                type: 'warning'
            },
            
            // Ultimatum dialogue
            ultimatum: {
                paragraphs: [
                    "This is your final warning!",
                    "You've been causing problems since you arrived, and I've had enough.",
                    "Either you leave this village immediately, or I'll arrest you right now.",
                    "What's it going to be?"
                ],
                hasChoices: true,
                choices: [
                    { id: 'leave', text: "I'll leave peacefully.", available: true },
                    { id: 'resist', text: "I'm not going anywhere!", available: true },
                    { id: 'plead', text: "Please, give me another chance.", available: true }
                ],
                type: 'ultimatum'
            },
            
            // Friendly dialogue
            friendly: {
                paragraphs: [
                    "Ah, it's you again. How are you doing?",
                    "The village has been much safer since you've been helping out.",
                    "I appreciate what you've done for us. You're welcome here anytime."
                ],
                hasChoices: true,
                choices: [
                    { id: 'ask_about_village', text: "How is the village doing?", available: true },
                    { id: 'ask_about_danger', text: "Any new threats around?", available: true },
                    { id: 'report_suspicious', text: "I saw something suspicious earlier.", available: true }
                ]
            }
        });
    }
    
    /**
     * Initialize MERCHANT dialogues
     */
    initializeMerchantDialogues() {
        this.dialogues.set('MERCHANT', {
            // Initial encounter
            initial: {
                paragraphs: [
                    "Welcome, traveler! I have the finest goods from across the realm.",
                    "My name is Marcus, and I've been trading in these parts for over twenty years.",
                    "I can see you're new around here. Perhaps I can help you with some supplies?"
                ],
                hasChoices: true,
                choices: [
                    { id: 'browse_goods', text: "What do you have for sale?", available: true },
                    { id: 'sell_items', text: "I have some items to sell.", available: true },
                    { id: 'ask_about_rumors', text: "Any interesting rumors lately?", available: true }
                ]
            },
            
            // Sales pitch
            sales_pitch: {
                paragraphs: [
                    "Ah, a customer with good taste! I can see you know quality when you see it.",
                    "This particular item comes from the far eastern kingdoms, crafted by master artisans.",
                    "It's not often I get to show such fine wares to someone who truly appreciates them.",
                    "I could make you a special deal, just for you."
                ],
                hasChoices: true,
                choices: [
                    { id: 'buy', text: "I'm interested. What's your price?", available: true },
                    { id: 'negotiate', text: "Can we make a deal?", available: true },
                    { id: 'decline', text: "Maybe another time.", available: true }
                ]
            },
            
            // Warning about bandits
            bandit_warning: {
                paragraphs: [
                    "I must warn you about the roads ahead.",
                    "There have been reports of bandits operating near the eastern pass.",
                    "They've been targeting merchants and travelers, taking everything of value.",
                    "If you're heading that way, I'd suggest traveling in a group or taking the longer route through the mountains."
                ],
                hasChoices: false,
                type: 'warning'
            },
            
            // Quest offer
            quest_offer: {
                paragraphs: [
                    "Actually, I do have a proposition for you.",
                    "I need someone trustworthy to deliver a valuable package to the next town.",
                    "The pay is good - 100 gold pieces - but the road is dangerous.",
                    "Are you interested in taking on this delivery job?"
                ],
                hasChoices: true,
                choices: [
                    { id: 'accept_quest', text: "I'll take the job.", available: true },
                    { id: 'ask_details', text: "Tell me more about the package.", available: true },
                    { id: 'decline_quest', text: "I'm not interested.", available: true }
                ]
            }
        });
    }
    
    /**
     * Initialize VILLAGER dialogues
     */
    initializeVillagerDialogues() {
        this.dialogues.set('VILLAGER', {
            // Initial encounter
            initial: {
                paragraphs: [
                    "Hello there! You're new around here, aren't you?",
                    "I don't think I've seen you in the village before.",
                    "Welcome! I hope you find our little community to your liking."
                ],
                hasChoices: true,
                choices: [
                    { id: 'ask_for_help', text: "Do you need any help?", available: true },
                    { id: 'ask_about_problems', text: "Are there any problems around here?", available: true },
                    { id: 'ask_about_rumors', text: "Any interesting news lately?", available: true }
                ]
            },
            
            // Request for help
            help_request: {
                paragraphs: [
                    "Oh, how kind of you to ask!",
                    "I've been having trouble with my garden lately - something's been eating my vegetables.",
                    "I've tried everything I can think of, but nothing seems to work.",
                    "If you could help me figure out what's going on, I'd be very grateful."
                ],
                hasChoices: true,
                choices: [
                    { id: 'investigate_garden', text: "I'll help you investigate.", available: true },
                    { id: 'ask_about_garden', text: "Tell me more about your garden.", available: true },
                    { id: 'suggest_solution', text: "Maybe I can suggest something.", available: true }
                ]
            },
            
            // Village gossip
            gossip: {
                paragraphs: [
                    "Oh, you haven't heard? There's been quite the commotion lately.",
                    "The merchant Marcus found some ancient coins in the old ruins north of here.",
                    "He's been showing them off to anyone who'll listen.",
                    "Some say there might be more treasure hidden there, but the ruins are dangerous."
                ],
                hasChoices: true,
                choices: [
                    { id: 'ask_about_ruins', text: "Tell me about these ruins.", available: true },
                    { id: 'ask_about_coins', text: "What do the coins look like?", available: true },
                    { id: 'ask_about_danger', text: "What makes the ruins dangerous?", available: true }
                ]
            },
            
            // Warning about strangers
            stranger_warning: {
                paragraphs: [
                    "I should warn you about something.",
                    "We've had some trouble with strangers lately - people who seemed friendly at first.",
                    "They've been asking a lot of questions about the village and its history.",
                    "The guard has been keeping a close eye on anyone new around here."
                ],
                hasChoices: false,
                type: 'warning'
            }
        });
    }
    
    /**
     * Initialize ELDER dialogues
     */
    initializeElderDialogues() {
        this.dialogues.set('ELDER', {
            // Initial encounter
            initial: {
                paragraphs: [
                    "Greetings, traveler. I am Elder Marcus, keeper of this village's wisdom.",
                    "I have been watching you since you arrived, and I sense something different about you.",
                    "The village has been in need of someone with your... particular talents.",
                    "Perhaps we should speak in private about matters that concern us all."
                ],
                hasChoices: true,
                choices: [
                    { id: 'ask_about_talents', text: "What talents do you mean?", available: true },
                    { id: 'ask_about_village', text: "What's wrong with the village?", available: true },
                    { id: 'agree_private', text: "I'll speak with you privately.", available: true }
                ]
            },
            
            // Ancient knowledge
            ancient_knowledge: {
                paragraphs: [
                    "This village was founded by ancient mages who sought to protect the realm from dark forces.",
                    "They built this place as a sanctuary, a place where knowledge and wisdom could be preserved.",
                    "The ruins you may have heard about contain their greatest secrets - and their greatest dangers.",
                    "Only those with pure hearts and strong wills should venture there."
                ],
                hasChoices: true,
                choices: [
                    { id: 'ask_about_mages', text: "Tell me about these ancient mages.", available: true },
                    { id: 'ask_about_secrets', text: "What secrets are hidden there?", available: true },
                    { id: 'ask_about_dangers', text: "What dangers await in the ruins?", available: true }
                ]
            },
            
            // Prophecy
            prophecy: {
                paragraphs: [
                    "I have had visions, young one. Visions of great change coming to our land.",
                    "The ancient texts speak of a time when darkness will rise again, and only the chosen one can stop it.",
                    "I believe you may be that chosen one, or at least someone who can help in the coming struggle.",
                    "The signs are all around us - the increased bandit activity, the strange occurrences in the ruins.",
                    "Will you help us when the time comes?"
                ],
                hasChoices: true,
                choices: [
                    { id: 'accept_prophecy', text: "I'll help however I can.", available: true },
                    { id: 'ask_about_signs', text: "What signs have you seen?", available: true },
                    { id: 'doubt_prophecy', text: "This all sounds like superstition.", available: true }
                ]
            },
            
            // Final warning
            final_warning: {
                paragraphs: [
                    "Time is running short, and I fear we may not have much longer.",
                    "The darkness grows stronger with each passing day, and our defenses grow weaker.",
                    "If you choose to help us, you must be prepared for great danger and sacrifice.",
                    "If you choose to leave, I understand - but know that the fate of many may rest on your decision.",
                    "What will you do?"
                ],
                hasChoices: true,
                choices: [
                    { id: 'pledge_help', text: "I pledge to help protect this village.", available: true },
                    { id: 'need_time', text: "I need time to think about this.", available: true },
                    { id: 'refuse', text: "I can't make such a commitment.", available: true }
                ],
                type: 'ultimatum'
            }
        });
    }
    
    /**
     * Get dialogue for NPC type and situation
     */
    getDialogue(npcType, situation = 'initial') {
        const npcDialogues = this.dialogues.get(npcType);
        if (!npcDialogues) {
            return this.getDefaultDialogue();
        }
        
        const dialogue = npcDialogues[situation];
        if (!dialogue) {
            return npcDialogues.initial || this.getDefaultDialogue();
        }
        
        return dialogue;
    }
    
    /**
     * Get default dialogue for unknown NPCs
     */
    getDefaultDialogue() {
        return {
            paragraphs: [
                "Hello there. Can I help you with something?",
                "I don't have much time to talk right now."
            ],
            hasChoices: false,
            type: 'statement'
        };
    }
    
    /**
     * Get all available situations for an NPC type
     */
    getAvailableSituations(npcType) {
        const npcDialogues = this.dialogues.get(npcType);
        if (!npcDialogues) return [];
        
        return Object.keys(npcDialogues);
    }
    
    /**
     * Check if a dialogue has choices
     */
    hasChoices(npcType, situation = 'initial') {
        const dialogue = this.getDialogue(npcType, situation);
        return dialogue.hasChoices || false;
    }
    
    /**
     * Get dialogue type (statement, warning, ultimatum, etc.)
     */
    getDialogueType(npcType, situation = 'initial') {
        const dialogue = this.getDialogue(npcType, situation);
        return dialogue.type || 'conversation';
    }
}

// Export singleton instance
export const dialogueDatabase = new DialogueDatabase();
