const WORKER_TIMEOUT_MS = 15000;
const DEFAULT_WORKER_URL = 'https://discord.flexozy.site';

function getWorkerUrl() {
  // The production Worker for H_RealHigh is fixed to the existing API host.
  // WORKER_URL can still override it for local/testing deployments.
  const raw = (process.env.WORKER_URL || DEFAULT_WORKER_URL).trim().replace(/^['"]|['"]$/g, '');
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

export async function workerFetch(path, options = {}) {
  const key = process.env.WORKER_API_KEY;
  if (!key) throw new Error('WORKER_API_KEY is not configured');

  const workerUrl = getWorkerUrl();
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const target = new URL(`${cleanPath}`, `${workerUrl.toString().replace(/\/$/, '')}/`);

  const headers = new Headers(options.headers || {});
  headers.set('x-api-key', key);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

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

    // Never follow redirects from the Worker. Following a redirect back to the
    // Vercel dashboard is what causes Vercel's INFINITE_LOOP_DETECTED response.
    if (isRedirect(response.status)) {
      const location = response.headers.get('location') || '';
      throw new Error(
        `Worker redirected the request (${response.status})${location ? ` to ${location}` : ''}. ` +
        'Make sure https://discord.flexozy.site points directly to the Wispbyte Worker, not this Vercel site.'
      );
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, error: text || 'Worker returned a non-JSON response' };
    }

    if (!response.ok) throw new Error(data.error || `Worker returned ${response.status}`);
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Worker request timed out');
    if (error?.message === 'fetch failed') {
      throw new Error('เชื่อมต่อ Worker ไม่ได้: ตรวจสอบ DNS/HTTPS ของ discord.flexozy.site และให้ชี้ตรงไปยัง Wispbyte Worker');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
