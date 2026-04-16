# Phase 1 — Single-Player Foundation (Agent 1 / Lead)

## Context

You are **Agent 1 (Lead)** on the Moon Doom project — a retro FPS built with Three.js + Colyseus + Vite. 

**Phase 0 is complete.** Agent 2 has scaffolded the project:
- `client/` — Vite app with Three.js installed, `npm run dev` works
- `server/` — Colyseus server scaffold (not used yet)
- `shared/constants.js` — all gameplay constants (CELL_SIZE, PLAYER_SPEED, GRAVITY, etc.)
- `shared/level-data.js` — LEVEL_01 grid array, spawn points, enemy spawns, isWall() utility
- `client/index.html` — game container, HUD elements, crosshair, weapon overlay, damage flash, start overlay
- `client/style.css` — all styling for the above

**In parallel**, Agent 2 is building the HUD module, audio system, and weapon visuals (see PHASE_1_SUPPORT.md). You do NOT touch their files.

**Reference**: `MOON_DOOM_SPEC.md` — especially "Game Architecture" (line ~58), "Visual Style" (line ~138), and the Phase 1 build plan (line ~306).

---

## Goal

A playable single-player FPS: walk around a moon base level, look with mouse, shoot alien enemies, see them die, take damage from them. The game loop runs at ~60fps.

---

## File Ownership

You **create and own** these files:
- `client/src/main.js` — entry point, scene setup, game loop
- `client/src/player.js` — player controller, input, movement, collision
- `client/src/level.js` — level grid to Three.js geometry
- `client/src/enemies.js` — enemy sprites, AI state machine, health
- `client/src/weapons-logic.js` — shooting mechanics, raycasting, damage

You **import from** (read-only, never edit):
- `shared/constants.js`
- `shared/level-data.js`
- `client/src/hud.js` (Agent 2's file)
- `client/src/audio.js` (Agent 2's file)
- `client/src/weapons-visuals.js` (Agent 2's file)

You **never touch**:
- `client/index.html`, `client/style.css`
- `client/src/hud.js`, `client/src/audio.js`, `client/src/weapons-visuals.js`
- Anything in `server/`

---

## Function Contracts — What You Call

Agent 2 is implementing these modules in parallel. Import and call them from your game loop. If they're not ready yet (empty files), wrap calls in try/catch or check for undefined — but write the calls from the start.

### From `hud.js`:
```javascript
import { initHUD, updateHealth, updateAmmo, updateScore, showDamageFlash } from './hud.js';

initHUD();                  // Call once at startup
updateHealth(healthValue);  // Call each frame or on change
updateAmmo(ammoValue);      // Call each frame or on change
updateScore(scoreValue);    // Call on score change
showDamageFlash();          // Call when player takes damage
```

### From `audio.js`:
```javascript
import { initAudio, playShootSound, playHitSound, playEnemyDeathSound, playPickupSound, playDamageSound } from './audio.js';

initAudio();          // Call once at startup
playShootSound();     // Call on weapon fire
playHitSound();       // Call when shot hits an enemy
playEnemyDeathSound(); // Call when enemy health reaches 0
playPickupSound();    // Call when player picks up item
playDamageSound();    // Call when player takes damage
```

### From `weapons-visuals.js`:
```javascript
import { initWeaponVisuals, updateWeaponVisuals, playFireAnimation, switchWeapon } from './weapons-visuals.js';

initWeaponVisuals();                   // Call once at startup
updateWeaponVisuals(isMoving, delta);  // Call each frame — handles weapon bob
playFireAnimation();                   // Call on weapon fire — handles recoil
switchWeapon('blaster');               // Call on weapon switch
```

---

## Tasks

### Task 1: Scene Setup (`main.js`)

Create the Three.js scene, renderer, and camera.

```javascript
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, AMBIENT_LIGHT_COLOR, BACKGROUND_COLOR } from '../../shared/constants.js';
```

Key setup:
- `THREE.WebGLRenderer({ antialias: false })` — no anti-aliasing for retro look
- Append renderer to `#game-container`
- `renderer.setPixelRatio(window.devicePixelRatio)` and `renderer.setSize(window.innerWidth, window.innerHeight)`
- `THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR)`
- `scene.background = new THREE.Color(BACKGROUND_COLOR)`
- `new THREE.AmbientLight(AMBIENT_LIGHT_COLOR)` — dim ambient
- Add a few `THREE.PointLight` instances at strategic positions for atmosphere
- `PointerLockControls(camera, renderer.domElement)` — stored for movement
- Click handler on `#start-overlay` to call `controls.lock()`, hide overlay, show crosshair + HUD
- Handle `controls.unlock` event to show overlay again
- Window resize handler

### Task 2: Level Renderer (`level.js`)

Convert the 2D grid array into Three.js geometry.

```javascript
import { LEVEL_01 } from '../../shared/level-data.js';
import { CELL_SIZE, WALL_HEIGHT } from '../../shared/constants.js';
```

Implementation:
- Loop through `LEVEL_01` — for each cell with value `1`, create a `THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE)`
- Position each box at `(col * CELL_SIZE + CELL_SIZE/2, WALL_HEIGHT/2, row * CELL_SIZE + CELL_SIZE/2)`
- Use `MeshBasicMaterial({ color: 0x666677 })` for Phase 1 (procedural — no texture files)
- Slight color variation per wall: randomize the color slightly (e.g., +-0x050505) for visual interest
- **Merge all wall geometry** using `BufferGeometryUtils.mergeGeometries()` for performance — one draw call instead of hundreds
- Create floor: `PlaneGeometry(levelWidth * CELL_SIZE, levelHeight * CELL_SIZE)`, rotated -90 degrees on X axis, `MeshBasicMaterial({ color: 0x444444 })`
- Create ceiling: same as floor but at `y = WALL_HEIGHT`
- Export a function like `createLevel(scene)` that adds everything to the scene and returns collision data if needed
- Apply `THREE.NearestFilter` to any textures (even colored materials should be ready for texture swap in Phase 3)

### Task 3: Player Controller (`player.js`)

Movement, collision detection, gravity, and jumping.

```javascript
import { CELL_SIZE, PLAYER_SPEED, GRAVITY, JUMP_VELOCITY, PLAYER_HEIGHT, HEAD_BOB_SPEED, HEAD_BOB_AMPLITUDE } from '../../shared/constants.js';
import { LEVEL_01, isWall } from '../../shared/level-data.js';
```

Implementation:
- Track keyboard state: `keydown`/`keyup` event listeners for WASD and Space
- Each frame, compute desired movement direction from key state + camera forward/right vectors (from PointerLockControls)
- **Grid-based collision** (spec lines 46–52):
  - Convert desired new position to grid coords: `gridX = Math.floor(worldX / CELL_SIZE)`, `gridZ = Math.floor(worldZ / CELL_SIZE)`
  - Check `isWall(LEVEL_01, gridX, gridZ)`
  - **Wall sliding**: if diagonal blocked, try each axis independently. Check X movement alone, then Z movement alone
  - Add a small collision radius (~0.3 units) so the player doesn't clip into walls
- **Gravity + Jump**:
  - Track `velocityY`, apply `GRAVITY * delta` each frame (downward)
  - On Space press (if grounded): `velocityY = JUMP_VELOCITY`
  - Grounded check: `camera.position.y <= PLAYER_HEIGHT`
  - Clamp to floor: `camera.position.y = Math.max(PLAYER_HEIGHT, camera.position.y)`
- **Head bob**: when moving, apply sinusoidal Y offset: `Math.sin(bobTimer * HEAD_BOB_SPEED) * HEAD_BOB_AMPLITUDE`
- **Player start position**: use first entry from `SPAWN_POINTS`, multiply by CELL_SIZE, set camera position
- Export: `initPlayer(camera, controls)`, `updatePlayer(delta)` — returns `{ isMoving, position }` for other systems

### Task 4: Enemy Sprites (`enemies.js`)

Billboard sprite enemies with procedural textures and basic AI.

```javascript
import { ENEMY_SPAWNS } from '../../shared/level-data.js';
import { CELL_SIZE, ENEMY_SPEED, ENEMY_HEALTH, ENEMY_DAMAGE, ENEMY_ATTACK_RANGE, ENEMY_DETECT_RANGE, ENEMY_ATTACK_COOLDOWN } from '../../shared/constants.js';
```

Implementation:
- **Procedural enemy texture**: draw on a `<canvas>` element, create `THREE.CanvasTexture`
  - 64x64 canvas, fill with green (alien theme), draw simple circle body with two red/purple eyes
  - `texture.magFilter = THREE.NearestFilter` for pixelated look
- **Create sprites** at each `ENEMY_SPAWNS` position:
  - `new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }))` 
  - Position: `(spawn.x * CELL_SIZE + CELL_SIZE/2, WALL_HEIGHT/2, spawn.z * CELL_SIZE + CELL_SIZE/2)`
  - Scale to roughly player height
- **Track enemy state** in a Map or array:
  ```javascript
  { id, sprite, health: ENEMY_HEALTH, state: 'idle', position: {x, z}, attackTimer: 0 }
  ```
- **AI state machine** (spec lines 118–124), run each frame:
  - **Idle**: stand still. Check distance to player each frame. If < `ENEMY_DETECT_RANGE` AND line-of-sight clear → switch to **Chase**
  - **Chase**: move toward player at `ENEMY_SPEED`. If distance < `ENEMY_ATTACK_RANGE` → switch to **Attack**. If distance > `ENEMY_DETECT_RANGE` → back to **Idle**
  - **Attack**: deal `ENEMY_DAMAGE` to player on cooldown timer. Stay in Attack while in range
- **Line-of-sight**: cast a ray (manually step through grid cells from enemy to player) to check for wall occlusion. Keep it simple — just check a few points along the line
- **Enemy movement collision**: check `isWall()` before moving enemies (same grid collision as player)
- Export: `createEnemies(scene)`, `updateEnemies(delta, playerPosition)`, `getEnemySprites()` (for raycaster hit detection), `damageEnemy(enemyId, amount)` → returns `{ killed: bool }`

### Task 5: Shooting / Raycasting (`weapons-logic.js`)

```javascript
import { BLASTER_DAMAGE, BLASTER_FIRE_RATE, BLASTER_AMMO_COST, PLAYER_START_AMMO } from '../../shared/constants.js';
```

Implementation:
- Track ammo count (start at `PLAYER_START_AMMO`), fire cooldown timer
- On mouse click (when pointer locked):
  - Check cooldown and ammo
  - Create `THREE.Raycaster` from camera position in camera forward direction
  - `raycaster.intersectObjects(getEnemySprites())` — check hits against enemy sprites
  - If hit: call `damageEnemy(hitEnemy.id, BLASTER_DAMAGE)`, call `playHitSound()`
  - If enemy killed: call `playEnemyDeathSound()`, increment score
  - Deduct ammo, reset cooldown
  - Call `playShootSound()`, `playFireAnimation()`
- Export: `initWeaponsLogic(camera)`, `updateWeaponsLogic(delta)`, `getAmmo()`, `getFireCooldown()`

### Task 6: Game Loop (`main.js` — continued)

Wire everything together in the animation loop:

```javascript
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Update systems
  const playerState = updatePlayer(delta);
  updateEnemies(delta, camera.position);
  updateWeaponsLogic(delta);

  // Update Agent 2 modules
  updateWeaponVisuals(playerState.isMoving, delta);
  updateHealth(playerHealth);
  updateAmmo(getAmmo());
  updateScore(score);

  // Render
  renderer.render(scene, camera);
}
```

### Task 7: Player Damage & Death

- When enemies attack (from `updateEnemies`), reduce player health
- Call `showDamageFlash()` and `playDamageSound()`
- When health <= 0: show `#death-screen`, pause game, reset after RESPAWN_TIME seconds
- On respawn: restore health/ammo, move to a spawn point, hide death screen

---

## Integration Points

- Agent 2's modules (`hud.js`, `audio.js`, `weapons-visuals.js`) may not be ready when you start. Write your import calls anyway. If the files are empty stubs, the imports will succeed but the functions won't exist. Use optional chaining or a guard pattern:
  ```javascript
  if (typeof updateHealth === 'function') updateHealth(playerHealth);
  ```
  Or simply let it error during development — both agents are working simultaneously and it will resolve as Agent 2 delivers.

- The HUD DOM elements (`#health-value`, `#ammo-value`, `#score-value`, `#crosshair`, `#hud`, `#start-overlay`) already exist in `index.html` (created in Phase 0). You can reference them directly if needed for showing/hiding on pointer lock events.

---

## Verification

Phase 1 Lead is complete when:

1. **Level renders**: walls, floor, and ceiling visible from first-person perspective
2. **Movement works**: WASD moves the player, mouse rotates the camera, collisions prevent walking through walls, wall sliding works on diagonals
3. **Gravity + jump**: player falls to floor, Space bar jumps with moon-gravity float
4. **Head bob**: subtle camera bounce while walking
5. **Enemies visible**: green alien sprites standing at spawn positions, facing the camera (billboard)
6. **Enemy AI**: enemies chase when you get close, stop chasing when far, attack when in range
7. **Shooting works**: click fires, raycaster detects enemy hits, enemies take damage and die (sprite removed)
8. **Ammo/health tracking**: ammo decreases on fire, health decreases on enemy attack
9. **Player death**: health reaching 0 shows death screen, respawn after timer
10. **Performance**: 60fps in Chrome

Open `npm run dev` in browser. Click to lock pointer. Walk around. Shoot enemies. Get hit. Die and respawn.
