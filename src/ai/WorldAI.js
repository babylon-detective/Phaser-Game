/**
 * World AI Module
 * Handles NPC behaviors in WorldScene (patrol, wander, detection, chase)
 */

import { npcAI } from './NpcAI.js';

export class WorldAI {
    constructor(scene) {
        this.scene = scene;
        this.behaviors = new Map(); // Store AI state for each NPC
    }

    /**
     * Initialize AI for an NPC
     */
    initNPC(npc, profile) {
        const aiState = {
            profile: profile,
            behavior: profile.worldBehavior,
            state: 'idle',
            spawnPoint: { x: npc.x, y: npc.y },
            patrolPoints: this.generatePatrolPoints(npc.x, npc.y, profile),
            currentPatrolIndex: 0,
            wanderTimer: 0,
            wanderDelay: Phaser.Math.Between(2000, 5000),
            detectionTimer: 0,
            chaseTarget: null,
            lastKnownPlayerPos: null,
            alertLevel: 0 // 0 = calm, 1 = suspicious, 2 = aggressive
        };

        this.behaviors.set(npc, aiState);
        console.log(`[WorldAI] Initialized AI for ${npc.npcData.type}:`, aiState.behavior);
    }

    /**
     * Generate patrol points around spawn
     */
    generatePatrolPoints(x, y, profile) {
        if (profile.worldBehavior !== 'patrol') return [];

        const points = [];
        const radius = 100;
        const numPoints = 4;

        for (let i = 0; i < numPoints; i++) {
            const angle = (Math.PI * 2 / numPoints) * i;
            points.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius
            });
        }

        return points;
    }

    /**
     * Update all NPCs AI
     */
    update(npcs, player, delta) {
        if (!player) return;

        npcs.forEach(npc => {
            const aiState = this.behaviors.get(npc);
            if (!aiState) return;

            // Check player detection
            this.updateDetection(npc, aiState, player);

            // Execute current behavior
            switch (aiState.state) {
                case 'idle':
                    this.executeIdle(npc, aiState, delta);
                    break;
                case 'patrol':
                    this.executePatrol(npc, aiState, delta);
                    break;
                case 'wander':
                    this.executeWander(npc, aiState, delta);
                    break;
                case 'chase':
                    this.executeChase(npc, aiState, player, delta);
                    break;
                case 'return':
                    this.executeReturn(npc, aiState, delta);
                    break;
                case 'alert':
                    this.executeAlert(npc, aiState, player, delta);
                    break;
            }
        });
    }

    /**
     * Update player detection
     */
    updateDetection(npc, aiState, player) {
        const distance = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
        const profile = aiState.profile;

        // Detection radius check
        if (distance < profile.detectionRadius) {
            aiState.detectionTimer += 16; // ~60fps

            // Gradual alert level increase
            if (distance < profile.aggroRadius) {
                aiState.alertLevel = 2; // Aggressive
                if (aiState.state !== 'chase') {
                    console.log(`[WorldAI] ${npc.npcData.type} detected player - CHASE`);
                    aiState.state = 'chase';
                    aiState.chaseTarget = player;
                }
            } else if (distance < profile.detectionRadius) {
                aiState.alertLevel = Math.max(1, aiState.alertLevel); // Suspicious
                if (aiState.state === 'idle' || aiState.state === 'patrol' || aiState.state === 'wander') {
                    aiState.state = 'alert';
                    aiState.lastKnownPlayerPos = { x: player.x, y: player.y };
                }
            }
        } else {
            // Player left detection range
            aiState.detectionTimer = Math.max(0, aiState.detectionTimer - 32);
            
            if (aiState.detectionTimer <= 0) {
                aiState.alertLevel = Math.max(0, aiState.alertLevel - 0.01);
                
                if (aiState.state === 'chase' || aiState.state === 'alert') {
                    console.log(`[WorldAI] ${npc.npcData.type} lost player - RETURN`);
                    aiState.state = 'return';
                    aiState.chaseTarget = null;
                }
            }
        }
    }

    /**
     * Execute idle behavior
     */
    executeIdle(npc, aiState, delta) {
        // Stop movement
        if (npc.body) {
            npc.body.setVelocity(0, 0);
        }

        // Transition based on behavior type
        if (aiState.profile.worldBehavior === 'patrol') {
            aiState.state = 'patrol';
        } else if (aiState.profile.worldBehavior === 'wander') {
            aiState.wanderTimer += delta;
            if (aiState.wanderTimer >= aiState.wanderDelay) {
                aiState.state = 'wander';
                aiState.wanderTimer = 0;
            }
        }
    }

    /**
     * Execute patrol behavior
     */
    executePatrol(npc, aiState, delta) {
        if (aiState.patrolPoints.length === 0) {
            aiState.state = 'idle';
            return;
        }

        const targetPoint = aiState.patrolPoints[aiState.currentPatrolIndex];
        const distance = Phaser.Math.Distance.Between(npc.x, npc.y, targetPoint.x, targetPoint.y);

        if (distance < 10) {
            // Reached patrol point, move to next
            aiState.currentPatrolIndex = (aiState.currentPatrolIndex + 1) % aiState.patrolPoints.length;
            
            // Pause at patrol point
            if (npc.body) {
                npc.body.setVelocity(0, 0);
            }
            aiState.state = 'idle';
            aiState.wanderDelay = Phaser.Math.Between(1000, 3000);
            aiState.wanderTimer = 0;
        } else {
            // Move toward patrol point
            this.moveToward(npc, targetPoint, 50);
        }
    }

    /**
     * Execute wander behavior
     */
    executeWander(npc, aiState, delta) {
        aiState.wanderTimer += delta;

        if (aiState.wanderTimer < 2000) {
            // Pick random direction and move
            if (!aiState.wanderDirection) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Phaser.Math.Between(50, 150);
                aiState.wanderDirection = {
                    x: npc.x + Math.cos(angle) * distance,
                    y: npc.y + Math.sin(angle) * distance
                };
            }

            this.moveToward(npc, aiState.wanderDirection, 40);

            // Check if reached wander point
            const dist = Phaser.Math.Distance.Between(npc.x, npc.y, aiState.wanderDirection.x, aiState.wanderDirection.y);
            if (dist < 20) {
                aiState.wanderDirection = null;
                aiState.state = 'idle';
                aiState.wanderDelay = Phaser.Math.Between(3000, 6000);
                aiState.wanderTimer = 0;
            }
        } else {
            // Wander time expired, return to idle
            aiState.wanderDirection = null;
            aiState.state = 'idle';
            aiState.wanderDelay = Phaser.Math.Between(3000, 6000);
            aiState.wanderTimer = 0;
        }
    }

    /**
     * Execute chase behavior
     */
    executeChase(npc, aiState, player, delta) {
        if (!aiState.chaseTarget) {
            aiState.state = 'return';
            return;
        }

        const chaseSpeed = 70 * aiState.profile.chaseSpeed;
        this.moveToward(npc, player, chaseSpeed);

        // Update last known position
        aiState.lastKnownPlayerPos = { x: player.x, y: player.y };
    }

    /**
     * Execute alert behavior (suspicious, investigating)
     */
    executeAlert(npc, aiState, player, delta) {
        // Move toward last known player position
        if (aiState.lastKnownPlayerPos) {
            const distance = Phaser.Math.Distance.Between(
                npc.x, npc.y, 
                aiState.lastKnownPlayerPos.x, 
                aiState.lastKnownPlayerPos.y
            );

            if (distance < 30) {
                // Reached last known position, return to normal
                aiState.state = 'return';
                aiState.lastKnownPlayerPos = null;
            } else {
                this.moveToward(npc, aiState.lastKnownPlayerPos, 60);
            }
        } else {
            aiState.state = 'return';
        }
    }

    /**
     * Execute return to spawn behavior
     */
    executeReturn(npc, aiState, delta) {
        const distance = Phaser.Math.Distance.Between(
            npc.x, npc.y, 
            aiState.spawnPoint.x, 
            aiState.spawnPoint.y
        );

        if (distance < 20) {
            // Reached spawn point
            if (npc.body) {
                npc.body.setVelocity(0, 0);
            }
            aiState.state = 'idle';
            aiState.alertLevel = 0;
            aiState.chaseTarget = null;
            aiState.lastKnownPlayerPos = null;
            console.log(`[WorldAI] ${npc.npcData.type} returned to spawn`);
        } else {
            // Move toward spawn
            this.moveToward(npc, aiState.spawnPoint, 60);
        }
    }

    /**
     * Move NPC toward target position
     */
    moveToward(npc, target, speed) {
        if (!npc.body) return;

        const angle = Phaser.Math.Angle.Between(npc.x, npc.y, target.x, target.y);
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;

        npc.body.setVelocity(velocityX, velocityY);
    }

    /**
     * Force NPC to chase player (e.g., when hit)
     */
    forceAggro(npc, player) {
        const aiState = this.behaviors.get(npc);
        if (aiState) {
            aiState.alertLevel = 2;
            aiState.state = 'chase';
            aiState.chaseTarget = player;
            console.log(`[WorldAI] ${npc.npcData.type} forced into aggro`);
        }
    }

    /**
     * Get NPC AI state (for debugging)
     */
    getState(npc) {
        return this.behaviors.get(npc);
    }

    /**
     * Clean up AI for removed NPC
     */
    removeNPC(npc) {
        this.behaviors.delete(npc);
    }

    /**
     * Clean up all AI
     */
    cleanup() {
        this.behaviors.clear();
    }
}

