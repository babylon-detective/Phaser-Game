/**
 * Battle AI Module
 * Handles NPC combat behaviors in BattleScene
 */

import { npcAI } from './NpcAI.js';

export class BattleAI {
    constructor(scene) {
        this.scene = scene;
        this.enemyStates = new Map(); // Store AI state for each enemy
    }

    /**
     * Initialize AI for an enemy in battle
     */
    initEnemy(enemy, profile) {
        const difficulty = npcAI.getDifficulty();
        
        const aiState = {
            profile: profile,
            combatStyle: profile.combatStyle,
            lastActionTime: 0,
            nextActionDelay: difficulty.reactionTime,
            currentTactic: 'approach',
            preferredDistance: profile.preferredRange === 'close' ? 150 : 300,
            attackCooldown: 0,
            dodgeCooldown: 0,
            movementPattern: null,
            aggressiveness: profile.attackFrequency * difficulty.aggressiveness,
            accuracy: difficulty.accuracy,
            panicThreshold: 0.3, // HP percentage to trigger panic
            isPanicking: false
        };

        this.enemyStates.set(enemy, aiState);
        console.log(`[BattleAI] Initialized AI for ${enemy.enemyData.type}:`, aiState.combatStyle);
    }

    /**
     * Update all enemies AI
     */
    update(enemies, player, delta) {
        if (!player) return;

        enemies.forEach(enemy => {
            const aiState = this.enemyStates.get(enemy);
            if (!aiState) return;

            // Update cooldowns
            aiState.attackCooldown = Math.max(0, aiState.attackCooldown - delta);
            aiState.dodgeCooldown = Math.max(0, aiState.dodgeCooldown - delta);

            // Check health for panic mode
            const healthPercent = enemy.enemyData.health / enemy.enemyData.maxHealth;
            if (healthPercent < aiState.panicThreshold && !aiState.isPanicking) {
                aiState.isPanicking = true;
                console.log(`[BattleAI] ${enemy.enemyData.type} is panicking!`);
            }

            // Execute combat style
            switch (aiState.combatStyle) {
                case 'aggressive':
                    this.executeAggressiveBehavior(enemy, aiState, player, delta);
                    break;
                case 'tactical':
                    this.executeTacticalBehavior(enemy, aiState, player, delta);
                    break;
                case 'defensive':
                    this.executeDefensiveBehavior(enemy, aiState, player, delta);
                    break;
                case 'cautious':
                    this.executeCautiousBehavior(enemy, aiState, player, delta);
                    break;
                case 'passive':
                    this.executePassiveBehavior(enemy, aiState, player, delta);
                    break;
                case 'panic':
                    this.executePanicBehavior(enemy, aiState, player, delta);
                    break;
            }
        });
    }

    /**
     * Aggressive behavior - Constant pressure, high attack frequency
     */
    executeAggressiveBehavior(enemy, aiState, player, delta) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);

        if (aiState.isPanicking) {
            this.executePanicBehavior(enemy, aiState, player, delta);
            return;
        }

        // Always try to close distance
        if (distance > 150) {
            this.moveTowardPlayer(enemy, player, 150);
        } else if (distance < 100) {
            // Too close, back up slightly
            this.moveAwayFromPlayer(enemy, player, 80);
        } else {
            // In optimal range, focus on attacking
            if (enemy.body) {
                enemy.body.setVelocityX(0);
            }
        }

        // High attack frequency
        if (aiState.attackCooldown <= 0 && Math.random() < aiState.aggressiveness) {
            this.attemptAttack(enemy, aiState, player);
        }
    }

    /**
     * Tactical behavior - Positioning, spacing, smart attacks
     */
    executeTacticalBehavior(enemy, aiState, player, delta) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
        const optimalDistance = 180;

        if (aiState.isPanicking) {
            this.executePanicBehavior(enemy, aiState, player, delta);
            return;
        }

        // Maintain optimal distance
        if (distance > optimalDistance + 50) {
            this.moveTowardPlayer(enemy, player, 120);
        } else if (distance < optimalDistance - 50) {
            this.moveAwayFromPlayer(enemy, player, 120);
        } else {
            // In optimal range, use side-step movement
            this.executeSideStep(enemy, player);
        }

        // Medium attack frequency with timing
        if (aiState.attackCooldown <= 0) {
            // Wait for player vulnerability (just after player attacks)
            const shouldAttack = Math.random() < (aiState.aggressiveness * 0.8);
            if (shouldAttack) {
                this.attemptAttack(enemy, aiState, player);
            }
        }
    }

    /**
     * Defensive behavior - Keep distance, counterattack
     */
    executeDefensiveBehavior(enemy, aiState, player, delta) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
        const safeDistance = 250;

        if (aiState.isPanicking) {
            // Defensive types flee when panicking
            this.moveAwayFromPlayer(enemy, player, 150);
            return;
        }

        // Keep safe distance
        if (distance < safeDistance) {
            this.moveAwayFromPlayer(enemy, player, 130);
        } else {
            // Maintain position
            if (enemy.body) {
                enemy.body.setVelocityX(0);
            }
        }

        // Low attack frequency, only when safe
        if (aiState.attackCooldown <= 0 && distance > 200) {
            if (Math.random() < (aiState.aggressiveness * 0.5)) {
                this.attemptAttack(enemy, aiState, player);
            }
        }
    }

    /**
     * Cautious behavior - Careful approach, retreat when hit
     */
    executeCautiousBehavior(enemy, aiState, player, delta) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);

        if (aiState.isPanicking) {
            this.moveAwayFromPlayer(enemy, player, 140);
            return;
        }

        // Slow, careful approach
        if (distance > 200) {
            this.moveTowardPlayer(enemy, player, 90);
        } else if (distance < 150) {
            // Back away
            this.moveAwayFromPlayer(enemy, player, 100);
        } else {
            // Hover in range
            this.executeSideStep(enemy, player);
        }

        // Very selective attacks
        if (aiState.attackCooldown <= 0 && distance > 150 && distance < 220) {
            if (Math.random() < (aiState.aggressiveness * 0.6)) {
                this.attemptAttack(enemy, aiState, player);
            }
        }
    }

    /**
     * Passive behavior - Minimal aggression, mainly defensive
     */
    executePassiveBehavior(enemy, aiState, player, delta) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);

        // Always try to maintain distance
        if (distance < 200) {
            this.moveAwayFromPlayer(enemy, player, 120);
        } else {
            if (enemy.body) {
                enemy.body.setVelocityX(0);
            }
        }

        // Rare attacks, only in desperation
        if (aiState.attackCooldown <= 0 && distance > 180) {
            if (Math.random() < 0.15) {
                this.attemptAttack(enemy, aiState, player);
            }
        }
    }

    /**
     * Panic behavior - Erratic movement, desperate attacks or flee
     */
    executePanicBehavior(enemy, aiState, player, delta) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);

        // Erratic movement
        if (!aiState.panicDirection || Math.random() < 0.05) {
            aiState.panicDirection = Math.random() > 0.5 ? 1 : -1;
        }

        // Move erratically
        if (distance < 180) {
            this.moveAwayFromPlayer(enemy, player, 160);
        } else {
            // Random side movement
            if (enemy.body) {
                enemy.body.setVelocityX(aiState.panicDirection * 100);
            }
        }

        // Either spam attacks or don't attack at all
        if (Math.random() < 0.3) {
            if (aiState.attackCooldown <= 0) {
                this.attemptAttack(enemy, aiState, player);
            }
        }
    }

    /**
     * Side-step movement for tactical positioning
     */
    executeSideStep(enemy, player) {
        if (!enemy.body) return;

        // Move side to side
        const time = Date.now();
        const direction = Math.sin(time / 500) > 0 ? 1 : -1;
        enemy.body.setVelocityX(direction * 70);
    }

    /**
     * Move toward player
     */
    moveTowardPlayer(enemy, player, speed) {
        if (!enemy.body) return;

        if (player.x < enemy.x) {
            enemy.body.setVelocityX(-speed);
        } else {
            enemy.body.setVelocityX(speed);
        }
    }

    /**
     * Move away from player
     */
    moveAwayFromPlayer(enemy, player, speed) {
        if (!enemy.body) return;

        if (player.x < enemy.x) {
            enemy.body.setVelocityX(speed);
        } else {
            enemy.body.setVelocityX(-speed);
        }
    }

    /**
     * Attempt to attack player
     */
    attemptAttack(enemy, aiState, player) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
        
        // Only attack if in range
        if (distance < 300) {
            console.log(`[BattleAI] ${enemy.enemyData.type} attempting attack`);
            
            // Set cooldown based on aggressiveness
            aiState.attackCooldown = 1500 / aiState.aggressiveness;
            
            // Trigger attack (this would be handled by BattleScene)
            // For now, just log it
            this.triggerEnemyAttack(enemy, aiState, player);
        }
    }

    /**
     * Trigger enemy attack (to be implemented in BattleScene)
     */
    triggerEnemyAttack(enemy, aiState, player) {
        // This method will be called by BattleScene to actually perform the attack
        // For now, it's a placeholder
        if (this.scene && this.scene.createEnemyAttack) {
            const accuracy = aiState.accuracy + (aiState.isPanicking ? -0.2 : 0);
            this.scene.createEnemyAttack(enemy, player, accuracy);
        }
    }

    /**
     * Enemy takes damage - react
     */
    onDamageTaken(enemy, damage) {
        const aiState = this.enemyStates.get(enemy);
        if (!aiState) return;

        console.log(`[BattleAI] ${enemy.enemyData.type} took ${damage} damage`);

        // Increase aggressiveness temporarily
        aiState.aggressiveness = Math.min(1, aiState.aggressiveness + 0.1);

        // Check if should panic
        const healthPercent = enemy.enemyData.health / enemy.enemyData.maxHealth;
        if (healthPercent < aiState.panicThreshold) {
            aiState.isPanicking = true;
        }
    }

    /**
     * Get enemy AI state (for debugging)
     */
    getState(enemy) {
        return this.enemyStates.get(enemy);
    }

    /**
     * Clean up AI for removed enemy
     */
    removeEnemy(enemy) {
        this.enemyStates.delete(enemy);
    }

    /**
     * Clean up all AI
     */
    cleanup() {
        this.enemyStates.clear();
    }

    /**
     * Get recommended action for enemy
     */
    getRecommendedAction(enemy, player) {
        const aiState = this.enemyStates.get(enemy);
        if (!aiState) return 'idle';

        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
        
        if (aiState.isPanicking) {
            return Math.random() > 0.5 ? 'flee' : 'attack';
        }

        if (distance < aiState.preferredDistance) {
            return 'retreat';
        } else if (distance > aiState.preferredDistance + 100) {
            return 'advance';
        } else if (aiState.attackCooldown <= 0 && Math.random() < aiState.aggressiveness) {
            return 'attack';
        } else {
            return 'position';
        }
    }
}

