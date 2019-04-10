'use strict';

const { test } = require('tap');
const { build } = require('../helper');

test('default health route', async (t) => {
  const app = build(t);

  const res = await app.inject({
    url: '/healthz'
  });
  t.deepEqual(JSON.parse(res.payload), { msg: 'OK' });
});
