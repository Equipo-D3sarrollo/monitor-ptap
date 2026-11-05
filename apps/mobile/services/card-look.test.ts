import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SignalDto } from '@ptap/shared';
import { directionLook, isAnomalous, shouldFlash, tankFill } from './card-look';

const signal = (over: Partial<SignalDto>): SignalDto => ({
  value: 2,
  unit: 'l/s',
  quality: 'Good',
  usable: true,
  mappingStatus: 'mapped',
  confidence: 'confirmed',
  label: 'Caudal de salida',
  ts: null,
  ...over,
});

test('card-look: el rango OPERATIVO también pinta en rojo aunque el backend no marque outOfRange', () => {
  assert.equal(isAnomalous(signal({ value: 62.27, opMin: 1, opMax: 3 })), true);
  assert.equal(isAnomalous(signal({ value: 0.5, opMin: 1 })), true);
  assert.equal(isAnomalous(signal({ value: 2, opMin: 1, opMax: 3 })), false);
  assert.equal(isAnomalous(signal({ value: 2, outOfRange: true })), true);
  assert.equal(isAnomalous(signal({ value: null, opMax: 3 })), false);
});

test('card-look: entrada y salida con icono, etiqueta y dos azules distintos', () => {
  const inlet = directionLook('inletFlow1');
  const outlet = directionLook('outletPressure1');
  assert.deepEqual([inlet?.label, inlet?.icon], ['Entrada', 'arrow-forward']);
  assert.deepEqual([outlet?.label, outlet?.icon], ['Salida', 'arrow-back']);
  assert.notEqual(inlet?.color, outlet?.color);
  assert.equal(directionLook('conductivity'), null);
});

test('card-look: tanque sin capacidad confirmada no dibuja nivel; por encima de 100 % es rebose', () => {
  assert.deepEqual(tankFill(null), { kind: 'unconfirmed', drawPct: null });
  assert.deepEqual(tankFill(72), { kind: 'normal', drawPct: 72 });
  assert.deepEqual(tankFill(106), { kind: 'overflow', drawPct: 100 });
  assert.deepEqual(tankFill(-3), { kind: 'normal', drawPct: 0 });
});

test('card-look: destello solo si el valor cambió, la planta está viva y hay movimiento', () => {
  assert.equal(shouldFlash(1, 2, false, false), true);
  assert.equal(shouldFlash(undefined, 2, false, false), false); // primer pintado
  assert.equal(shouldFlash(2, 2, false, false), false);
  assert.equal(shouldFlash(1, 2, true, false), false); // congelada
  assert.equal(shouldFlash(1, 2, false, true), false); // reducir movimiento
  assert.equal(shouldFlash(1, 2, false, null), false); // aún sin saber
});
