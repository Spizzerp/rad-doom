# Moon Doom — Project Specification v1.0

## Game Overview

Moon Doom is a retro-styled first-person shooter set on a lunar base overrun by aliens. The game pays homage to the visual and gameplay style of Doom (1993) — grid-based levels, billboard sprite enemies, pixelated textures, and fast-paced combat — but set in a sci-fi moon environment with alien enemies instead of demons. The game runs entirely in the web browser and supports real-time multiplayer via WebSockets.

---

## Technical Stack

### Core Rendering — Three.js

Three.js (latest stable via npm) is the rendering engine. It provides the abstraction layer over WebGL that makes this feasible in a short timeframe. The key modules are:

- **`THREE.PerspectiveCamera`** — the player's eyes. Field of view ~75, near plane 0.1, far plane 1000.
- **`PointerLockControls`** (from `three/addons/controls/PointerLockControls.js`) — wraps the browser Pointer Lock API to give full mouse-captured FPS camera control. This is the player controller. ~5 lines to set up.
- **`THREE.Raycaster`** — used for shooting mechanics (cast ray from camera center, check intersections with enemy sprites) and for future features like interactive doors or pickups.
- **`THREE.TextureLoader`** — loads wall/floor/sprite textures. Critical setting: `texture.magFilter = THREE.NearestFilter` on every texture to achieve the pixelated retro aesthetic.
- **`THREE.Sprite` / `THREE.SpriteMaterial`** — for enemy billboards. Sprites automatically face the camera, replicating how Doom rendered its monsters as 2D images in 3D space.
- **`THREE.BoxGeometry`** — walls are boxes generated from the level grid. Merge static geometry with `BufferGeometryUtils.mergeGeometries()` for performance.
- **`THREE.PlaneGeometry`** — floor and ceiling planes.

### Build Tool — Vite

Vite provides the dev server with hot module replacement (HMR). Initialize with `npm create vite@latest moon-doom -- --template vanilla` then `npm install three`. Run with `npm run dev`. No complex webpack config needed.

### Multiplayer — Colyseus

Colyseus is the authoritative multiplayer game server framework. It runs as a separate Node.js process alongside the Vite dev server.

- **Server**: handles game state (player positions, health, enemy states, projectiles), validates all movement and combat, broadcasts state deltas to clients.
- **Client SDK**: `colyseus.js` connects to the server, joins/creates rooms, and receives state updates. State changes trigger callbacks that update the Three.js scene.
- **Architecture**: authoritative server model — clients send input intentions ("I want to move forward"), server validates and updates state, clients render the result.
- **Room-based**: each game session is a "room." Players join via `client.joinOrCreate("moon-doom")`. Colyseus handles matchmaking automatically.
- **State sync**: define game state as a Colyseus Schema class. Modify properties on the server and Colyseus automatically detects changes, delta-compresses them, and broadcasts binary-encoded updates to all clients.
- **Setup**: `npm create colyseus-app@latest ./server` creates the server scaffold. Default port is 2567.

### Audio — jsfxr (Procedural)

jsfxr generates retro 8-bit sound effects programmatically at runtime. Zero audio files needed. Built-in presets cover all core needs: `laserShoot` for weapons, `explosion` for enemy deaths, `hitHurt` for taking damage, `powerUp` for pickups, `pickupCoin` for ammo/health. Available as npm package or web tool at sfxr.me for tuning custom sounds.

### Physics — None (Custom Grid Collision)

No physics engine. The original Doom didn't use one either. Collision detection is handled via the 2D level grid:

- Before moving the player, convert desired position to grid coordinates (`Math.floor(x)`, `Math.floor(z)`).
- Check if that cell in the map array is a wall (`1`). If so, block movement on that axis.
- Wall sliding: if diagonal movement is blocked, allow movement on whichever axis is clear.
- Enemy-player collision: simple distance checks between positions.
- Shooting: `THREE.Raycaster` from camera center, check intersections with enemy sprite objects.

This approach is O(1) per check and takes roughly 20 lines of code.

---

## Game Architecture

### The Game Loop

The game runs at ~60fps via `requestAnimationFrame`. Each frame executes three phases:

1. **Read Input** — check keyboard state (WASD/arrow keys for movement, Space for jump, mouse click for shoot) and mouse delta (for camera rotation, handled by PointerLockControls).
2. **Update State** — move player (with collision checks), update enemy AI (patrol/chase/attack state machines), process projectiles, apply gravity, check hit detection.
3. **Render** — `renderer.render(scene, camera)` draws the frame.

In multiplayer mode, steps 1 and 2 are split: the client reads input and sends it to the Colyseus server, the server runs the authoritative update, and the client receives the updated state and renders it.

### Level System — 2D Grid Array

Levels are defined as 2D JavaScript arrays where each number represents a tile type:

```javascript
// 0 = empty space, 1 = standard wall, 2 = door, 3 = window/transparent wall
const LEVEL_01 = [
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
```

The level generator loops through this array and places a `BoxGeometry` with the appropriate texture at each `1` position. Floor and ceiling are `PlaneGeometry` meshes at y=0 and y=WALL_HEIGHT respectively.

Each cell in the grid corresponds to a fixed world-space size (e.g., 4 units). Player coordinates map to grid coordinates via `gridX = Math.floor(worldX / CELL_SIZE)`.

### Player Model

The player is the camera itself in first-person view. Other players in multiplayer are represented as a simple colored mesh or sprite visible to opponents. Player state:

```javascript
{
  id: string,           // Colyseus session ID
  position: { x, y, z },
  rotation: { y },      // Horizontal look angle
  health: 100,
  maxHealth: 100,
  ammo: 50,
  score: 0,
  alive: true,
  currentWeapon: 'blaster'
}
```

### Enemy AI — State Machine

Each enemy runs a simple state machine with three states:

- **Idle/Patrol**: enemy wanders between waypoints or stands still. Checks line-of-sight to all players each frame.
- **Chase**: enemy has detected a player (within range + line-of-sight). Moves toward the target player at chase speed. Switches back to Idle if player leaves range.
- **Attack**: enemy is within attack range. Deals damage on a cooldown timer. Plays attack animation.

Enemy state is managed on the Colyseus server in multiplayer mode. The server runs the AI tick and broadcasts updated enemy positions/states to all clients.

### Combat System

- **Player shoots**: client sends "shoot" event with camera direction to server. Server casts a ray from the player's position in that direction, checks intersections with enemy hitboxes and other players. Applies damage to the first hit. Returns hit result to client for visual feedback (muzzle flash, hit marker, blood splat).
- **Enemy attacks**: server checks if enemy is in attack state and within range. Applies damage to target player. Sends damage event to that client for screen flash effect.
- **Health pickups**: placed at fixed positions in the level grid. Server tracks which pickups are available. When a player walks over one, server adds health and marks it as collected (respawns after a timer).
- **Death/Respawn**: when health reaches 0, player enters dead state. After a respawn timer (3 seconds), player respawns at a random spawn point with full health and ammo.

---

## Visual Style & Aesthetic

### The Retro Look

The retro Doom aesthetic comes from specific technical choices, not complex art:

- **Texture resolution**: all textures should be 64x64 or 128x128 pixels maximum. Loaded with `THREE.NearestFilter` on both `magFilter` and `minFilter` to prevent smoothing.
- **Color palette**: muted grays and browns for moon base walls/floors. Green/purple for alien enemies. Red for damage effects. Amber for lighting/energy elements.
- **No anti-aliasing**: `renderer = new THREE.WebGLRenderer({ antialias: false })`.
- **Pixelated rendering** (optional): render to a smaller resolution (e.g., 640x480) and upscale, for authentic chunky pixels. Achieved by setting `renderer.setSize(640, 480)` and scaling the canvas via CSS.
- **Head bob**: subtle sinusoidal camera y-offset synced to movement speed.
- **Weapon sprite overlay**: a 2D weapon image fixed to the bottom-center of the screen, implemented as an HTML `<img>` overlay or a screen-space Three.js sprite. Slight bob animation when walking, recoil animation when shooting.

### Moon/Space Theme

- **Skybox/Background**: `scene.background = new THREE.Color(0x000011)` for dark space. Optionally add a star field using a particle system or a simple skybox texture from OpenGameArt's "Space Skyboxes" collection.
- **Wall textures**: metallic gray panels, riveted steel, airlock-style doors. Source from the Quake-like Sci-Fi 64x64 Texture Pack on itch.io (300 textures, CC-BY license) or generate procedurally.
- **Floor textures**: grated metal, moon dust/regolith, industrial tile.
- **Lighting**: dim ambient light (0x333344) + point lights at strategic locations (airlocks, crates) for atmosphere. Optional flickering light effect using sinusoidal intensity variation.
- **Low gravity feel**: increase jump height (jump velocity × 1.5), decrease gravity (gravity × 0.6), slightly slower fall speed.

---

## Asset Strategy

### Phase 1 — Procedural (Get Playable Fast)

Generate all visuals in code for the initial prototype:

- **Walls**: `MeshBasicMaterial({ color: 0x666677 })` with slight variation per wall segment.
- **Floor**: `MeshBasicMaterial({ color: 0x444444 })`.
- **Enemies**: colored `THREE.Sprite` with a simple procedural texture (draw a circle with eyes on a Canvas, use as `CanvasTexture`).
- **Weapon**: CSS overlay `<div>` styled as a simple weapon silhouette, or skip entirely and just use a crosshair.
- **Crosshair**: CSS `position: fixed` centered div with a + shape.
- **HUD**: HTML overlay with health bar, ammo counter, score display.

### Phase 2 — Asset Swap (Visual Polish)

Replace procedural assets with real sprite art:

- **Enemy sprites**: OpenGameArt "doomlike" collection — monster mutants, alien creatures, Harkubus sprites. Multi-angle sprite sheets with attack animations. Apply green/purple tint via shader or pre-processing to fit the alien theme.
- **Wall/floor textures**: Quake-like Sci-Fi 64x64 Texture Pack from itch.io, or OpenGameArt's "[Airos] Doom Textures & Sprites."
- **Weapon sprites**: OpenGameArt's "FPS Weapon Sprites" set or itch.io's "FPS Gun Sprites."
- **Pickup sprites**: OpenGameArt CC0 collection items — health kits, ammo boxes, armor.
- **Skybox**: OpenGameArt's "Space Skyboxes" set.

### Phase 3 — Freedoom Assets (Comprehensive)

If deeper asset coverage is needed, extract sprites and textures from the Freedoom project (BSD license, free for commercial use with attribution). Requires extracting PNGs from the WAD file format.

---

## Multiplayer Architecture

### Network Flow

```
Player Input (client)
    ↓
WebSocket message to Colyseus server
    ↓
Server validates + updates authoritative state
    ↓
Colyseus auto-syncs state delta to ALL clients
    ↓
Client receives state → updates Three.js scene
```

### Colyseus Room State Schema

```typescript
// server/src/rooms/schema/GameState.ts
import { Schema, MapSchema, type } from "@colyseus/schema";

class Position extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
}

class Player extends Schema {
  @type(Position) position = new Position();
  @type("number") rotationY: number = 0;
  @type("number") health: number = 100;
  @type("number") ammo: number = 50;
  @type("number") score: number = 0;
  @type("boolean") alive: boolean = true;
}

class Enemy extends Schema {
  @type("string") id: string;
  @type(Position) position = new Position();
  @type("number") health: number = 100;
  @type("string") state: string = "idle"; // idle | chase | attack
  @type("string") targetId: string = "";  // player session ID being chased
}

class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
  @type("number") gameTime: number = 0;
}
```

### Client Message Types

```javascript
// Messages sent FROM client TO server
{ type: "move", direction: { x, z }, deltaTime }
{ type: "rotate", rotationY }
{ type: "shoot", direction: { x, y, z } }
{ type: "jump" }

// Server handles these, updates state, Colyseus syncs automatically
```

### Server Game Loop

The Colyseus room runs its own server-side game loop (via `this.setSimulationInterval()`) at a fixed tick rate (e.g., 20Hz or 50ms intervals). Each tick:

1. Process all queued player inputs.
2. Move players (with server-side collision checks against the same level grid).
3. Run enemy AI ticks (pathfinding, state transitions, attacks).
4. Process combat (ray intersection checks for shots, enemy melee range checks).
5. Update pickup respawn timers.
6. Colyseus automatically detects state mutations and syncs to clients.

---

## Project Structure

```
moon-doom/
├── server/                    # Colyseus server (separate Node process)
│   ├── src/
│   │   ├── rooms/
│   │   │   ├── GameRoom.ts    # Room lifecycle, message handlers, game loop
│   │   │   └── schema/
│   │   │       └── GameState.ts  # Colyseus state schemas
│   │   ├── game/
│   │   │   ├── level.ts       # Shared level data + collision logic
│   │   │   ├── enemy-ai.ts    # Enemy state machine + pathfinding
│   │   │   └── combat.ts      # Damage calculation, hit detection
│   │   └── index.ts           # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── client/                    # Vite + Three.js client
│   ├── src/
│   │   ├── main.js            # Entry point, scene setup, game loop
│   │   ├── player.js          # Local player controller, input handling
│   │   ├── network.js         # Colyseus client connection, state sync
│   │   ├── level.js           # Level grid → Three.js geometry generator
│   │   ├── enemies.js         # Enemy sprite rendering, animation
│   │   ├── weapons.js         # Weapon sprite overlay, shooting visuals
│   │   ├── hud.js             # Health, ammo, score display
│   │   ├── audio.js           # jsfxr sound effect definitions
│   │   └── assets/            # Texture files (if using external assets)
│   ├── index.html
│   ├── style.css              # HUD overlay, crosshair, weapon sprite
│   ├── package.json
│   └── vite.config.js
├── shared/                    # Code shared between client and server
│   └── level-data.js          # Level grid arrays (used by both)
├── MOON_DOOM_SPEC.md          # This file
└── README.md
```

---

## Phased Build Plan

### Phase 1 — Single Player Foundation (30 minutes)

**Goal**: A playable single-player FPS running on localhost.

1. **Minutes 0–5**: Scaffold the Vite project, install Three.js, create the basic scene with camera, renderer, and ambient lighting.
2. **Minutes 5–12**: Define the level grid array, write the level generator that loops through and creates BoxGeometry walls + floor/ceiling planes. Apply basic colored materials.
3. **Minutes 12–17**: Add PointerLockControls for mouse look, implement WASD movement with grid-based collision detection and wall sliding. Add gravity and jumping.
4. **Minutes 17–22**: Create billboard sprite enemies at fixed positions, implement Raycaster shooting on mouse click, add enemy health and death (remove sprite on kill). Basic enemy AI (chase player when in range).
5. **Minutes 22–27**: Add jsfxr sound effects (shoot, hit, enemy death, pickup), CSS crosshair overlay, and basic HTML HUD (health number, ammo count, score).
6. **Minutes 27–30**: Polish — head bob on movement, screen flash on taking damage, weapon bob animation, flicker lighting.

### Phase 2 — Multiplayer Layer (60–90 minutes)

**Goal**: Two or more players in the same level via Colyseus.

1. **Scaffold Colyseus server** alongside the existing client. Define GameState schema with Player and Enemy classes.
2. **Move player state to server**: positions, health, ammo, and score are now server-authoritative. Client sends input messages; server validates and updates.
3. **Render other players**: when the server syncs state showing another player, render them as a colored mesh or sprite in the Three.js scene. Update position/rotation each frame based on server state.
4. **Sync enemy state**: server manages all enemy AI. Clients receive enemy positions and states, render sprites accordingly. No client-side AI logic in multiplayer mode.
5. **PvP combat**: player shots can hit other players (server validates via Raycaster on server-side copy of the scene). Add kill feed / death messages.
6. **Spawn/respawn system**: define spawn points in the level data. Server assigns spawn points on join and respawn.

### Phase 3 — Polish & Assets (30 minutes)

**Goal**: Visual and gameplay polish.

1. Swap procedural textures for real assets from OpenGameArt / itch.io.
2. Add multiple enemy types with different speeds, health, and attack patterns.
3. Add pickup items (health, ammo, weapon upgrades) at fixed level positions.
4. Implement a scoreboard overlay (Tab key to show).
5. Add a minimap in the corner (top-down 2D render of the level grid with player dots).
6. Add multiple weapon types (blaster, shotgun, rocket launcher) with different fire rates and damage.

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Rendering engine | Three.js | Smallest bundle (~168KB gzip), largest AI training corpus, proven Doom clones exist |
| Multiplayer framework | Colyseus | Authoritative server, auto state sync, room-based matchmaking, JS/TS native |
| Physics engine | None (grid collision) | O(1) lookups, ~20 LOC, the original Doom approach |
| Audio | jsfxr (procedural) | Zero audio files, instant retro SFX, generates at runtime |
| Build tool | Vite | Fastest HMR, minimal config, `npm create vite@latest` |
| Textures | 64x64 / 128x128 + NearestFilter | Authentic retro pixel aesthetic |
| Enemy rendering | Billboard sprites (THREE.Sprite) | Classic Doom technique, auto-faces camera |
| Level format | 2D JS array | Simple to edit, simple to generate geometry from, shareable between client/server |
| Server tick rate | 20Hz (50ms intervals) | Good balance of responsiveness and bandwidth for this game type |
| Transport | WebSocket (via Colyseus) | Built-in to Colyseus, reliable for game state sync |

---

## Coding Standards

- **Explicit over clever**: prefer readable, straightforward code. Comment non-obvious game math.
- **DRY**: shared logic (level data, collision math, constants) lives in `shared/` and is imported by both client and server.
- **Constants at the top**: magic numbers (CELL_SIZE, PLAYER_SPEED, GRAVITY, ENEMY_SPEED, DAMAGE values) are named constants in a config file.
- **No premature optimization**: get it working first, then optimize if performance is actually an issue.
- **ES modules**: use `import/export` everywhere, no CommonJS `require()`.
- **Test in two tabs**: always verify multiplayer by opening two browser tabs to localhost.

---

## Reference Links

- Three.js docs: https://threejs.org/docs/
- Three.js FPS example: https://threejs.org/examples/#games_fps
- PointerLockControls: https://threejs.org/docs/#examples/en/controls/PointerLockControls
- Colyseus docs: https://docs.colyseus.io/
- Colyseus getting started: https://docs.colyseus.io/getting-started/javascript-client/
- jsfxr web tool: https://sfxr.me/
- OpenGameArt Doom sprites: https://opengameart.org/content/doomlike
- OpenGameArt Doom textures: https://opengameart.org/content/airos-doom-textures-sprites
- Sci-Fi 64x64 textures (itch.io): https://itch.io/game-assets/assets-cc4-by/free/tag-science-fiction
- OpenGameArt space skyboxes: https://opengameart.org/content/space-skyboxes-0
- Freedoom project (BSD license): https://freedoom.github.io/
- three-arena reference (Three.js + Socket.io FPS): https://github.com/felixgren/three-arena
- vibe-doom reference (Claude Code Doom clone): https://github.com/ordoghl/vibe-doom
