import * as THREE from 'three';
import { ENEMY_SPAWNS, LEVEL_01, isWall } from '../../shared/level-data.js';
import {
  CELL_SIZE, ENEMY_SPEED, ENEMY_HEALTH, ENEMY_DAMAGE,
  ENEMY_ATTACK_RANGE, ENEMY_DETECT_RANGE, ENEMY_ATTACK_COOLDOWN,
} from '../../shared/constants.js';

let sceneRef;
const enemies = [];

function generateEnemyTexture() {
  const s = 64;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');

  // Green alien body
  ctx.fillStyle = '#2a7a2a';
  ctx.beginPath();
  ctx.ellipse(s / 2, s / 2 + 4, 22, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a5a1a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Red glowing eyes
  ctx.fillStyle = '#ff3300';
  ctx.beginPath();
  ctx.arc(s / 2 - 8, s / 2 - 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s / 2 + 8, s / 2 - 4, 5, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(s / 2 - 7, s / 2 - 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s / 2 + 9, s / 2 - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.fillStyle = '#1a3a1a';
  ctx.beginPath();
  ctx.ellipse(s / 2, s / 2 + 14, 8, 4, 0, 0, Math.PI);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function hasLineOfSight(fx, fz, tx, tz) {
  const dx = tx - fx;
  const dz = tz - fz;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const steps = Math.ceil(dist / (CELL_SIZE * 0.5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const gx = Math.floor((fx + dx * t) / CELL_SIZE);
    const gz = Math.floor((fz + dz * t) / CELL_SIZE);
    if (isWall(LEVEL_01, gx, gz)) return false;
  }
  return true;
}

function enemyCollidesAt(x, z) {
  const r = 0.3;
  for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    if (isWall(LEVEL_01, Math.floor((x + ox) / CELL_SIZE), Math.floor((z + oz) / CELL_SIZE))) return true;
  }
  return false;
}

export function createEnemies(scene) {
  sceneRef = scene;
  const texture = generateEnemyTexture();

  for (const spawn of ENEMY_SPAWNS) {
    const mat = new THREE.SpriteMaterial({ map: texture.clone() });
    mat.map.needsUpdate = true;
    const sprite = new THREE.Sprite(mat);
    const wx = spawn.x * CELL_SIZE + CELL_SIZE / 2;
    const wz = spawn.z * CELL_SIZE + CELL_SIZE / 2;
    sprite.position.set(wx, 1.0, wz);
    sprite.scale.set(1.4, 1.8, 1);
    scene.add(sprite);

    enemies.push({
      sprite,
      health: ENEMY_HEALTH,
      state: 'idle',
      worldX: wx,
      worldZ: wz,
      attackTimer: 0,
    });
  }
}

export function updateEnemies(delta, playerPosition) {
  let damageToPlayer = 0;
  const px = playerPosition.x;
  const pz = playerPosition.z;

  for (const e of enemies) {
    const dx = px - e.worldX;
    const dz = pz - e.worldZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    switch (e.state) {
      case 'idle':
        if (dist < ENEMY_DETECT_RANGE && hasLineOfSight(e.worldX, e.worldZ, px, pz)) {
          e.state = 'chase';
        }
        break;

      case 'chase':
        if (dist > ENEMY_DETECT_RANGE) { e.state = 'idle'; break; }
        if (dist < ENEMY_ATTACK_RANGE) { e.state = 'attack'; e.attackTimer = ENEMY_ATTACK_COOLDOWN; break; }

        // Move toward player with collision
        const nx = dx / dist;
        const nz = dz / dist;
        const moveX = e.worldX + nx * ENEMY_SPEED * delta;
        const moveZ = e.worldZ + nz * ENEMY_SPEED * delta;
        if (!enemyCollidesAt(moveX, e.worldZ)) e.worldX = moveX;
        if (!enemyCollidesAt(e.worldX, moveZ)) e.worldZ = moveZ;
        e.sprite.position.x = e.worldX;
        e.sprite.position.z = e.worldZ;
        break;

      case 'attack':
        if (dist > ENEMY_ATTACK_RANGE * 1.5) { e.state = 'chase'; break; }
        e.attackTimer -= delta;
        if (e.attackTimer <= 0) {
          damageToPlayer += ENEMY_DAMAGE;
          e.attackTimer = ENEMY_ATTACK_COOLDOWN;
        }
        break;
    }
  }

  return { damageToPlayer };
}

export function getEnemySprites() {
  return enemies.map(e => e.sprite);
}

export function damageEnemy(sprite, amount) {
  const enemy = enemies.find(e => e.sprite === sprite);
  if (!enemy) return { killed: false };

  enemy.health -= amount;

  // Hit flash
  enemy.sprite.material.color.setHex(0xff4444);
  setTimeout(() => {
    if (enemy.sprite.material) enemy.sprite.material.color.setHex(0xffffff);
  }, 100);

  if (enemy.health <= 0) {
    sceneRef.remove(enemy.sprite);
    enemy.sprite.material.map?.dispose();
    enemy.sprite.material.dispose();
    enemies.splice(enemies.indexOf(enemy), 1);
    return { killed: true };
  }
  return { killed: false };
}
