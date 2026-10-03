const WORKER_TIMEOUT_MS = 15000;

export async function workerFetch(path, options = {}) {
  const base = process.env.WORKER_URL;
  const key = process.env.WORKER_API_KEY;

  if (!base || !key) {
    throw new Error('WORKER_URL / WORKER_API_KEY is not configured');
  }

  let workerUrl;
  try {
    workerUrl = new URL(base);
  } catch {
    throw new Error('WORKER_URL is invalid');
  }

  if (process.env.NODE_ENV === 'production' && workerUrl.hostname === 'localhost') {
    throw new Error('WORKER_URL still points to localhost in production');
  }

  const headers = new Headers(options.headers || {});
  headers.set('x-api-key', key);
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);

  try {
    const response = await fetch(
      new URL(path.replace(/^\/+/, ''), `${workerUrl.toString().replace(/\/$/, '')}/`).toString(),
      { ...options, headers, cache: 'no-store', signal: controller.signal }
    );

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
