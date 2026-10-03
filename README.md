# H_RealHigh Web Dashboard

Deploy this folder to Vercel with `flexozy.site`.

Set:

```env
WORKER_URL=https://discord.flexozy.site
WORKER_API_KEY=the-same-secret-used-by-the-worker
```

The worker key is server-side only. The browser calls Next.js API routes; Next.js calls the Worker.
