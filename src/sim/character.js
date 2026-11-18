import {
  HUNGER_DECAY_PER_SEC,
  INITIAL_HUNGER,
  STARVATION_DAMAGE_PER_SEC,
  STAT_GROWTH_PER_SEC,
} from './constants.js';

export function createCharacter({ id, name, role, x, y, birthTimestamp }) {
  return {
    id,
    name,
    role, // 'player' | 'npc'
    x,
    y,
    birthTimestamp,
    lastUpdatedTimestamp: birthTimestamp,
    // Global given stats grow +1/sec from birthTimestamp; damage subtracts from them
    healthDamage: 0,
    manaDamage: 0,
    staminaDamage: 0,
    // Talent stats: innate abilities, start at 0
    talents: {
      strength: 0,
      cunning: 0,
    },
    // Learning stats: start at 0, grow on matching actions
    learning: {
      asking: 0,
      trading: 0,
      foraging: 0,
      survival: 0,
    },
    // Survival need: fullness 0..100
    hunger: INITIAL_HUNGER,
    // Karma balance and per-creditor debts
    karma: 0,
    /** @type {Record<string, number>} */
    debts: {},
    lastHazardTimestamp: 0,
    alive: true,
    deathTimestamp: null,
    deathCause: null,
  };
}

export function getGlobalStats(character, nowMs) {
  const effectiveTime = character.alive ? nowMs : (character.deathTimestamp ?? nowMs);
  const ageSeconds = Math.max(0, (effectiveTime - character.birthTimestamp) / 1000);
  const rawHealth = ageSeconds * STAT_GROWTH_PER_SEC - character.healthDamage;
  const rawMana = ageSeconds * STAT_GROWTH_PER_SEC - (character.manaDamage ?? 0);
  const rawStamina = ageSeconds * STAT_GROWTH_PER_SEC - (character.staminaDamage ?? 0);

  return {
    ageSeconds,
    rawHealth,
    health: Math.max(0, rawHealth),
    mana: Math.max(0, rawMana),
    stamina: Math.max(0, rawStamina),
  };
}

export function advanceCharacterTime(character, nowMs) {
  if (!character.alive || nowMs <= character.lastUpdatedTimestamp) {
    return;
  }

  const dtSeconds = (nowMs - character.lastUpdatedTimestamp) / 1000;
  const timeToZeroHunger = character.hunger / HUNGER_DECAY_PER_SEC;

  if (dtSeconds <= timeToZeroHunger) {
    character.hunger = Math.max(0, character.hunger - HUNGER_DECAY_PER_SEC * dtSeconds);
    character.lastUpdatedTimestamp = nowMs;
    return;
  }

  // Hunger reaches 0 mid-interval; integrate exact starvation damage thereafter
  const starveStartMs = character.lastUpdatedTimestamp + timeToZeroHunger * 1000;
  const starvingSeconds = dtSeconds - timeToZeroHunger;
  const ageAtStarveStart = Math.max(0, (starveStartMs - character.birthTimestamp) / 1000);
  const healthAtStarveStart =
    ageAtStarveStart * STAT_GROWTH_PER_SEC - character.healthDamage;

  character.hunger = 0;
  character.healthDamage += STARVATION_DAMAGE_PER_SEC * starvingSeconds;

  const netDrainPerSec = STARVATION_DAMAGE_PER_SEC - STAT_GROWTH_PER_SEC;
  if (healthAtStarveStart <= 0 && ageAtStarveStart > 0) {
    character.alive = false;
    character.deathTimestamp = starveStartMs;
    character.deathCause = 'starvation';
  } else if (netDrainPerSec > 0) {
    const secondsToDeath = Math.max(0, healthAtStarveStart / netDrainPerSec);
    if (starvingSeconds >= secondsToDeath) {
      character.alive = false;
      character.deathTimestamp = starveStartMs + secondsToDeath * 1000;
      character.deathCause = 'starvation';
    }
  }

  character.lastUpdatedTimestamp = nowMs;
}

export function applyDamage(character, amount, nowMs, cause = 'damage') {
  if (!character.alive || amount <= 0) {
    return { died: false };
  }

  advanceCharacterTime(character, nowMs);
  if (!character.alive) {
    return { died: true, cause: character.deathCause };
  }

  character.healthDamage += amount;
  const { ageSeconds, rawHealth } = getGlobalStats(character, nowMs);

  // Newborn starts at 0 health; any lethal damage once age > 0 or amount > 0 kills
  if (rawHealth <= 0 && (ageSeconds > 0 || amount > 0)) {
    character.alive = false;
    character.deathTimestamp = nowMs;
    character.deathCause = cause;
    return { died: true, cause };
  }

  // Surviving damage teaches survival
  if (character.learning) {
    character.learning.survival = (character.learning.survival ?? 0) + 1;
  }

  return { died: false };
}
