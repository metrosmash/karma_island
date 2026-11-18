import {
  INTERACT_DISTANCE_PX,
  MAX_HUNGER,
  NPC_AUTO_EAT_GAIN,
  NPC_AUTO_EAT_THRESHOLD,
  PLAYER_RADIUS_PX,
  PLAYER_SPEED_PX,
  THORN_COOLDOWN_MS,
  THORN_DAMAGE,
  TILE_SIZE,
  TILES,
} from './constants.js';
import {
  advanceCharacterTime,
  applyDamage,
  createCharacter,
} from './character.js';
import { askForFood } from './karma.js';
import { createIslandMap, getTileAtPixel, isWalkableCircle } from './map.js';

const PLAYER_SPAWN = {
  x: 5 * TILE_SIZE + TILE_SIZE / 2,
  y: 7 * TILE_SIZE + TILE_SIZE / 2,
};

const NPC_SPAWN = {
  x: 12 * TILE_SIZE + TILE_SIZE / 2,
  y: 5 * TILE_SIZE + TILE_SIZE / 2,
};

export function addWorldLog(world, message) {
  world.events.unshift(message);
  if (world.events.length > 12) {
    world.events.length = 12;
  }
}

export function createWorld(nowMs = Date.now()) {
  return {
    version: 1,
    generation: 1,
    npcGeneration: 1,
    map: createIslandMap(),
    player: createCharacter({
      id: 'player-1',
      name: 'Castaway #1',
      role: 'player',
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      birthTimestamp: nowMs,
    }),
    npcs: [
      createCharacter({
        id: 'npc-1',
        name: 'Elder Mara',
        role: 'npc',
        x: NPC_SPAWN.x,
        y: NPC_SPAWN.y,
        birthTimestamp: nowMs,
      }),
    ],
    events: ['Gen 1 washed ashore. All stats start at 0.'],
    lastTickTimestamp: nowMs,
  };
}

export function respawnPlayer(world, nowMs, deathCause) {
  world.generation += 1;
  addWorldLog(
    world,
    `Castaway #${world.generation - 1} died (${deathCause}). Gen ${world.generation} starts at 0 stats.`
  );
  world.player = createCharacter({
    id: `player-${world.generation}`,
    name: `Castaway #${world.generation}`,
    role: 'player',
    x: PLAYER_SPAWN.x,
    y: PLAYER_SPAWN.y,
    birthTimestamp: nowMs,
  });
}

export function advanceWorld(world, nowMs = Date.now()) {
  let playerRespawned = false;
  let deathCause = null;

  advanceCharacterTime(world.player, nowMs);
  if (!world.player.alive) {
    deathCause = world.player.deathCause ?? 'unknown';
    respawnPlayer(world, nowMs, deathCause);
    playerRespawned = true;
  }

  for (let i = 0; i < world.npcs.length; i += 1) {
    const npc = world.npcs[i];
    advanceCharacterTime(npc, nowMs);

    if (!npc.alive) {
      world.npcGeneration += 1;
      addWorldLog(world, `${npc.name} perished. The island spawned a new Elder at 0 stats.`);
      world.npcs[i] = createCharacter({
        id: `npc-${world.npcGeneration}`,
        name: `Elder Mara #${world.npcGeneration}`,
        role: 'npc',
        x: NPC_SPAWN.x,
        y: NPC_SPAWN.y,
        birthTimestamp: nowMs,
      });
      continue;
    }

    if (npc.hunger <= NPC_AUTO_EAT_THRESHOLD) {
      npc.hunger = Math.min(MAX_HUNGER, npc.hunger + NPC_AUTO_EAT_GAIN);
      npc.learning.foraging += 1;
      addWorldLog(world, `${npc.name} foraged wild berries (+1 Foraging).`);
    }
  }

  world.lastTickTimestamp = nowMs;
  return { playerRespawned, deathCause };
}

export function movePlayer(world, dirX, dirY, dtSeconds, nowMs = Date.now()) {
  if (!world.player.alive || (dirX === 0 && dirY === 0)) {
    return { moved: false, hazardHit: false, playerRespawned: false };
  }

  const len = Math.hypot(dirX, dirY);
  const nx = dirX / len;
  const ny = dirY / len;
  const step = PLAYER_SPEED_PX * dtSeconds;

  let moved = false;
  const tryX = world.player.x + nx * step;
  if (isWalkableCircle(world.map, tryX, world.player.y, PLAYER_RADIUS_PX)) {
    world.player.x = tryX;
    moved = true;
  }

  const tryY = world.player.y + ny * step;
  if (isWalkableCircle(world.map, world.player.x, tryY, PLAYER_RADIUS_PX)) {
    world.player.y = tryY;
    moved = true;
  }

  let hazardHit = false;
  let playerRespawned = false;
  const tile = getTileAtPixel(world.map, world.player.x, world.player.y);
  if (tile === TILES.THORNS && nowMs - world.player.lastHazardTimestamp >= THORN_COOLDOWN_MS) {
    world.player.lastHazardTimestamp = nowMs;
    hazardHit = true;
    const res = applyDamage(world.player, THORN_DAMAGE, nowMs, 'thorns');
    addWorldLog(world, `Stepped on bramble thorns: -${THORN_DAMAGE} Health.`);
    if (res.died) {
      respawnPlayer(world, nowMs, res.cause);
      playerRespawned = true;
    }
  }

  return { moved, hazardHit, playerRespawned };
}

export function getNearestInteractableNpc(world) {
  let best = null;
  let bestDist = Infinity;

  for (const npc of world.npcs) {
    if (!npc.alive) continue;
    const dist = Math.hypot(npc.x - world.player.x, npc.y - world.player.y);
    if (dist <= INTERACT_DISTANCE_PX && dist < bestDist) {
      best = npc;
      bestDist = dist;
    }
  }
  return best;
}

export function playerAskNearestNpcForFood(world, nowMs = Date.now()) {
  const npc = getNearestInteractableNpc(world);
  if (!npc) {
    addWorldLog(world, 'Move closer to Elder Mara to ask for food.');
    return { ok: false, reason: 'too_far' };
  }

  const result = askForFood(world.player, npc, nowMs);
  if (result.ok) {
    addWorldLog(
      world,
      `Asked ${npc.name} for food: -${result.karmaTransferred} Karma, +${Math.round(result.hungerRestored)} Hunger.`
    );
  } else if (result.reason === 'not_hungry') {
    addWorldLog(world, 'You are already full.');
  } else if (result.reason === 'karma_limit') {
    addWorldLog(world, `${npc.name} refused: karma debt limit reached.`);
  }
  return result;
}

// Shifts timestamps backward to simulate closed-tab elapsed time during testing
export function shiftWorldTimeBack(world, deltaMs) {
  const chars = [world.player, ...world.npcs];
  for (const c of chars) {
    c.birthTimestamp -= deltaMs;
    c.lastUpdatedTimestamp -= deltaMs;
    if (c.lastHazardTimestamp > 0) {
      c.lastHazardTimestamp -= deltaMs;
    }
  }
  world.lastTickTimestamp -= deltaMs;
}
