import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerPreferencia, opcionesDeTema, resolverTema, temaAlterno } from './theme-prefs';

test('tema: el oscuro es el predeterminado ante cualquier valor desconocido', () => {
  for (const raw of [null, undefined, '', 'azul', 'DARK']) {
    assert.equal(leerPreferencia(raw, 'web'), 'oscuro');
    assert.equal(leerPreferencia(raw, 'android'), 'oscuro');
  }
  assert.equal(leerPreferencia('claro', 'android'), 'claro');
  assert.equal(leerPreferencia('oscuro', 'web'), 'oscuro');
});

test('tema: «Según el sistema» solo en web (Android fija userInterfaceStyle dark hasta la próxima APK)', () => {
  assert.deepEqual(opcionesDeTema('web').map((o) => o.id), ['oscuro', 'claro', 'sistema']);
  assert.deepEqual(opcionesDeTema('android').map((o) => o.id), ['oscuro', 'claro']);
  assert.equal(leerPreferencia('sistema', 'web'), 'sistema');
  assert.equal(leerPreferencia('sistema', 'android'), 'oscuro', 'en Android no se puede seguir al sistema todavía');
});

test('tema: «Según el sistema» sigue al esquema; sin dato, oscuro', () => {
  assert.equal(resolverTema('sistema', 'light'), 'claro');
  assert.equal(resolverTema('sistema', 'dark'), 'oscuro');
  assert.equal(resolverTema('sistema', null), 'oscuro');
  assert.equal(resolverTema('claro', 'dark'), 'claro');
  assert.equal(resolverTema('oscuro', 'light'), 'oscuro');
});

test('tema: el botón alterna entre los dos temas', () => {
  assert.equal(temaAlterno('oscuro'), 'claro');
  assert.equal(temaAlterno('claro'), 'oscuro');
});
