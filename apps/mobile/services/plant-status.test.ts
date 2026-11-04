import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LivenessDto } from '@ptap/shared';
import { plantStatus, formatSince } from './plant-status';

const live = (state: LivenessDto['state'], lastChangeAt: string | null = null): LivenessDto => ({
  state,
  lastChangeAt,
  windowSec: 60,
});
// Fechas construidas en hora LOCAL para que el test no dependa de la zona horaria de la máquina.
const NOW = new Date(2026, 10, 4, 15, 30);

test('plant-status: live y stable son verdes y cuentan como en línea', () => {
  const a = plantStatus(live('live'), 'Connected', NOW);
  const b = plantStatus(live('stable'), 'Connected', NOW);
  assert.deepEqual([a.label, a.tone, a.online], ['En vivo', 'ok', true]);
  assert.deepEqual([b.label, b.tone, b.online], ['Estable', 'ok', true]);
});

test('plant-status: stable NUNCA es advertencia (operación normal)', () => {
  assert.notEqual(plantStatus(live('stable'), 'Connected', NOW).tone, 'danger');
});

test('plant-status: frozen es gris con la hora del último cambio', () => {
  const s = plantStatus(live('frozen', new Date(2026, 10, 4, 14, 5).toISOString()), 'Connected', NOW);
  assert.deepEqual([s.label, s.tone, s.online], ['Sin datos desde 14:05', 'muted', false]);
  assert.equal(plantStatus(live('frozen', null), 'Connected', NOW).label, 'Sin datos');
});

test('plant-status: el puente caído manda sobre la frescura', () => {
  for (const b of ['Disconnected', 'Faulted', 'Connecting', 'Recovering'] as const) {
    const s = plantStatus(live('live'), b, NOW);
    assert.deepEqual([s.label, s.tone, s.online], ['Sin conexión', 'danger', false], b);
  }
  const stale = plantStatus(live('live'), 'Stale', NOW);
  assert.deepEqual([stale.label, stale.tone, stale.online], ['Sin conexión', 'muted', false]);
});

test('formatSince: otro día incluye la fecha', () => {
  assert.equal(formatSince(new Date(2026, 10, 3, 9, 7).toISOString(), NOW), '03/11 09:07');
});
