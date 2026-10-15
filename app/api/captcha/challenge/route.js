import { route, json } from '@/lib/api';
import { clientIp, rateLimit, recordAttempt } from '@/lib/auth';
import { issueChallenge, turnstileEnabled } from '@/lib/captcha';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const k = `capch:${await clientIp()}`;
  await rateLimit(k, 60, 10);
  await recordAttempt(k);
  if (turnstileEnabled()) return json({ mode: 'turnstile', siteKey: process.env.TURNSTILE_SITE_KEY });
  return json({ mode: 'pow', ...issueChallenge() });
});
