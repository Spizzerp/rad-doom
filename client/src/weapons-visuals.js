// client/src/weapons-visuals.js
// Weapon overlay animations: idle sway, walking bob, firing recoil, weapon switch.

const BOB_FREQ_H = 6;       // horizontal bob frequency
const BOB_FREQ_V = 12;      // vertical bob frequency (2x horizontal = classic FPS)
const BOB_AMP_X = 4;        // px
const BOB_AMP_Y = 6;        // px
const RECOIL_DURATION = 0.08; // seconds
const RECOIL_KICK_Y = 24;   // px
const REST_DECAY = 12;      // 1/s — how fast bob fades when player stops

let containerEl, spriteEl;
let bobTimer = 0;
let bobAmount = 0;          // 0 = at rest, 1 = full bob (ramps up/down for smoothness)
let recoilTimer = 0;
let currentWeapon = 'blaster';

export function initWeaponVisuals() {
  containerEl = document.getElementById('weapon-container');
  spriteEl = document.getElementById('weapon-sprite');
  bobTimer = 0;
  bobAmount = 0;
  recoilTimer = 0;
  applyTransform(0, 0, 0);
  switchWeapon(currentWeapon);
}

export function updateWeaponVisuals(isMoving, delta) {
  if (!containerEl) return;

  if (recoilTimer > 0) {
    recoilTimer = Math.max(0, recoilTimer - delta);
  }

  // Smoothly blend bob in when moving, out when not
  const target = isMoving ? 1 : 0;
  bobAmount += (target - bobAmount) * Math.min(1, delta * REST_DECAY);

  if (bobAmount > 0.001) {
    bobTimer += delta;
  } else {
    bobTimer = 0;
  }

  const bobX = Math.sin(bobTimer * BOB_FREQ_H) * BOB_AMP_X * bobAmount;
  const bobY = Math.abs(Math.sin(bobTimer * BOB_FREQ_V)) * BOB_AMP_Y * bobAmount;

  // Recoil is a smooth decay — ease from kicked-up to rest
  const recoilFrac = recoilTimer > 0 ? recoilTimer / RECOIL_DURATION : 0;
  const recoilY = RECOIL_KICK_Y * recoilFrac;

  applyTransform(bobX, bobY, recoilY);
}

export function playFireAnimation() {
  recoilTimer = RECOIL_DURATION;
}

export function switchWeapon(name) {
  currentWeapon = name;
  if (!spriteEl) return;

  // Phase 1 placeholder: change clip-path + color to suggest different weapons.
  // Phase 3 swaps these for real sprite images.
  switch (name) {
    case 'shotgun':
      spriteEl.style.clipPath =
        'polygon(20% 100%, 80% 100%, 70% 30%, 65% 10%, 35% 10%, 30% 30%)';
      spriteEl.style.background =
        'linear-gradient(to top, #553322 0%, #886644 40%, transparent 100%)';
      break;
    case 'rocket':
      spriteEl.style.clipPath =
        'polygon(25% 100%, 75% 100%, 70% 20%, 60% 0%, 40% 0%, 30% 20%)';
      spriteEl.style.background =
        'linear-gradient(to top, #223344 0%, #556677 40%, transparent 100%)';
      break;
    case 'blaster':
    default:
      spriteEl.style.clipPath =
        'polygon(30% 100%, 70% 100%, 55% 20%, 50% 0%, 45% 20%)';
      spriteEl.style.background =
        'linear-gradient(to top, #444 0%, #666 40%, transparent 100%)';
      break;
  }
}

function applyTransform(bobX, bobY, recoilY) {
  if (!containerEl) return;
  const x = bobX;
  const y = -(bobY + recoilY); // negative Y = up on screen
  containerEl.style.transform = `translateX(calc(-50% + ${x.toFixed(2)}px)) translateY(${y.toFixed(2)}px)`;
}
