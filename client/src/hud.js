// client/src/hud.js
// HUD module — health, ammo, score display + damage flash overlay.
// DOM elements live in index.html and are styled by style.css.

let healthEl, ammoEl, scoreEl, damageFlashEl;
let damageFlashTimer = null;

export function initHUD() {
  healthEl = document.getElementById('health-value');
  ammoEl = document.getElementById('ammo-value');
  scoreEl = document.getElementById('score-value');
  damageFlashEl = document.getElementById('damage-flash');
}

export function updateHealth(val) {
  if (!healthEl) return;
  const hp = Math.max(0, Math.round(val));
  healthEl.textContent = hp;
  healthEl.classList.toggle('low', hp < 25);
}

export function updateAmmo(val) {
  if (!ammoEl) return;
  const ammo = Math.max(0, Math.round(val));
  ammoEl.textContent = ammo;
  ammoEl.classList.toggle('low', ammo < 10);
}

export function updateScore(val) {
  if (!scoreEl) return;
  scoreEl.textContent = Math.round(val);
}

export function showDamageFlash() {
  if (!damageFlashEl) return;
  damageFlashEl.classList.add('active');
  if (damageFlashTimer) clearTimeout(damageFlashTimer);
  damageFlashTimer = setTimeout(() => {
    damageFlashEl.classList.remove('active');
    damageFlashTimer = null;
  }, 150);
}
