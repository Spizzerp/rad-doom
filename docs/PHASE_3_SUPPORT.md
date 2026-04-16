# Phase 3 — Content, Assets & Server Support (Agent 2 / Support)

## Context

You are **Agent 2 (Support)**. Phases 1 and 2 are complete — the game has multiplayer working with basic combat and enemy AI. Now you add content depth and polish on the server and UI side.

**Agent 1 is working in parallel** on client-side gameplay (multiple weapons, enemy variety, minimap). You support that work by extending the server, adding assets, building the scoreboard, and creating new levels.

**Critical reference**: `docs/PHASE_2_3_CONTRACT.md` — weapon types, enemy types, stat constants, tile types.

---

## Goal

Server supports multiple weapon types and enemy types. Real (or improved) textures replace procedural placeholders. Scoreboard overlay works. Additional levels exist. Sound effects are polished.

---

## File Ownership

You **modify** (files you already own):
- `shared/constants.js` — add new weapon/enemy stat constants
- `shared/level-data.js` — add LEVEL_02, LEVEL_03, new pickup types
- `server/src/game/combat.ts` — weapon-specific damage models
- `server/src/game/enemy-ai.ts` — type-specific AI behaviors
- `server/src/rooms/GameRoom.ts` — new pickup types, enemy type spawning
- `client/src/hud.js` — add scoreboard display
- `client/src/audio.js` — add weapon-specific sounds, polish presets
- `client/src/weapons-visuals.js` — add shotgun/rocket visual appearances
- `client/style.css` — scoreboard styles

You **create**:
- `client/src/assets/` — texture files (if using external assets)

You **never touch**:
- `client/src/main.js`, `client/src/player.js`, `client/src/level.js`, `client/src/enemies.js`, `client/src/weapons-logic.js`, `client/src/network.js`, `client/src/minimap.js` — Agent 1's files

---

## Tasks

### Task 1: Add New Constants to `shared/constants.js`

**Do this first** — Agent 1 needs to import these values.

Add the weapon and enemy stat constants from the Phase 2→3 contract:

```javascript
// === SHOTGUN ===
export const SHOTGUN_DAMAGE = 15;
export const SHOTGUN_PELLETS = 5;
export const SHOTGUN_SPREAD = 0.1;
export const SHOTGUN_FIRE_RATE = 0.8;
export const SHOTGUN_AMMO_COST = 2;

// === ROCKET LAUNCHER ===
export const ROCKET_DAMAGE = 80;
export const ROCKET_SPLASH_DAMAGE = 40;
export const ROCKET_SPLASH_RADIUS = 3;
export const ROCKET_FIRE_RATE = 1.2;
export const ROCKET_AMMO_COST = 3;
export const ROCKET_SPEED = 15;

// === CHARGER ENEMY ===
export const CHARGER_SPEED = 6;
export const CHARGER_HEALTH = 60;
export const CHARGER_DAMAGE = 20;
export const CHARGER_ATTACK_RANGE = 1.5;
export const CHARGER_DETECT_RANGE = 20;
export const CHARGER_ATTACK_COOLDOWN = 0.5;

// === SPITTER ENEMY ===
export const SPITTER_SPEED = 2;
export const SPITTER_HEALTH = 150;
export const SPITTER_DAMAGE = 15;
export const SPITTER_ATTACK_RANGE = 12;
export const SPITTER_DETECT_RANGE = 18;
export const SPITTER_ATTACK_COOLDOWN = 2.0;
export const SPITTER_PROJECTILE_SPEED = 10;
```

### Task 2: Server-Side Weapon Support (`server/src/game/combat.ts`)

Extend `processShot()` to handle different weapon types.

**Shotgun:**
- Cast `SHOTGUN_PELLETS` (5) rays, each with random angular deviation within `SHOTGUN_SPREAD` radians
- Each ray independently checks for hits
- Each hit does `SHOTGUN_DAMAGE` per pellet
- Return array of hit results

**Rocket launcher:**
- Don't use instant raycasting — spawn a server-side projectile
- Track active projectiles in the GameRoom (not in schema — no need to sync to clients; Agent 1 handles client-side projectile rendering)
- Each server tick: advance projectile by `ROCKET_SPEED * delta`
- On impact with wall, enemy, or player:
  - Apply `ROCKET_DAMAGE` to direct hit
  - Apply `ROCKET_SPLASH_DAMAGE` to all entities within `ROCKET_SPLASH_RADIUS`
  - Send `'hitConfirm'` to shooter with all hit details
  - Send `'playerHit'` to any damaged players

**Blaster:** remains as-is from Phase 2.

### Task 3: Server-Side Enemy Type AI (`server/src/game/enemy-ai.ts`)

Extend `updateEnemyAI()` to use type-specific stats.

**Grunt:** unchanged from Phase 2.

**Charger:**
- Much faster movement (`CHARGER_SPEED = 6`)
- Shorter attack range (`1.5`) — pure melee
- Faster attack cooldown (`0.5s`)
- Higher damage per hit (`20`)
- Lower health (`60`)
- Behavior: rushes directly at player, no hesitation

**Spitter:**
- Slower movement (`SPITTER_SPEED = 2`)
- Long attack range (`12 units`) — ranged attacker
- Slower cooldown (`2s`)
- High health (`150`) — tanky
- **Ranged attack**: instead of melee damage, spawn a projectile toward the target player
  - Track projectile server-side, advance each tick at `SPITTER_PROJECTILE_SPEED`
  - On hit: deal `SPITTER_DAMAGE`
  - On wall collision: destroy projectile
  - Send `'projectileSpawned'` event to clients for visual rendering (Agent 1 can optionally render these)

**Refactor AI to use a config lookup:**
```typescript
const ENEMY_CONFIGS = {
  grunt:   { speed: ENEMY_SPEED, health: ENEMY_HEALTH, damage: ENEMY_DAMAGE, ... },
  charger: { speed: CHARGER_SPEED, health: CHARGER_HEALTH, damage: CHARGER_DAMAGE, ... },
  spitter: { speed: SPITTER_SPEED, health: SPITTER_HEALTH, damage: SPITTER_DAMAGE, ... },
};
```

### Task 4: Update Enemy Spawns & New Levels (`shared/level-data.js`)

**Update LEVEL_01 enemy spawns** to include variety:
```javascript
export const ENEMY_SPAWNS = [
  { x: 8, z: 4, type: 'grunt' },
  { x: 4, z: 8, type: 'charger' },
  { x: 11, z: 8, type: 'grunt' },
  { x: 8, z: 12, type: 'spitter' },
];
```

**Add weapon pickup spawns:**
```javascript
export const PICKUP_SPAWNS = [
  { x: 7, z: 7, type: 'health' },
  { x: 8, z: 8, type: 'ammo' },
  { x: 1, z: 1, type: 'health' },
  { x: 14, z: 14, type: 'ammo' },
  { x: 4, z: 4, type: 'weapon_shotgun' },
  { x: 11, z: 11, type: 'weapon_rocket' },
];
```

**Create LEVEL_02** — a larger, more complex level:
```javascript
export const LEVEL_02 = [
  // 20x20 grid with more rooms, corridors, and varied tile types
  // Use tile types 0, 1, 2 (doors), 3 (windows) for variety
  // Include tighter corridors (good for shotgun), open areas (good for rockets),
  // and long sight lines (good for spitters)
];

export const LEVEL_02_SPAWNS = { /* same structure as LEVEL_01 data */ };
export const LEVEL_02_ENEMIES = [ /* mix of all three types */ ];
export const LEVEL_02_PICKUPS = [ /* more pickups including all weapon types */ ];
```

**Create LEVEL_03** — an arena-style level for PvP focus:
```javascript
export const LEVEL_03 = [
  // Symmetrical layout, good for deathmatch
  // Central open area with cover, weapons along the edges
];
```

### Task 5: Scoreboard Overlay (`client/src/hud.js` + `client/style.css`)

Add a scoreboard that appears when Tab is held.

**Add to `hud.js`:**
```javascript
/**
 * Show/hide the scoreboard overlay.
 * @param {boolean} visible
 */
export function setScoreboardVisible(visible) { }

/**
 * Update scoreboard with current player data.
 * @param {Array<{ sessionId: string, score: number, health: number, alive: boolean }>} players
 * @param {string} mySessionId — highlight local player
 */
export function updateScoreboard(players, mySessionId) { }
```

**Implementation:**
- Create a `<div id="scoreboard">` via JS on `initHUD()` (don't edit index.html)
- Style as a semi-transparent dark panel centered on screen
- Table format: columns for Player, Score, Health, Status
- Highlight the local player's row
- Agent 1 calls `setScoreboardVisible(true)` on Tab keydown, `false` on keyup
- Agent 1 calls `updateScoreboard(data, myId)` each frame while visible

**Add to `style.css`:**
```css
#scoreboard {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 17, 0.9);
  border: 1px solid #444;
  padding: 20px;
  z-index: 30;
  min-width: 400px;
  display: none;
  font-family: 'Courier New', monospace;
}

#scoreboard table {
  width: 100%;
  border-collapse: collapse;
}

#scoreboard th {
  color: #888;
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid #333;
}

#scoreboard td {
  padding: 4px 8px;
  color: #ccc;
}

#scoreboard tr.self td {
  color: #0f0;
}

#scoreboard tr.dead td {
  color: #666;
}
```

### Task 6: Weapon Visual Updates (`client/src/weapons-visuals.js`)

Extend `switchWeapon(name)` to change the weapon overlay appearance per type.

**Blaster** (existing): narrow, tall silhouette shape.

**Shotgun**: wider, shorter shape. Change clip-path and/or background:
```javascript
case 'shotgun':
  sprite.style.clipPath = 'polygon(20% 100%, 80% 100%, 65% 30%, 50% 10%, 35% 30%)';
  sprite.style.background = 'linear-gradient(to top, #555 0%, #777 40%, transparent 100%)';
  break;
```

**Rocket launcher**: thick barrel shape:
```javascript
case 'rocket':
  sprite.style.clipPath = 'polygon(35% 100%, 65% 100%, 60% 10%, 55% 0%, 45% 0%, 40% 10%)';
  sprite.style.background = 'linear-gradient(to top, #554433 0%, #776655 40%, transparent 100%)';
  break;
```

### Task 7: Audio Polish (`client/src/audio.js`)

Add weapon-specific sound variations and polish existing sounds.

**New exports (optional — or modify existing functions to accept weapon type):**
```javascript
// Option A: weapon-aware shoot sound
export function playShootSound(weaponType = 'blaster') {
  switch (weaponType) {
    case 'blaster': /* existing laser zap */ break;
    case 'shotgun': /* deeper, louder boom — lower freq, longer duration */ break;
    case 'rocket':  /* whoosh/launch sound — rising freq sweep */ break;
  }
}

// Option B: separate functions (if Agent 1 prefers)
export function playShotgunSound() { }
export function playRocketSound() { }
```

**Polish existing sounds:**
- Tune jsfxr/WebAudio parameters for more satisfying sounds
- Add a subtle ambient hum/drone (low continuous tone) for atmosphere
- Add footstep sounds (subtle, synced to head bob)

### Task 8: Asset Integration (Optional)

If time allows, replace procedural textures with real assets from OpenGameArt/itch.io.

**Sources** (from spec):
- Wall/floor textures: Quake-like Sci-Fi 64x64 Texture Pack (itch.io, CC-BY)
- Enemy sprites: OpenGameArt "doomlike" collection
- Weapon sprites: OpenGameArt "FPS Weapon Sprites"
- Skybox: OpenGameArt "Space Skyboxes"

**Integration approach:**
1. Download assets, place in `client/src/assets/`
2. Load with `THREE.TextureLoader`, apply `NearestFilter` to every texture
3. Agent 1's `level.js` already uses materials on walls/floor — swapping the material texture should work without code changes on their side
4. For enemy sprites: create texture files, Agent 1's `enemies.js` would need to load them instead of procedural canvas. Coordinate with Agent 1 or provide a texture-loading utility they can import

**Note**: Asset integration is the lowest priority task. Focus on gameplay-affecting work first (Tasks 1-6).

---

## Verification

Phase 3 Support is complete when:

1. **New constants exist**: `shared/constants.js` has all shotgun/rocket/charger/spitter stats
2. **Server handles shotgun**: spread rays, multiple hits, correct damage
3. **Server handles rocket**: projectile travel, splash damage on impact
4. **Charger AI works**: fast rush, melee attacks, lower health
5. **Spitter AI works**: ranged attacks, projectile spawning, slower movement
6. **Enemy variety in spawns**: LEVEL_01 has mixed enemy types
7. **Weapon pickups in spawns**: shotgun and rocket launcher pickups placed in level
8. **LEVEL_02 exists**: larger, more complex level with varied tile types and enemy mix
9. **LEVEL_03 exists**: arena-style PvP-focused level
10. **Scoreboard works**: Tab shows/hides player stats overlay, local player highlighted
11. **Weapon visuals switch**: shotgun and rocket have distinct silhouettes
12. **Audio varies by weapon**: different sound for each weapon type
13. **No regressions**: all Phase 1/2 features still work, server starts cleanly, client connects
