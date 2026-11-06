import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

function load(file: string, modules: Record<string, unknown>) {
  const exports: Record<string, any> = {};
  const context = createContext({ exports, module: { exports },
    require: (name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
      return modules[name];
    } });
  runInContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, context);
  return exports;
}

function preferences() {
  const read = deferred<string | null>();
  const writes: { value: string; gate: ReturnType<typeof deferred<void>> }[] = [];
  const store = load('./dashboard-prefs.ts', {
    react: { useEffect: (effect: () => void) => effect(),
      useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot() },
    '@react-native-async-storage/async-storage': {
      getItem: () => read.promise,
      setItem: (_key: string, value: string) => {
        const gate = deferred<void>();
        writes.push({ value, gate });
        return gate.promise;
      },
    },
  });
  store.useDashboardPrefs();
  return { store, read, writes, snapshot: () => JSON.parse(JSON.stringify(store.getPrefs())) };
}

test('late dashboard hydration preserves an explicit false and loads untouched groups', async () => {
  const f = preferences();
  f.store.setCompact(false);
  f.read.resolve(JSON.stringify({ compact: true, collapsed: ['outlet'] }));
  await tick();
  assert.deepEqual(f.snapshot(), { compact: false, collapsed: ['outlet'] });
  f.writes[0].gate.resolve();
  await tick();
  assert.deepEqual(JSON.parse(f.writes[1].value), f.snapshot());
  f.writes[1].gate.resolve();
});

test('late dashboard hydration preserves a group toggled during the read', async () => {
  const f = preferences();
  f.store.toggleGroup('inlet');
  f.read.resolve(JSON.stringify({ compact: true, collapsed: ['outlet'] }));
  await tick();
  assert.deepEqual(f.snapshot(), { compact: true, collapsed: ['inlet'] });
  f.writes[0].gate.resolve();
  await tick();
  f.writes[1].gate.resolve();
});

test('dashboard writes complete in edit order even with slow storage', async () => {
  const f = preferences();
  f.read.resolve(null);
  f.store.setCompact(true);
  f.store.setCompact(false);
  await tick();
  assert.equal(f.writes.length, 1);
  f.writes[0].gate.resolve();
  await tick();
  assert.equal(f.writes.length, 2);
  assert.equal(JSON.parse(f.writes[1].value).compact, false);
  f.writes[1].gate.resolve();
});

test('dashboard storage rejects invalid groups and duplicates', async () => {
  const f = preferences();
  f.read.resolve(JSON.stringify({ compact: false, collapsed: ['inlet', null, {}, 'invalid', 'inlet'] }));
  await tick();
  assert.deepEqual(f.snapshot(), { compact: false, collapsed: ['inlet'] });
});

test('corrupt dashboard storage leaves usable defaults', async () => {
  for (const value of ['null', '{bad', '42']) {
    const f = preferences();
    f.read.resolve(value);
    await tick();
    assert.deepEqual(f.snapshot(), { compact: false, collapsed: [] });
  }
});

function motion() {
  const reads: ReturnType<typeof deferred<boolean>>[] = [];
  let changes: ((value: boolean) => void) | undefined;
  let subscriptions = 0;
  let removals = 0;
  let subscribe!: (listener: () => void) => () => void;
  let snapshot!: () => boolean;
  const hook = load('../hooks/useReducedMotion.ts', {
    react: { useSyncExternalStore: (nextSubscribe: typeof subscribe, nextSnapshot: typeof snapshot) => {
      subscribe = nextSubscribe; snapshot = nextSnapshot; return snapshot();
    } },
    'react-native': { AccessibilityInfo: {
      addEventListener: (_event: string, callback: (value: boolean) => void) => {
        subscriptions++; changes = callback;
        return { remove: () => { removals++; changes = undefined; } };
      },
      isReduceMotionEnabled: () => {
        const read = deferred<boolean>(); reads.push(read); return read.promise;
      },
    } },
  });
  hook.useReducedMotion();
  return { reads, subscribe: (listener = () => {}) => subscribe(listener), snapshot: () => snapshot(),
    change: (value: boolean) => changes?.(value), counts: () => ({ subscriptions, removals }) };
}

test('motion shares one listener and cleans it after the last component unmounts', async () => {
  const f = motion();
  assert.equal(f.snapshot(), true);
  const first = f.subscribe();
  const second = f.subscribe();
  assert.equal(f.counts().subscriptions, 1);
  f.reads[0].resolve(false);
  await tick();
  assert.equal(f.snapshot(), false);
  first();
  assert.equal(f.counts().removals, 0);
  second();
  assert.equal(f.counts().removals, 1);
  assert.equal(f.snapshot(), true);
});

test('motion change wins over an older asynchronous preference read', async () => {
  const f = motion();
  const stop = f.subscribe();
  f.change(true);
  f.reads[0].resolve(false);
  await tick();
  assert.equal(f.snapshot(), true);
  f.change(false);
  assert.equal(f.snapshot(), false);
  stop();
});

test('motion ignores an old query after unmount and remount', async () => {
  const f = motion();
  f.subscribe()();
  const stop = f.subscribe();
  f.reads[0].resolve(false);
  await tick();
  assert.equal(f.snapshot(), true);
  f.reads[1].resolve(false);
  await tick();
  assert.equal(f.snapshot(), false);
  stop();
});
