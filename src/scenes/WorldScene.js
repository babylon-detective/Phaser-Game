import Phaser from "phaser";

import SaveState from "../SaveState";
import PlayerManager from "../managers/PlayerManager";
import NpcManager from "../managers/NpcManager";
import MapScene from "./MapScene";

export default class WorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WorldScene' });
    }

    init(data) {
        console.log('WorldScene init with data:', data);
        // Store return position if coming back from battle
        this.returnPosition = data?.returnPosition || null;
        this.resumeFromBattle = data?.resumeFromBattle || false;
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

        // Define a large world size
        const worldWidth = 2500; // Example width
        const worldHeight = 2000; // Example height

        // Tilemap setup
        this.map = this.make.tilemap({ key: 'map' });
        const tilesetGrass = this.map.addTilesetImage('TX Tileset Grass', 'tilesGrass', 32, 32, 0, 0);
        const tilesetStoneGround = this.map.addTilesetImage('TX Tileset Stone Ground', 'tilesStoneGround');
        const tilesetWall = this.map.addTilesetImage('TX Tileset Wall', 'tilesWall');
        const tilesetStruct = this.map.addTilesetImage('TX Struct', 'tilesStruct');
        const tilesetProps = this.map.addTilesetImage('TX Props', 'tilesProps');
        const tilesetPlants = this.map.addTilesetImage('TX Plants', 'tilesPlants');

        const groundLayer = this.map.createLayer('Ground', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        const wallsLayer = this.map.createLayer('Walls', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        const plantsLayer = this.map.createLayer('Plants', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        const propsLayer = this.map.createLayer('Props', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);

        // Move the tilemap layers to the desired position
        const offsetX = 50; // Example offset
        const offsetY = 50; // Example offset
        groundLayer.setPosition(offsetX, offsetY);
        wallsLayer.setPosition(offsetX, offsetY);
        plantsLayer.setPosition(offsetX, offsetY);
        propsLayer.setPosition(offsetX, offsetY);

        // Set world and camera bounds using worldWidth and worldHeight
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        // Center the camera on the map
        this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);

        // Log dimensions for debugging
        console.log(`World dimensions: ${worldWidth}x${worldHeight}`);
        console.log(`Camera position: ${this.cameras.main.scrollX}, ${this.cameras.main.scrollY}`);

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
            this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
        }

        // ---- NPC MANAGER ----
        this.npcManager = new NpcManager(this);
        this.npcManager.create(); // Call create to initialize NPCs

        // Save button
        const saveLocation = this.add.text(100, 200, 'Save Location', { fontSize: '24px', fill: '#fff' }).setInteractive();
        saveLocation.on('pointerdown', () => {
            SaveState.save({ scene: 'WorldScene', data: { x: 100, y: 200 } });
        });

        // Basic text
        this.add.text(100, 100, 'World View', { fontSize: '32px', fill: '#fff' });

        function adjustCameraForDevice() {
            const width = window.innerWidth;
            const height = window.innerHeight;

            if (width < 600) {
                // Mobile portrait
                this.cameras.main.setZoom(0.5);
            } else if (width < 900) {
                // Mobile landscape or small tablet
                this.cameras.main.setZoom(0.75);
            } else {
                // Tablet or desktop
                this.cameras.main.setZoom(1);
            }
        }

        window.addEventListener('resize', adjustCameraForDevice.bind(this));
        adjustCameraForDevice.call(this);
    
        // Set up M key to open the map
        this.input.keyboard.on('keydown-M', () => {
            this.scene.pause();
            this.scene.launch('MapScene', {
                playerPosition: this.playerManager.getPlayerPosition()
            });
        });
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

    wake(sys, data) {
        console.log('WorldScene wake with data:', data);
        if (data?.returnPosition && this.playerManager?.player) {
            this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
            this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
        }
    }

    resume(sys, data) {
        console.log('WorldScene resume with data:', data);
        if (data?.returnPosition && this.playerManager?.player) {
            this.playerManager.player.setPosition(data.returnPosition.x, data.returnPosition.y);
            this.cameras.main.centerOn(data.returnPosition.x, data.returnPosition.y);
        }
    }

    pause() {
        console.log('WorldScene paused');
        // Optional: Pause any ongoing animations or timers
    }

    sleep() {
        console.log('WorldScene sleep');
        // Optional: Clean up any resources that shouldn't persist while sleeping
    }

    shutdown() {
        console.log('WorldScene shutdown');
        // Clean up any resources that shouldn't persist after shutdown
        if (this.playerManager) {
            // Clean up player manager resources
            this.playerManager = null;
        }
        if (this.npcManager) {
            // Clean up NPC manager resources
            this.npcManager = null;
        }
        
        // Call parent shutdown
        super.shutdown();
    }

    startBattle(npcData) {
        this.scene.start('BattleScene', {
            playerData: this.playerManager.getPlayerData(),
            npcData: npcData // Pass the npcData including triggerRadius
        });
    }
}
