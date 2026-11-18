import {
  ASK_FOOD_HUNGER_GAIN,
  ASK_FOOD_KARMA_COST,
  BIRTH_KARMA_DEBT,
  CHILD_FEED_KARMA_MULTIPLIER,
  MAX_HUNGER,
  MAX_KARMA_DEBT,
} from './constants.js';
import { advanceCharacterTime } from './character.js';

export function askForFood(requester, provider, nowMs) {
  advanceCharacterTime(requester, nowMs);
  advanceCharacterTime(provider, nowMs);

  if (!requester.alive || !provider.alive) {
    return { ok: false, reason: 'dead' };
  }

  if (requester.hunger >= MAX_HUNGER - 1) {
    return { ok: false, reason: 'not_hungry' };
  }

  if (requester.karma - ASK_FOOD_KARMA_COST < -MAX_KARMA_DEBT) {
    return { ok: false, reason: 'karma_limit' };
  }

  requester.karma -= ASK_FOOD_KARMA_COST;
  provider.karma += ASK_FOOD_KARMA_COST;
  requester.debts[provider.id] = (requester.debts[provider.id] ?? 0) + ASK_FOOD_KARMA_COST;

  const beforeHunger = requester.hunger;
  requester.hunger = Math.min(MAX_HUNGER, requester.hunger + ASK_FOOD_HUNGER_GAIN);

  // Every action teaches something in the matching learning stat
  requester.learning.asking += 1;
  provider.learning.trading += 1;

  return {
    ok: true,
    karmaTransferred: ASK_FOOD_KARMA_COST,
    hungerRestored: requester.hunger - beforeHunger,
  };
}

export function registerBirthKarma(parent, child) {
  child.debts[parent.id] = (child.debts[parent.id] ?? 0) + BIRTH_KARMA_DEBT;
  child.karma -= BIRTH_KARMA_DEBT;
  parent.karma += BIRTH_KARMA_DEBT;
}

export function feedChild(parent, child, hungerGain = ASK_FOOD_HUNGER_GAIN) {
  if (!parent.alive || !child.alive) {
    return { ok: false, reason: 'dead' };
  }

  const currentDebt = child.debts[parent.id] ?? BIRTH_KARMA_DEBT;
  const multipliedDebt = currentDebt * CHILD_FEED_KARMA_MULTIPLIER;
  const delta = multipliedDebt - currentDebt;

  child.debts[parent.id] = multipliedDebt;
  child.karma -= delta;
  parent.karma += delta;
  child.hunger = Math.min(MAX_HUNGER, child.hunger + hungerGain);

  return {
    ok: true,
    previousDebt: currentDebt,
    newDebt: multipliedDebt,
    karmaDelta: delta,
  };
}
