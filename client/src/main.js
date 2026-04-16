import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Shared data
import {
  CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR,
  AMBIENT_LIGHT_COLOR, BACKGROUND_COLOR,
  PLAYER_MAX_HEALTH, PLAYER_START_AMMO, RESPAWN_TIME,
} from '../../shared/constants.js';

// Core gameplay modules
import { createLevel } from './level.js';
import { initPlayer, updatePlayer, resetPlayer } from './player.js';
import { createEnemies, updateEnemies, getEnemySprites, damageEnemy } from './enemies.js';
import { initWeaponsLogic, tryFire, updateWeaponsLogic } from './weapons-logic.js';

// Agent 2 modules (UI, audio, weapon visuals)
import { initHUD, updateHealth, updateAmmo, updateScore, showDamageFlash } from './hud.js';
import { initAudio, playShootSound, playHitSound, playEnemyDeathSound, playDamageSound } from './audio.js';
import { initWeaponVisuals, updateWeaponVisuals, playFireAnimation } from './weapons-visuals.js';

// --- Game state ---
let playerHealth = PLAYER_MAX_HEALTH;
let playerAmmo = PLAYER_START_AMMO;
let score = 0;
let isDead = false;
let respawnTimer = 0;

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(BACKGROUND_COLOR);

const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV, window.innerWidth / window.innerHeight, CAMERA_NEAR, CAMERA_FAR
);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(AMBIENT_LIGHT_COLOR));

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);

// --- DOM refs ---
const startOverlay = document.getElementById('start-overlay');
const crosshair = document.getElementById('crosshair');
const hud = document.getElementById('hud');
const weaponContainer = document.getElementById('weapon-container');
const deathScreen = document.getElementById('death-screen');

// --- Pointer lock ---
startOverlay.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
  startOverlay.style.display = 'none';
  crosshair.style.display = 'block';
  hud.style.display = 'flex';
  weaponContainer.style.display = 'block';
});

controls.addEventListener('unlock', () => {
  if (!isDead) {
    startOverlay.style.display = 'flex';
    crosshair.style.display = 'none';
    hud.style.display = 'none';
    weaponContainer.style.display = 'none';
  }
});

// --- Initialize modules ---
createLevel(scene);
initPlayer(camera, controls);
createEnemies(scene);
initHUD();
initAudio();
initWeaponVisuals();

initWeaponsLogic(camera, {
  getEnemySprites,
  damageEnemy,
  getAmmo: () => playerAmmo,
  onShoot: () => {
    playerAmmo -= 1;
    playShootSound();
    playFireAnimation();
  },
  onHit: () => {
    playHitSound();
  },
  onKill: () => {
    score += 100;
    playEnemyDeathSound();
  },
});

// --- Shooting input ---
document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && controls.isLocked && !isDead) {
    tryFire();
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Death / Respawn ---
function die() {
  isDead = true;
  playerHealth = 0;
  respawnTimer = RESPAWN_TIME;
  deathScreen.style.display = 'flex';
  crosshair.style.display = 'none';
}

function respawn() {
  isDead = false;
  playerHealth = PLAYER_MAX_HEALTH;
  playerAmmo = PLAYER_START_AMMO;
  respawnTimer = 0;
  resetPlayer();
  deathScreen.style.display = 'none';
  crosshair.style.display = 'block';
}

// --- Game loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1); // Cap to prevent huge jumps

  if (isDead) {
    respawnTimer -= delta;
    if (respawnTimer <= 0) respawn();
    renderer.render(scene, camera);
    return;
  }

  if (!controls.isLocked) {
    renderer.render(scene, camera);
    return;
  }

  // Update systems
  const playerState = updatePlayer(delta);
  const enemyResult = updateEnemies(delta, camera.position);
  updateWeaponsLogic(delta);

  // Enemy damage to player
  if (enemyResult.damageToPlayer > 0) {
    playerHealth -= enemyResult.damageToPlayer;
    showDamageFlash();
    playDamageSound();
    if (playerHealth <= 0) die();
  }

  // Update HUD & weapon visuals
  updateWeaponVisuals(playerState.isMoving, delta);
  updateHealth(playerHealth);
  updateAmmo(playerAmmo);
  updateScore(score);

  renderer.render(scene, camera);
}

animate();
