# Party Recruitment System Documentation

## Overview
The game now features a complete party/recruitment system where the player can recruit up to 3 additional characters to join their party. These characters follow the player in the WorldScene and fight alongside them in battles.

## System Components

### 1. PartyManager (`src/managers/PartyManager.js`)
Central manager for the party recruitment system.

**Key Features:**
- Creates 3 recruitable NPCs in WorldScene
- Handles recruitment dialogue and interactions
- Manages party member following behavior
- Provides party data to BattleScene

**Recruitable Characters:**
1. **Warrior** (Blue indicator)
   - Position: (500, 400)
   - Stats: HP 120, Attack 15, Defense 10
   - Abilities: Power Strike, Defend

2. **Mage** (Yellow indicator)
   - Position: (700, 500)
   - Stats: HP 80, Attack 20, Defense 5
   - Abilities: Fireball, Heal

3. **Ranger** (Green indicator)
   - Position: (400, 600)
   - Stats: HP 100, Attack 12, Defense 8
   - Abilities: Quick Shot, Dodge

### 2. WorldScene Integration

**Initialization:**
- PartyManager is created after PlayerManager
- Recruitable NPCs spawn at predefined locations
- Each NPC has a unique colored direction indicator (Blue/Yellow/Green)

**Recruitment Process:**
1. Player approaches recruitable NPC
2. Trigger zone detects player proximity
3. Recruitment dialogue overlay appears
4. Player can accept or decline
5. If accepted, NPC joins party and becomes semi-transparent
6. Party members follow player in a line formation

**Following Behavior:**
- Party members follow at 50-unit intervals
- Smooth interpolation for natural movement
- Direction indicators move with characters

### 3. BattleScene Integration

**Party Character Display:**
- Player positioned at 30% from left
- Party members positioned to the left of player (80-unit spacing)
- Each character has their unique colored direction indicator
- Characters have individual HP and stats

**Combat Controls (U/I/O/P Keys):**
- **U Key**: Player melee combo attack
- **I Key**: Party Member 1 (Warrior) ability
- **O Key**: Party Member 2 (Mage) ability
- **P Key**: Party Member 3 (Ranger) ability

**Party Member Abilities:**
- Cost: 5 AP per ability
- Fire colored projectiles at enemies
- Deal damage based on character's attack stat
- Show character name and damage on activation

### 4. Visual Design

**Character Appearance:**
- Gray rectangular body (96x192) - same as player
- Unique colored direction indicator (10x10 square)
  - Player: Red
  - Warrior: Blue
  - Mage: Yellow
  - Ranger: Green

**Recruitment UI:**
- Full-screen overlay with gradient background
- Character info card with:
  - Character name
  - Level and HP
  - Colored border matching indicator
  - Recruitment dialogue
  - Accept/Decline buttons

## Usage

### In WorldScene:
1. Navigate to recruitable NPC locations
2. Approach within trigger range (60 units)
3. Recruitment dialogue appears automatically
4. Choose to recruit or decline
5. Recruited members follow player
6. Maximum party size: 4 (Player + 3 members)

### In BattleScene:
1. Press **U** to perform player melee attack
2. Press **I** to use first party member's ability (if recruited)
3. Press **O** to use second party member's ability (if recruited)
4. Press **P** to use third party member's ability (if recruited)
5. Each ability costs 5 AP and targets closest enemy
6. Projectiles are colored to match character's indicator

## Technical Details

### Data Flow:
```
WorldScene (PartyManager) 
  → Recruitment → Party Members Data
  → Battle Transition → BattleScene
  → Party Characters Created → Combat System
```

### Party Member Data Structure:
```javascript
{
  id: 'warrior',           // Unique identifier
  name: 'Warrior',         // Display name
  color: 0x808080,         // Body color (gray)
  indicatorColor: 0x0000ff, // Blue indicator
  abilities: ['powerStrike', 'defend'],
  stats: {
    health: 120,
    attack: 15,
    defense: 10,
    level: 1
  }
}
```

### Key Methods:

**PartyManager:**
- `init()` - Creates recruitable NPCs
- `createRecruitableNPC(data)` - Spawns individual NPC
- `handlePlayerNearNPC(npcData)` - Detects player proximity
- `showRecruitmentPrompt(npcData)` - Displays dialogue
- `recruitCharacter(npcData)` - Adds to party
- `update()` - Updates following behavior
- `getPartyForBattle()` - Returns party data for battle

**BattleScene:**
- `createPartyCharacters(groundY)` - Creates party visuals
- `handleFaceButtonInput()` - Processes U/I/O/P inputs
- `executePartyMemberAbility(memberIndex)` - Fires projectile attack

## Customization

### Adding More Recruitable Characters:
Edit the `recruitables` array in `PartyManager.createRecruitableNPCs()`:
```javascript
{
  id: 'newCharacter',
  name: 'New Character',
  color: 0x808080,
  indicatorColor: 0xFF00FF, // Purple
  x: 800,
  y: 700,
  abilities: ['ability1', 'ability2'],
  stats: { health: 100, attack: 12, defense: 8, level: 1 },
  dialogue: {
    initial: "Want me to join?",
    accept: "Great!",
    reject: "Maybe later."
  }
}
```

### Modifying Party Size:
Change `maxPartySize` in PartyManager constructor:
```javascript
this.maxPartySize = 5; // Player + 4 members
```

### Adjusting Follow Distance:
Change `followDistance` in PartyManager:
```javascript
this.followDistance = 70; // More space between characters
```

### Changing AP Costs:
Edit `abilityAPCost` in `BattleScene.executePartyMemberAbility()`:
```javascript
const abilityAPCost = 3; // Cheaper abilities
```

## Known Behaviors

1. **Party members only follow in WorldScene** - They appear in battle but don't follow around enemies
2. **Shared AP pool** - All characters use the same AP resource
3. **Projectile-based attacks** - All party members currently use ranged attacks
4. **One ability per character** - Each recruited member has one active ability in battle
5. **Recruitment is permanent** - Once recruited, characters stay in party (no dismissal system yet)

## Future Enhancements

Potential additions:
- Individual HP bars for party members
- Different ability types (melee, support, buff)
- Character-specific AP pools
- Party formation control
- Character dismissal/swapping
- Party member leveling system
- Unique abilities per character class
- Party member permadeath/revival system

## Files Modified

1. **src/managers/PartyManager.js** (NEW) - Core party system
2. **src/scenes/WorldScene.js** - Party integration and data passing
3. **src/scenes/BattleScene.js** - Party combat mechanics
4. **src/style.css** - Recruitment UI animations

## Testing

To test the system:
1. Start the game and navigate to WorldScene
2. Find the 3 recruitable NPCs at their spawn locations
3. Approach each one to trigger recruitment dialogue
4. Accept to recruit them
5. Observe following behavior in WorldScene
6. Trigger a battle and use I/O/P keys to command party members
7. Watch projectiles fire and deal damage

The system is now fully functional and ready for use!

