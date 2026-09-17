import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/app.js';

test('app exports valid express instance', () => {
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.listen, 'function');
});
