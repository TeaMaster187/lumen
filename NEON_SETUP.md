# Setting up Neon (free PostgreSQL) for Lumen

Neon gives you **0.5GB of PostgreSQL for free, forever, no credit card**. Your messages, accounts, and all data persist across Render deploys.

---

## Step 1: Create a Neon account

1. Go to https://neon.tech
2. Click **Sign up** → **Continue with GitHub** (or email)
3. Authorize Neon

## Step 2: Create a project

1. Click **New Project**
2. **Name**: `lumen`
3. **Postgres version**: 16 (default)
4. **Region**: pick the one closest to you (e.g. `US East (Ohio)` for North America, `EU Central (Frankfurt)` for Europe)
5. Click **Create project**

## Step 3: Copy your connection string

After creating the project, Neon shows a page with your connection details. Look for the **"Connection string"** — it looks like:

```
postgresql://lumen_owner:AbCdEf123456@ep-cool-dawn-123456.us-east-2.aws.neon.tech/lumen?sslmode=require
```

**Copy this entire string.** You'll paste it into Render in the next step.

⚠️ Keep this string private — it's the password to your database.

## Step 4: Set DATABASE_URL on Render

1. Go to your Render dashboard → your `lumen` web service
2. Click **Environment** in the left sidebar
3. Click **Add Environment Variable**
4. **Key**: `DATABASE_URL`
5. **Value**: paste the connection string from Neon
6. Click **Save Changes**

Render will automatically re-deploy with the new env var. The build runs `prisma db push` which creates all 15 tables in your Neon database.

## Step 5: Verify it worked

1. Wait for the deploy to finish (~5-8 min)
2. Open your Render URL: `https://lumen-xxxx.onrender.com`
3. Register with invite code `BIGGA` + your phone + name + password
4. Send a message, log some food, create a workout plan

## Step 6: Confirm data persists

1. In the Render dashboard, click **Manual Deploy** → **Clear build cache & deploy**
2. Wait for the redeploy to finish
3. Log in with the same phone + password — your account + messages should still be there ✅

---

## Viewing your data in Neon

1. Go to https://console.neon.tech
2. Click your `lumen` project
3. Click **Tables** in the sidebar — see all your users, messages, reactions, etc.
4. Click **SQL Editor** to run queries directly (e.g. `SELECT * FROM "User";`)

---

## Neon free tier limits

| Resource | Limit |
|---|---|
| Storage | 0.5 GB |
| Compute | 191.9 compute hours / month |
| Projects | 1 |
| Branches | 10 |

**Auto-suspend:** Neon pauses your DB after 5 min of inactivity. The first query after pause takes ~1 second to wake up. This is transparent — your app just works, with a tiny delay on the first request after idle.

For a messaging app with a few friends, 0.5GB is plenty (thousands of messages + photos). If you outgrow it, Neon's paid tier starts at $19/mo for 10GB.

---

## Troubleshooting

### "Can't reach database server" on Render
- Double-check the connection string is correct
- Make sure `?sslmode=require` is at the end
- Verify the region you picked in Neon is reasonable for Render (Render's free tier is in `us-east-1`)

### "relation does not exist" errors
- The build didn't run `prisma db push`. Check the Render build log for Prisma errors.
- You can manually push the schema: in your terminal, set `DATABASE_URL` to your Neon string, then run `npx prisma db push`

### "Neon project is suspended"
- The DB auto-paused. Just visit your app URL — the first request will wake it up (~1 sec delay).
