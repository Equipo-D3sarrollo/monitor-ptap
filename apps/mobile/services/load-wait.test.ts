import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESPERA_MAXIMA_MS, estadoEspera } from './load-wait';

test('estadoEspera: consultando antes del límite, sin respuesta desde el límite', () => {
  assert.equal(estadoEspera(1000, 1000), 'consultando');
  assert.equal(estadoEspera(1000, 1000 + ESPERA_MAXIMA_MS - 1), 'consultando');
  assert.equal(estadoEspera(1000, 1000 + ESPERA_MAXIMA_MS), 'sin_respuesta');
});

test('estadoEspera: el límite se puede ajustar', () => {
  assert.equal(estadoEspera(0, 4999, 5000), 'consultando');
  assert.equal(estadoEspera(0, 5000, 5000), 'sin_respuesta');
});
