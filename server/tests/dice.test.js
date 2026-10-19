import assert from 'node:assert/strict';
import test from 'node:test';
import { rollDice } from '../../src/utils/dice.js';

test('rolls the requested number of dice and calculates their total', () => {
  const requestedSides = [];
  const roll = rollDice({ type: 'd6', count: 3 }, (sides) => {
    requestedSides.push(sides);
    return requestedSides.length;
  });

  assert.deepEqual(roll, { type: 'd6', sides: 6, count: 3, results: [1, 2, 3], total: 6 });
  assert.deepEqual(requestedSides, [6, 6, 6]);
});

test('supports d20 and d100 result ranges', () => {
  assert.deepEqual(rollDice({ type: 'd20', count: 1 }, (sides) => sides).results, [20]);
  assert.deepEqual(rollDice({ type: 'd100', count: 1 }, (sides) => sides).results, [100]);
});

test('normalizes invalid dice types and caps excessive counts', () => {
  const roll = rollDice({ type: 'd999', count: 500 }, () => 1);

  assert.equal(roll.type, 'd20');
  assert.equal(roll.count, 20);
  assert.equal(roll.results.length, 20);
  assert.equal(roll.total, 20);
});