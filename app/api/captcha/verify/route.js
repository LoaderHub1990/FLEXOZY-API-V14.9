import { route, json, body } from '@/lib/api';
import { clientIp, rateLimit, recordAttempt } from '@/lib/auth';
import { solveCaptcha } from '@/lib/captcha';

export const POST = route(async (req) => {
  const b = await body(req);
  const ip = await clientIp();
  const k = `capv:${ip}`;
  await rateLimit(k, 40, 10);
  await recordAttempt(k);
  return json({ token: await solveCaptcha(b, ip) });
});
