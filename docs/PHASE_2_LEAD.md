# Phase 2 — Client Network Integration (Agent 1 / Lead)

## Context

You are **Agent 1 (Lead)**. Phase 1 is complete — you have a working single-player FPS with movement, collision, enemies, shooting, HUD, audio, and weapon visuals.

Now you add multiplayer. **Agent 2 is building the Colyseus server in parallel** (see PHASE_2_SUPPORT.md). You build the client-side network layer and adapt your existing systems to receive authoritative state from the server.

**Critical reference**: `docs/PHASE_1_2_CONTRACT.md` — the exact message types, schema paths, and event formats. Every property name must match.

---

## Goal

The game connects to a Colyseus server, sends player input as messages, receives authoritative state, renders other players, and syncs enemy state from the server. Single-player mode still works as a fallback.

---

## File Ownership

You **create**:
- `client/src/network.js` — Colyseus client, state sync, message sending

You **modify** (files you already own):
- `client/src/main.js` — add network init, game mode toggle
- `client/src/player.js` — send input to server instead of local movement
- `client/src/enemies.js` — receive enemy state from server instead of local AI
- `client/src/weapons-logic.js` — send shoot messages to server

You **import from** (read-only):
- `shared/protocol.js` (Agent 2 creates this — MSG_MOVE, MSG_ROTATE, MSG_SHOOT, MSG_JUMP)
- `shared/constants.js`

You **never touch**:
- `server/src/**` — Agent 2's domain
- `client/src/hud.js`, `client/src/audio.js`, `client/src/weapons-visuals.js` — Agent 2's files
- `client/index.html`, `client/style.css`

---

## Prerequisites

- `shared/protocol.js` exists with message type constants (Agent 2 creates this first in Phase 2)
- Colyseus server is running on port 2567 with at least the echo server (accepts connections, handles `move`/`rotate`)
- If the server isn't ready yet, you can develop against a local mock (see Task 1 below)

---

## Tasks

### Task 1: Network Module (`client/src/network.js`)

The core connection layer. Provides a clean interface for the rest of the client to send input and receive state.

```javascript
import { Client } from 'colyseus.js';
import { MSG_MOVE, MSG_ROTATE, MSG_SHOOT, MSG_JUMP } from '../../shared/protocol.js';
```

**Exports:**

```javascript
/**
 * Connect to the Colyseus server and join a room.
 * @returns {Promise<Room>} the joined room
 */
export async function connectToServer() { }

/**
 * Send player movement input to the server.
 * @param {{ x: number, z: number }} direction — normalized movement vector
 * @param {number} deltaTime — frame delta
 */
export function sendMove(direction, deltaTime) { }

/**
 * Send player rotation to the server.
 * @param {number} rotationY — horizontal camera angle in radians
 */
export function sendRotation(rotationY) { }

/**
 * Send shoot event to the server.
 * @param {{ x: number, y: number, z: number }} direction — camera forward vector
 * @param {string} weaponType — current weapon
 */
export function sendShoot(direction, weaponType) { }

/** Send jump request to the server. */
export function sendJump() { }

/** Get the current room instance (null if not connected). */
export function getRoom() { }

/** Get this client's session ID. */
export function getSessionId() { }

/** Check if we're connected to multiplayer. */
export function isMultiplayer() { }

/**
 * Register callbacks for state changes and events.
 * @param {Object} callbacks — { onPlayerAdd, onPlayerRemove, onPlayerChange,
 *                               onEnemyAdd, onEnemyRemove, onEnemyChange,
 *                               onHitConfirm, onPlayerHit, onPlayerKilled, onPlayerRespawned }
 */
export function registerCallbacks(callbacks) { }
```

**Implementation:**

```javascript
let room = null;
let client = null;

export async function connectToServer() {
  client = new Client('ws://localhost:2567');
  room = await client.joinOrCreate('moon-doom');

  // Set up state change listeners per PHASE_1_2_CONTRACT.md
  room.state.players.onAdd((player, sessionId) => { /* dispatch callback */ });
  room.state.players.onRemove((player, sessionId) => { /* dispatch callback */ });
  // ... same for enemies

  // One-off event listeners
  room.onMessage('hitConfirm', (data) => { /* dispatch callback */ });
  room.onMessage('playerHit', (data) => { /* dispatch callback */ });
  room.onMessage('playerKilled', (data) => { /* dispatch callback */ });
  room.onMessage('playerRespawned', (data) => { /* dispatch callback */ });

  return room;
}

export function sendMove(direction, deltaTime) {
  if (room) room.send(MSG_MOVE, { direction, deltaTime });
}
// ... etc for other send functions
```

**Mock adapter** (for developing before server is ready):
```javascript
const USE_MOCK = false; // flip to true if server isn't available

function createMockRoom() {
  return {
    state: {
      players: new Map(),
      enemies: new Map(),
      gameTime: 0,
    },
    sessionId: 'local-player',
    send: () => {},
    onMessage: () => {},
  };
}
```

### Task 2: Adapt Player Controller (`player.js`)

Add a multiplayer mode where input is sent to the server instead of applied locally.

**Changes:**
- Add a `multiplayerMode` flag (set from `main.js` based on whether we connected)
- In single-player mode: movement works exactly as Phase 1 (local collision, etc.)
- In multiplayer mode:
  - Instead of moving the camera directly, call `sendMove(direction, delta)` and `sendRotation(camera.rotation.y)`
  - Receive authoritative position from server via callback and apply to camera
  - **Client-side prediction** (optional but recommended): apply movement locally immediately, then reconcile with server position. Simple approach: lerp camera toward server position each frame
- Export a function `setServerPosition(x, y, z)` that the network callback can call to update the player's authoritative position

### Task 3: Render Other Players

When the server reports other players in `state.players`, create visible representations.

**Implementation:**
- On `onPlayerAdd(player, sessionId)`:
  - Skip if `sessionId === getSessionId()` (that's us)
  - Create a colored `THREE.Mesh` (capsule or box shape) or `THREE.Sprite`
  - Position at `player.position.x/y/z`
  - Add to scene, store in a `Map<sessionId, mesh>`
- On `onPlayerChange(player, sessionId)`:
  - Update mesh position to `player.position`
  - Update mesh rotation to `player.rotationY`
  - Smoothly interpolate (lerp) between current and target position for visual smoothness
- On `onPlayerRemove(player, sessionId)`:
  - Remove mesh from scene and map
- **Visual**: use a distinct color per player (hash sessionId to a color), or use a simple procedural sprite

### Task 4: Adapt Enemies (`enemies.js`)

In multiplayer mode, enemies are server-authoritative. Remove local AI and render from server state.

**Changes:**
- Add a `multiplayerMode` flag
- In single-player: AI runs locally as Phase 1
- In multiplayer:
  - `createEnemies()` no longer spawns enemies from `ENEMY_SPAWNS` — instead, enemies are created via `onEnemyAdd` callback
  - `updateEnemies()` no longer runs AI — just interpolates sprite positions toward server-reported positions
  - Export `addServerEnemy(enemyId, data)`, `updateServerEnemy(enemyId, data)`, `removeServerEnemy(enemyId)` for the network module to call
  - Enemy sprites still billboard toward camera (THREE.Sprite handles this automatically)
  - Visual feedback for enemy state: change sprite tint or add animation based on `enemy.state` (idle/chase/attack)

### Task 5: Adapt Weapons (`weapons-logic.js`)

In multiplayer mode, shooting is server-validated.

**Changes:**
- In single-player: raycasting works locally as Phase 1
- In multiplayer:
  - On click: call `sendShoot(cameraForward, weaponType)` instead of local raycasting
  - Still play shoot sound and fire animation immediately (client-side feedback)
  - Wait for `hitConfirm` event from server to confirm the hit (show hit marker, play hit sound)
  - Ammo and score updates come from server state, not local tracking

### Task 6: Game Mode Switch (`main.js`)

Add multiplayer toggle to the game initialization.

```javascript
let multiplayerMode = false;

async function init() {
  // ... existing scene setup ...

  // Try to connect to server
  try {
    await connectToServer();
    multiplayerMode = true;
    console.log('Connected to multiplayer server');
  } catch (e) {
    console.log('No server found, running single-player');
    multiplayerMode = false;
  }

  // Pass mode to subsystems
  initPlayer(camera, controls, multiplayerMode);
  initEnemies(scene, multiplayerMode);
  initWeaponsLogic(camera, multiplayerMode);

  if (multiplayerMode) {
    registerCallbacks({
      onPlayerAdd: (player, id) => addOtherPlayer(player, id),
      onPlayerRemove: (player, id) => removeOtherPlayer(id),
      onEnemyAdd: (enemy, id) => addServerEnemy(id, enemy),
      onEnemyChange: (enemy, id) => updateServerEnemy(id, enemy),
      onEnemyRemove: (enemy, id) => removeServerEnemy(id),
      onHitConfirm: (data) => handleHitConfirm(data),
      onPlayerHit: (data) => handlePlayerHit(data),
      // ... etc
    });
  }
}
```

---

## Integration Points

- **Echo server first**: Agent 2's first deliverable is a minimal server that accepts connections and syncs player position. Test your `connectToServer()` and `sendMove()` against this.
- **Incremental testing**: as Agent 2 adds server features (collision, AI, combat), test each one:
  - Collision: try walking through walls — server should prevent it
  - AI: enemy sprites should move based on server state
  - Combat: shoot messages should produce hitConfirm events
  - PvP: open two browser tabs, verify players see each other
- **Two-tab testing**: always test multiplayer by opening two browser tabs to `localhost:5173`. Both should connect to the same Colyseus room.

---

## Verification

Phase 2 Lead is complete when:

1. **Connection**: game connects to Colyseus server on load, falls back to single-player if server unavailable
2. **Movement synced**: player position is server-authoritative in multiplayer mode
3. **Other players visible**: opening two tabs shows the other player as a colored mesh
4. **Other players move**: movement in one tab updates the mesh position in the other tab smoothly
5. **Enemies server-synced**: enemy sprites move based on server state, not local AI
6. **Shooting server-validated**: clicking sends shoot message, hitConfirm comes back, enemy takes damage
7. **PvP works**: player shots in one tab can damage the player in the other tab
8. **Single-player still works**: if server is offline, game runs in local single-player mode exactly as Phase 1
9. **No regressions**: all Phase 1 features (HUD, audio, weapon visuals) still work in both modes
