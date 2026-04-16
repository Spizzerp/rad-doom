# Phase 0 — Project Scaffolding (Agent 2 / Support)

## Context

You are **Agent 2 (Support)** on the Moon Doom project — a retro FPS built with Three.js + Colyseus + Vite. This is a greenfield project. Only the spec file `MOON_DOOM_SPEC.md` exists in the repo root.

Your job in Phase 0 is to scaffold the entire project so that **Agent 1 (Lead)** can begin building core gameplay immediately when Phase 1 starts. You work alone in this phase — Agent 1 is idle until you finish.

**Read&#x20;**`MOON_DOOM_SPEC.md`**&#x20;for full architecture details.** The "Project Structure" section (line ~266) is your primary reference.

***

## Goal

A fully scaffolded project where `npm run dev` in `client/` serves a blank page, the server scaffold exists and compiles, and all shared data files are populated and importable.

***

## File Ownership

You **create** everything listed below. You will **never** touch but you can read and should understand these files in later phases (Agent 1 owns them):

* `client/src/main.js`

* `client/src/player.js`

* `client/src/level.js`

* `client/src/enemies.js`

* `client/src/weapons-logic.js`

* `client/src/network.js`

* `client/src/minimap.js`

***

## Tasks

### 1. Initialize the Vite client project

```bash
cd /Users/nybllc/Doom
npm create vite@latest client -- --template vanilla
cd client
npm install three
npm install colyseus.js
```

The colyseus.js client SDK is installed now to avoid package.json conflicts in Phase 2.

### 2. Initialize the Colyseus server project

```bash
cd /Users/nybllc/Doom
npm create colyseus-app@latest ./server
```

Follow prompts to create a TypeScript Colyseus app. Default port 2567. Ensure `npm run build` and `npm start` work in the server directory. If the scaffolder doesn't work cleanly, manually create:

```text
server/
├── src/
│   ├── rooms/
│   │   ├── GameRoom.ts        # Empty placeholder class extending Room
│   │   └── schema/
│   │       └── GameState.ts   # Empty placeholder
│   ├── game/
│   │   ├── level.ts           # Empty placeholder
│   │   ├── enemy-ai.ts        # Empty placeholder
│   │   └── combat.ts          # Empty placeholder
│   └── index.ts               # Server entry point
├── package.json
└── tsconfig.json
```

Install Colyseus dependencies:

```bash
cd server
npm install @colyseus/core @colyseus/ws-transport @colyseus/schema express
npm install -D typescript @types/express ts-node-dev
```

### 3. Create shared module directory

```bash
mkdir -p /Users/nybllc/Doom/shared
```

### 4. Create `shared/constants.js`

All gameplay constants extracted from the spec. Both client and server import from this file.

```javascript
// shared/constants.js
// Gameplay constants — single source of truth for client and server

// Grid & Level
export const CELL_SIZE = 4;           // World units per grid cell
export const WALL_HEIGHT = 4;         // Height of wall geometry

// Player
export const PLAYER_SPEED = 8;        // Units per second
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_START_AMMO = 50;
export const JUMP_VELOCITY = 6;
export const GRAVITY = 9.8 * 0.6;     // Moon gravity (0.6x Earth)
export const PLAYER_HEIGHT = 1.6;     // Camera Y position
export const HEAD_BOB_SPEED = 10;
export const HEAD_BOB_AMPLITUDE = 0.05;

// Enemies
export const ENEMY_SPEED = 3;         // Units per second
export const ENEMY_HEALTH = 100;
export const ENEMY_DAMAGE = 10;       // Damage per attack
export const ENEMY_ATTACK_RANGE = 2;  // Units
export const ENEMY_DETECT_RANGE = 15; // Units — triggers chase
export const ENEMY_ATTACK_COOLDOWN = 1.0; // Seconds between attacks

// Combat
export const BLASTER_DAMAGE = 25;
export const BLASTER_FIRE_RATE = 0.3; // Seconds between shots
export const BLASTER_AMMO_COST = 1;

// Pickups
export const HEALTH_PICKUP_AMOUNT = 25;
export const AMMO_PICKUP_AMOUNT = 15;
export const PICKUP_RESPAWN_TIME = 30; // Seconds

// Respawn
export const RESPAWN_TIME = 3;        // Seconds

// Multiplayer
export const SERVER_TICK_RATE = 20;   // Hz (50ms intervals)
export const SERVER_PORT = 2567;

// Rendering
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 1000;
export const AMBIENT_LIGHT_COLOR = 0x333344;
export const BACKGROUND_COLOR = 0x000011;
```

### 5. Create `shared/level-data.js`

Level grid from the spec (lines 72–91), plus spawn/placement data.

```javascript
// shared/level-data.js
// Level definitions — used by both client (rendering) and server (collision/spawns)

// 0 = empty, 1 = standard wall, 2 = door, 3 = window/transparent
export const LEVEL_01 = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Grid coordinates (not world coordinates) — multiply by CELL_SIZE for world position
export const SPAWN_POINTS = [
  { x: 2, z: 2 },
  { x: 13, z: 2 },
  { x: 2, z: 13 },
  { x: 13, z: 13 },
];

export const ENEMY_SPAWNS = [
  { x: 8, z: 4, type: 'grunt' },
  { x: 4, z: 8, type: 'grunt' },
  { x: 11, z: 8, type: 'grunt' },
  { x: 8, z: 12, type: 'grunt' },
];

export const PICKUP_SPAWNS = [
  { x: 7, z: 7, type: 'health' },
  { x: 8, z: 8, type: 'ammo' },
  { x: 1, z: 1, type: 'health' },
  { x: 14, z: 14, type: 'ammo' },
];

// Utility: check if a grid cell is a wall (blocking)
export function isWall(level, gridX, gridZ) {
  if (gridX < 0 || gridZ < 0 || gridX >= level[0].length || gridZ >= level.length) {
    return true; // Out of bounds = wall
  }
  return level[gridZ][gridX] === 1;
}
```

### 6. Create `client/index.html`

Replace the Vite default `index.html` with the game HTML including all HUD/overlay elements.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Moon Doom</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <!-- Three.js canvas is appended here by the renderer -->
  <div id="game-container"></div>

  <!-- Click-to-play overlay (shown before PointerLock) -->
  <div id="start-overlay">
    <h1>MOON DOOM</h1>
    <p>Click to play</p>
  </div>

  <!-- Crosshair -->
  <div id="crosshair">+</div>

  <!-- HUD overlay -->
  <div id="hud">
    <div id="hud-health">
      <span class="hud-label">HEALTH</span>
      <span id="health-value">100</span>
    </div>
    <div id="hud-ammo">
      <span class="hud-label">AMMO</span>
      <span id="ammo-value">50</span>
    </div>
    <div id="hud-score">
      <span class="hud-label">SCORE</span>
      <span id="score-value">0</span>
    </div>
  </div>

  <!-- Weapon sprite overlay -->
  <div id="weapon-container">
    <div id="weapon-sprite"></div>
  </div>

  <!-- Damage flash overlay -->
  <div id="damage-flash"></div>

  <!-- Death screen -->
  <div id="death-screen" style="display: none;">
    <h2>YOU DIED</h2>
    <p>Respawning...</p>
  </div>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### 7. Create `client/style.css`

Base styles, crosshair, HUD layout, weapon overlay, damage flash.

```css
/* client/style.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
  background: #000;
  font-family: 'Courier New', monospace;
  color: #fff;
  cursor: none;
}

#game-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}

#game-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* Start overlay */
#start-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 17, 0.9);
  z-index: 100;
  cursor: pointer;
}

#start-overlay h1 {
  font-size: 4rem;
  color: #ff4444;
  text-shadow: 0 0 20px #ff0000;
  margin-bottom: 1rem;
  letter-spacing: 0.3em;
}

#start-overlay p {
  font-size: 1.5rem;
  color: #aaa;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Crosshair */
#crosshair {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  color: #0f0;
  text-shadow: 0 0 4px #0f0;
  z-index: 10;
  pointer-events: none;
  display: none; /* shown when pointer is locked */
}

/* HUD */
#hud {
  position: fixed;
  bottom: 20px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 40px;
  z-index: 10;
  pointer-events: none;
  display: none; /* shown when game is active */
}

#hud-health, #hud-ammo, #hud-score {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hud-label {
  font-size: 0.7rem;
  color: #888;
  letter-spacing: 0.2em;
}

#health-value {
  font-size: 2rem;
  color: #ff4444;
  text-shadow: 0 0 8px #ff0000;
}

#ammo-value {
  font-size: 2rem;
  color: #ffaa00;
  text-shadow: 0 0 8px #ff8800;
}

#score-value {
  font-size: 2rem;
  color: #44ff44;
  text-shadow: 0 0 8px #00ff00;
}

/* Weapon overlay */
#weapon-container {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  z-index: 5;
  pointer-events: none;
  display: none; /* shown when game is active */
}

#weapon-sprite {
  width: 100%;
  height: 100%;
  background: linear-gradient(to top, #444 0%, #666 40%, transparent 100%);
  clip-path: polygon(30% 100%, 70% 100%, 55% 20%, 50% 0%, 45% 20%);
}

/* Damage flash */
#damage-flash {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 0, 0, 0);
  z-index: 20;
  pointer-events: none;
  transition: background 0.1s ease-out;
}

#damage-flash.active {
  background: rgba(255, 0, 0, 0.3);
}

/* Death screen */
#death-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(100, 0, 0, 0.7);
  z-index: 50;
}

#death-screen h2 {
  font-size: 3rem;
  color: #ff0000;
  text-shadow: 0 0 20px #ff0000;
}

#death-screen p {
  font-size: 1rem;
  color: #ccc;
  margin-top: 1rem;
}
```

### 8. Configure `client/vite.config.js`

Add a WebSocket proxy for Colyseus so the client can reach the game server during development.

```javascript
// client/vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/colyseus': {
        target: 'http://localhost:2567',
        ws: true,
        rewrite: (path) => path.replace(/^\/colyseus/, ''),
      },
    },
  },
});
```

### 9. Create empty client source stubs

Create empty placeholder files so imports don't fail when Agent 1 starts. These are just empty ES module files — Agent 1 and Agent 2 will fill them in during Phase 1.

```bash
# Files Agent 1 will fill in Phase 1:
touch client/src/main.js
touch client/src/player.js
touch client/src/level.js
touch client/src/enemies.js
touch client/src/weapons-logic.js

# Files Agent 2 (you) will fill in Phase 1:
touch client/src/hud.js
touch client/src/audio.js
touch client/src/weapons-visuals.js

# File Agent 1 will fill in Phase 2:
touch client/src/network.js
```

### 10. Create assets directory

```bash
mkdir -p client/src/assets
```

### 11. Delete Vite boilerplate

Remove the default Vite template files that we don't need:

```bash
rm -f client/src/counter.js client/src/main.js client/src/style.css client/javascript.svg
```

(We replaced `style.css` and `index.html` with our own. Re-create the empty `client/src/main.js` stub after deletion.)

***

## Verification

Before declaring Phase 0 complete:

1. **Client starts**: `cd client && npm run dev` — opens in browser, shows the "MOON DOOM / Click to play" overlay on a black background

2. **Shared imports work**: Temporarily add `import { CELL_SIZE } from '../../shared/constants.js'; console.log(CELL_SIZE);` to `client/src/main.js` — verify `4` appears in console

3. **Server compiles**: `cd server && npm run build` (or `npx tsc --noEmit`) — no TypeScript errors

4. **Directory structure matches**: All directories and placeholder files exist per the project structure in the spec

Once verified, **notify Agent 1 that Phase 0 is complete** and proceed to your Phase 1 tasks in `docs/PHASE_1_SUPPORT.md`.

⠀