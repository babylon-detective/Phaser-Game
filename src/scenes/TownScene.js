import Phaser from "phaser";
import SaveState from "../SaveState";
import PlayerScene from "./PlayerScene";

export default class TownScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TownScene' });
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
        this.add.text(100, 100, 'Town View', { fontSize: '32px', fill: '#fff' });

        const map = this.make.tilemap({ key: 'map' });
        const tilesetGrass = map.addTilesetImage('TX Tileset Grass', 'tilesGrass', 32, 32, 0, 0);
        const tilesetStoneGround = map.addTilesetImage('TX Tileset Stone Ground', 'tilesStoneGround');
        const tilesetWall = map.addTilesetImage('TX Tileset Wall', 'tilesWall');
        const tilesetStruct = map.addTilesetImage('TX Struct', 'tilesStruct');
        const tilesetProps = map.addTilesetImage('TX Props', 'tilesProps');
        const tilesetPlants = map.addTilesetImage('TX Plants', 'tilesPlants');

        const groundLayer = map.createLayer('Ground', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        const wallsLayer = map.createLayer('Walls', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        const plantsLayer = map.createLayer('Plants', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);
        const propsLayer = map.createLayer('Props', [tilesetGrass, tilesetStoneGround, tilesetWall, tilesetStruct, tilesetProps, tilesetPlants]);

        const scaleX = this.cameras.main.width / map.widthInPixels;
        const scaleY = this.cameras.main.height / map.heightInPixels;
        const scale = Math.min(scaleX, scaleY);
        
        // Apply zoom to fit the map correctly
        this.cameras.main.setZoom(scale);
        // this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;
    this.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

        this.scene.launch('PlayerScene');
        const playerScene = this.scene.get('PlayerScene');

        playerScene.events.once('playerCreated', (player) => {
            this.cameras.main.startFollow(player, true, 0.05, 0.05);
        });

        const saveLocation = this.add.text(100, 200, 'Save Location', { fontSize: '24px', fill: '#fff' }).setInteractive();
        saveLocation.on('pointerdown', () => {
            SaveState.save({ scene: 'TownScene', data: { x: 100, y: 200 } });
        });
    }

    update() {
        const playerScene = this.scene.get('PlayerScene');
        if (playerScene && playerScene.update) {
            playerScene.update();
        }
    }
}
