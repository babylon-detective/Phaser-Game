import Phaser from "phaser";

export default class NpcManager {
    constructor(scene) {
        this.scene = scene;
        this.npcs = [];
        this.interactionRadius = 100; // Radius for NPC interaction
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
        this.npcs.forEach(npc => {
            if (npc.isInBattle) return; // Skip if already in battle

            const distance = Phaser.Math.Distance.Between(
                player.x, player.y,
                npc.x, npc.y
            );

            if (distance <= this.interactionRadius) {
                this.startBattle(npc);
            }
        });
    }

    startBattle(npc) {
        npc.isInBattle = true;
        
        // Store current scene state
        const currentSceneKey = this.scene.scene.key;
        
        // Launch BattleScene
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

        // Sleep current scene
        this.scene.scene.sleep(currentSceneKey);
        
        // Ensure BattleScene is on top and active
        this.scene.scene.bringToTop('BattleScene');
        this.scene.scene.setVisible(true, 'BattleScene');
        this.scene.scene.setActive(true, 'BattleScene');
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
