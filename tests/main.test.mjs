import test from 'node:test';
import assert from 'node:assert/strict';

test('imports main module in Node without browser globals or bootstrap side effects', async () => {
  delete globalThis.document;
  delete globalThis.window;

  const main = await import('../src/main.js?safe-import');

  assert.equal(typeof main.startApp, 'function');
});
