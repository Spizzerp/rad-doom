# Phase 3 — Gameplay Depth & Polish (Agent 1 / Lead)

## Context

You are **Agent 1 (Lead)**. Phases 1 and 2 are complete — you have a multiplayer FPS with networked players, server-authoritative enemy AI, and combat. Single-player fallback works.

Now you add gameplay depth: multiple weapons, enemy variety, a minimap, and visual polish. **Agent 2 is working in parallel** on server-side support for new weapons/enemies, asset integration, and the scoreboard UI.

**Critical reference**: `docs/PHASE_2_3_CONTRACT.md` — weapon types, enemy types, stat constants, pickup types.

---

## Goal

The game feels like a complete retro FPS: three weapons with distinct behavior, three enemy types with different tactics, a minimap for navigation, and polished visual effects.

---

## File Ownership

You **modify** (files you already own):
- `client/src/weapons-logic.js` — multiple weapon types, ammo per weapon, switching
- `client/src/enemies.js` — enemy type differentiation, different sprites per type
- `client/src/main.js` — weapon switch input, minimap integration, kill feed

You **create**:
- `client/src/minimap.js` — top-down 2D level view

You **import from** (read-only):
- `shared/constants.js` — new weapon/enemy stat constants (Agent 2 adds these)
- `shared/level-data.js` — new level data (Agent 2 extends)
- `shared/protocol.js`

You **never touch**:
- `server/src/**`
- `client/src/hud.js`, `client/src/audio.js`, `client/src/weapons-visuals.js` — Agent 2's files
- `client/index.html`, `client/style.css`

---

## Tasks

### Task 1: Multiple Weapon System (`weapons-logic.js`)

Expand from a single blaster to three weapons with distinct mechanics.

**Weapon inventory:**
```javascript
const weapons = {
  blaster: { owned: true, damage: BLASTER_DAMAGE, fireRate: BLASTER_FIRE_RATE, ammoCost: BLASTER_AMMO_COST },
  shotgun: { owned: false, damage: SHOTGUN_DAMAGE, fireRate: SHOTGUN_FIRE_RATE, ammoCost: SHOTGUN_AMMO_COST, pellets: SHOTGUN_PELLETS, spread: SHOTGUN_SPREAD },
  rocket:  { owned: false, damage: ROCKET_DAMAGE, fireRate: ROCKET_FIRE_RATE, ammoCost: ROCKET_AMMO_COST },
};
let currentWeapon = 'blaster';
```

**Weapon switching:**
- Listen for `1`, `2`, `3` keypress
- Only switch if player owns that weapon
- Call `switchWeapon(name)` from `weapons-visuals.js` (Agent 2's module) for visual feedback
- Update current weapon type sent in shoot messages

**Shotgun (client-side in single-player):**
- On fire: cast `SHOTGUN_PELLETS` (5) rays with random angular offset within `SHOTGUN_SPREAD` radians
- Each pellet that hits does `SHOTGUN_DAMAGE`
- In multiplayer: just send `weaponType: 'shotgun'` — server handles spread ray logic

**Rocket launcher (client-side in single-player):**
- On fire: create a visible projectile (small sphere or sprite) that travels in the aim direction at `ROCKET_SPEED`
- On impact (hits wall or enemy): apply `ROCKET_DAMAGE` to direct hit, `ROCKET_SPLASH_DAMAGE` to anything within `ROCKET_SPLASH_RADIUS`
- In multiplayer: send `weaponType: 'rocket'` — server handles projectile and splash

**Weapon pickups:**
- When player walks over a `'weapon_shotgun'` or `'weapon_rocket'` pickup: set `weapons.shotgun.owned = true` or `weapons.rocket.owned = true`
- If already owned, treat as ammo (+15)
- In multiplayer: server sends pickup event, client updates local weapon inventory

### Task 2: Enemy Type Variety (`enemies.js`)

Differentiate enemy visuals and behavior based on `enemyType`.

**Procedural sprites per type:**
- **Grunt** (existing): green circle with red eyes, ~64x64
- **Charger**: red/orange smaller circle, angrier eyes, ~48x48 (smaller = feels faster)
- **Spitter**: purple larger blob with a "mouth", ~80x80 (larger = feels tankier)

Create a `generateEnemyTexture(type)` function that draws different CanvasTextures:
```javascript
function generateEnemyTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  switch (type) {
    case 'grunt':   /* green, medium */ break;
    case 'charger': /* red/orange, small, fierce */ break;
    case 'spitter': /* purple, large, with mouth */ break;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  return texture;
}
```

**In single-player mode:**
- Read `ENEMY_SPAWNS` type field to create the right enemy
- AI behavior varies by type (charger moves faster but has less range, spitter attacks from distance)
- Use the per-type constants from `shared/constants.js`

**In multiplayer mode:**
- Read `enemy.enemyType` from server state to select the correct sprite texture
- No behavior changes needed client-side — server handles AI

### Task 3: Minimap (`client/src/minimap.js`)

A small top-down 2D view of the level in the corner of the screen.

**Implementation:**
- Create a `<canvas>` element positioned in the top-right corner (via JS, not by editing HTML)
- Size: ~150x150 pixels
- Draw the level grid: walls as light pixels, empty as dark
- Draw player position as a bright dot with a direction indicator (line showing facing direction)
- In multiplayer: draw other players as different colored dots
- Draw enemies as red dots
- Update each frame (or every few frames for performance)
- Scale: each grid cell = a few pixels on the minimap

```javascript
const MINIMAP_SIZE = 150;
const MINIMAP_CELL = Math.floor(MINIMAP_SIZE / LEVEL_01.length);

export function initMinimap() {
  const canvas = document.createElement('canvas');
  canvas.id = 'minimap';
  canvas.width = MINIMAP_SIZE;
  canvas.height = MINIMAP_SIZE;
  canvas.style.cssText = 'position:fixed;top:10px;right:10px;z-index:10;border:1px solid #333;opacity:0.8;';
  document.body.appendChild(canvas);
  return canvas.getContext('2d');
}

export function updateMinimap(ctx, playerPos, playerRot, enemies, otherPlayers) {
  // Clear
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Draw walls
  ctx.fillStyle = '#444';
  for (let z = 0; z < LEVEL_01.length; z++) {
    for (let x = 0; x < LEVEL_01[z].length; x++) {
      if (LEVEL_01[z][x] === 1) {
        ctx.fillRect(x * MINIMAP_CELL, z * MINIMAP_CELL, MINIMAP_CELL, MINIMAP_CELL);
      }
    }
  }

  // Draw enemies as red dots
  // Draw other players as blue dots
  // Draw self as green dot with direction line
}
```

### Task 4: Visual Polish

Small improvements that add atmosphere:

**Flicker lighting:**
- Add a `flickerLight` function to random point lights: vary intensity sinusoidally + random noise
- Apply to 1-2 lights in the level for atmosphere

**Kill feed:**
- When an enemy is killed or a player is killed (from server events or local): display a brief text message
- Create a `<div>` container (via JS) in the top-left, stack messages that fade after 3 seconds
- Format: "You killed Grunt" / "Player was eliminated"

**Improved damage effects:**
- Camera shake on taking damage: briefly offset camera position randomly, ease back
- More intense red flash for large hits
- Screen tint when low health (<25)

**Weapon-specific visual feedback:**
- Shotgun: wider muzzle flash effect (could be a brief CSS flash or canvas overlay)
- Rocket: visible projectile trail (simple line or particle effect using THREE.Points)

---

## Integration Points

- Agent 2 adds new constants to `shared/constants.js` (SHOTGUN_*, CHARGER_*, SPITTER_*, etc.) — you import them
- Agent 2 adds `'weapon_shotgun'` and `'weapon_rocket'` pickup spawns to `shared/level-data.js`
- Agent 2 extends `weapons-visuals.js` to handle shotgun and rocket appearances in `switchWeapon(name)`
- Agent 2 adds new audio: `playShootSound()` should ideally vary by weapon (or Agent 2 adds `playShotgunSound()`, `playRocketSound()`) — coordinate if needed
- Agent 2 builds the scoreboard UI — you read `state.players` and pass data to it via a function Agent 2 exports from `hud.js`
- Agent 2 may swap procedural textures for real assets — your level.js and enemies.js should work with any texture (you use `NearestFilter` on everything)

---

## Verification

Phase 3 Lead is complete when:

1. **Three weapons**: blaster, shotgun, rocket launcher — each with distinct fire behavior
2. **Weapon switching**: 1/2/3 keys switch weapons, visual updates, correct damage/fire-rate per weapon
3. **Weapon pickups**: walking over weapon pickups grants new weapons
4. **Three enemy types**: grunt, charger, spitter — visually distinct sprites, different behaviors in single-player
5. **Enemy types in multiplayer**: correct sprite selected based on `enemyType` from server
6. **Minimap visible**: top-right corner shows level layout, player position, enemy positions
7. **Minimap updates**: player dot moves, enemies move, other players shown in multiplayer
8. **Visual polish**: flicker lights, kill feed, camera shake on damage
9. **No regressions**: all Phase 1/2 features still work
10. **Performance**: 60fps with all additions
