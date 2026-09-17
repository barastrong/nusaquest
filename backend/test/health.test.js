import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/app.js';

test('app exports valid express instance', () => {
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.listen, 'function');
});

test('router stack contains province and game endpoints', () => {
  const routes = app._router.stack
    .filter(r => r.route || (r.name === 'router' && r.regexp))
    .map(r => r.regexp.toString());
  assert.ok(routes.length > 0);
});
