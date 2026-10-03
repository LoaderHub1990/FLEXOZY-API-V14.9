const WORKER_TIMEOUT_MS = 15000;

function getWorkerUrl() {
  const raw = String(process.env.WORKER_URL || '').trim().replace(/^['"]|['"]$/g, '');

  if (!raw) {
    throw new Error('WORKER_URL / WORKER_API_KEY is not configured');
  }

  // Accept both https://host and host, while keeping the existing setting unchanged.
  const value = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('WORKER_URL is invalid');
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('WORKER_URL is invalid');
  }

  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

export async function workerFetch(path, options = {}) {
  const key = process.env.WORKER_API_KEY;
  if (!key) {
    throw new Error('WORKER_URL / WORKER_API_KEY is not configured');
  }

  const workerUrl = getWorkerUrl();
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const target = new URL(cleanPath, `${workerUrl.toString().replace(/\/$/, '')}/`);

  // Never follow redirects automatically. This prevents a misconfigured custom
  // domain that points back to Vercel from turning into an infinite redirect loop.
  const headers = new Headers(options.headers || {});
  headers.set('x-api-key', key);
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);

  try {
    const response = await fetch(target, {
      ...options,
      headers,
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') || '';
      throw new Error(
        location
          ? `Worker redirected the request to ${location}. Check WORKER_URL/DNS so it points to the Wispbyte Worker, not this Vercel app.`
          : `Worker returned redirect status ${response.status}. Check WORKER_URL/DNS.`
      );
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, error: text || 'Worker returned a non-JSON response' };
    }

    if (!response.ok) {
      throw new Error(data.error || `Worker returned ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Worker request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
