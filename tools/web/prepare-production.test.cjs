const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { prepare } = require('./prepare-production.cjs');
test('font hints use the four shipped fonts and are idempotent', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aquora-font-hints-'));
  t.after(() => fs.rmSync(root, { recursive: true }));
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(
    path.join(root, 'index.html'),
    '<html lang="en"><head></head><body></body></html>',
  );
  for (const name of [
    'Poppins_400Regular',
    'Poppins_500Medium',
    'Poppins_600SemiBold',
    'Ionicons',
  ]) {
    fs.writeFileSync(path.join(root, 'assets', name + '.012345abcdef.woff2'), 'fixture');
  }
  prepare(root);
  const first = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(first, /lang="es"/);
  assert.equal((first.match(/rel="preload"/g) || []).length, 4);
  // El tema se aplica antes del JS, una sola vez y en <head>.
  assert.equal((first.match(/id="aquora-tema"/g) || []).length, 1);
  assert.ok(first.indexOf('id="aquora-tema"') < first.indexOf('</head>'));
  assert.match(first, /localStorage\.getItem\('aquora\.tema'\)/);
  const script = path.join(root, 'app.js');
  fs.writeFileSync(script, 'console.log("Aquora")');
  prepare(root);
  assert.equal(
    zlib.brotliDecompressSync(fs.readFileSync(script + '.br')).toString(),
    fs.readFileSync(script, 'utf8'),
  );
  assert.equal(
    zlib.gunzipSync(fs.readFileSync(script + '.gz')).toString(),
    fs.readFileSync(script, 'utf8'),
  );
  assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), first);
  fs.unlinkSync(path.join(root, 'assets/Ionicons.012345abcdef.woff2'));
  assert.throws(() => prepare(root), /Expected four/);
});

test('theme script paints the saved theme before the bundle loads', (t) => {
  const vm = require('node:vm');
  const { FONDO_OSCURO, FONDO_CLARO } = require('./prepare-production.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aquora-theme-'));
  t.after(() => fs.rmSync(root, { recursive: true }));
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(path.join(root, 'index.html'), '<html lang="en"><head></head><body></body></html>');
  for (const name of ['Poppins_400Regular', 'Poppins_500Medium', 'Poppins_600SemiBold', 'Ionicons'])
    fs.writeFileSync(path.join(root, 'assets', name + '.012345abcdef.woff2'), 'fixture');
  prepare(root);
  const code = fs
    .readFileSync(path.join(root, 'index.html'), 'utf8')
    .match(/<script id="aquora-tema">([\s\S]*?)<\/script>/)[1];
  const run = (saved, prefersLight) => {
    const style = {};
    const meta = { content: '#171C28' };
    vm.runInNewContext(code, {
      localStorage: { getItem: () => saved },
      matchMedia: () => ({ matches: prefersLight }),
      document: { documentElement: { style }, querySelector: () => meta },
    });
    assert.equal(meta.content, style.backgroundColor, 'la barra del navegador sigue al fondo');
    return style;
  };
  assert.deepEqual(run(null, true), { backgroundColor: FONDO_OSCURO, colorScheme: 'dark' });
  assert.deepEqual(run('claro', false), { backgroundColor: FONDO_CLARO, colorScheme: 'light' });
  assert.deepEqual(run('sistema', true), { backgroundColor: FONDO_CLARO, colorScheme: 'light' });
  assert.deepEqual(run('sistema', false), { backgroundColor: FONDO_OSCURO, colorScheme: 'dark' });
  assert.deepEqual(run('oscuro', true), { backgroundColor: FONDO_OSCURO, colorScheme: 'dark' });
});
