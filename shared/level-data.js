// shared/level-data.js
// Level definitions — used by both client (rendering) and server (collision/spawns)

// 0 = empty, 1 = standard wall, 2 = door, 3 = window/transparent
export const LEVEL_01 = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Grid coordinates (not world coordinates) — multiply by CELL_SIZE for world position
export const SPAWN_POINTS = [
  { x: 2, z: 2 },
  { x: 13, z: 2 },
  { x: 2, z: 13 },
  { x: 13, z: 13 },
];

export const ENEMY_SPAWNS = [
  { x: 8, z: 4, type: 'grunt' },
  { x: 4, z: 8, type: 'grunt' },
  { x: 11, z: 8, type: 'grunt' },
  { x: 8, z: 12, type: 'grunt' },
];

export const PICKUP_SPAWNS = [
  { x: 7, z: 7, type: 'health' },
  { x: 8, z: 8, type: 'ammo' },
  { x: 1, z: 1, type: 'health' },
  { x: 14, z: 14, type: 'ammo' },
];

// Utility: check if a grid cell is a wall (blocking)
export function isWall(level, gridX, gridZ) {
  if (gridX < 0 || gridZ < 0 || gridX >= level[0].length || gridZ >= level.length) {
    return true; // Out of bounds = wall
  }
  return level[gridZ][gridX] === 1;
}
