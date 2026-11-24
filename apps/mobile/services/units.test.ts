import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLps, formatUnit } from './units';

test('formatUnit: la ele de litro se pinta mayúscula (Poppins confunde «l» con «I»)', () => {
  assert.equal(formatUnit('l/s'), 'L/s');
  assert.equal(formatUnit('l/min'), 'L/min');
  assert.equal(formatUnit(' l/s '), 'L/s');
});

test('formatUnit: el resto de unidades no cambia', () => {
  for (const u of ['L/s', 'm', 'psi', 'm³', 'm³/h', 'ml/s', 'NTU', 'mg/l', 'lux', '%']) {
    assert.equal(formatUnit(u), u);
  }
});

test('formatUnit: sin unidad no inventa nada', () => {
  assert.equal(formatUnit(null), '');
  assert.equal(formatUnit(undefined), '');
  assert.equal(formatUnit(''), '');
});

test('formatLps: un decimal y L/s', () => {
  assert.equal(formatLps(12.34), '12.3 L/s');
});
