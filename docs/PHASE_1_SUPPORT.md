# Phase 1 — UI, Audio & Weapon Visuals (Agent 2 / Support)

## Context

You are **Agent 2 (Support)** on the Moon Doom project. **You just completed Phase 0** — the project is scaffolded, shared data files exist, and `npm run dev` works.

Now you build the supporting client modules while **Agent 1 (Lead)** builds the core gameplay (scene, player, level, enemies, shooting) in parallel. Agent 1 will import your modules and call your exported functions from the game loop.

**Reference**: `MOON_DOOM_SPEC.md` — "Visual Style" (line ~138), jsfxr section (line ~38), HUD/crosshair details in Phase 1 plan (line ~306).

---

## Goal

Three fully functional modules — HUD, audio, and weapon visuals — each exporting the agreed-upon function interface. Agent 1 calls these from the game loop.

---

## File Ownership

You **create and own** these files:
- `client/src/hud.js` — health, ammo, score display + damage flash
- `client/src/audio.js` — jsfxr procedural sound effects
- `client/src/weapons-visuals.js` — weapon sprite overlay, bob + recoil animations

You already created in Phase 0 (modify only `style.css` if needed):
- `client/index.html` — HUD markup already in place
- `client/style.css` — all styling already in place

You **never touch**:
- `client/src/main.js`, `client/src/player.js`, `client/src/level.js`, `client/src/enemies.js`, `client/src/weapons-logic.js` — Agent 1's files
- Anything in `server/`
- `shared/constants.js`, `shared/level-data.js` — created in Phase 0, read-only now

---

## Function Contracts — What You Implement

Agent 1 is writing calls to these functions right now. You must export exactly these signatures.

---

## Tasks

### Task 1: HUD Module (`client/src/hud.js`)

The HUD DOM elements already exist in `index.html` (created in Phase 0). This module reads/writes those elements.

**Required exports:**

```javascript
/**
 * Initialize HUD — call once at game startup.
 * Caches DOM element references for performance.
 */
export function initHUD() { }

/**
 * Update the health display.
 * @param {number} val — current health (0–100)
 */
export function updateHealth(val) { }

/**
 * Update the ammo display.
 * @param {number} val — current ammo count
 */
export function updateAmmo(val) { }

/**
 * Update the score display.
 * @param {number} val — current score
 */
export function updateScore(val) { }

/**
 * Flash red overlay when player takes damage.
 * Should auto-clear after ~150ms.
 */
export function showDamageFlash() { }
```

**Implementation details:**

- `initHUD()`: cache references to `#health-value`, `#ammo-value`, `#score-value`, `#damage-flash` via `document.getElementById`. Store in module-level variables.
- `updateHealth(val)`: set `healthEl.textContent = Math.max(0, Math.round(val))`. Optionally change color when low health (<25: more intense red glow).
- `updateAmmo(val)`: set `ammoEl.textContent = val`. Optionally flash when low (<10).
- `updateScore(val)`: set `scoreEl.textContent = val`.
- `showDamageFlash()`: add `'active'` class to `#damage-flash`, remove after 150ms via `setTimeout`. The CSS transition is already defined in `style.css`.

### Task 2: Audio Module (`client/src/audio.js`)

Use **jsfxr** to generate retro 8-bit sound effects procedurally. Zero audio files needed.

**First, install jsfxr:**
```bash
cd client && npm install jsfxr
```

If `jsfxr` is not available as an npm package, use the alternative approach: generate sound buffers using the Web Audio API with parameters that mimic retro SFX. You can also use `sfxr` or `zzfx` npm packages as alternatives.

**Required exports:**

```javascript
/**
 * Initialize audio system — call once at startup.
 * Pre-generates all sound buffers.
 */
export function initAudio() { }

/** Weapon fire — short laser/blaster zap */
export function playShootSound() { }

/** Projectile hitting enemy — quick impact thud */
export function playHitSound() { }

/** Enemy dies — small explosion/splat */
export function playEnemyDeathSound() { }

/** Pick up health/ammo — cheerful ascending tone */
export function playPickupSound() { }

/** Player takes damage — low thud/hurt sound */
export function playDamageSound() { }
```

**Implementation approach:**

Option A — using `jsfxr` or `zzfx`:
```javascript
import { jsfxr } from 'jsfxr'; // or similar

const sounds = {};

export function initAudio() {
  sounds.shoot = new Audio(jsfxr([/* laserShoot preset params */]));
  sounds.hit = new Audio(jsfxr([/* hitHurt preset params */]));
  sounds.enemyDeath = new Audio(jsfxr([/* explosion preset params */]));
  sounds.pickup = new Audio(jsfxr([/* powerUp preset params */]));
  sounds.damage = new Audio(jsfxr([/* hitHurt variant preset */]));
}

function play(key) {
  const s = sounds[key];
  if (s) { s.currentTime = 0; s.play().catch(() => {}); }
}
```

Option B — if no suitable npm package, use Web Audio API directly:
```javascript
let ctx;

export function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, duration, type = 'square') {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}
```

Then each sound function calls `playTone` with different parameters:
- `playShootSound()`: high freq (880Hz), short (0.1s), square wave
- `playHitSound()`: mid freq (440Hz), very short (0.05s), sawtooth
- `playEnemyDeathSound()`: low freq sweep (200→50Hz), medium (0.3s), square + noise
- `playPickupSound()`: ascending (440→880Hz), short (0.15s), sine
- `playDamageSound()`: low freq (150Hz), medium (0.2s), sawtooth

Keep sounds short and punchy — retro 8-bit style.

### Task 3: Weapon Visuals Module (`client/src/weapons-visuals.js`)

The weapon overlay is an HTML element positioned at screen bottom-center. This module handles the bob (walking) and recoil (shooting) animations.

**Required exports:**

```javascript
/**
 * Initialize weapon visuals — call once at startup.
 * Caches DOM references, sets initial state.
 */
export function initWeaponVisuals() { }

/**
 * Update weapon bob animation each frame.
 * @param {boolean} isMoving — whether the player is walking
 * @param {number} delta — frame delta time in seconds
 */
export function updateWeaponVisuals(isMoving, delta) { }

/**
 * Play weapon fire/recoil animation.
 * Quick upward kick, then return to resting position.
 */
export function playFireAnimation() { }

/**
 * Switch to a different weapon (updates sprite/appearance).
 * @param {string} name — weapon identifier ('blaster', 'shotgun', 'rocket')
 */
export function switchWeapon(name) { }
```

**Implementation details:**

- `initWeaponVisuals()`: cache `#weapon-container` and `#weapon-sprite`. Set initial transform.
- `updateWeaponVisuals(isMoving, delta)`:
  - If moving: increment a bob timer, apply sinusoidal offset to `#weapon-container`:
    ```javascript
    const bobX = Math.sin(bobTimer * 6) * 4;    // px horizontal
    const bobY = Math.abs(Math.sin(bobTimer * 12)) * 6; // px vertical (always positive = bounce)
    container.style.transform = `translateX(calc(-50% + ${bobX}px)) translateY(-${bobY}px)`;
    ```
  - If not moving: smoothly return to rest position (`translateX(-50%)`)
  - If recoiling: override with recoil position (takes priority over bob)
- `playFireAnimation()`:
  - Set recoil state: move weapon up by ~20px and slightly back
  - After ~80ms: return to normal position
  - Use `style.transform` manipulation or CSS `transition` for smoothness
  ```javascript
  container.style.transform = 'translateX(-50%) translateY(-20px)';
  setTimeout(() => { /* return to bob position */ }, 80);
  ```
- `switchWeapon(name)`:
  - Change the `#weapon-sprite` appearance based on weapon name
  - For Phase 1, just change the CSS `clip-path` or `background-color` to suggest different shapes
  - Blaster: narrow, tall shape (default)
  - Shotgun: wider, shorter shape
  - Rocket: thick barrel shape
  - Phase 3 will swap in real sprite images

---

## Integration Notes

- Agent 1's `main.js` will import your modules and call `init*()` functions at startup and `update*()`/`play*()` functions each frame or on events.
- Your modules are **self-contained** — they only manipulate DOM elements that already exist in `index.html` and manage their own state. No Three.js imports needed.
- If you need to adjust `style.css` for additional animations or states (e.g., weapon switch transitions, HUD color changes), you can — you own that file.
- The `#hud` and `#weapon-container` elements start with `display: none` in CSS. Agent 1's code will set them to visible when the pointer is locked. If you want to test your modules independently, temporarily override this in your dev process.

---

## Verification

Phase 1 Support is complete when:

1. **HUD updates**: calling `updateHealth(50)` in console changes the health display to 50; calling `updateAmmo(10)` updates ammo; `updateScore(100)` updates score
2. **Damage flash**: calling `showDamageFlash()` produces a brief red screen flash
3. **Audio plays**: calling each `play*Sound()` function produces a distinct retro SFX (may need user interaction first to unlock AudioContext)
4. **Weapon bob**: calling `updateWeaponVisuals(true, 0.016)` in a loop makes the weapon sprite bounce
5. **Weapon recoil**: calling `playFireAnimation()` kicks the weapon up and returns it
6. **No errors**: no console errors from any module when all functions are called

To test independently before Agent 1's game loop is ready:
```javascript
// Temporary test in main.js or browser console:
import { initHUD, updateHealth } from './hud.js';
import { initAudio, playShootSound } from './audio.js';
import { initWeaponVisuals, playFireAnimation } from './weapons-visuals.js';

initHUD(); initAudio(); initWeaponVisuals();
updateHealth(75);
playShootSound();
playFireAnimation();
```

Once verified, your Phase 1 work is complete. Proceed to the Phase 1→2 contract review (`docs/PHASE_1_2_CONTRACT.md`), then to `docs/PHASE_2_SUPPORT.md`.
