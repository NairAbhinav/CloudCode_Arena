const test = require('node:test');
const assert = require('node:assert/strict');
const gatewayApp = require('../../api-gateway/src/index');

test('Integration Test - API Gateway: Health endpoints respond with 200 OK', async () => {
  const req = {};
  let status = null;
  let data = null;

  const res = {
    json: (body) => { data = body; },
    status: (code) => { status = code; return res; }
  };

  // Gateway /health
  const routes = gatewayApp._router.stack
    .filter(r => r.route && r.route.path === '/health');

  assert.ok(routes.length > 0, 'Health route must exist on gateway');

  routes[0].route.stack[0].handle(req, res);

  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'api-gateway');
  assert.ok(data.routes.auth);
  assert.ok(data.routes.assessment);
  assert.ok(data.routes.submission);
  assert.ok(data.routes.reporting);
});
