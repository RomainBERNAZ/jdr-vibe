const diceSides = { d6: 6, d20: 20, d100: 100 };

const secureRandomInt = (maximum) => {
  if (!globalThis.crypto?.getRandomValues) {
    return Math.floor(Math.random() * maximum) + 1;
  }

  const range = 0x100000000;
  const limit = range - (range % maximum);
  const values = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return (values[0] % maximum) + 1;
};

export const rollDice = (configuration = {}, randomInt = secureRandomInt) => {
  const type = Object.hasOwn(diceSides, configuration.type) ? configuration.type : 'd20';
  const sides = diceSides[type];
  const requestedCount = Number(configuration.count);
  const count = Number.isInteger(requestedCount) ? Math.max(1, Math.min(requestedCount, 20)) : 1;
  const results = Array.from({ length: count }, () => randomInt(sides));

  return {
    type,
    sides,
    count,
    results,
    total: results.reduce((sum, value) => sum + value, 0)
  };
};