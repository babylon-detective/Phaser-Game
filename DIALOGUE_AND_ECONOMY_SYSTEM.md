# Dialogue, Economy, and Inventory System

## Overview
This document describes the comprehensive dialogue, money, and items systems integrated into the Phaser game. These systems provide alternatives to combat through negotiation, manage player currency, and track inventory across all scenes.

## System Architecture

### 1. MoneyManager (`src/managers/MoneyManager.js`)
**Purpose**: Universal currency system for managing player gold.

#### Features:
- **Singleton Pattern**: One instance across all scenes
- **Starting Amount**: 150 gold
- **Transaction History**: Tracks last 50 transactions
- **Persistence**: Saves/loads with GameStateManager

#### Key Methods:
```javascript
moneyManager.getMoney()                     // Get current money
moneyManager.addMoney(amount, reason)       // Add money
moneyManager.removeMoney(amount, reason)    // Remove money
moneyManager.canAfford(amount)              // Check if can afford
moneyManager.getTransactionHistory()        // Get transaction log
```

#### Usage Example:
```javascript
import { moneyManager } from './managers/MoneyManager.js';

// Check if player can afford something
if (moneyManager.canAfford(50)) {
    moneyManager.removeMoney(50, 'Bought item');
}

// Reward player
moneyManager.addMoney(100, 'Quest reward');
```

---

### 2. ItemsManager (`src/managers/ItemsManager.js`)
**Purpose**: Universal inventory system for managing player items.

#### Features:
- **Item Database**: Predefined items with properties
- **Max Inventory**: 50 items
- **Item Types**: consumable, quest, valuable, equipment
- **Stacking**: Items stack by ID
- **Persistence**: Saves/loads with GameStateManager

#### Item Database:
| Item ID | Name | Type | Value | Effect |
|---------|------|------|-------|---------|
| `health_potion` | Health Potion | consumable | 25 | Heal 50 HP |
| `mana_potion` | Mana Potion | consumable | 20 | Restore 30 Mana |
| `attack_boost` | Attack Boost | consumable | 30 | +10 Attack (3 turns) |
| `defense_boost` | Defense Boost | consumable | 30 | +10 Defense (3 turns) |
| `ancient_scroll` | Ancient Scroll | quest | 100 | Quest item |
| `gold_ring` | Gold Ring | valuable | 150 | Valuable item |

#### Key Methods:
```javascript
itemsManager.addItem(itemId, quantity)          // Add item
itemsManager.removeItem(itemId, quantity)       // Remove item
itemsManager.hasItem(itemId, quantity)          // Check if has item
itemsManager.getInventory()                     // Get all items
itemsManager.getItemInfo(itemId)                // Get item details
itemsManager.useItem(itemId, target)            // Use consumable
itemsManager.getInventoryValue()                // Total value
```

#### Usage Example:
```javascript
import { itemsManager } from './managers/ItemsManager.js';

// Add item to inventory
itemsManager.addItem('health_potion', 3);

// Check if player has item
if (itemsManager.hasItem('gold_ring')) {
    console.log('Player has the gold ring!');
}

// Get all items for display
const inventory = itemsManager.getInventory();
inventory.forEach(item => {
    console.log(`${item.name}: ${item.quantity}x`);
});
```

---

### 3. DialogueManager (`src/managers/DialogueManager.js`)
**Purpose**: Handles dialogue trees, negotiation mechanics, and battle alternatives.

#### Features:
- **4 Dialogue Options**: Fight, Negotiate (Money), Negotiate (Item), Flee
- **Dynamic Pricing**: Based on NPC type and level difference
- **XP Rewards**: Negotiation grants 50% of battle XP
- **Flee System**: Level-based success chance

#### Negotiation Costs:
```javascript
baseCost = 20
levelDiff = max(1, npcLevel - playerLevel + 1)
typeModifier = {
    'GUARD': 0.8,     // Harder to negotiate
    'MERCHANT': 1.2,   // Easier to negotiate
    'VILLAGER': 1.0    // Neutral
}
finalCost = baseCost * levelDiff * typeModifier
```

#### Item Negotiation:
```javascript
itemGiftValue = negotiationCost * 1.5  // Items need 1.5x the gold cost
```

#### Key Methods:
```javascript
dialogueManager.getDialogueOptions(npcData)                 // Get all options
dialogueManager.negotiateWithMoney(npcData, amount)         // Money negotiation
dialogueManager.negotiateWithItem(npcData, itemId)          // Item negotiation
dialogueManager.attemptFlee(npcData)                        // Try to flee
dialogueManager.calculateNegotiationCost(type, level, pLvl) // Calculate cost
```

#### Flee Success Chance:
```javascript
baseChance = 0.5
levelModifier = (playerLevel - npcLevel) * 0.1
fleeChance = clamp(baseChance + levelModifier, 0.1, 0.9)
```

---

## Integration with BattleScene

### Battle Flow with Dialogue:

1. **Battle Starts** → Dialogue UI appears automatically
2. **Player Chooses**:
   - **Fight**: Proceeds to normal combat
   - **Negotiate (Money)**: Offers gold, if accepted NPC leaves peacefully
   - **Negotiate (Item)**: Selects item to gift, if accepted NPC leaves
   - **Flee**: Attempts escape, if failed must fight

3. **Successful Negotiation**:
   - NPCs marked as "defeated" (removed from world)
   - Player gains 50% of battle XP
   - Money/item removed from player
   - Returns to WorldScene

4. **Failed Negotiation**:
   - Returns to Fight option automatically

### Dialogue UI Features:
- **Current Money Display**: Shows player's gold
- **Option Status**: Grayed out if can't afford/no suitable items
- **Cost Display**: Shows exact cost/value needed
- **Item Selection**: Popup for choosing which item to gift
- **Result Feedback**: Success/failure message with XP display
- **Level Up**: Shows if player leveled up from negotiation XP

---

## UI Integration

### MenuScene - Inventory Tab
**Location**: Menu → Inventory (W/A/S/D to navigate)

**Displays**:
- Current gold amount
- Total inventory value
- All items with:
  - Icon (emoji based on type)
  - Name and description
  - Quantity
  - Individual value
  - Type

**Features**:
- Scrollable list
- Empty state message
- Real-time updates

### HUDManager - Money Display
**Locations**: 
- WorldScene: Top-left player panel
- BattleScene: Top-left player panel

**Format**:
```
Player
HP: 100/100
Level: 5
💰 150
```

**Updates**:
- Real-time updates via `updatePlayerStats()`
- Persists across scenes
- Synced with MoneyManager

---

## Persistence System

### Save Data Structure:
```javascript
{
    // GameStateManager
    playTime: 1234567,
    playerStats: {...},
    npcStats: {...},
    defeatedNpcIds: [...],
    
    // MoneyManager
    money: {
        money: 150,
        transactionHistory: [...]
    },
    
    // ItemsManager
    items: {
        inventory: [
            { id: 'health_potion', quantity: 2 },
            { id: 'gold_ring', quantity: 1 }
        ]
    }
}
```

### Save/Load Flow:
1. **Save Game**: MenuScene → SaveGame tab → Press `]`
   - Calls `gameStateManager.saveGame(playerPosition)`
   - GameStateManager collects money/items data
   - Stores in localStorage

2. **Load Game**: StartScene → Continue
   - Calls `gameStateManager.loadGame()`
   - Restores money via `moneyManager.loadSaveData()`
   - Restores items via `itemsManager.loadSaveData()`

3. **Reset Game**: StartScene → Start (new game)
   - Calls `gameStateManager.resetGame()`
   - Resets money to 150
   - Resets items to starting inventory

---

## Starting Resources

### New Game Defaults:
```javascript
Money: 150 gold
Items:
  - Health Potion x2 (25g each, heals 50 HP)
  - Gold Ring x1 (150g, valuable)
```

### Why These Amounts:
- **150 Gold**: Enough for 1-2 low-level negotiations
- **Health Potions**: Safety net for battles
- **Gold Ring**: High-value item for difficult negotiations

---

## Example Scenarios

### Scenario 1: Low-Level Negotiation
```
Player Level: 1
NPC: VILLAGER Level 1
Cost: 20 * 1 * 1.0 = 20 gold ✅ (Player has 150)
Item Alternative: 30 value item needed

Result: Player can negotiate with either money or gold ring
```

### Scenario 2: High-Level Negotiation
```
Player Level: 1
NPC: GUARD Level 3
Cost: 20 * 3 * 0.8 = 48 gold ✅ (Player has 150)
Item Alternative: 72 value item needed ✅ (Gold ring = 150)

Result: Both options available
```

### Scenario 3: Impossible Negotiation
```
Player Level: 1
NPC: GUARD Level 5
Cost: 20 * 5 * 0.8 = 80 gold ✅ (Player has 150)
Item Alternative: 120 value item needed ✅ (Gold ring = 150)

Result: Could negotiate, but expensive!
```

### Scenario 4: Multiple NPCs
```
Encounter: 3 VILLAGERs (Level 1)
Lead NPC: VILLAGER Level 1
Cost: 20 gold for negotiation

Result: Negotiating with leader dismisses ALL NPCs in the group
```

---

## Testing the Systems

### 1. Test Money System:
- Start game, check HUD shows 150 gold
- Enter battle, choose "Negotiate (Money)"
- Observe money deduction
- Check MenuScene shows updated amount
- Save and reload game, verify money persists

### 2. Test Items System:
- Open MenuScene → Inventory tab
- Verify starting items (2x Health Potion, 1x Gold Ring)
- Enter battle, choose "Negotiate (Item)"
- Select Gold Ring
- Return to inventory, verify it's gone
- Save and reload, verify inventory persists

### 3. Test Dialogue System:
- Enter battle with low-level NPC (VILLAGER)
- Check all 4 options appear
- Verify cost is reasonable (~20 gold)
- Test each option:
  - Fight: Normal battle
  - Negotiate Money: Pay and escape
  - Negotiate Item: Gift item and escape
  - Flee: Random escape chance

### 4. Test Persistence:
- Earn/spend money
- Collect items
- Save game
- Close browser/refresh
- Load game
- Verify all money and items restored

---

## Future Enhancements

### Potential Additions:
1. **Shop System**: Buy/sell items at specific locations
2. **Quest Items**: Special items that unlock quests
3. **Equipment**: Wearable items that boost stats
4. **Crafting**: Combine items to create new ones
5. **Trading**: NPC-specific trade offers
6. **Money Drops**: Enemies drop gold on defeat
7. **Item Drops**: Random items from defeated enemies
8. **Reputation**: Negotiation costs affected by player actions
9. **Bartering**: Complex multi-item trades
10. **Item Durability**: Equipment degrades over time

---

## Technical Notes

### Performance:
- All managers use singleton pattern
- DOM-based UI for dialogue/inventory (better than Phaser.Text)
- Minimal performance impact on game loop
- Save/load operations are synchronous (localStorage)

### Cross-Scene Communication:
```
MoneyManager ←→ GameStateManager (save/load)
ItemsManager ←→ GameStateManager (save/load)
DialogueManager → MoneyManager (negotiations)
DialogueManager → ItemsManager (item gifts)
DialogueManager → StatsManager (XP rewards)
BattleScene → DialogueManager (all interactions)
MenuScene → MoneyManager + ItemsManager (display)
HUDManager → MoneyManager (display)
```

### Memory Management:
- Singleton instances persist across scene changes
- DOM elements cleaned up on scene shutdown
- Save data stored in localStorage (browser-managed)
- Transaction history limited to last 50 entries

---

## Troubleshooting

### Issue: Money not updating in HUD
**Solution**: Ensure `updatePlayerStats()` is called after money changes

### Issue: Items not appearing in inventory
**Solution**: Check item ID matches database, verify `addItem()` returns true

### Issue: Dialogue not appearing
**Solution**: Verify BattleScene receives npcDataArray with type and level

### Issue: Negotiation always fails
**Solution**: Check player has enough money/suitable items, verify calculations

### Issue: Save/load not working
**Solution**: Check localStorage is enabled, verify save data structure

---

## Credits

- **Dialogue System**: Modal-based DOM UI with gradient backgrounds
- **Economy System**: Transaction logging and history tracking
- **Inventory System**: Emoji-based icons and categorization
- **Integration**: Seamless cross-scene state management


