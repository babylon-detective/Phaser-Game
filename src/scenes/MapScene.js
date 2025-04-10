import Phaser from "phaser";

export default class MapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MapScene' });
        // Simple color palette for different tile types
        this.tilePalette = {
            'TX Sea': 0x0066cc,        // Blue
            'TX Tileset Grass': 0x33cc33,  // Green
            'TX Tileset Stone Ground': 0x999999, // Gray
            'TX Tileset Wall': 0x663300,   // Brown
            'TX Props': 0xffff00,      // Yellow
        };
    }

    init(data) {
        console.log('[MapScene] Init with data:', data);
        this.playerPosition = data.playerPosition;
        this.worldScene = this.scene.get('WorldScene');
    }

    create() {
        console.log('[MapScene] Creating scene');
        
        // 1. First, let's verify we can access the tilemap
        const tilemap = this.worldScene.map;
        if (!tilemap) {
            console.error('[MapScene] No tilemap found!');
            return;
        }

        // 2. Log tilemap information
        console.log('[MapScene] Tilemap info:', {
            width: tilemap.width,
            height: tilemap.height,
            layers: tilemap.layers.map(l => l.name)
        });

        // Add basic UI elements
        this.add.text(10, 10, 'Map Scene (Press M to close)', {
            fontSize: '16px',
            color: '#ffffff'
        });

        // Draw only one map
        this.drawMinimap(tilemap);

        // Add M key handler
        this.input.keyboard.on('keydown-M', () => {
            console.log('[MapScene] Closing map');
            this.scene.resume('WorldScene');
            this.scene.stop();
        });
    }

    drawMainMap(tilemap) {
        // Main map settings
        const tileSize = 4;
        const mapWidth = tilemap.width * tileSize;
        const mapHeight = tilemap.height * tileSize;
        const centerX = this.cameras.main.centerX - (mapWidth / 2);
        const centerY = this.cameras.main.centerY - (mapHeight / 2);

        const mapGraphics = this.add.graphics();
        
        // Draw border
        mapGraphics.lineStyle(2, 0xffffff);
        mapGraphics.strokeRect(centerX - 2, centerY - 2, mapWidth + 4, mapHeight + 4);

        // Draw layers
        tilemap.layers.forEach(layer => {
            for (let y = 0; y < tilemap.height; y++) {
                for (let x = 0; x < tilemap.width; x++) {
                    const tile = layer.data[y][x];
                    if (tile && tile.index !== -1) {
                        const color = this.tilePalette[tile.tileset.name] || 0xcccccc;
                        mapGraphics.fillStyle(color, 1);
                        mapGraphics.fillRect(
                            centerX + (x * tileSize),
                            centerY + (y * tileSize),
                            tileSize,
                            tileSize
                        );
                    }
                }
            }
        });

        // Draw player on main map
        if (this.playerPosition) {
            const playerX = centerX + (this.playerPosition.x / tilemap.tileWidth) * tileSize;
            const playerY = centerY + (this.playerPosition.y / tilemap.tileHeight) * tileSize;
            mapGraphics.lineStyle(2, 0x000000);
            mapGraphics.fillStyle(0xffffff);
            mapGraphics.fillCircle(playerX, playerY, 3);
            mapGraphics.strokeCircle(playerX, playerY, 3);
        }
    }

    drawMinimap(tilemap) {
        // Minimap settings - significantly increased size
        const tileSize = 8; // Increased from 1 to 8 pixels per tile
        const minimapWidth = tilemap.width * tileSize;
        const minimapHeight = tilemap.height * tileSize;
        
        // Center the map in the viewport
        const minimapX = this.cameras.main.centerX - (minimapWidth / 2);
        const minimapY = this.cameras.main.centerY - (minimapHeight / 2);

        const minimapGraphics = this.add.graphics();
        
        // Draw minimap background with larger border and glow effect
        minimapGraphics.lineStyle(4, 0xffffff, 0.5); // Outer glow
        minimapGraphics.strokeRect(minimapX - 4, minimapY - 4, minimapWidth + 8, minimapHeight + 8);
        minimapGraphics.lineStyle(2, 0xffffff); // Inner border
        minimapGraphics.strokeRect(minimapX - 2, minimapY - 2, minimapWidth + 4, minimapHeight + 4);
        minimapGraphics.fillStyle(0x000000, 0.7);
        minimapGraphics.fillRect(minimapX, minimapY, minimapWidth, minimapHeight);

        // Draw minimap layers with enhanced visibility
        tilemap.layers.forEach((layer, index) => {
            // Add slight transparency for layering effect
            const alpha = 1 - (index * 0.1);
            for (let y = 0; y < tilemap.height; y++) {
                for (let x = 0; x < tilemap.width; x++) {
                    const tile = layer.data[y][x];
                    if (tile && tile.index !== -1) {
                        const color = this.tilePalette[tile.tileset.name] || 0xcccccc;
                        minimapGraphics.fillStyle(color, alpha);
                        minimapGraphics.fillRect(
                            minimapX + (x * tileSize),
                            minimapY + (y * tileSize),
                            tileSize,
                            tileSize
                        );
                    }
                }
            }
        });

        // Draw grid for better visibility
        minimapGraphics.lineStyle(1, 0xffffff, 0.1);
        for (let x = 0; x <= tilemap.width; x++) {
            minimapGraphics.beginPath();
            minimapGraphics.moveTo(minimapX + (x * tileSize), minimapY);
            minimapGraphics.lineTo(minimapX + (x * tileSize), minimapY + minimapHeight);
            minimapGraphics.strokePath();
        }
        for (let y = 0; y <= tilemap.height; y++) {
            minimapGraphics.beginPath();
            minimapGraphics.moveTo(minimapX, minimapY + (y * tileSize));
            minimapGraphics.lineTo(minimapX + minimapWidth, minimapY + (y * tileSize));
            minimapGraphics.strokePath();
        }

        // Draw player on minimap with enhanced visibility
        if (this.playerPosition) {
            const playerX = minimapX + (this.playerPosition.x / tilemap.tileWidth) * tileSize;
            const playerY = minimapY + (this.playerPosition.y / tilemap.tileHeight) * tileSize;
            
            // Add player glow effect
            minimapGraphics.lineStyle(6, 0xffffff, 0.3);
            minimapGraphics.strokeCircle(playerX, playerY, 8);
            minimapGraphics.lineStyle(4, 0xffffff, 0.5);
            minimapGraphics.strokeCircle(playerX, playerY, 6);
            
            // Draw player marker
            minimapGraphics.lineStyle(2, 0x000000);
            minimapGraphics.fillStyle(0xffffff);
            minimapGraphics.fillCircle(playerX, playerY, 4);
            minimapGraphics.strokeCircle(playerX, playerY, 4);
        }

        // Add enhanced minimap label - centered above the map
        const label = this.add.text(minimapX + (minimapWidth / 2), minimapY - 30, 'Map View', {
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        label.setOrigin(0.5, 0); // Center the text above the map
    }
}