# H_RealHigh Dashboard

Set these server-side environment variables on Vercel:

```env
WORKER_URL=https://your-worker-hostname
WORKER_API_KEY=<same-random-secret-configured-on-the-worker>
```

`WORKER_URL` must point directly to the Node.js Quest Worker. The dashboard
checks `GET /health` and requires JSON containing `"service":"quest-worker"`
before it forwards any API call. If the health check returns a Vercel/Next.js
page or a 404, correct the Worker hostname or DNS assignment first.

Never expose `WORKER_API_KEY` in client-side code, logs, or committed files.