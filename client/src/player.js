import * as THREE from 'three';
import {
  CELL_SIZE, PLAYER_SPEED, GRAVITY, JUMP_VELOCITY,
  PLAYER_HEIGHT, HEAD_BOB_SPEED, HEAD_BOB_AMPLITUDE,
} from '../../shared/constants.js';
import { LEVEL_01, SPAWN_POINTS, isWall } from '../../shared/level-data.js';

const keys = {};
let camera, controls;
let velocityY = 0;
let isGrounded = true;
let bobTimer = 0;

const COLLISION_RADIUS = 0.35;

export function initPlayer(cam, ctrl) {
  camera = cam;
  controls = ctrl;

  const spawn = SPAWN_POINTS[0];
  camera.position.set(
    spawn.x * CELL_SIZE + CELL_SIZE / 2,
    PLAYER_HEIGHT,
    spawn.z * CELL_SIZE + CELL_SIZE / 2
  );

  document.addEventListener('keydown', (e) => { keys[e.code] = true; });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });
}

function collidesAt(x, z) {
  const checks = [
    [x - COLLISION_RADIUS, z - COLLISION_RADIUS],
    [x + COLLISION_RADIUS, z - COLLISION_RADIUS],
    [x - COLLISION_RADIUS, z + COLLISION_RADIUS],
    [x + COLLISION_RADIUS, z + COLLISION_RADIUS],
  ];
  for (const [cx, cz] of checks) {
    if (isWall(LEVEL_01, Math.floor(cx / CELL_SIZE), Math.floor(cz / CELL_SIZE))) return true;
  }
  return false;
}

export function updatePlayer(delta) {
  if (!controls || !controls.isLocked) {
    return { isMoving: false, position: camera ? camera.position : new THREE.Vector3() };
  }

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  let mx = 0, mz = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    { mx += forward.x; mz += forward.z; }
  if (keys['KeyS'] || keys['ArrowDown'])  { mx -= forward.x; mz -= forward.z; }
  if (keys['KeyA'] || keys['ArrowLeft'])  { mx -= right.x;   mz -= right.z; }
  if (keys['KeyD'] || keys['ArrowRight']) { mx += right.x;   mz += right.z; }

  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 0) { mx /= len; mz /= len; }

  const speed = PLAYER_SPEED * delta;
  const newX = camera.position.x + mx * speed;
  const newZ = camera.position.z + mz * speed;

  // Wall-sliding: try each axis independently
  if (!collidesAt(newX, camera.position.z)) camera.position.x = newX;
  if (!collidesAt(camera.position.x, newZ)) camera.position.z = newZ;

  // Jump
  if (keys['Space'] && isGrounded) {
    velocityY = JUMP_VELOCITY;
    isGrounded = false;
  }

  // Gravity
  velocityY -= GRAVITY * delta;
  camera.position.y += velocityY * delta;

  if (camera.position.y <= PLAYER_HEIGHT) {
    camera.position.y = PLAYER_HEIGHT;
    velocityY = 0;
    isGrounded = true;
  }

  // Head bob when grounded and moving
  const isMoving = len > 0;
  if (isMoving && isGrounded) {
    bobTimer += delta * HEAD_BOB_SPEED;
    camera.position.y += Math.sin(bobTimer) * HEAD_BOB_AMPLITUDE;
  } else {
    bobTimer = 0;
  }

  return { isMoving, position: camera.position };
}

export function resetPlayer() {
  const spawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  camera.position.set(
    spawn.x * CELL_SIZE + CELL_SIZE / 2,
    PLAYER_HEIGHT,
    spawn.z * CELL_SIZE + CELL_SIZE / 2
  );
  velocityY = 0;
  isGrounded = true;
  bobTimer = 0;
}
