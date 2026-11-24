import { test } from 'node:test';
import assert from 'node:assert/strict';
import Colors from '../constants/colors';
import { TEMAS, type NombreTema, type Paleta } from '../constants/theme';

/** Contraste WCAG 2.x entre dos colores #RRGGBB. */
function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('tema oscuro: es EXACTAMENTE la identidad de siempre (no se mueve un píxel)', () => {
  const o = TEMAS.oscuro;
  const B = Colors.brand;
  assert.equal(o.fondo, B.page);
  assert.equal(o.panel, B.panel);
  assert.equal(o.superficie, B.card);
  assert.equal(o.fila, B.row);
  assert.equal(o.bordeFila, B.rowBorder);
  assert.equal(o.texto, B.text);
  assert.equal(o.textoSec, B.textSecondary);
  assert.equal(o.enlace, B.link);
  assert.equal(o.entrada, B.inflow);
  assert.equal(o.salida, B.outflow);
  assert.equal(o.enVivo, B.green);
  assert.equal(o.criticoTexto, B.dangerText);
  assert.equal(o.critico, Colors.danger);
  // Los hex que las tarjetas tenían escritos a mano.
  assert.equal(o.bordeTarjeta, '#1B3044');
  assert.equal(o.bordeHoja, '#1E3A52');
  assert.equal(o.pulsado, '#0E2536');
  assert.equal(o.bannerFondo, '#2A1416');
  assert.equal(o.bannerTexto, '#E6C9C9');
  assert.equal(o.velo, 'rgba(2,8,14,0.7)');
  assert.equal(o.destello, 'rgba(36,145,204,0.2)');
});

test('temas: los dos tienen los mismos tokens, y los de color son #RRGGBB', () => {
  assert.deepEqual(Object.keys(TEMAS.claro).sort(), Object.keys(TEMAS.oscuro).sort());
  for (const nombre of ['oscuro', 'claro'] as NombreTema[]) {
    for (const [k, v] of Object.entries(TEMAS[nombre])) {
      if (k === 'velo' || k.startsWith('destello')) continue;
      assert.match(v, /^#[0-9A-F]{6}$/i, `${nombre}.${k} = ${v}`);
    }
  }
});

// [primer plano, fondo, mínimo]. Texto 4,5:1; íconos y bordes que comunican estado 3:1.
const PARES: [keyof Paleta, keyof Paleta, number][] = [
  ['texto', 'fondo', 4.5],
  ['texto', 'superficie', 4.5],
  ['texto', 'panel', 4.5],
  ['texto', 'seleccionado', 4.5],
  ['textoSec', 'fondo', 4.5],
  ['textoSec', 'superficie', 4.5],
  ['textoSec', 'panel', 4.5],
  ['textoSec', 'fila', 4.5],
  ['enlace', 'superficie', 4.5],
  ['enlace', 'panel', 4.5],
  ['sobreAccion', 'accion', 4.5],
  ['sobreAccion', 'accionPresionada', 4.5],
  ['entrada', 'superficie', 4.5],
  ['salida', 'superficie', 4.5],
  ['enVivo', 'fila', 4.5],
  ['enVivo', 'superficie', 4.5],
  ['alerta', 'superficie', 4.5],
  ['criticoTexto', 'superficie', 4.5],
  ['bannerTexto', 'bannerFondo', 4.5],
  ['integracion', 'superficie', 3],
  ['integracion', 'fila', 3],
  ['critico', 'superficie', 3],
  ['bordeControl', 'superficie', 3],
  ['foco', 'superficie', 3],
  ['foco', 'fondo', 3],
  ['foco', 'panel', 3],
  ['aguaSuperficie', 'superficie', 3],
];

for (const nombre of ['oscuro', 'claro'] as NombreTema[]) {
  test(`tema ${nombre}: contrastes WCAG (texto ≥ 4,5:1, estado ≥ 3:1)`, () => {
    const t = TEMAS[nombre];
    for (const [fg, bg, min] of PARES) {
      const r = contraste(t[fg], t[bg]);
      assert.ok(r >= min, `${nombre}: ${fg} sobre ${bg} = ${r.toFixed(2)} < ${min}`);
    }
  });
}

test('tema claro: el placeholder tiene margen (≥ 5:1 sobre la tarjeta y el fondo)', () => {
  const t = TEMAS.claro;
  assert.ok(contraste(t.placeholder, t.superficie) >= 5);
  assert.ok(contraste(t.placeholder, t.fondo) >= 5);
});

test('tema claro: el fondo nunca es blanco puro y la tarjeta sí', () => {
  assert.notEqual(TEMAS.claro.fondo.toUpperCase(), '#FFFFFF');
  assert.equal(TEMAS.claro.superficie.toUpperCase(), '#FFFFFF');
});

test('tema: el HTML de producción pinta los mismos fondos antes de cargar el JS', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const ruta = fileURLToPath(new URL('../../../tools/web/prepare-production.cjs', import.meta.url));
  const src = readFileSync(ruta, 'utf8');
  assert.ok(src.includes(`FONDO_OSCURO = '${TEMAS.oscuro.fondo}'`), 'fondo oscuro desincronizado');
  assert.ok(src.includes(`FONDO_CLARO = '${TEMAS.claro.fondo}'`), 'fondo claro desincronizado');
});
