/**
 * PartyFollowingManager - Handles snake-trail following behavior for party members
 * Works with PartyLeadershipManager to get party order
 * Simple, clean logic: everyone follows the person in front of them
 */

export default class PartyFollowingManager {
    constructor(scene) {
        this.scene = scene;
        this.followDistance = 60; // Distance between characters
        this.followSpeed = 0.15; // Smooth interpolation speed
        this.minFollowDistance = 10; // Stop moving if closer than this
    }

    /**
     * Update all follower positions
     * Called every frame from WorldScene.update()
     * @param {Array} party - Array from PartyLeadershipManager (leader at index 0)
     */
    update(party) {
        if (party.length < 2) return; // No followers to update

        // Each follower (index 1+) follows the character in front of them
        for (let i = 1; i < party.length; i++) {
            const follower = party[i];
            const leader = party[i - 1]; // The character in front

            if (!follower.sprite || !leader.sprite) continue;

            // Calculate target position (behind the leader)
            const targetX = leader.sprite.x - this.followDistance;
            const targetY = leader.sprite.y;

            // Calculate distance to target
            const dx = targetX - follower.sprite.x;
            const dy = targetY - follower.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Only move if far enough away
            if (distance > this.minFollowDistance) {
                // Smooth movement towards target
                follower.sprite.x += dx * this.followSpeed;
                follower.sprite.y += dy * this.followSpeed;

                // Update indicator position to stay above follower
                if (follower.indicator) {
                    follower.indicator.setPosition(
                        follower.sprite.x,
                        follower.sprite.y - 40
                    );
                }
            }
        }
    }

    /**
     * Position all party members in initial formation
     * Called when party composition changes (recruitment, scene transition)
     * @param {Array} party - Array from PartyLeadershipManager
     */
    arrangeFormation(party) {
        if (party.length < 2) return;

        const leader = party[0];
        if (!leader.sprite) return;

        console.log('[PartyFollowingManager] Arranging party formation');

        // Position each follower behind the previous character
        for (let i = 1; i < party.length; i++) {
            const follower = party[i];
            if (!follower.sprite) continue;

            // Position directly behind leader at proper distance
            const positionX = leader.sprite.x - (i * this.followDistance);
            const positionY = leader.sprite.y;

            follower.sprite.setPosition(positionX, positionY);

            if (follower.indicator) {
                follower.indicator.setPosition(
                    follower.sprite.x,
                    follower.sprite.y - 40
                );
            }

            console.log(`  [${i}] ${follower.name} positioned at (${positionX}, ${positionY})`);
        }
    }
}

