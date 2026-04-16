# Phase 2 — Colyseus Server (Agent 2 / Support)

## Context

You are **Agent 2 (Support)**. Phase 1 is complete — the client has a working single-player FPS. Now you build the authoritative multiplayer server using Colyseus.

**Agent 1 is building the client network layer in parallel** (see PHASE_2_LEAD.md). They need a running server to test against. Your **first priority** is delivering a minimal echo server, then incrementally adding features.

**Critical reference**: `docs/PHASE_1_2_CONTRACT.md` — the exact message types, schema shapes, and event formats. Every property name and type must match exactly.

**Spec reference**: `MOON_DOOM_SPEC.md` — "Multiplayer Architecture" (line ~188), "Colyseus Room State Schema" (line ~204), "Server Game Loop" (line ~252).

---

## Goal

A fully authoritative Colyseus game server: player movement with collision, enemy AI, combat validation (PvE and PvP), pickups, death/respawn — all running at 20Hz tick rate.

---

## File Ownership

You **create and own** everything in `server/src/`:
- `server/src/index.ts` — server entry point
- `server/src/rooms/GameRoom.ts` — room lifecycle, message handlers, game loop
- `server/src/rooms/schema/GameState.ts` — Colyseus state schemas
- `server/src/game/level.ts` — server-side collision using shared level data
- `server/src/game/enemy-ai.ts` — enemy AI state machine
- `server/src/game/combat.ts` — damage calculation, hit detection

You also **create**:
- `shared/protocol.js` — message type constants (your first task!)

You **import from** (read-only):
- `shared/constants.js` — gameplay constants
- `shared/level-data.js` — level grid, spawn points, enemy spawns, isWall()

You **never touch**:
- `client/src/main.js`, `client/src/player.js`, `client/src/level.js`, `client/src/enemies.js`, `client/src/weapons-logic.js`, `client/src/network.js` — Agent 1's files
- `client/src/hud.js`, `client/src/audio.js`, `client/src/weapons-visuals.js` — your Phase 1 files (stable now)
- `client/index.html`, `client/style.css`

---

## Tasks (Ordered for Incremental Delivery)

Each task produces a testable increment. Agent 1 can test against your server after each one.

### Task 0: Create `shared/protocol.js`

**Do this first.** Agent 1 needs to import these constants.

```javascript
// shared/protocol.js
// Message type constants — used by both client and server

export const MSG_MOVE = 'move';
export const MSG_ROTATE = 'rotate';
export const MSG_SHOOT = 'shoot';
export const MSG_JUMP = 'jump';
```

### Task 1: State Schemas (`server/src/rooms/schema/GameState.ts`)

Define the Colyseus state classes exactly matching the contract.

```typescript
import { Schema, MapSchema, type } from '@colyseus/schema';

export class Position extends Schema {
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 0;
}

export class Player extends Schema {
  @type(Position) position = new Position();
  @type('number') rotationY: number = 0;
  @type('number') health: number = 100;
  @type('number') ammo: number = 50;
  @type('number') score: number = 0;
  @type('boolean') alive: boolean = true;
}

export class Enemy extends Schema {
  @type(Position) position = new Position();
  @type('number') health: number = 100;
  @type('string') state: string = 'idle';     // idle | chase | attack
  @type('string') targetId: string = '';       // session ID of target player
  @type('string') enemyType: string = 'grunt';
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Enemy }) enemies = new MapSchema<Enemy>();
  @type('number') gameTime: number = 0;
}
```

### Task 2: Echo Server — Minimal GameRoom (`server/src/rooms/GameRoom.ts`)

The first testable deliverable. Agent 1 can connect, see their player in state, and move.

```typescript
import { Room, Client } from '@colyseus/core';
import { GameState, Player, Enemy, Position } from './schema/GameState';
// Import message types — you may need to configure TS to import .js from shared/
// Options: use relative path with .js extension, or copy constants inline temporarily

export class GameRoom extends Room<GameState> {
  maxClients = 8;

  onCreate(options: any) {
    this.setState(new GameState());

    // Set up simulation interval at 20Hz
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));

    // Message handlers
    this.onMessage('move', (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) return;
      // Simple position update (no collision yet in echo server)
      player.position.x += data.direction.x * 8 * data.deltaTime;
      player.position.z += data.direction.z * 8 * data.deltaTime;
    });

    this.onMessage('rotate', (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) player.rotationY = data.rotationY;
    });

    this.onMessage('shoot', (client, data) => {
      // Placeholder — combat added in Task 5
    });

    this.onMessage('jump', (client, data) => {
      // Placeholder — jump physics added in Task 3
    });
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    // Assign spawn point
    const spawnPoints = [/* import from shared/level-data.js */];
    const spawn = spawnPoints[this.state.players.size % spawnPoints.length];
    player.position.x = spawn.x * 4 + 2; // CELL_SIZE * gridX + offset
    player.position.y = 1.6;              // PLAYER_HEIGHT
    player.position.z = spawn.z * 4 + 2;
    player.health = 100;
    player.ammo = 50;
    this.state.players.set(client.sessionId, player);

    // Spawn initial enemies (only if first player — don't re-spawn on each join)
    if (this.state.players.size === 1) {
      this.spawnEnemies();
    }
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }

  update(deltaTime: number) {
    this.state.gameTime += deltaTime / 1000;
    // Placeholder — AI and physics added in later tasks
  }

  spawnEnemies() {
    // Create Enemy instances from ENEMY_SPAWNS
    // Add to this.state.enemies with string IDs
  }
}
```

**Configure the server entry point** (`server/src/index.ts`):
```typescript
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './rooms/GameRoom';
import express from 'express';

const app = express();
const server = new Server({
  transport: new WebSocketTransport({ server: app.listen(2567) }),
});

server.define('moon-doom', GameRoom);
console.log('Moon Doom server listening on ws://localhost:2567');
```

**Verify**: `npm run dev` (or `npx ts-node-dev src/index.ts`) starts the server. Agent 1 can connect from the client.

### Task 3: Server-Side Collision & Physics (`server/src/game/level.ts`)

Import the shared level data and implement server-side collision checks that match the client's behavior.

```typescript
import { LEVEL_01, isWall } from '../../../shared/level-data.js';
import { CELL_SIZE, PLAYER_SPEED, GRAVITY, JUMP_VELOCITY, PLAYER_HEIGHT } from '../../../shared/constants.js';
```

**Implementation:**
- `validateMovement(currentPos, desiredPos, level)` — grid collision check:
  - Convert desired position to grid coords
  - Check `isWall()` for the target cell
  - Wall sliding: if diagonal blocked, try X-only and Z-only
  - Add collision radius (~0.3 units)
  - Return the valid final position
- Integrate into GameRoom's `move` handler: replace direct position update with `validateMovement()`
- **Jump/gravity on server**: track `velocityY` per player, apply `GRAVITY * delta` each tick, handle jump request by setting `velocityY = JUMP_VELOCITY` if grounded

**Note on importing JS from TS**: If TypeScript can't import `.js` files from `shared/`, configure `tsconfig.json` with `"allowJs": true` and `"rootDir": ".."`, or use a path alias, or create `.d.ts` declaration files for the shared modules.

### Task 4: Server-Side Enemy AI (`server/src/game/enemy-ai.ts`)

Port the enemy AI state machine to run on the server.

```typescript
import { Enemy, Player } from '../rooms/schema/GameState';
import { LEVEL_01, isWall } from '../../../shared/level-data.js';
import { CELL_SIZE, ENEMY_SPEED, ENEMY_DETECT_RANGE, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_COOLDOWN, ENEMY_DAMAGE } from '../../../shared/constants.js';
```

**Implementation:**
- `updateEnemyAI(enemy, players, level, delta)` — called for each enemy each server tick:
  - Find nearest visible player (distance + line-of-sight check through grid)
  - **Idle**: if nearest player within `ENEMY_DETECT_RANGE` and line-of-sight clear → Chase
  - **Chase**: move toward target at `ENEMY_SPEED`, with grid collision. If within `ENEMY_ATTACK_RANGE` → Attack. If target out of range → Idle
  - **Attack**: decrement attack cooldown. When cooldown reaches 0: deal `ENEMY_DAMAGE` to target player, reset cooldown. If target moves out of range → Chase
- **Line-of-sight**: step through grid from enemy to player checking `isWall()` at each cell
- **Enemy movement collision**: same grid check as player movement
- Update `enemy.state`, `enemy.targetId`, and `enemy.position` on the schema — Colyseus auto-syncs to clients
- When enemy attacks a player: send a `'playerHit'` message to that specific client

### Task 5: Combat Validation (`server/src/game/combat.ts`)

Server-side hit detection for shooting.

```typescript
import { Player, Enemy, GameState } from '../rooms/schema/GameState';
import { BLASTER_DAMAGE, BLASTER_AMMO_COST } from '../../../shared/constants.js';
```

**Implementation:**

- `processShot(shooter, direction, weaponType, state, level)`:
  - Check shooter is alive and has ammo
  - Deduct ammo (`BLASTER_AMMO_COST`)
  - **Ray march** from shooter position in the given direction:
    - Step along the ray in small increments (e.g., 0.5 units)
    - At each step, check proximity to each enemy and each other player
    - If within hit radius (~0.5 units) of an enemy: apply damage, return hit result
    - If within hit radius of another player: apply damage, return PvP hit
    - If the ray enters a wall cell: miss (ray blocked)
    - Max range: ~50 units
  - Return `{ hit: boolean, targetType: 'enemy'|'player'|null, targetId, damage, killed }`
- Integrate into GameRoom's `shoot` handler:
  ```typescript
  this.onMessage('shoot', (client, data) => {
    const player = this.state.players.get(client.sessionId);
    if (!player?.alive) return;
    const result = processShot(player, data.direction, data.weaponType, this.state, LEVEL_01);
    if (result.hit) {
      client.send('hitConfirm', { enemyId: result.targetId, damage: result.damage, killed: result.killed });
      if (result.killed) player.score += 100;
      if (result.targetType === 'player') {
        const victim = this.clients.find(c => c.sessionId === result.targetId);
        if (victim) victim.send('playerHit', { attackerId: client.sessionId, damage: result.damage });
      }
    }
  });
  ```

### Task 6: Death & Respawn System

- When a player's health reaches 0:
  - Set `player.alive = false`
  - Broadcast `'playerKilled'` to all clients
  - Start respawn timer (3 seconds)
  - After timer: reset health to 100, ammo to 50, set `alive = true`, move to random spawn point
  - Broadcast `'playerRespawned'` to all clients
- When an enemy's health reaches 0:
  - Remove from `state.enemies`
  - Start respawn timer (e.g., 30 seconds)
  - After timer: re-add with full health at original spawn position

### Task 7: Pickup System

- On room creation, spawn pickups at `PICKUP_SPAWNS` positions (track as internal state, not schema — pickups don't need constant syncing)
- Each server tick: check if any alive player is within pickup radius (~1 unit) of an active pickup
- On collection:
  - Health pickup: `player.health = Math.min(player.health + 25, 100)`
  - Ammo pickup: `player.ammo += 15`
  - Send a `'pickupCollected'` message to the collecting client (for audio/visual feedback)
  - Mark pickup as collected, start respawn timer

---

## Server Startup

Ensure the server runs with:
```bash
cd server
npm run dev  # or: npx ts-node-dev --respawn src/index.ts
```

The server should:
- Listen on `ws://localhost:2567`
- Register the `'moon-doom'` room
- Log connections and disconnections

---

## Verification

Phase 2 Support is complete when:

1. **Server starts**: `npm run dev` in `server/` starts without errors, logs "listening on 2567"
2. **Client connects**: Agent 1's client can `joinOrCreate('moon-doom')` successfully
3. **Player sync**: two browser tabs both connect, each sees the other as a player in `state.players`
4. **Movement validated**: player cannot walk through walls (server collision blocks it)
5. **Enemy AI runs**: enemies appear in `state.enemies`, move toward players, attack when close
6. **Combat works**: shoot message → server ray march → hitConfirm event sent back → enemy takes damage
7. **PvP works**: shoot message hitting another player → playerHit event → damage applied
8. **Death/respawn**: player dying → playerKilled broadcast → 3s timer → playerRespawned broadcast → full health at spawn point
9. **Enemy respawn**: killed enemy reappears after timer
10. **Pickups work**: walking over a pickup → health/ammo updated → pickup disappears → respawns after timer
11. **20Hz tick**: `setSimulationInterval` runs at 50ms intervals, game state updates smoothly

Test with two browser tabs at `localhost:5173` (Vite dev server).
