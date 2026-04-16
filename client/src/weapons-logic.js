import * as THREE from 'three';
import { BLASTER_DAMAGE, BLASTER_FIRE_RATE, BLASTER_AMMO_COST } from '../../shared/constants.js';

let camera;
let getEnemySpritesFn;
let damageEnemyFn;
let callbacks = {};
let fireCooldown = 0;

export function initWeaponsLogic(cam, opts) {
  camera = cam;
  getEnemySpritesFn = opts.getEnemySprites;
  damageEnemyFn = opts.damageEnemy;
  callbacks = opts;
}

export function tryFire() {
  if (fireCooldown > 0) return false;
  if (callbacks.getAmmo() < BLASTER_AMMO_COST) return false;

  fireCooldown = BLASTER_FIRE_RATE;

  // Raycast from screen center
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const sprites = getEnemySpritesFn();
  const intersects = raycaster.intersectObjects(sprites);

  callbacks.onShoot();

  if (intersects.length > 0) {
    const result = damageEnemyFn(intersects[0].object, BLASTER_DAMAGE);
    callbacks.onHit();
    if (result.killed) callbacks.onKill();
  }

  return true;
}

export function updateWeaponsLogic(delta) {
  if (fireCooldown > 0) fireCooldown -= delta;
}
