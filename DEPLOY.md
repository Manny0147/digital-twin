# Deploy Digital Twin

The production build can succeed without live Clerk, OpenAI, or Upstash credentials. Those services are required before the corresponding features work.

## Environment

| Variable | Required for |
| --- | --- |
| `DATABASE_URL` | Any database read or write. Set on Vercel production, preview, and development. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Sign-in, sign-up, and dashboard auth. Not set yet. |
| `CLERK_SECRET_KEY` | Clerk server auth and mobile bearer verification. Not set yet. |
| `OPENAI_API_KEY` | Memory embeddings and twin chat. Not set yet. Chat returns 503 until it is set. |
| `UPSTASH_REDIS_REST_URL` | Shared rate limits across instances. Not set yet. |
| `UPSTASH_REDIS_REST_TOKEN` | Shared rate limits across instances. Not set yet. |

Set the publishable Clerk key before building. Next.js inlines `NEXT_PUBLIC_*` values at build time.

## Database

The Neon database already has the application tables and `memories.embedding vector(1536)`. Do not run a destructive reset. `npm run build` runs `prisma generate` and does not migrate.

## Build

```bash
npm install
npm test
npm run build
```

Do not deploy to production until Clerk keys are present and a signed-in pass confirms memories, grants, and revocation.
