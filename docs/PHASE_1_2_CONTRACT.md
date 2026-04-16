# Phase 1→2 Contract — Multiplayer Protocol Agreement

## Purpose

Before either agent writes Phase 2 code, both must agree on the exact data shapes flowing between client and server. This document is the contract. Any deviation breaks the other agent's code.

**Agent 2 creates `shared/protocol.js` from this spec. Agent 1 imports from it.**

---

## Room Configuration

- **Room name**: `"moon-doom"`
- **Server URL**: `ws://localhost:2567` (proxied through Vite as `/colyseus`)
- **Client connection**:
  ```javascript
  import { Client } from 'colyseus.js';
  const client = new Client('ws://localhost:2567');
  const room = await client.joinOrCreate('moon-doom');
  ```

---

## Message Types — Client → Server

These are the messages Agent 1 sends from `network.js` and Agent 2 handles in `GameRoom.ts`.

### `shared/protocol.js`

Agent 2 creates this file:

```javascript
// shared/protocol.js
// Message type constants — used by both client and server

export const MSG_MOVE = 'move';
export const MSG_ROTATE = 'rotate';
export const MSG_SHOOT = 'shoot';
export const MSG_JUMP = 'jump';
```

### Message Payloads

```javascript
// MSG_MOVE — player wants to move
{ direction: { x: number, z: number }, deltaTime: number }
// direction is a normalized vector relative to camera facing
// deltaTime is the frame delta in seconds

// MSG_ROTATE — player looked around
{ rotationY: number }
// rotationY is the horizontal camera rotation in radians

// MSG_SHOOT — player fired weapon
{ direction: { x: number, y: number, z: number }, weaponType: string }
// direction is a normalized 3D vector (camera forward)
// weaponType is 'blaster' (Phase 2), expands in Phase 3

// MSG_JUMP — player wants to jump
{ }
// No payload — server checks if player is grounded
```

---

## Server → Client State Schema

These are the Colyseus schema property paths that Agent 1 reads in `network.js` state change listeners.

### GameState (root)

```
state.players    → MapSchema<Player>   (keyed by session ID)
state.enemies    → MapSchema<Enemy>    (keyed by enemy ID string)
state.gameTime   → number              (server elapsed seconds)
```

### Player Schema

```
player.position.x   → number
player.position.y   → number
player.position.z   → number
player.rotationY    → number
player.health       → number  (0–100)
player.ammo         → number
player.score        → number
player.alive        → boolean
```

### Enemy Schema

```
enemy.position.x    → number
enemy.position.y    → number
enemy.position.z    → number
enemy.health        → number  (0–100)
enemy.state         → string  ("idle" | "chase" | "attack")
enemy.targetId      → string  (session ID of player being targeted, "" if idle)
enemy.enemyType     → string  ("grunt" — extensible in Phase 3)
```

---

## Server → Client Events

Beyond schema sync, the server sends these one-off messages for immediate feedback:

```javascript
// Hit confirmation — sent to the shooting player
room.onMessage('hitConfirm', ({ enemyId, damage, killed }) => { });

// Player hit — sent to the damaged player
room.onMessage('playerHit', ({ attackerId, damage }) => { });

// Player killed — broadcast to all
room.onMessage('playerKilled', ({ killerId, victimId }) => { });

// Player respawned — broadcast to all
room.onMessage('playerRespawned', ({ playerId, position }) => { });
```

---

## Client State Listeners (Agent 1 reference)

How Agent 1's `network.js` will listen for state changes:

```javascript
// New player joined
room.state.players.onAdd((player, sessionId) => {
  // Create mesh/sprite for this player (skip if sessionId === room.sessionId)
});

// Player left
room.state.players.onRemove((player, sessionId) => {
  // Remove mesh/sprite
});

// Player state changed
room.state.players.onChange((player, sessionId) => {
  // Update position, rotation, health for remote players
});

// Enemy added
room.state.enemies.onAdd((enemy, enemyId) => {
  // Create enemy sprite
});

// Enemy removed
room.state.enemies.onRemove((enemy, enemyId) => {
  // Remove enemy sprite
});

// Enemy state changed — position, AI state, health
room.state.enemies.onChange((enemy, enemyId) => {
  // Update sprite position, visual state
});
```

---

## Handoff Sequence

1. **Agent 2 creates `shared/protocol.js`** with the message constants above — first task in Phase 2
2. **Agent 2 builds echo server** — minimal GameRoom that accepts connections, handles `move`/`rotate` messages, syncs player position. No collision, no AI yet
3. **Agent 1 tests basic connection** against the echo server — join room, see own player in state, move, confirm position updates
4. **Agent 2 incrementally adds**: collision → enemy AI → combat → PvP → respawn
5. **Agent 1 tests each increment** by exercising the corresponding client feature

Both agents can work in parallel throughout — Agent 2 enriches the server, Agent 1 builds client network code against whatever server features are available.
