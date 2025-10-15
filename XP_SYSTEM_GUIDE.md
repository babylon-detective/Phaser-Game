# Experience System Guide

## 📊 XP Calculation Formula

### **Battle XP Reward**
```javascript
XP = 50 × enemyLevel × levelMultiplier × typeMultiplier
```

**Where:**
- **Base XP**: 50 per enemy level
- **Level Multiplier**: `1 + (levelDiff × 0.2)` (min 0.5)
- **Type Multiplier**: 
  - VILLAGER: 1.0x
  - MERCHANT: 1.3x
  - GUARD: 1.5x

### **Level-Up Requirements**
```javascript
XP_Required = 100 × (currentLevel ^ 1.5)
```

## 📈 XP Rewards Table

### **Level 1 NPCs (Player Level 1)**

| NPC Type | Level | XP Reward | Why? |
|----------|-------|-----------|------|
| VILLAGER | 1 | **50 XP** | Base (50 × 1 × 1.0 × 1.0) |
| MERCHANT | 1 | **65 XP** | +30% type bonus (50 × 1 × 1.0 × 1.3) |
| GUARD | 1 | **75 XP** | +50% type bonus (50 × 1 × 1.0 × 1.5) |

### **Level 3 NPCs (Player Level 1)**

| NPC Type | Level | XP Reward | Why? |
|----------|-------|-----------|------|
| VILLAGER | 3 | **210 XP** | Higher level bonus (50 × 3 × 1.4 × 1.0) |
| MERCHANT | 3 | **273 XP** | Level + type (50 × 3 × 1.4 × 1.3) |
| GUARD | 3 | **315 XP** | Level + type (50 × 3 × 1.4 × 1.5) |

### **Same Level (Player Level 3 vs Level 3 NPCs)**

| NPC Type | Level | XP Reward | Why? |
|----------|-------|-----------|------|
| VILLAGER | 3 | **150 XP** | Equal level (50 × 3 × 1.0 × 1.0) |
| MERCHANT | 3 | **195 XP** | Type bonus (50 × 3 × 1.0 × 1.3) |
| GUARD | 3 | **225 XP** | Type bonus (50 × 3 × 1.0 × 1.5) |

### **Lower Level (Player Level 5 vs Level 2 NPCs)**

| NPC Type | Level | XP Reward | Why? |
|----------|-------|-----------|------|
| VILLAGER | 2 | **30 XP** | Penalty for easier (50 × 2 × 0.6 × 1.0) |
| MERCHANT | 2 | **39 XP** | Penalty + type (50 × 2 × 0.6 × 1.3) |
| GUARD | 2 | **45 XP** | Penalty + type (50 × 2 × 0.6 × 1.5) |

## 🎯 Level Progression

### **XP Required per Level**

| Player Level | XP to Next Level | Total XP Needed | NPCs to Defeat* |
|--------------|------------------|-----------------|-----------------|
| 1 → 2 | 100 XP | 100 | ~2 Villagers or 1 Guard |
| 2 → 3 | 283 XP | 383 | ~4 Villagers or 3 Guards |
| 3 → 4 | 520 XP | 903 | ~7 Villagers or 4 Guards |
| 4 → 5 | 800 XP | 1,703 | ~11 Villagers or 7 Guards |
| 5 → 6 | 1,118 XP | 2,821 | ~15 Villagers or 10 Guards |
| 6 → 7 | 1,470 XP | 4,291 | ~20 Villagers or 13 Guards |
| 7 → 8 | 1,854 XP | 6,145 | ~25 Villagers or 17 Guards |
| 8 → 9 | 2,267 XP | 8,412 | ~30 Villagers or 20 Guards |
| 9 → 10 | 2,707 XP | 11,119 | ~36 Villagers or 24 Guards |
| 10 → 11 | 3,173 XP | 14,292 | ~42 Villagers or 28 Guards |

*Assuming same-level enemies

## ⚔️ Stat Growth per Level

### **Player Stats Growth**
```
Level Up Bonuses:
• Max Health: +10
• Attack: +2
• Defense: +1
• Speed: +5
• Full heal on level up
```

### **Example Player Progression**

| Level | Max HP | Attack | Defense | Speed |
|-------|--------|--------|---------|-------|
| 1 | 100 | 10 | 5 | 100 |
| 2 | 110 | 12 | 6 | 105 |
| 3 | 120 | 14 | 7 | 110 |
| 5 | 140 | 18 | 9 | 120 |
| 10 | 190 | 28 | 14 | 145 |
| 20 | 290 | 48 | 24 | 195 |

## 🎮 Gameplay Balance Recommendations

### **Early Game (Levels 1-3)**
- **Easy to level up** (100-500 XP per level)
- **Villagers**: Good for safe grinding (50 XP)
- **Guards**: Risk/reward (75 XP)
- **Strategy**: Focus on learning combat

### **Mid Game (Levels 4-7)**
- **Moderate progression** (800-1,500 XP per level)
- **Mixed enemies**: Variety keeps it interesting
- **Strategy**: Optimize for type bonuses

### **Late Game (Levels 8+)**
- **Slower progression** (2,000+ XP per level)
- **Higher level enemies**: Better XP/battle
- **Strategy**: Hunt high-level Guards (315+ XP)

## 🔧 Tuning Parameters

### **To Make Leveling FASTER:**
1. **Increase base XP**: Change `battleXpBase` from 50 → 75
2. **Reduce XP curve**: Change `playerXpMultiplier` from 1.5 → 1.3
3. **Increase type bonuses**: GUARD 1.5 → 2.0

### **To Make Leveling SLOWER:**
1. **Decrease base XP**: Change `battleXpBase` from 50 → 35
2. **Steepen XP curve**: Change `playerXpMultiplier` from 1.5 → 1.7
3. **Reduce level difference bonus**: `0.2` → `0.15`

### **To Reward Skill More:**
1. **Increase level difference bonus**: `0.2` → `0.3`
2. **Add combo/streak bonuses** (future feature)
3. **Reduce same-level XP**: Make multiplier `0.8` instead of `1.0`

## 📝 Example Battle Scenarios

### **Scenario 1: New Player**
- Player Level 1
- Defeats Level 1 VILLAGER
- **XP Gained: 50**
- **Progress: 50/100 (50%)**

### **Scenario 2: Challenge Accepted**
- Player Level 1  
- Defeats Level 3 GUARD
- **XP Gained: 315**
- **Progress: Level up + 215 toward next!**

### **Scenario 3: Farming Low-Level**
- Player Level 5
- Defeats Level 2 VILLAGER
- **XP Gained: 30**
- **Progress: Not efficient, need ~37 kills**

### **Scenario 4: Optimal Grinding**
- Player Level 5
- Defeats Level 5 GUARD (same level)
- **XP Gained: 375**
- **Progress: ~3 battles = level up**

## 🎯 Recommended XP Economy

### **For 10-20 Hour Game:**
- ✅ Current settings (1.5 multiplier)
- 15 NPC total → Need respawning or more NPCs
- Add NPC respawn every 5 minutes

### **For 5-10 Hour Game:**
- Change `playerXpMultiplier` to 1.3
- OR increase `battleXpBase` to 70
- Faster progression, more arcade-y

### **For 20+ Hour Game:**
- Change `playerXpMultiplier` to 1.7
- Add quests/alternative XP sources
- More strategic depth needed

## 🚀 Next Steps

1. **Test Current Balance**: Play through levels 1-5
2. **Adjust**: Based on feel (too fast/slow?)
3. **Add Variety**: 
   - Boss NPCs (3x XP multiplier)
   - Quest XP bonuses
   - Achievement XP rewards
4. **Display XP**: Show "+50 XP" on screen after battles
5. **Level Up Effect**: Celebration animation + sound

