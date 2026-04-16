// client/src/audio.js
// Procedural retro SFX via jsfxr (sfxr port). Zero audio files.

import { sfxr } from 'jsfxr';

const sounds = {};
let initialized = false;

export function initAudio() {
  if (initialized) return;

  const shoot = sfxr.generate('laserShoot');
  const hit = sfxr.generate('hitHurt');
  const enemyDeath = sfxr.generate('explosion');
  const pickup = sfxr.generate('pickupCoin');

  // Player-damage variant: start from hitHurt and push it lower/longer for a thud
  const damage = sfxr.generate('hitHurt');
  damage.p_base_freq = Math.max(0.05, (damage.p_base_freq || 0.4) * 0.5);
  damage.p_env_sustain = Math.min(0.6, (damage.p_env_sustain || 0.1) + 0.15);
  damage.p_env_decay = Math.min(0.8, (damage.p_env_decay || 0.2) + 0.15);
  damage.wave_type = 2; // sawtooth for a rougher hurt sound

  sounds.shoot = sfxr.toAudio(shoot);
  sounds.hit = sfxr.toAudio(hit);
  sounds.enemyDeath = sfxr.toAudio(enemyDeath);
  sounds.pickup = sfxr.toAudio(pickup);
  sounds.damage = sfxr.toAudio(damage);

  initialized = true;
}

function play(key) {
  const s = sounds[key];
  if (!s) return;
  try {
    s.play();
  } catch {
    // AudioContext may be suspended pre-gesture; swallow silently.
  }
}

export function playShootSound() { play('shoot'); }
export function playHitSound() { play('hit'); }
export function playEnemyDeathSound() { play('enemyDeath'); }
export function playPickupSound() { play('pickup'); }
export function playDamageSound() { play('damage'); }
