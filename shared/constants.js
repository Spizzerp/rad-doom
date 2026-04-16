// shared/constants.js
// Gameplay constants — single source of truth for client and server

// Grid & Level
export const CELL_SIZE = 4;           // World units per grid cell
export const WALL_HEIGHT = 4;         // Height of wall geometry

// Player
export const PLAYER_SPEED = 8;        // Units per second
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_START_AMMO = 50;
export const JUMP_VELOCITY = 6;
export const GRAVITY = 9.8 * 0.6;     // Moon gravity (0.6x Earth)
export const PLAYER_HEIGHT = 1.6;     // Camera Y position
export const HEAD_BOB_SPEED = 10;
export const HEAD_BOB_AMPLITUDE = 0.05;

// Enemies
export const ENEMY_SPEED = 3;         // Units per second
export const ENEMY_HEALTH = 100;
export const ENEMY_DAMAGE = 10;       // Damage per attack
export const ENEMY_ATTACK_RANGE = 2;  // Units
export const ENEMY_DETECT_RANGE = 15; // Units — triggers chase
export const ENEMY_ATTACK_COOLDOWN = 1.0; // Seconds between attacks

// Combat
export const BLASTER_DAMAGE = 25;
export const BLASTER_FIRE_RATE = 0.3; // Seconds between shots
export const BLASTER_AMMO_COST = 1;

// Pickups
export const HEALTH_PICKUP_AMOUNT = 25;
export const AMMO_PICKUP_AMOUNT = 15;
export const PICKUP_RESPAWN_TIME = 30; // Seconds

// Respawn
export const RESPAWN_TIME = 3;        // Seconds

// Multiplayer
export const SERVER_TICK_RATE = 20;   // Hz (50ms intervals)
export const SERVER_PORT = 2567;

// Rendering
export const CAMERA_FOV = 75;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 1000;
export const AMBIENT_LIGHT_COLOR = 0x333344;
export const BACKGROUND_COLOR = 0x000011;
