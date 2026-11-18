import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASK_FOOD_HUNGER_GAIN,
  ASK_FOOD_KARMA_COST,
  BIRTH_KARMA_DEBT,
  CHILD_FEED_KARMA_MULTIPLIER,
  HUNGER_DECAY_PER_SEC,
  INITIAL_HUNGER,
  THORN_DAMAGE,
} from '../src/sim/constants.js';
import {
  advanceCharacterTime,
  applyDamage,
  createCharacter,
  getGlobalStats,
} from '../src/sim/character.js';
import { askForFood, feedChild, registerBirthKarma } from '../src/sim/karma.js';
import { advanceWorld, createWorld } from '../src/sim/world.js';

test('new characters start at zero for every stat', () => {
  const t0 = 1_000_000;
  const c = createCharacter({
    id: 'c1',
    name: 'Test',
    role: 'player',
    x: 100,
    y: 100,
    birthTimestamp: t0,
  });

  const global = getGlobalStats(c, t0);
  assert.equal(global.health, 0);
  assert.equal(global.mana, 0);
  assert.equal(global.stamina, 0);
  assert.equal(c.talents.strength, 0);
  assert.equal(c.talents.cunning, 0);
  assert.equal(c.learning.asking, 0);
  assert.equal(c.learning.trading, 0);
  assert.equal(c.learning.foraging, 0);
  assert.equal(c.learning.survival, 0);
  assert.equal(c.karma, 0);
});

test('global given stats grow +1/sec from birth and keep growing after damage', () => {
  const t0 = 1_000_000;
  const c = createCharacter({
    id: 'c1',
    name: 'Test',
    role: 'player',
    x: 100,
    y: 100,
    birthTimestamp: t0,
  });

  const t10 = t0 + 10_000;
  assert.equal(getGlobalStats(c, t10).health, 10);
  assert.equal(getGlobalStats(c, t10).mana, 10);

  const dmgRes = applyDamage(c, THORN_DAMAGE, t10, 'thorns');
  assert.equal(dmgRes.died, false);
  assert.equal(getGlobalStats(c, t10).health, 10 - THORN_DAMAGE);
  assert.equal(c.learning.survival, 1);

  const t13 = t10 + 3_000;
  assert.equal(getGlobalStats(c, t13).health, 10 - THORN_DAMAGE + 3);
  assert.equal(getGlobalStats(c, t13).mana, 13);
});

test('hunger decays over time and asking NPC for food transfers karma and teaches skills', () => {
  const t0 = 1_000_000;
  const player = createCharacter({
    id: 'p1',
    name: 'Player',
    role: 'player',
    x: 100,
    y: 100,
    birthTimestamp: t0,
  });
  const npc = createCharacter({
    id: 'n1',
    name: 'Elder Mara',
    role: 'npc',
    x: 110,
    y: 100,
    birthTimestamp: t0,
  });

  const t25 = t0 + 25_000;
  advanceCharacterTime(player, t25);
  assert.equal(player.hunger, INITIAL_HUNGER - 25 * HUNGER_DECAY_PER_SEC);

  const expectedRestored = Math.min(ASK_FOOD_HUNGER_GAIN, 100 - player.hunger);
  const res = askForFood(player, npc, t25);

  assert.equal(res.ok, true);
  assert.equal(res.karmaTransferred, ASK_FOOD_KARMA_COST);
  assert.equal(res.hungerRestored, expectedRestored);
  assert.equal(player.karma, -ASK_FOOD_KARMA_COST);
  assert.equal(npc.karma, ASK_FOOD_KARMA_COST);
  assert.equal(player.debts[npc.id], ASK_FOOD_KARMA_COST);
  assert.equal(player.learning.asking, 1);
  assert.equal(npc.learning.trading, 1);
});

test('parent-child birth creates karma debt and feeding a child multiplies it', () => {
  const t0 = 1_000_000;
  const parent = createCharacter({
    id: 'parent',
    name: 'Parent',
    role: 'npc',
    x: 100,
    y: 100,
    birthTimestamp: t0,
  });
  const child = createCharacter({
    id: 'child',
    name: 'Child',
    role: 'npc',
    x: 105,
    y: 100,
    birthTimestamp: t0 + 1_000,
  });

  registerBirthKarma(parent, child);
  assert.equal(child.debts[parent.id], BIRTH_KARMA_DEBT);
  assert.equal(child.karma, -BIRTH_KARMA_DEBT);

  child.hunger = 40;
  const feedRes = feedChild(parent, child, 30);
  assert.equal(feedRes.ok, true);
  assert.equal(
    child.debts[parent.id],
    BIRTH_KARMA_DEBT * CHILD_FEED_KARMA_MULTIPLIER
  );
  assert.equal(
    child.karma,
    -(BIRTH_KARMA_DEBT * CHILD_FEED_KARMA_MULTIPLIER)
  );
  assert.equal(child.hunger, 70);
});

test('prolonged starvation kills character and respawns Gen 2 at zero stats', () => {
  const t0 = 1_000_000;
  const world = createWorld(t0);

  const t10 = t0 + 10_000;
  advanceWorld(world, t10);
  assert.equal(world.generation, 1);
  assert.equal(getGlobalStats(world.player, t10).health, 10);

  // At 50s hunger hits 0; at 75s net -2 HP/s wipes out 50s of HP
  const t80 = t0 + 80_000;
  const res = advanceWorld(world, t80);

  assert.equal(res.playerRespawned, true);
  assert.equal(res.deathCause, 'starvation');
  assert.equal(world.generation, 2);
  assert.equal(world.player.birthTimestamp, t80);
  assert.equal(getGlobalStats(world.player, t80).health, 0);
  assert.equal(getGlobalStats(world.player, t80).mana, 0);
  assert.equal(getGlobalStats(world.player, t80).stamina, 0);
  assert.equal(world.player.karma, 0);
  assert.equal(world.player.learning.asking, 0);
});
