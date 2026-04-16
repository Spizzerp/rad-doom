# Phase 2→3 Contract — Content Type Agreements

## Purpose

Before Phase 3 (Polish & Content), both agents must agree on new content type identifiers and data shapes. Agent 1 adds client-side rendering for new weapons/enemies. Agent 2 adds server-side logic and assets. The identifiers and schemas must match.

---

## Weapon Types

### Identifiers

```javascript
// Weapon type strings used in messages and state
'blaster'   // Default weapon — already implemented in Phase 2
'shotgun'   // New in Phase 3
'rocket'    // New in Phase 3
```

### Weapon Stats (add to `shared/constants.js`)

```javascript
// Shotgun
export const SHOTGUN_DAMAGE = 15;        // Per pellet
export const SHOTGUN_PELLETS = 5;        // Number of rays
export const SHOTGUN_SPREAD = 0.1;       // Radians spread angle
export const SHOTGUN_FIRE_RATE = 0.8;    // Seconds between shots
export const SHOTGUN_AMMO_COST = 2;

// Rocket Launcher
export const ROCKET_DAMAGE = 80;         // Direct hit
export const ROCKET_SPLASH_DAMAGE = 40;  // Splash within radius
export const ROCKET_SPLASH_RADIUS = 3;   // Units
export const ROCKET_FIRE_RATE = 1.2;     // Seconds between shots
export const ROCKET_AMMO_COST = 3;
export const ROCKET_SPEED = 15;          // Units per second (projectile)
```

### Shoot Message Update

The `shoot` message already includes `weaponType`. In Phase 3:
- `weaponType: 'shotgun'` — server casts multiple rays with spread
- `weaponType: 'rocket'` — server spawns a projectile that travels and explodes on impact

### Weapon Switch

Players switch weapons with number keys (1=blaster, 2=shotgun, 3=rocket). Client tracks which weapons the player has (blaster always available; shotgun/rocket from pickups). No server message needed for switching — the weapon type is sent with each shoot message.

---

## Enemy Types

### Identifiers

```javascript
// Enemy type strings used in schema and spawns
'grunt'     // Basic alien — already implemented in Phase 2
'charger'   // Fast melee alien — new in Phase 3
'spitter'   // Ranged alien — new in Phase 3
```

### Enemy Stats (add to `shared/constants.js`)

```javascript
// Charger — fast, low health, high damage melee
export const CHARGER_SPEED = 6;          // 2x grunt
export const CHARGER_HEALTH = 60;
export const CHARGER_DAMAGE = 20;        // 2x grunt
export const CHARGER_ATTACK_RANGE = 1.5;
export const CHARGER_DETECT_RANGE = 20;
export const CHARGER_ATTACK_COOLDOWN = 0.5;

// Spitter — slow, high health, ranged attack
export const SPITTER_SPEED = 2;
export const SPITTER_HEALTH = 150;
export const SPITTER_DAMAGE = 15;
export const SPITTER_ATTACK_RANGE = 12;  // Long range
export const SPITTER_DETECT_RANGE = 18;
export const SPITTER_ATTACK_COOLDOWN = 2.0;
export const SPITTER_PROJECTILE_SPEED = 10;
```

### Enemy Schema Update

The `Enemy` schema already has `enemyType: string`. In Phase 3:
- Server sets `enemyType` to `'grunt'`, `'charger'`, or `'spitter'` on spawn
- Client reads `enemyType` to select the correct sprite/color
- Server uses `enemyType` to look up the correct stat constants for AI behavior

### Visual Differentiation (Agent 1)

- **Grunt**: green sprite (existing)
- **Charger**: red/orange sprite, slightly smaller
- **Spitter**: purple sprite, slightly larger

---

## Pickup Types

### Existing
- `'health'` — restores 25 HP
- `'ammo'` — adds 15 ammo

### New in Phase 3
```javascript
'weapon_shotgun'  // Gives player the shotgun
'weapon_rocket'   // Gives player the rocket launcher
```

When collected, player gains the weapon. If already owned, treat as ammo pickup instead.

---

## Scoreboard Data Shape

The scoreboard overlay (Tab key) displays all connected players' stats. Agent 2 implements the UI. Data comes from the Colyseus state (already synced):

```javascript
// Derived from state.players — no new schema needed
[
  {
    sessionId: string,
    score: number,      // from player.score
    health: number,     // from player.health
    alive: boolean,     // from player.alive
  },
  // ... one entry per connected player
]
```

Agent 1 reads this from `state.players` and passes it to the scoreboard UI. Agent 2 builds the scoreboard display component.

---

## New Level Tile Types

For Phase 3 additional levels, new tile values may be introduced:

```javascript
// Existing
0  // empty
1  // standard wall

// New (optional, for LEVEL_02/03)
2  // door (future: interactive)
3  // window/transparent wall (render as translucent)
4  // destructible wall (future)
```

Agent 1's `level.js` must handle these by mapping tile values to materials:
- `1` → gray metal wall (existing)
- `2` → dark gray with door texture
- `3` → translucent blue (glass/window)
- `4` → cracked/damaged wall texture

Agent 2 creates the new level arrays in `shared/level-data.js` using these tile values.

---

## Integration Checklist

Before starting Phase 3:
- [ ] Agent 2 adds new weapon/enemy constants to `shared/constants.js`
- [ ] Agent 2 adds new pickup types to `shared/level-data.js` spawn data
- [ ] Both agents agree this contract is finalized
- [ ] Both agents' Phase 2 code is stable and tested
