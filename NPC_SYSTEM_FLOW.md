# NPC Generation & State Management System

## 📋 Overview

The NPC system uses **fixed spawn locations** with **persistent unique IDs** to ensure NPCs remain consistent across game sessions and state transitions.

---

## 🎯 Key Concepts

### 1. **Fixed NPC Spawns**
- **15 pre-defined NPC spawn locations** in `NpcManager.fixedNpcSpawns`
- Each NPC has a **permanent unique ID** (e.g., `npc_village_guard_1`)
- NPCs are defined with:
  - `id`: Unique identifier
  - `type`: GUARD, MERCHANT, or VILLAGER
  - `x, y`: Fixed spawn coordinates
  - `behavior`: patrol, stationary, or wander

### 2. **Defeated NPC Tracking**
- `defeatedNpcIds`: A `Set` that tracks which NPCs have been defeated
- Stored in `GameStateManager` and `NpcManager`
- Persisted to localStorage when saving
- NPCs with IDs in this set **will not respawn**

---

## 🔄 NPC State Transitions

### **Scenario 1: New Game Start**
```
StartScene → "Start" selected
    ↓
GameStateManager.resetGame()
    - defeatedNpcIds = new Set() (empty)
    ↓
WorldScene.init()
    - defeatedNpcIds = []
    ↓
NpcManager.init({ defeatedNpcIds: [] })
    - this.defeatedNpcIds = new Set([])
    ↓
NpcManager.create()
    - Spawns ALL 15 NPCs (none are filtered out)
    ↓
HUD shows: 0 defeated, 15 remaining
```

### **Scenario 2: Battle Victory → Return to WorldScene**
```
WorldScene (player engages NPC)
    ↓
BattleScene.create()
    - Receives npcData with NPC IDs
    ↓
BattleScene.showVictorySequence()
    - Collects defeated enemy IDs
    - this.defeatedEnemyIds = [id1, id2, ...]
    ↓
BattleScene → Returns to WorldScene
    - Passes { defeatedNpcIds: [id1, id2, ...] }
    ↓
WorldScene.resume()
    - Receives defeatedNpcIds
    - this.defeatedNpcIds = [id1, id2, ...]
    ↓
WorldScene.handleResumeData()
    - Calls npcManager.removeDefeatedNpcs(defeatedNpcIds)
    - Updates HUD: updateNPCCount(defeated, remaining)
    ↓
NpcManager.removeDefeatedNpcs()
    - Adds IDs to this.defeatedNpcIds Set
    - Destroys NPC sprites
    - NPCs are REMOVED from scene
    ↓
HUD shows: X defeated, (15-X) remaining
```

### **Scenario 3: Save Game**
```
WorldScene (player on save point)
    ↓
MenuScene.handleSaveGame()
    - Gets playerPosition
    - Calls gameStateManager.saveGame(playerPosition)
    ↓
GameStateManager.saveGame()
    - Collects current state:
        * playTime
        * playerStats (level, XP, health, etc.)
        * npcStats
        * defeatedNpcIds (converted to Array)
        * playerPosition
    - Saves to localStorage as JSON
    ↓
localStorage.setItem('gameState', {
    playTime: 12345,
    playerStats: {...},
    defeatedNpcIds: ['npc_village_guard_1', 'npc_east_merchant_1'],
    playerPosition: {x: 300, y: 300}
})
```

### **Scenario 4: Continue from Save**
```
StartScene → "Continue" selected
    ↓
GameStateManager.loadGame()
    - Reads localStorage.getItem('gameState')
    - Parses JSON
    - Restores:
        * this.totalPlayTime = gameState.playTime
        * this.playerStats = gameState.playerStats
        * this.defeatedNpcIds = new Set(gameState.defeatedNpcIds)
    - Returns: { 
        success: true, 
        playerPosition: {x, y},
        defeatedNpcIds: ['npc_village_guard_1', ...] 
      }
    ↓
StartScene.selectMenuItem(1)
    - Starts WorldScene with loaded data:
        scene.start('WorldScene', {
            loadedGame: true,
            playerPosition: {x: 300, y: 300},
            defeatedNpcIds: ['npc_village_guard_1', ...]
        })
    ↓
WorldScene.init(data)
    - this.defeatedNpcIds = data.defeatedNpcIds
    - this.loadedPlayerPosition = data.playerPosition
    ↓
WorldScene.create()
    - NpcManager.init({ defeatedNpcIds: this.defeatedNpcIds })
    - NpcManager.create()
    ↓
NpcManager.create()
    - Iterates through fixedNpcSpawns
    - FOR EACH spawn:
        if (defeatedNpcIds.has(spawnData.id)) {
            SKIP - don't spawn this NPC
        } else {
            SPAWN - create NPC at fixed location
        }
    - Result: Only non-defeated NPCs are spawned
    ↓
WorldScene positions player at loadedPlayerPosition
    ↓
HUD.updateNPCCount(defeatedNpcIds.length, 15 - defeatedNpcIds.length)
    ↓
HUD shows: 2 defeated, 13 remaining (example)
```

### **Scenario 5: Battle Escape → Return to WorldScene**
```
BattleScene (player presses ESC)
    ↓
BattleScene.returnToWorld()
    - Collects updatedNpcHealth for active enemies
    - [{ id, health, maxHealth }, ...]
    - Passes to WorldScene: { 
        returnPosition: {x, y},
        updatedNpcHealth: [...]
      }
    ↓
WorldScene.resume()
    - Receives updatedNpcHealth
    ↓
WorldScene.handleResumeData()
    - Calls npcManager.updateNpcHealth(updatedNpcHealth)
    ↓
NpcManager.updateNpcHealth()
    - Finds NPCs by ID
    - Updates npcData.health and npcData.maxHealth
    - Adds visual feedback (alpha change)
    - NPCs remain in scene with updated health
    ↓
HUD count: UNCHANGED (no NPCs defeated)
```

---

## 🐛 Current Issues

### **Issue 1: Game Time Display**
**Problem:** When loading a saved game, the timer displays incorrectly.

**Root Cause:** 
- `totalPlayTime` is loaded correctly from localStorage
- But the timer might be starting from 0 or showing a strange value

**Fix Needed:**
- Ensure `gameStateManager.getFormattedPlayTime()` correctly displays loaded time
- Verify timer continues from saved time, not from 0

### **Issue 2: NPC Count Resets**
**Problem:** When loading a saved game, HUD shows 0 defeated / 15 remaining.

**Root Cause:**
- `defeatedNpcIds` ARE passed correctly to WorldScene
- NPCs ARE filtered out correctly (they don't spawn)
- BUT: HUD is updated BEFORE NPCs are fully processed
- OR: The HUD update is using stale data

**Fix Needed:**
- Ensure HUD.updateNPCCount is called AFTER NpcManager.create() completes
- Verify defeatedNpcIds.length is correctly calculated

---

## 🔍 Debugging Checklist

When loading a saved game, check these console logs in order:

1. **StartScene:**
   ```
   [StartScene] ========== CONTINUE GAME ==========
   [StartScene] Load result: { success: true, playerPosition: {...}, defeatedNpcIds: [...] }
   ```

2. **WorldScene.init:**
   ```
   [WorldScene] Initializing with data: { loadedGame: true, defeatedNpcIds: [...] }
   [WorldScene] Initial state: { defeatedNpcIds: [...length...] }
   ```

3. **NpcManager.init:**
   ```
   NpcManager: Initialized with defeated NPCs: [...]
   ```

4. **NpcManager.create:**
   ```
   [NpcManager] Defeated NPCs: [...]
   [NpcManager] Skipping defeated NPC: npc_village_guard_1
   [NpcManager] Generation complete. Spawned X out of 15 NPCs
   ```

5. **HUD Update:**
   ```
   [HUDManager] Updating NPC count: X defeated, Y remaining
   ```

---

## ✅ Expected Behavior

### **Fresh Game:**
- 15 NPCs spawn
- HUD: 0 defeated, 15 remaining

### **After Defeating 2 NPCs:**
- 13 NPCs remain in scene
- HUD: 2 defeated, 13 remaining

### **After Saving:**
- localStorage contains `defeatedNpcIds: [id1, id2]`

### **After Continuing:**
- Only 13 NPCs spawn (defeated ones excluded)
- Player positioned at saved location
- HUD: 2 defeated, 13 remaining
- Game time continues from saved time

---

## 🛠️ NPC Manager Key Methods

```javascript
// Initialize with defeated NPC IDs
init(config) {
    this.defeatedNpcIds = new Set(config.defeatedNpcIds || []);
}

// Spawn NPCs, excluding defeated ones
create() {
    this.fixedNpcSpawns.forEach(spawnData => {
        if (!this.defeatedNpcIds.has(spawnData.id)) {
            this.spawnFixedNPC(spawnData);
        }
    });
}

// Mark NPCs as defeated after battle
removeDefeatedNpcs(defeatedIds) {
    defeatedIds.forEach(id => {
        this.defeatedNpcIds.add(id);
        // Find and destroy NPC sprite
    });
}

// Update NPC health after escape
updateNpcHealth(healthUpdates) {
    healthUpdates.forEach(update => {
        const npc = this.npcs.find(n => n.npcData.id === update.id);
        if (npc) {
            npc.npcData.health = update.health;
        }
    });
}
```

