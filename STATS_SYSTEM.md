# Modular Stats & Leveling System Documentation

## Overview
This document explains the new modular stat system for player and NPCs, including experience points, leveling, and the gameplay timer.

## Architecture

### 1. GameStateManager (`src/managers/GameStateManager.js`)
**Singleton** that manages universal game state across all scenes.

#### Gameplay Timer
- Starts from `StartScene` when beginning a new game
- Pauses when in menus (MenuScene, MapScene)
- Tracks total play time in milliseconds
- Provides formatted time display (HH:MM:SS)

#### Player Stats
```javascript
playerStats = {
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
    speed: 100,
    x: 0,  // Position tracking
    y: 0
}
```

#### NPC Stats
- Stored by NPC ID in `npcStats` object
- Persists health changes across battles
- Tracks defeated NPCs

#### Key Methods
- `startTimer()` - Start gameplay timer
- `pauseTimer()` - Pause timer (menus)
- `resumeTimer()` - Resume timer
- `getFormattedPlayTime()` - Get HH:MM:SS format
- `initializeNpcStats(id, type, baseStats)` - Initialize NPC
- `updateNpcHealth(id, health)` - Update NPC health
- `markNpcDefeated(id)` - Mark NPC as defeated
- `saveGame()` - Save to localStorage
- `loadGame()` - Load from localStorage

### 2. StatsManager (`src/managers/StatsManager.js`)
Handles experience calculations and level-up mechanics.

#### Experience Formulas
- **Player XP for next level**: `100 * (currentLevel ^ 1.5)`
- **NPC XP for next level**: `100 * (currentLevel ^ 1.3)` (NPCs level faster)

#### XP Rewards
- **Battle XP**: `50 * defeatedLevel * (1 + levelDiff * 0.2)`
  - Higher level enemies give more XP
  - Lower level enemies give less XP
  - Minimum: 10 XP
  - Defeated gets 30% of victor's XP

- **Negotiation XP**: `30 * (1 + levelDiff * 0.2)`
  - Success: Full XP
  - Failure: 50% XP
  - NPC also gets 50% of player's XP

#### Stat Growth Per Level
**Player:**
- Max Health: +10
- Attack: +2
- Defense: +1
- Speed: +5

**NPC:**
- Max Health: +8
- Attack: +1.5
- Defense: +0.5
- Speed: +3

#### Damage Calculation
```javascript
levelScaling = 1 + (attackerLevel * 0.05)  // +5% per level
scaledAttack = baseAttack * levelScaling
defenseReduction = defenderDefense * (1 + defenderLevel * 0.03)
damage = max(1, scaledAttack - defenseReduction)
```

#### Key Methods
- `calculateBattleXp(defeatedLevel, victorLevel)` - Calculate battle XP
- `calculateNegotiationXp(npcLevel, playerLevel, outcome)` - Calculate negotiation XP
- `addPlayerExperience(xp)` - Add XP to player, check level up
- `addNpcExperience(npcId, xp)` - Add XP to NPC, check level up
- `processBattleRewards(battleResult)` - Award XP to both sides
- `processNegotiationRewards(negotiationResult)` - Award negotiation XP
- `calculateDamage(baseAttack, attackerLvl, defenderDef, defenderLvl)` - Combat damage

### 3. MenuScene (`src/scenes/MenuScene.js`)
Displays player stats and gameplay timer.

#### Features
- **Gameplay Timer**: Top-right corner, gold styling
- **Player Stats Panel**: Left side with:
  - Level and XP bar
  - Health (HP)
  - Attack
  - Defense
  - Speed
- **Visual Effects**:
  - Dark overlay (70% opacity)
  - Player sprite zoom (1.5x)
  - Camera pan to player
- **Controls**: 
  - `?` (Shift + /) to open
  - `?` or `ESC` to close

#### Timer Display
Updates every 100ms for smooth display, pauses game timer when open.

## Integration Guide

### Starting a New Game
```javascript
// In StartScene.js
gameStateManager.resetGame();      // Reset stats
gameStateManager.startTimer();     // Start timer
this.scene.start('WorldScene');
```

### Initializing NPC Stats
```javascript
// In WorldScene or NpcManager
import { gameStateManager } from '../managers/GameStateManager.js';

gameStateManager.initializeNpcStats(npcId, npcType, {
    level: 1,
    health: 100,
    maxHealth: 100,
    attack: 8,
    defense: 3,
    color: 0xff0000,
    triggerRadius: 80
});
```

### Battle Experience (TODO)
```javascript
// In BattleScene after battle ends
import { statsManager } from '../managers/StatsManager.js';

const result = statsManager.processBattleRewards({
    victor: { level: playerLevel },
    defeated: { level: npcLevel, id: npcId },
    victorIsPlayer: true
});

if (result.victor.leveledUp) {
    // Show level up UI
    console.log(`Level Up! New Level: ${result.victor.newLevel}`);
    console.log(`Stats gained:`, result.victor.statsGained);
}
```

### Negotiation Experience (TODO)
```javascript
// When negotiation succeeds/fails
const result = statsManager.processNegotiationRewards({
    playerLevel: player.level,
    npcId: npc.id,
    npcLevel: npc.level,
    outcome: 'success' // or 'failure'
});
```

### Damage Calculation in Battle
```javascript
import { statsManager } from '../managers/StatsManager.js';

const playerStats = statsManager.getPlayerCombatStats();
const npcStats = statsManager.getNpcCombatStats(npcId);

const damage = statsManager.calculateDamage(
    playerStats.attack,
    playerStats.level,
    npcStats.defense,
    npcStats.level
);
```

### Saving/Loading Game
```javascript
// Save game
gameStateManager.saveGame();

// Load game
if (gameStateManager.loadGame()) {
    gameStateManager.startTimer(); // Resume timer
    // Continue from saved state
}
```

## Controls

- **M**: Open Map Scene
- **? (Shift + /)**: Open Menu Scene (Timer, Stats)
- **ESC**: Close Menu/Map

## File Structure
```
src/
├── managers/
│   ├── GameStateManager.js    # Universal state & timer
│   ├── StatsManager.js         # XP & leveling system
│   ├── PlayerManager.js        # Player controls
│   └── NpcManager.js           # NPC management
├── scenes/
│   ├── StartScene.js           # Initialize timer
│   ├── WorldScene.js           # Main gameplay
│   ├── BattleScene.js          # Combat
│   ├── MapScene.js             # World map
│   └── MenuScene.js            # Stats & timer display
└── game.js                     # Game configuration
```

## Next Steps (TODO)

### 5. Integrate Experience Gain from Battles
- Add `processBattleRewards()` call in BattleScene victory
- Create level-up notification UI
- Award XP to both player and surviving NPCs

### 6. Create Level-Up System UI
- Level up animation/sound effect
- Display stat increases
- Pause battle briefly to show level up
- Update HUD with new stats

### 7. Negotiation System (Future)
- Create negotiation dialogue UI
- Implement dialogue choices
- Award XP based on outcome
- Affect NPC relationships

## Example: Full Battle Flow
```javascript
// 1. Battle starts with current stats
const playerStats = gameStateManager.getPlayerStats();
const npcStats = gameStateManager.getNpcStats(npcId);

// 2. Calculate damage during battle
const damage = statsManager.calculateDamage(
    playerStats.attack,
    playerStats.level,
    npcStats.defense,
    npcStats.level
);

// 3. Apply damage
gameStateManager.updatePlayerHealth(playerStats.health - damage);
// or
gameStateManager.updateNpcHealth(npcId, npcStats.health - damage);

// 4. Battle ends - award XP
const xpResult = statsManager.processBattleRewards({
    victor: playerStats,
    defeated: npcStats,
    victorIsPlayer: true
});

// 5. Check for level up
if (xpResult.victor.leveledUp) {
    // Show level up UI with new stats
}

// 6. If NPC defeated
if (npcStats.health <= 0) {
    gameStateManager.markNpcDefeated(npcId);
}
```

## Benefits
1. **Persistence**: Stats survive across battles and scene changes
2. **Modularity**: Easy to add new stat types or mechanics
3. **Balance**: Level scaling ensures fair battles
4. **Progression**: Players and NPCs both grow stronger
5. **Tracking**: Gameplay timer and history tracking
6. **Save/Load**: Full game state persistence

