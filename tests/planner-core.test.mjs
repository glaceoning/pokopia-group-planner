import assert from 'node:assert/strict';

import {
  buildImportCandidates,
  canonicalizeMapName,
  matchesRequirements,
  normalizeMapSet,
  parseImportTextFromLookup,
  sanitizeFreeText,
  setFrom,
} from '../planner-core.mjs';

const lookup = new Map([
  ['pikachu', 'pikachu'],
  ['25', 'pikachu'],
  ['025', 'pikachu'],
  ['lucario', 'lucario'],
  ['448', 'lucario'],
  ['eevee', 'eevee'],
]);

assert.equal(canonicalizeMapName('Pallette Town'), 'Palette Town');
assert.equal(canonicalizeMapName('Withered Wasteland'), 'Withered Wastelands');
assert.deepEqual(normalizeMapSet(['Pallette Town', 'Palette Town', 'Cloud Island']), ['Palette Town', 'Cloud Island']);

assert.deepEqual(buildImportCandidates('#025 Pikachu'), ['025 pikachu', '25 pikachu', 'pikachu', '25', '025']);

const parsed = parseImportTextFromLookup(
  `
  #025 Pikachu
  - Lucario
  Eevee, note
  Missingmon
  `,
  lookup,
);

assert.deepEqual(parsed.matchedIds, ['pikachu', 'lucario', 'eevee']);
assert.deepEqual(parsed.missing, ['Missingmon']);

const candidate = {
  idealHabitatNorm: 'bright',
  specialtiesNorm: setFrom(['Grow']),
  locationNormSet: setFrom(['Palette Town']),
};

assert.equal(
  matchesRequirements(candidate, {
    requiredHabitatNorm: 'bright',
    requiredSpecialtiesNorm: ['grow'],
    targetMapNorm: 'palette town',
  }),
  true,
);

assert.equal(
  matchesRequirements(candidate, {
    requiredHabitatNorm: 'dark',
    requiredSpecialtiesNorm: [],
    targetMapNorm: '',
  }),
  false,
);

assert.equal(sanitizeFreeText('  Test\u0000 Name   ', 20), 'Test Name');

console.log('planner-core tests passed');
