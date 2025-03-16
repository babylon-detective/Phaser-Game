import Phaser from "phaser";

import SaveState from "../SaveState";
import PlayerManager from "../managers/PlayerManager";
import NpcManager from "../managers/NpcManager";

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WorldScene' });
    }

    init(data) {
        console.log('WorldScene init with data:', data);
        // Store return position if coming back from battle
        this.returnPosition = data?.returnPosition || null;
    }

    preload() {
        this.load.image('tilesGrass', '/assets/tilesets/TX Tileset Grass.png');
        this.load.image('tilesStoneGround', '/assets/tilesets/TX Tileset Stone Ground.png');
        this.load.image('tilesWall', '/assets/tilesets/TX Tileset Wall.png');
        this.load.image('tilesStruct', '/assets/tilesets/TX Struct.png');
        this.load.image('tilesProps', '/assets/tilesets/TX Props.png');
        this.load.image('tilesPlants', '/assets/tilesets/TX Plants.png');
        this.load.tilemapTiledJSON('map', '/assets/tilemaps/TownScene.tmj');
    }

    create() {
        console.log('WorldScene create');
        // Tilemap setup
        const map = this.make.tilemap({ key: 'map' });
        const tilesetGrass = map.addTilesetImage('TX Tileset Grass', 'tilesGrass', 32, 32, 0, 0);
        const tilesetStoneGround = map.addTilesetImage('TX Tileset Stone Ground', 'tilesStoneGround');
        const tilesetWall = map.addTilesetImage('TX Tileset Wall', 'tilesWall');
        const tilesetStruct = map.addTilesetImage('TX Struct', 'tilesStruct');
        const tilesetProps = map.addTilesetImage('TX Props', 'tilesProps');
        const tilesetPlants = map.addTilesetImage('TX Plants', 'tilesPlants');

        map.createLayer('Ground', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        map.createLayer('Walls', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        map.createLayer('Plants', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        map.createLayer('Props', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);

        // Camera scaling
        const scaleX = this.cameras.main.width / map.widthInPixels;
        const scaleY = this.cameras.main.height / map.heightInPixels;
        const scale = Math.min(scaleX, scaleY);

        this.cameras.main.setZoom(scale);

        // ---- PLAYER MANAGER ----
        this.playerManager = new PlayerManager(this);
        this.playerManager.create(); // sets up the player

        // Position player and camera
        if (this.returnPosition && this.playerManager.player) {
            console.log('Setting player position to returnPosition:', this.returnPosition);
            this.playerManager.player.setPosition(this.returnPosition.x, this.returnPosition.y);
            this.cameras.main.centerOn(this.returnPosition.x, this.returnPosition.y);
        } else {
            console.log('Centering camera on map center');
            this.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
        }

        // ---- NPC MANAGER ----
        this.npcManager = new NpcManager(this);

        // Example NPC spawns
        this.npcManager.spawnNPC(map.tileToWorldX(10), map.tileToWorldY(8));
        this.npcManager.spawnNPC(500, 350);
        this.npcManager.spawnNPC(1200, 350);
        this.npcManager.spawnNPC(0,0); 
        this.npcManager.spawnNPC(1000,1000);

        // Save button
        const saveLocation = this.add.text(100, 200, 'Save Location', { fontSize: '24px', fill: '#fff' }).setInteractive();
        saveLocation.on('pointerdown', () => {
            SaveState.save({ scene: 'WorldScene', data: { x: 100, y: 200 } });
        });

         // Basic text
         this.add.text(100, 100, 'World View', { fontSize: '32px', fill: '#fff' });
    }

    update() {
        // Player update
        this.playerManager?.update();

        // NPC update
        this.npcManager?.update();

        // Check for NPC interactions
        if (this.playerManager && this.playerManager.player) {
            this.npcManager.checkInteraction(this.playerManager.player);
        }
    }
}
