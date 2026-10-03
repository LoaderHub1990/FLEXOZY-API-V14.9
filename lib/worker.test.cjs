const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

const workerSource = readFileSync(path.join(__dirname, 'worker.js'), 'utf8')
  .replace(/^export async function workerFetch/m, 'async function workerFetch');
const workerModule = { exports: {} };
runInNewContext(`${workerSource}\nmodule.exports = { workerFetch };`, {
  module: workerModule,
  exports: workerModule.exports,
  process,
  fetch,
  Headers,
  URL,
  AbortController,
  setTimeout,
  clearTimeout,
  Date,
  Map,
});
const { workerFetch } = workerModule.exports;

const testApiKey = 'local-worker-test-key';

async function createTestServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    server,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

test('verifies the Worker before forwarding an API request', async (t) => {
  const requests = [];
  let apiKeyHeader;
  const testServer = await createTestServer((req, res) => {
    requests.push(req.url);
    res.setHeader('content-type', 'application/json');
    if (req.url === '/health') {
      res.end(JSON.stringify({ ok: true, service: 'quest-worker' }));
      return;
    }
    apiKeyHeader = req.headers['x-api-key'];
    res.end(JSON.stringify({ ok: true, jobId: 'test-job' }));
  });
  t.after(testServer.close);
  process.env.WORKER_URL = testServer.url;
  process.env.WORKER_API_KEY = testApiKey;

  const result = await workerFetch('/api/jobs', { method: 'GET' });

  assert.equal(result.ok, true);
  assert.equal(result.jobId, 'test-job');
  assert.deepEqual(requests, ['/health', '/api/jobs']);
  assert.equal(apiKeyHeader, testApiKey);
});

test('stops before the API request when the hostname serves a dashboard page', async (t) => {
  const requests = [];
  const testServer = await createTestServer((req, res) => {
    requests.push(req.url);
    res.statusCode = 404;
    res.setHeader('content-type', 'text/html');
    res.end('<html><body>Next.js 404</body></html>');
  });
  t.after(testServer.close);
  process.env.WORKER_URL = testServer.url;
  process.env.WORKER_API_KEY = testApiKey;

  await assert.rejects(
    workerFetch('/api/quests', { method: 'POST', body: '{}' }),
    /WORKER_URL may point to the dashboard instead of the Quest Worker/
  );
  assert.deepEqual(requests, ['/health']);
});

test('does not follow a redirect during the Worker health check', async (t) => {
  const requests = [];
  const testServer = await createTestServer((req, res) => {
    requests.push(req.url);
    res.statusCode = 307;
    res.setHeader('location', '/');
    res.end();
  });
  t.after(testServer.close);
  process.env.WORKER_URL = testServer.url;
  process.env.WORKER_API_KEY = testApiKey;

  await assert.rejects(workerFetch('/api/quests'), /Worker health check redirected/);
  assert.deepEqual(requests, ['/health']);
});

test('fails clearly when WORKER_URL is unset', async () => {
  delete process.env.WORKER_URL;
  process.env.WORKER_API_KEY = testApiKey;

  await assert.rejects(workerFetch('/api/quests'), /WORKER_URL is not configured/);
});