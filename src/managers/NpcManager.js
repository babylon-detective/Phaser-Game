import Phaser from "phaser";

export default class NpcManager {
    constructor(scene) {
        this.scene = scene;
        this.npcs = [];
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

        this.npcs.push(npc);
    }

    update() {
        // Keep display object in sync with its physics body
        // this.npcs.forEach(npc => {
        //     npc.setPosition(npc.body.x, npc.body.y);
        // });
    }
}
