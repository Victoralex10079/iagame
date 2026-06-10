// Extend Phaser TextureManager to support dynamic color key transparency and sheet conversion
Phaser.Textures.TextureManager.prototype.addKeyed = function (newKey, sourceImage, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let rKey = 0, gKey = 0, bKey = 0;
    if (typeof colorHex === 'string') {
        const cleanHex = colorHex.replace('#', '').replace('0x', '');
        rKey = parseInt(cleanHex.substring(0, 2), 16);
        gKey = parseInt(cleanHex.substring(2, 4), 16);
        bKey = parseInt(cleanHex.substring(4, 6), 16);
    } else if (typeof colorHex === 'number') {
        rKey = (colorHex >> 16) & 255;
        gKey = (colorHex >> 8) & 255;
        bKey = colorHex & 255;
    }

    for (let i = 0; i < data.length; i += 4) {
        if (data[i] === rKey && data[i + 1] === gKey && data[i + 2] === bKey) {
            data[i + 3] = 0; // Set alpha to 0 for the transparent color key
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return this.addCanvas(newKey, canvas);
};

// Extend Phaser Texture to support slicing into spritesheet in-place
Phaser.Textures.Texture.prototype.addSpriteSheetFromSheet = function (config) {
    const source = this.source[0];
    Phaser.Textures.Parsers.SpriteSheet(this, 0, 0, 0, source.width, source.height, config);
    return this;
};

// --- SCENE 1: MAIN MENU SCENE ---
class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        // Black background
        this.cameras.main.setBackgroundColor('#000000');

        // Title text in neon cyan
        const titleText = this.add.text(400, 200, 'RETRO PLATFORMER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            fill: '#00f0ff'
        }).setOrigin(0.5);

        // Neon shadow glow effect
        titleText.setShadow(0, 0, '#ff007f', 15, true, true);

        // Subtitle
        this.add.text(400, 260, 'Demo de Físicas y Escenas', {
            fontFamily: 'Outfit',
            fontSize: '18px',
            fill: '#94a3b8'
        }).setOrigin(0.5);

        // PLAY Button
        const playButton = this.add.text(400, 380, 'PLAY', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: '#1e293b',
            padding: { x: 32, y: 16 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Hover animations
        playButton.on('pointerover', () => {
            playButton.setStyle({ fill: '#ff007f', backgroundColor: '#0f172a' });
            playButton.setScale(1.1);
        });

        playButton.on('pointerout', () => {
            playButton.setStyle({ fill: '#ffffff', backgroundColor: '#1e293b' });
            playButton.setScale(1.0);
        });

        // Click interaction
        playButton.on('pointerdown', () => {
            this.scene.start('PlatformerScene');
        });
    }
}

// --- SCENE 2: GAMEPLAY SCENE ---
class PlatformerScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlatformerScene' });
    }

    preload() {
        // 1. Load player raw image from assets folder for color keying
        this.load.image('player_raw', 'assets/Gemini_Generated_Image_8ty5jb8ty5jb8ty5.png');

        // 2. Generate floating platform texture (dark blue with neon blue top border)
        const platformGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        platformGraphics.fillStyle(0x1e293b, 0.9);
        platformGraphics.fillRect(0, 0, 400, 32);
        // Top border highlights
        platformGraphics.fillStyle(0x3b82f6, 1);
        platformGraphics.fillRect(0, 0, 400, 4);
        platformGraphics.fillStyle(0x00f0ff, 1);
        platformGraphics.fillRect(0, 0, 400, 1);

        platformGraphics.generateTexture('platform', 400, 32);

        // 3. Generate ground texture - 600px wide (reused to form pits)
        const groundGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        groundGraphics.fillStyle(0x0f172a, 1);
        groundGraphics.fillRect(0, 0, 600, 64);
        // Grid pattern
        groundGraphics.lineStyle(1, 0x1e293b, 0.5);
        for (let i = 0; i < 600; i += 40) {
            groundGraphics.lineBetween(i, 0, i, 64);
        }
        for (let j = 0; j < 64; j += 20) {
            groundGraphics.lineBetween(0, j, 600, j);
        }
        // Top border pink neon lines
        groundGraphics.fillStyle(0xff007f, 1);
        groundGraphics.fillRect(0, 0, 600, 4);
        groundGraphics.fillStyle(0xffffff, 1);
        groundGraphics.fillRect(0, 0, 600, 1);

        groundGraphics.generateTexture('ground', 600, 64);

        // 4. Generate retro-futuristic portal texture
        const portalGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        // Outer ellipse neon blue outline
        portalGraphics.lineStyle(3, 0x00f0ff, 1);
        portalGraphics.strokeEllipse(16, 24, 14, 22);
        // Mid ellipse cyan glow
        portalGraphics.lineStyle(1, 0x00ffff, 0.5);
        portalGraphics.strokeEllipse(16, 24, 11, 18);
        // Inner core fill neon pink
        portalGraphics.fillStyle(0xff007f, 0.85);
        portalGraphics.fillEllipse(16, 24, 8, 14);
        // Portal light highlight
        portalGraphics.fillStyle(0xffffff, 1);
        portalGraphics.fillCircle(16, 12, 2);
        portalGraphics.fillCircle(16, 36, 2);
        portalGraphics.generateTexture('star', 32, 48);

        // 5. Generate neon red spike texture
        const spikeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        spikeGraphics.fillStyle(0xff0055, 1); // Neon red
        // Draw a triangle spike pointing up
        spikeGraphics.fillTriangle(0, 32, 16, 0, 32, 32);
        // Add white neon borders
        spikeGraphics.lineStyle(2, 0xffffff, 1);
        spikeGraphics.strokeTriangle(0, 32, 16, 0, 32, 32);
        spikeGraphics.generateTexture('spike', 32, 32);

        // 6. Generate hazard wall texture (neon orange vertical barrier, 20x80 px)
        const hazardGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        hazardGraphics.fillStyle(0xffa500, 1); // Neon orange
        hazardGraphics.fillRect(0, 0, 20, 80);
        // Neon yellow borders
        hazardGraphics.lineStyle(2, 0xffff00, 1);
        hazardGraphics.strokeRect(0, 0, 20, 80);
        hazardGraphics.generateTexture('hazard_wall', 20, 80);
    }

    create() {
        // State tracking
        this.levelCompleted = false;

        // Extrae la textura de 'player_raw', vuelve transparente el color negro puro (#000000)
        let rawTexture = this.textures.get('player_raw');
        this.textures.addKeyed('player_clean', rawTexture.getSourceImage(), '#000000');

        // Convierte la textura transparente en un spritesheet de 563x768 píxeles
        this.textures.get('player_clean').addSpriteSheetFromSheet({
            frameWidth: 563,
            frameHeight: 768
        });

        // Configure physics world boundaries (4000px wide, 600px tall)
        this.physics.world.setBounds(0, 0, 4000, 600);

        // Setup static physics group for platforms/ground
        this.platforms = this.physics.add.staticGroup();

        // Place ground segments covering different areas across the 4000px layout
        this.platforms.create(300, 568, 'ground');   // Ground 1: covers 0 to 600px
        this.platforms.create(1200, 568, 'ground');  // Ground 2: covers 900 to 1500px
        this.platforms.create(2100, 568, 'ground');  // Ground 3: covers 1800 to 2400px
        this.platforms.create(3000, 568, 'ground');  // Ground 4: covers 2700 to 3300px
        this.platforms.create(3800, 568, 'ground');  // Ground 5: covers 3500 to 4100px (End zone)

        // Distribute floating platforms for staggered jumps and crossing pits across the 4000px level
        this.platforms.create(450, 400, 'platform'); // Platform 1 (Y: 400)
        this.platforms.create(750, 280, 'platform'); // Platform 2 (Y: 280)
        this.platforms.create(1050, 420, 'platform'); // Platform 3 (Y: 420)
        this.platforms.create(1350, 240, 'platform'); // Platform 4 (Y: 240)
        this.platforms.create(1650, 320, 'platform'); // Platform 5 (Y: 320)
        this.platforms.create(1950, 420, 'platform'); // Platform 6 (Y: 420)
        this.platforms.create(2200, 280, 'platform'); // Platform 7 (Y: 280)
        this.platforms.create(2550, 400, 'platform'); // Platform 8 (Y: 400)
        this.platforms.create(2850, 260, 'platform'); // Platform 9 (Y: 260)
        this.platforms.create(3150, 420, 'platform'); // Platform 10 (Y: 420)
        this.platforms.create(3450, 300, 'platform'); // Platform 11 (Y: 300)
        this.platforms.create(3750, 260, 'platform'); // Platform 12 (Y: 260)

        // Create player sprite
        this.player = this.physics.add.sprite(100, 400, 'player_clean');
        this.player.setScale(0.08);

        // Define 'walk' animation (frames 0 to 9)
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('player_clean', { start: 0, end: 9 }),
            frameRate: 12,
            repeat: -1
        });

        // Define 'idle' animation (frame 0)
        this.anims.create({
            key: 'idle',
            frames: [{ key: 'player_clean', frame: 0 }],
            frameRate: 1
        });

        // Collide with the boundaries of the Phaser game screen
        this.player.setCollideWorldBounds(true);

        // Collisions between player and static platforms
        this.physics.add.collider(this.player, this.platforms);

        // --- Camera Configuration ---
        // Bound camera boundaries to match world dimensions (4000px wide)
        this.cameras.main.setBounds(0, 0, 4000, 600);
        // Follow the player smoothly
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        // --- Obstacles: Spikes and Energy Walls ---
        this.spikes = this.physics.add.staticGroup();

        // Spikes on ground segments and platforms
        this.spikes.create(250, 520, 'spike');   // Ground segment 1
        this.spikes.create(1150, 520, 'spike');  // Ground segment 2
        this.spikes.create(2050, 520, 'spike');  // Ground segment 3
        this.spikes.create(2950, 520, 'spike');  // Ground segment 4
        this.spikes.create(3750, 520, 'spike');  // Ground segment 5
        this.spikes.create(450, 368, 'spike');   // Platform 1 (Y: 400)
        this.spikes.create(1650, 288, 'spike');  // Platform 5 (Y: 320)
        this.spikes.create(2850, 228, 'spike');  // Platform 9 (Y: 260)

        // Orange Hazard Walls on key platforms
        this.spikes.create(750, 224, 'hazard_wall');  // Platform 2 (Y: 280)
        this.spikes.create(1350, 184, 'hazard_wall'); // Platform 4 (Y: 240)
        this.spikes.create(2200, 224, 'hazard_wall'); // Platform 7 (Y: 280)
        this.spikes.create(3450, 244, 'hazard_wall'); // Platform 11 (Y: 300)

        // Add overlap checker for spikes (death penalty)
        this.physics.add.overlap(this.player, this.spikes, this.handleSpikeCollision, null, this);

        // --- Victory Goal ---
        // Place the goal portal near the end of the level at X: 3850
        this.goalStar = this.physics.add.staticSprite(3850, 220, 'star');

        // Add overlap checker for victory goal
        this.physics.add.overlap(this.player, this.goalStar, this.handleVictory, null, this);

        // Setup cursors for keyboard control (Arrows)
        this.cursors = this.input.keyboard.createCursorKeys();

        // Setup Spacebar key for jumping
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // --- Physics Movement Parameters ---
        this.ACCELERATION = 900;       // Horizontal acceleration speed
        this.DRAG = 750;               // Sliding drag (inertia) when keys are released
        this.MAX_SPEED_X = 320;        // Max horizontal running speed
        this.JUMP_SPEED = -360;        // Initial jump impulse (Balanced - reduced from -450)
        this.MAX_JUMP_HOLD_TIME = 220; // Maximum duration in ms (Balanced - reduced from 280ms)

        // State tracking
        this.isJumping = false;        // Indicates if we are currently holding the jump key for boost
        this.jumpTimer = 0;            // Accumulator for holding the jump key

        // Configure player body constraints
        this.player.setMaxVelocity(this.MAX_SPEED_X, 800); // Caps horizontal speed and terminal fall velocity
        this.player.setDragX(this.DRAG);                   // Applies passive resistance to simulate inertia
    }

    update(time, delta) {
        // Restart the scene via Game Over scene if the player falls off the bottom of the map (into a pit)
        if (this.player.y > 580) {
            this.player.body.enable = false; // Freeze player physics
            this.scene.start('GameOverScene');
            return;
        }

        // If level is completed, skip update logic (player is frozen)
        if (this.levelCompleted) return;

        // --- 1. HORIZONTAL MOVEMENT CONTROL WITH INERTIA ---
        if (this.cursors.left.isDown) {
            // Apply leftward acceleration
            this.player.setAccelerationX(-this.ACCELERATION);
            this.player.setFlipX(true); // Flip sprite to face left
            this.player.anims.play('walk', true);
        } else if (this.cursors.right.isDown) {
            // Apply rightward acceleration
            this.player.setAccelerationX(this.ACCELERATION);
            this.player.setFlipX(false); // Do not flip (face right)
            this.player.anims.play('walk', true);
        } else {
            // Apply 0 acceleration so setDragX takes care of deceleration slide
            this.player.setAccelerationX(0);
            this.player.anims.play('idle', true);
        }

        // --- 2. DYNAMIC VARIABLE JUMP HEIGHT LOGIC ---
        // Jump starts if the jump buttons (Up arrow OR Spacebar) are pressed and player is on the ground
        const jumpPressed = this.cursors.up.isDown || this.spaceKey.isDown;

        if (jumpPressed) {
            if (this.player.body.touching.down) {
                // Initial jump trigger
                this.player.setVelocityY(this.JUMP_SPEED);
                this.isJumping = true;
                this.jumpTimer = 0;
            } else if (this.isJumping) {
                // If jump key is held, accumulate elapsed time
                this.jumpTimer += delta;

                if (this.jumpTimer < this.MAX_JUMP_HOLD_TIME) {
                    // Sustain jump velocity against gravity
                    this.player.setVelocityY(this.JUMP_SPEED);
                } else {
                    // Hold limit reached, cancel further boost
                    this.isJumping = false;
                }
            }
        } else {
            // Player let go of jump key, stop applying boost immediately
            this.isJumping = false;
        }

        // Safety fallback: if player is starting to fall (Y velocity positive) or hits a ceiling, end jump boost
        if (this.player.body.velocity.y >= 0 || this.player.body.touching.up) {
            this.isJumping = false;
        }
    }

    handleSpikeCollision(player, spike) {
        // Freeze player physics and transfer flow to Game Over Scene
        this.player.body.enable = false;
        this.scene.start('GameOverScene');
    }

    handleVictory(player, goal) {
        if (this.levelCompleted) return;
        this.levelCompleted = true;

        // Freeze player movement
        this.player.setVelocity(0, 0);
        this.player.setAcceleration(0, 0);
        this.player.body.setEnable(false); // Disable physics body interactions
        this.player.anims.play('idle', true);

        // Display victory text centered on camera screen
        const victoryText = this.add.text(400, 300, '¡NIVEL COMPLETADO!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            fill: '#ff007f'
        })
            .setOrigin(0.5)
            .setScrollFactor(0); // Fixes text location on camera frame

        // Neon shadow glow effect
        victoryText.setShadow(0, 0, '#ffffff', 10, true, true);

        // Add a 3-second timer delay to return to MainMenuScene
        this.time.delayedCall(3000, () => {
            this.scene.start('MainMenuScene');
        });
    }
}

// --- SCENE 3: GAME OVER SCENE ---
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        // Flat black background
        this.cameras.main.setBackgroundColor('#000000');

        // GAME OVER text in neon pink
        const titleText = this.add.text(400, 250, 'GAME OVER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '40px',
            fill: '#ff007f'
        }).setOrigin(0.5);

        // White shadow glow
        titleText.setShadow(0, 0, '#ffffff', 10, true, true);

        // Keyboard press instructions
        this.add.text(400, 350, 'Presiona cualquier tecla para reintentar', {
            fontFamily: 'Outfit',
            fontSize: '18px',
            fill: '#94a3b8'
        }).setOrigin(0.5);

        // Listen for any key to transition back to the gameplay scene
        this.input.keyboard.once('keydown', () => {
            this.scene.start('PlatformerScene');
        });
    }
}

// Config instance
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false // Set to true to view boundaries and collision vectors
        }
    },
    scene: [MainMenuScene, PlatformerScene, GameOverScene]
};

// Instantiate the game
const game = new Phaser.Game(config);
