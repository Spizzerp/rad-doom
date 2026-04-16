import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVEL_01 } from '../../shared/level-data.js';
import { CELL_SIZE, WALL_HEIGHT } from '../../shared/constants.js';

export function createLevel(scene) {
  const wallGeometries = [];

  for (let z = 0; z < LEVEL_01.length; z++) {
    for (let x = 0; x < LEVEL_01[z].length; x++) {
      if (LEVEL_01[z][x] === 1) {
        const geo = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
        // Per-wall color variation via vertex colors
        const base = new THREE.Color(0x666677);
        const v = (Math.random() - 0.5) * 0.06;
        base.r += v;
        base.g += v;
        base.b += v;
        const colors = new Float32Array(geo.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = base.r;
          colors[i + 1] = base.g;
          colors[i + 2] = base.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.translate(
          x * CELL_SIZE + CELL_SIZE / 2,
          WALL_HEIGHT / 2,
          z * CELL_SIZE + CELL_SIZE / 2
        );
        wallGeometries.push(geo);
      }
    }
  }

  const mergedGeo = mergeGeometries(wallGeometries, false);
  const wallMesh = new THREE.Mesh(
    mergedGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.1 })
  );
  scene.add(wallMesh);
  wallGeometries.forEach(g => g.dispose());

  // Floor & ceiling
  const levelW = LEVEL_01[0].length * CELL_SIZE;
  const levelD = LEVEL_01.length * CELL_SIZE;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(levelW, levelD),
    new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(levelW / 2, 0, levelD / 2);
  scene.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(levelW, levelD),
    new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.9 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(levelW / 2, WALL_HEIGHT, levelD / 2);
  scene.add(ceil);

  // Point lights at open areas
  const lightPositions = [
    { x: 2, z: 2 }, { x: 13, z: 2 },
    { x: 2, z: 13 }, { x: 13, z: 13 },
    { x: 7, z: 7 },
  ];
  const lights = [];
  for (const pos of lightPositions) {
    const light = new THREE.PointLight(0xffaa55, 0.8, CELL_SIZE * 8);
    light.position.set(
      pos.x * CELL_SIZE + CELL_SIZE / 2,
      WALL_HEIGHT - 0.5,
      pos.z * CELL_SIZE + CELL_SIZE / 2
    );
    scene.add(light);
    lights.push(light);
  }

  return { wallMesh, lights };
}
