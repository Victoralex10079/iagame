// Extend Phaser TextureManager to support dynamic color key transparency and sheet conversion
Phaser.Textures.TextureManager.prototype.addKeyed = function (newKey, sourceKey, colorHex) {
    const sourceTexture = this.get(sourceKey);
    const image = sourceTexture.getSourceImage();

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

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

Phaser.Textures.TextureManager.prototype.addSpriteSheetFromSheet = function (newKey, sourceKey, config) {
    const sourceTexture = this.get(sourceKey);
    const sourceImage = sourceTexture.getSourceImage();
    return this.addSpriteSheet(newKey, sourceImage, config);
};

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

        // 3. Generate ground texture (dark grid texture with neon pink top edge)
        const groundGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        groundGraphics.fillStyle(0x0f172a, 1);
        groundGraphics.fillRect(0, 0, 800, 64);
        // Grid pattern
        groundGraphics.lineStyle(1, 0x1e293b, 0.5);
        for (let i = 0; i < 800; i += 40) {
            groundGraphics.lineBetween(i, 0, i, 64);
        }
        for (let j = 0; j < 64; j += 20) {
            groundGraphics.lineBetween(0, j, 800, j);
        }
        // Top border pink neon lines
        groundGraphics.fillStyle(0xff007f, 1);
        groundGraphics.fillRect(0, 0, 800, 4);
        groundGraphics.fillStyle(0xffffff, 1);
        groundGraphics.fillRect(0, 0, 800, 1);

        groundGraphics.generateTexture('ground', 800, 64);

        // 4. Generate star/collectible texture (for decorative/retro flavor)
        const starGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        starGraphics.fillStyle(0xfacc15, 1);
        starGraphics.fillCircle(8, 8, 8);
        starGraphics.generateTexture('star', 16, 16);
    }

    create() {
        // Extrae la textura de 'player_raw', vuelve transparente el color negro puro (#000000)
        this.textures.addKeyed('player_transparent', 'player_raw', '#000000');

        // Convierte la textura transparente en un spritesheet de 563x768 píxeles
        this.textures.addSpriteSheetFromSheet('player', 'player_transparent', {
            frameWidth: 563,
            frameHeight: 768
        });

        // Setup static physics group for platforms/ground
        this.platforms = this.physics.add.staticGroup();

        // Place ground at the bottom
        this.platforms.create(400, 568, 'ground');

        // Create standard platforms
        this.platforms.create(600, 400, 'platform');
        this.platforms.create(200, 300, 'platform');
        this.platforms.create(550, 200, 'platform');

        // Create player sprite
        this.player = this.physics.add.sprite(100, 400, 'player');
        // Scale the giant sprite sheet frames (563x768) down to a layout-friendly 48x65 size (maintains ratio)
        this.player.setDisplaySize(48, 65);

        // Define 'walk' animation (frames 0 to 9)
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 9 }),
            frameRate: 12,
            repeat: -1
        });

        // Define 'idle' animation (frame 0)
        this.anims.create({
            key: 'idle',
            frames: [{ key: 'player', frame: 0 }],
            frameRate: 1
        });

        // Collide with the boundaries of the Phaser game screen
        this.player.setCollideWorldBounds(true);

        // Collisions between player and static platforms
        this.physics.add.collider(this.player, this.platforms);

        // Setup cursors for keyboard control (Arrows)
        this.cursors = this.input.keyboard.createCursorKeys();

        // Setup Spacebar key for jumping
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // --- Physics Movement Parameters ---
        this.ACCELERATION = 900;       // Horizontal acceleration speed
        this.DRAG = 750;               // Sliding drag (inertia) when keys are released
        this.MAX_SPEED_X = 280;        // Max horizontal running speed
        this.JUMP_SPEED = -250;        // Initial jump impulse (upwards force)
        this.MAX_JUMP_HOLD_TIME = 220; // Maximum duration (ms) the jump button can boost height

        // State tracking
        this.isJumping = false;        // Indicates if we are currently holding the jump key for boost
        this.jumpTimer = 0;            // Accumulator for holding the jump key

        // Configure player body constraints
        this.player.setMaxVelocity(this.MAX_SPEED_X, 600); // Caps horizontal speed and terminal fall velocity
        this.player.setDragX(this.DRAG);                   // Applies passive resistance to simulate inertia

        // Debug/Telemetry Info text
        this.uiPanel = this.add.graphics();
        this.uiPanel.fillStyle(0x0f172a, 0.75);
        this.uiPanel.fillRoundedRect(10, 10, 320, 120, 8);
        this.uiPanel.lineStyle(1, 0xff007f, 0.5);
        this.uiPanel.strokeRoundedRect(10, 10, 320, 120, 8);

        this.telemetryText = this.add.text(20, 20, '', {
            fontSize: '12px',
            fontFamily: 'monospace',
            fill: '#ffffff'
        });
    }

    update(time, delta) {
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

        // --- 3. TELEMETRY DISPLAY UPDATE ---
        const state = this.player.body.touching.down ? 'On Ground' : (this.player.body.velocity.y < 0 ? 'Jumping' : 'Falling');
        this.telemetryText.setText([
            `State:        ${state}`,
            `Velocity X:   ${Math.round(this.player.body.velocity.x)} px/s`,
            `Velocity Y:   ${Math.round(this.player.body.velocity.y)} px/s`,
            `Acceleration: ${this.player.body.acceleration.x} px/s²`,
            `Jump Timer:   ${Math.round(this.jumpTimer)}ms / ${this.MAX_JUMP_HOLD_TIME}ms`,
            `Hold Active:  ${this.isJumping}`
        ]);
    }
}

// Config instance
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#0c1020',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false // Set to true to view boundaries and collision vectors
        }
    },
    scene: PlatformerScene
};

// Instantiate the game
const game = new Phaser.Game(config);
