# Sagor Pro — My Overtime

A fresh Next.js overtime-tracking app prepared for a new GitHub → Supabase → Render deployment.

## Production environment variables

Set these in Render:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (server-only)
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Never commit `.env` or any real secret to GitHub.

## Supabase

Run `supabase/schema.sql` once in the new Supabase project's SQL Editor.

## Local development

```bash
npm ci
npm run dev
```

## Production

```bash
npm ci
npm run build
npm start
```

## Health check

`GET /api/health` returns `{ "status": "ok" }` and is intended for uptime monitoring.
