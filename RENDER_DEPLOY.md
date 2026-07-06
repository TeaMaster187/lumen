# Deploying Lumen to Render (free tier)

## What you get

- **Real-time messaging** (socket.io + WebSockets) ✅
- **Persistent SQLite database** (survives restarts) ⚠️ (needs $7/mo Starter plan)
- **All app features** — Daily, Gym, Aura, calls, reactions, photos, etc.
- **Installable PWA** — add to home screen on Android

## ⚠️ Free tier limitations

Render's **free** plan:
- ❌ No persistent disk → SQLite DB resets on every deploy/restart
- ✅ WebSockets work
- ✅ Always on (no sleep on free Docker services — sleep only applies to free Node services)

**To keep your data**, upgrade to the **Starter plan ($7/month)** which supports persistent disks. This is the only cost. Everything else in this guide is free.

If you want truly free + persistent data, you'd need to self-host (laptop + Cloudflare Tunnel) — but Render free is great for testing.

---

## Step-by-step deploy

### 1. Push your code to GitHub

```bash
cd /home/z/my-project
git add -A
git commit -m "Add Render deployment config"
git push origin main
```

If you don't have a GitHub repo yet:
1. Go to https://github.com/new
2. Create a new repo (e.g. `lumen`)
3. Follow the "…or push an existing repository from the command line" instructions

### 2. Create a Render account

1. Go to https://render.com
2. Click **Get Started** → sign up with GitHub
3. Authorize Render to access your GitHub account

### 3. Deploy from the Blueprint

1. In the Render dashboard, click **New +** → **Blueprint**
2. Select your `lumen` GitHub repo
3. Render detects `render.yaml` and shows the service config
4. Click **Apply**

Render will:
- Build the Docker image
- Start the container (Next.js on port 3000 + chat-service on port 3003)
- Assign a URL like `https://lumen-xxxx.onrender.com`
- Run the health check at `/api/health`

### 4. Wait for the first deploy

The first build takes ~5-8 minutes. Watch the logs:
- **Build log**: shows `npm install` + `next build` output
- **Deploy log**: shows the container starting up

When you see `✓ Ready in XXXms` and `Lumen chat-service listening on port 3003`, you're live.

### 5. Open your app

Visit `https://lumen-xxxx.onrender.com` (Render shows the URL in the dashboard).

You should see the Lumen login screen. Register with:
- **Invite code**: `BIGGA`
- **Phone**: your phone number
- **Name**: your name
- **Password**: at least 4 characters

### 6. Install as an app on Android

1. Open `https://lumen-xxxx.onrender.com` in Chrome on your phone
2. Log in
3. Chrome menu (⋮) → **Add to Home screen**
4. Lumen appears in your app drawer with its own icon

---

## Environment variables (optional)

Set these in Render → Environment for extra features:

| Variable | Purpose | Where to get it |
|---|---|---|
| `USDA_API_KEY` | Real food search (26K+ foods) | https://fdc.nal.usda.gov/api-key-registration (free) |
| `EXERCISEDB_API_KEY` | Real exercise database (1.5K+ exercises with GIFs) | https://rapidapi.com/justin-WFnsXH7asBd/api/exercisedb (free tier) |

Without these, the app falls back to 20 built-in foods + 24 exercises.

---

## Troubleshooting

### "Site won't load"
- Check the deploy log in Render dashboard
- Look for `✓ Ready` in the logs — if it's not there, the build failed
- Common fix: wait 2-3 min after first deploy (cold start)

### "Messages aren't real-time"
- The chat-service (port 3003) must be running alongside Next.js
- Check the deploy log for `Lumen chat-service listening on port 3003`
- If missing, the `CMD` in Dockerfile failed — check the logs

### "Data disappeared after a deploy"
- You're on the free tier (no persistent disk)
- Upgrade to Starter ($7/mo) to get a persistent disk at `/app/db`

### "Can't log in after deploy"
- The DB resets on every deploy (free tier)
- Register a new account with invite code `BIGGA`

---

## Local development

```bash
npm install
npx prisma generate
npx prisma db push          # creates local SQLite DB
npm run dev                  # starts Next.js on :3000

# In another terminal, start the chat-service:
cd mini-services/chat-service
bun --hot index.ts           # starts socket.io on :3003
```

Visit http://localhost:3000
