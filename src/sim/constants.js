export const TILE_SIZE = 32;
export const MAP_COLS = 20;
export const MAP_ROWS = 15;

export const TILES = Object.freeze({
  WATER: 0,
  SAND: 1,
  GRASS: 2,
  THORNS: 3,
  TREE: 4,
  CAMP: 5,
});

export const PLAYER_SPEED_PX = 128;
export const PLAYER_RADIUS_PX = 10;
export const INTERACT_DISTANCE_PX = 52;

// Global given stats grow +1 per second from birth
export const STAT_GROWTH_PER_SEC = 1;

// Hunger & survival defaults
export const MAX_HUNGER = 100;
export const INITIAL_HUNGER = 100;
export const HUNGER_DECAY_PER_SEC = 2.0; // Full -> 0 in 50 seconds
export const STARVATION_DAMAGE_PER_SEC = 3.0; // Net -2 HP/s while starving (+1 regen - 3 dmg)

// Hazard tile defaults
export const THORN_DAMAGE = 4;
export const THORN_COOLDOWN_MS = 1200;

// Karma economy defaults
export const ASK_FOOD_KARMA_COST = 5;
export const ASK_FOOD_HUNGER_GAIN = 35;
export const MAX_KARMA_DEBT = 25;
export const BIRTH_KARMA_DEBT = 10;
export const CHILD_FEED_KARMA_MULTIPLIER = 2;

// NPC self-preservation in Milestone 1
export const NPC_AUTO_EAT_THRESHOLD = 25;
export const NPC_AUTO_EAT_GAIN = 40;
