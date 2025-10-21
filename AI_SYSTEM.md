# NPC Artificial Intelligence System

## Overview

The AI system provides intelligent behaviors for NPCs in both WorldScene (overworld) and BattleScene (combat). Each NPC type has unique AI profiles that determine how they behave in different situations.

---

## Architecture

```
src/ai/
├── NpcAI.js        # Core AI profiles and difficulty settings
├── WorldAI.js      # Overworld behaviors (patrol, wander, chase)
└── BattleAI.js     # Combat behaviors (attack patterns, tactics)
```

---

## NPC Types & AI Profiles

### GUARD
**Personality:** Aggressive, territorial, professional

**WorldScene Behavior:**
- **Pattern:** Patrol routes around spawn point
- **Detection:** 200px radius (high awareness)
- **Aggro:** 150px radius (quick to engage)
- **Chase Speed:** 1.2x (faster than player)
- **Intelligence:** High

**BattleScene Behavior:**
- **Combat Style:** Tactical
- **Attack Frequency:** 0.7 (very aggressive)
- **Dodge Chance:** 0.4 (moderate)
- **Preferred Range:** Close (150px)
- **Tactics:** Maintains optimal distance, times attacks well

---

### MERCHANT
**Personality:** Cautious, defensive, values survival

**WorldScene Behavior:**
- **Pattern:** Stationary (stays near shop/spawn)
- **Detection:** 150px radius (moderate awareness)
- **Aggro:** 80px radius (only when threatened)
- **Chase Speed:** 0.8x (slower than player)
- **Intelligence:** Medium

**BattleScene Behavior:**
- **Combat Style:** Defensive/Cautious
- **Attack Frequency:** 0.3 (low aggression)
- **Dodge Chance:** 0.6 (high survival instinct)
- **Preferred Range:** Far (300px)
- **Tactics:** Keeps distance, counterattacks when safe

---

### VILLAGER
**Personality:** Scared, inexperienced, non-threatening

**WorldScene Behavior:**
- **Pattern:** Wander aimlessly
- **Detection:** 120px radius (low awareness)
- **Aggro:** 60px radius (very defensive)
- **Chase Speed:** 0.9x (slightly slower)
- **Intelligence:** Low

**BattleScene Behavior:**
- **Combat Style:** Passive/Panic
- **Attack Frequency:** 0.2 (very low)
- **Dodge Chance:** 0.3 (poor combat skills)
- **Preferred Range:** Far (300px+)
- **Tactics:** Runs away, attacks only in desperation

---

## WorldScene AI States

### 1. **IDLE**
- Standing still
- Transitions to patrol/wander based on NPC type
- Minimal movement

### 2. **PATROL** (GUARD)
- Follows predefined patrol route
- 4 points in a square around spawn
- Pauses briefly at each point
- Returns to route after alert

### 3. **WANDER** (VILLAGER, sometimes MERCHANT)
- Picks random nearby destinations
- Walks 50-150px in random directions
- Pauses between movements
- Simulates casual exploration

### 4. **ALERT** (All types when detecting player)
- Suspicious behavior
- Moves toward last known player position
- Heightened awareness
- Can escalate to chase or return to normal

### 5. **CHASE** (When player in aggro range)
- Actively pursuing player
- Speed based on NPC type
- Updates last known position
- Triggers battle encounter on contact

### 6. **RETURN** (After losing player)
- Returns to spawn point
- Calms down gradually
- Resumes normal behavior upon arrival
- Alert level decreases

---

## BattleScene AI Behaviors

### **AGGRESSIVE** (GUARD)
```javascript
Strategy:
- Always close distance
- Optimal range: 100-150px
- High attack frequency
- Constant pressure
- Backs up only when too close
```

**Behavior:**
- Rushes player immediately
- Attacks frequently (70% chance when off cooldown)
- Minimal downtime
- Predictable but relentless

---

### **TACTICAL** (GUARD elite)
```javascript
Strategy:
- Maintain optimal spacing (180px)
- Use side-step movement
- Wait for player vulnerability
- Calculated attacks
```

**Behavior:**
- Positions intelligently
- Side-steps while in range
- Attacks after player commits
- Harder to predict

---

### **DEFENSIVE** (MERCHANT)
```javascript
Strategy:
- Keep distance (250px+)
- Counterattack from range
- Retreat when approached
- Flee when panicking
```

**Behavior:**
- Backs away constantly
- Only attacks when safe
- Low aggression (50% base)
- Prioritizes survival

---

### **CAUTIOUS** (MERCHANT in danger)
```javascript
Strategy:
- Careful, slow approach
- Quick retreat when hit
- Selective attacks
- Hover at mid-range
```

**Behavior:**
- Approaches slowly (90 speed)
- Stays at 150-200px range
- Attacks only in safe windows
- Retreats after taking damage

---

### **PASSIVE** (VILLAGER)
```javascript
Strategy:
- Avoid combat
- Maintain large distance
- Rare, desperate attacks
- Primarily defensive
```

**Behavior:**
- Runs away constantly
- Attacks only 15% of the time
- Stays far away (200px+)
- Easy to defeat

---

### **PANIC** (Any NPC below 30% HP)
```javascript
Strategy:
- Erratic movement
- Either spam attacks or flee
- Unpredictable behavior
- Survival mode
```

**Behavior:**
- Random side-to-side movement
- 30% chance to attack frantically
- Reduced accuracy (-20%)
- Desperate and chaotic

---

## Difficulty Settings

### **Easy**
```javascript
{
    reactionTime: 1000ms,
    accuracy: 0.6 (60%),
    aggressiveness: 0.3 (30%)
}
```
- Slow reactions
- Misses frequently
- Low attack frequency

### **Normal** (Default)
```javascript
{
    reactionTime: 600ms,
    accuracy: 0.75 (75%),
    aggressiveness: 0.6 (60%)
}
```
- Balanced gameplay
- Fair challenge
- Good for testing

### **Hard**
```javascript
{
    reactionTime: 300ms,
    accuracy: 0.9 (90%),
    aggressiveness: 0.9 (90%)
}
```
- Fast reactions
- High accuracy
- Very aggressive

---

## Usage Examples

### Integrating WorldAI in WorldScene

```javascript
import { WorldAI } from '../ai/WorldAI.js';
import { npcAI } from '../ai/NpcAI.js';

// In create()
this.worldAI = new WorldAI(this);

// When creating NPCs
this.npcs.forEach(npc => {
    const profile = npcAI.getAIProfile(npc.npcData.type);
    this.worldAI.initNPC(npc, profile);
});

// In update()
this.worldAI.update(this.npcs, this.playerSprite, delta);

// Force aggro when player attacks NPC
onNpcHit(npc) {
    this.worldAI.forceAggro(npc, this.playerSprite);
}
```

---

### Integrating BattleAI in BattleScene

```javascript
import { BattleAI } from '../ai/BattleAI.js';
import { npcAI } from '../ai/NpcAI.js';

// In create()
this.battleAI = new BattleAI(this);

// When creating enemies
this.enemies.forEach(enemy => {
    const profile = npcAI.getAIProfile(enemy.enemyData.type);
    this.battleAI.initEnemy(enemy, profile);
});

// In update()
this.battleAI.update(this.enemies, this.player, delta);

// When enemy takes damage
onEnemyHit(enemy, damage) {
    this.battleAI.onDamageTaken(enemy, damage);
}

// Get AI recommendation
const action = this.battleAI.getRecommendedAction(enemy, this.player);
```

---

### Changing Difficulty

```javascript
import { npcAI } from '../ai/NpcAI.js';

// In StartScene or settings menu
npcAI.setDifficulty('hard');
```

---

## AI State Debugging

### WorldAI Debug Info
```javascript
const aiState = this.worldAI.getState(npc);
console.log({
    behavior: aiState.behavior,
    state: aiState.state,
    alertLevel: aiState.alertLevel,
    spawnPoint: aiState.spawnPoint
});
```

### BattleAI Debug Info
```javascript
const aiState = this.battleAI.getState(enemy);
console.log({
    combatStyle: aiState.combatStyle,
    currentTactic: aiState.currentTactic,
    aggressiveness: aiState.aggressiveness,
    isPanicking: aiState.isPanicking
});
```

---

## Customization

### Adding New NPC Type

```javascript
// In NpcAI.js - getAIProfile()
BOSS: {
    worldBehavior: 'patrol',
    battleBehavior: 'aggressive',
    detectionRadius: 300,
    aggroRadius: 250,
    chaseSpeed: 1.5,
    combatStyle: 'tactical',
    attackFrequency: 0.9,
    dodgeChance: 0.7,
    preferredRange: 'close',
    intelligence: 'extreme'
}
```

### Creating Custom Behavior

```javascript
// In BattleAI.js
executeBossBehavior(enemy, aiState, player, delta) {
    // Custom boss logic
    // Phase changes, special attacks, etc.
}
```

---

## Performance Considerations

- **WorldAI** runs for all NPCs on screen (typically 5-15)
- **BattleAI** runs for enemies in battle (typically 1-3)
- Detection checks use simple distance calculations
- Patrol points are pre-generated
- States are stored in Map for O(1) lookup
- No pathfinding (uses direct movement)

---

## Future Enhancements

### Planned Features:
1. **Group Tactics** - NPCs coordinate with nearby allies
2. **Memory System** - Remember player actions and adapt
3. **Dynamic Difficulty** - Adjust based on player performance
4. **Special Abilities** - Unique moves per NPC type
5. **Pathfinding** - Smarter navigation around obstacles
6. **Emotion System** - Fear, anger, confidence affect behavior
7. **Learning AI** - Improve tactics over multiple encounters

---

## Testing Checklist

### WorldScene AI
- [ ] Guards patrol their routes
- [ ] Villagers wander randomly
- [ ] Merchants stay stationary
- [ ] NPCs detect player in radius
- [ ] NPCs chase when aggro'd
- [ ] NPCs return to spawn after losing player
- [ ] Alert state works properly
- [ ] Chase speed matches NPC type

### BattleScene AI
- [ ] Guards fight aggressively
- [ ] Merchants keep distance
- [ ] Villagers run away
- [ ] Panic mode triggers at low HP
- [ ] Attack cooldowns work
- [ ] Movement patterns match combat style
- [ ] Difficulty affects behavior
- [ ] AI adapts to damage taken

---

## Notes

- AI is deterministic but uses randomness for variety
- All NPCs use the same core AI, just with different parameters
- Easy to extend and modify
- Designed for readability and maintainability
- Console logs can be disabled for production

**Created:** 2025-10-21  
**Version:** 1.0.0  
**Status:** Ready for integration

