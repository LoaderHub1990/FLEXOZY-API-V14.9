const WORKER_TIMEOUT_MS = 15000;
const HEALTH_CACHE_MS = 30000;
const healthChecks = new Map();

function getWorkerUrl() {
  const configuredUrl = process.env.WORKER_URL;
  if (!configuredUrl?.trim()) {
    throw new Error('WORKER_URL is not configured. Set it to the Quest Worker host, not the dashboard URL.');
  }

  const raw = configuredUrl.trim().replace(/^['"]|['"]$/g, '');
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('WORKER_URL is invalid');
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('WORKER_URL must be an HTTP(S) URL');
  }

  if (process.env.NODE_ENV === 'production' &&
      ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname)) {
    throw new Error('WORKER_URL still points to localhost in production');
  }

  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function isRedirect(status) {
  return status >= 300 && status < 400;
}

function makeTargetUrl(workerUrl, path) {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return new URL(cleanPath, `${workerUrl.toString().replace(/\/$/, '')}/`);
}

function redirectError(response, endpoint) {
  const location = response.headers.get('location') || '';
  return new Error(
    `${endpoint} redirected the request (${response.status})${location ? ` to ${location}` : ''}. ` +
    'Make sure WORKER_URL points directly to the Quest Worker, not the Vercel dashboard.'
  );
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Worker request timed out');
    if (error?.message === 'fetch failed') {
      throw new Error('เชื่อมต่อ Worker ไม่ได้: ตรวจสอบ WORKER_URL และ DNS ของ Worker');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(response, endpoint) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${endpoint} returned a non-JSON response (HTTP ${response.status}). ` +
      'WORKER_URL may point to the dashboard instead of the Quest Worker.'
    );
  }
}

async function verifyWorker(workerUrl) {
  const key = workerUrl.toString();
  const cached = healthChecks.get(key);
  if (cached?.expiresAt > Date.now()) return;
  if (cached?.promise) return cached.promise;

  const promise = (async () => {
    const healthUrl = makeTargetUrl(workerUrl, '/health');
    const response = await fetchWithTimeout(healthUrl);
    if (isRedirect(response.status)) throw redirectError(response, 'Worker health check');

    const health = await readJson(response, 'Worker health check');
    if (!response.ok || health?.ok !== true || health?.service !== 'quest-worker') {
      throw new Error(
        `WORKER_URL did not reach the Quest Worker: GET /health returned HTTP ${response.status} ` +
        'without service "quest-worker". Point it directly to the Worker host and confirm /health returns JSON.'
      );
    }

    healthChecks.set(key, { expiresAt: Date.now() + HEALTH_CACHE_MS });
  })();

  healthChecks.set(key, { promise });
  try {
    await promise;
  } catch (error) {
    healthChecks.delete(key);
    throw error;
  }
}

export async function workerFetch(path, options = {}) {
  const key = process.env.WORKER_API_KEY;
  if (!key) throw new Error('WORKER_API_KEY is not configured');

  const workerUrl = getWorkerUrl();
  await verifyWorker(workerUrl);
  const target = makeTargetUrl(workerUrl, path);

  const headers = new Headers(options.headers || {});
  headers.set('x-api-key', key);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  const response = await fetchWithTimeout(target, { ...options, headers });
  if (isRedirect(response.status)) throw redirectError(response, 'Worker API');

  const data = await readJson(response, 'Worker API');
  if (!response.ok) throw new Error(data.error || `Worker returned ${response.status}`);
  return data;
}
