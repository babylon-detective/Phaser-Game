import Phaser from "phaser";

export default class NpcManager {
    constructor(scene) {
        this.scene = scene;
        this.npcs = [];
        this.interactionRadius = 100; // Radius for NPC interaction
        this.battleCooldown = false; // Add cooldown flag
        this.cooldownDuration = 4000; // 4 seconds cooldown
        this.isReturningFromBattle = false;
    }

    spawnNPC(worldX, worldY) {
        const npc = this.scene.add.rectangle(worldX, worldY, 32, 64, 0xff0000);
        this.scene.physics.add.existing(npc);

        if (npc.body) {
            npc.body.setImmovable(true);
            npc.body.setCollideWorldBounds(true);

            // Proper physics alignment
            // npc.body.setOffset(0, 0);
            // npc.body.setSize(32, 64);
            // // npc.body.setAllowGravity(false);
            // npc.body.setVelocity(0, 0);

            // // Manually set initial body position
            // npc.body.x = worldX;
            // npc.body.y = worldY;
        }

        // Add interaction circle (visual indicator)
        const interactionCircle = this.scene.add.circle(worldX, worldY, this.interactionRadius, 0x00ff00, 0.2);
        interactionCircle.setDepth(1); // Place above tilemap but below NPC
        
        // Store circle reference with NPC
        npc.interactionCircle = interactionCircle;
        npc.isInBattle = false; // Track battle state

        this.npcs.push(npc);
        return npc;
    }

    checkInteraction(player) {
        // Skip interaction check if on cooldown or returning from battle
        if (this.battleCooldown || this.isReturningFromBattle) {
            console.log('Interaction blocked: cooldown or returning from battle');
            return;
        }

        this.npcs.forEach(npc => {
            if (npc.isInBattle) {
                console.log('NPC already in battle, skipping');
                return;
            }

            const distance = Phaser.Math.Distance.Between(
                player.x, player.y,
                npc.x, npc.y
            );

            if (distance <= this.interactionRadius) {
                console.log('Starting battle with NPC');
                this.startBattle(npc);
            }
        });
    }

    startBattle(npc) {
        if (npc.isInBattle || this.battleCooldown || this.isReturningFromBattle) {
            console.log('Cannot start battle: NPC in battle, cooldown active, or returning from battle');
            return;
        }
        
        console.log('Setting battle cooldown and NPC state');
        npc.isInBattle = true;
        this.battleCooldown = true;
        
        // First pause the current WorldScene
        this.scene.scene.pause();
        
        // Then launch BattleScene
        this.scene.scene.launch('BattleScene', { 
            playerData: this.scene.playerManager.getPlayerData(),
            npcData: { 
                x: npc.x, 
                y: npc.y,
                health: 100,
                level: 1,
                type: 'enemy'
            }
        });
        
        // Make BattleScene active and visible
        this.scene.scene.bringToTop('BattleScene');
    }

    handleBattleEnd() {
        console.log('Handling battle end');
        this.isReturningFromBattle = true;
        this.battleCooldown = true;

        // Reset NPC battle states
        this.npcs.forEach(npc => {
            npc.isInBattle = false;
        });

        // Set a delayed call to reset the returning state and cooldown
        this.scene.time.delayedCall(this.cooldownDuration, () => {
            console.log('Battle cooldown and return state expired');
            this.isReturningFromBattle = false;
            this.battleCooldown = false;
        });
    }

    update() {
        // Keep display object in sync with its physics body
        // this.npcs.forEach(npc => {
        //     npc.setPosition(npc.body.x, npc.body.y);
        // });

        // Update interaction circles position
        this.npcs.forEach(npc => {
            if (npc.interactionCircle) {
                npc.interactionCircle.setPosition(npc.x, npc.y);
            }
        });
    }
}
