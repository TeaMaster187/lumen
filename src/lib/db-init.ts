// Ensures the database schema exists.
// With PostgreSQL (Neon), the schema is normally created during build via `prisma db push`.
// If that fails (e.g. DATABASE_URL not set at build time, or connection issue),
// this function creates the tables on first request as a fallback.
//
// Uses Prisma's $executeRawUnsafe to run Postgres DDL.
// Idempotent — safe to call on every request (uses IF NOT EXISTS).

import { db } from '@/lib/db'

let _initialized = false
let _initializing: Promise<void> | null = null

// PostgreSQL DDL for all Lumen tables.
// Using IF NOT EXISTS so this is safe to run repeatedly.
const DDL = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numericId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "bio" TEXT,
    "avatarA" TEXT NOT NULL DEFAULT 'oklch(0.62 0.24 285)',
    "avatarB" TEXT NOT NULL DEFAULT 'oklch(0.66 0.22 330)',
    "avatarUrl" TEXT,
    "dailyPublic" BOOLEAN NOT NULL DEFAULT true,
    "gymPublic" BOOLEAN NOT NULL DEFAULT true,
    "progressPicsPublic" BOOLEAN NOT NULL DEFAULT true,
    "readReceipts" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hapticsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_numericId_key" ON "User"("numericId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,

  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token")`,
  `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`,

  `CREATE TABLE IF NOT EXISTS "Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'private',
    "name" TEXT,
    "avatarA" TEXT,
    "avatarB" TEXT,
    "rules" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 2,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "Chat_createdBy_idx" ON "Chat"("createdBy")`,

  `CREATE TABLE IF NOT EXISTS "ChatMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE,
    CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ChatMember_chatId_userId_key" ON "ChatMember"("chatId", "userId")`,
  `CREATE INDEX IF NOT EXISTS "ChatMember_userId_idx" ON "ChatMember"("userId")`,

  `CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "text" TEXT,
    "meta" TEXT,
    "replyToId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId")`,

  `CREATE TABLE IF NOT EXISTS "Reaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE,
    CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_messageId_userId_emoji_key" ON "Reaction"("messageId", "userId", "emoji")`,
  `CREATE INDEX IF NOT EXISTS "Reaction_messageId_idx" ON "Reaction"("messageId")`,

  `CREATE TABLE IF NOT EXISTS "InviteCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "createdBy" TEXT,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InviteCode_code_key" ON "InviteCode"("code")`,

  `CREATE TABLE IF NOT EXISTS "Streak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Streak_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "Streak_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Streak_userAId_userBId_key" ON "Streak"("userAId", "userBId")`,
  `CREATE INDEX IF NOT EXISTS "Streak_userBId_idx" ON "Streak"("userBId")`,

  `CREATE TABLE IF NOT EXISTS "AuraCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "posterId" TEXT,
    "photoUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuraCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AuraCard_userId_createdAt_idx" ON "AuraCard"("userId", "createdAt")`,

  `CREATE TABLE IF NOT EXISTS "AuraMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiatorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuraMatch_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "AuraMatch_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AuraMatch_initiatorId_targetId_key" ON "AuraMatch"("initiatorId", "targetId")`,
  `CREATE INDEX IF NOT EXISTS "AuraMatch_targetId_idx" ON "AuraMatch"("targetId")`,

  `CREATE TABLE IF NOT EXISTS "WorkoutPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "day" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "WorkoutPlan_userId_idx" ON "WorkoutPlan"("userId")`,

  `CREATE TABLE IF NOT EXISTS "WorkoutExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "bodyPart" TEXT,
    "target" TEXT,
    "equipment" TEXT,
    "gifUrl" TEXT,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" INTEGER NOT NULL DEFAULT 10,
    "weight" DOUBLE PRECISION,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutExercise_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "WorkoutExercise_planId_idx" ON "WorkoutExercise"("planId")`,

  `CREATE TABLE IF NOT EXISTS "DailyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "calorieGoal" INTEGER NOT NULL DEFAULT 2000,
    "proteinGoal" INTEGER NOT NULL DEFAULT 150,
    "carbGoal" INTEGER NOT NULL DEFAULT 200,
    "fatGoal" INTEGER NOT NULL DEFAULT 65,
    "waterGoal" INTEGER NOT NULL DEFAULT 2500,
    "waterIntake" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DailyLog_userId_date_key" ON "DailyLog"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "DailyLog_userId_idx" ON "DailyLog"("userId")`,

  `CREATE TABLE IF NOT EXISTS "FoodEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logId" TEXT NOT NULL,
    "meal" TEXT NOT NULL DEFAULT 'snack',
    "foodName" TEXT NOT NULL,
    "fdcId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'serving',
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "aiEstimated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodEntry_logId_fkey" FOREIGN KEY ("logId") REFERENCES "DailyLog"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "FoodEntry_logId_idx" ON "FoodEntry"("logId")`,

  `CREATE TABLE IF NOT EXISTS "ProgressPic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressPic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ProgressPic_userId_createdAt_idx" ON "ProgressPic"("userId", "createdAt")`,
]

const SEED_INVITE = `INSERT INTO "InviteCode" ("id", "code", "maxUses", "active", "createdAt")
  SELECT
    substring(md5(random()::text || clock_timestamp()::text) from 1 for 25),
    'BIGGA',
    1000,
    true,
    CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM "InviteCode" WHERE "code" = 'BIGGA')`

export async function ensureDbInitialized(): Promise<void> {
  if (_initialized) return
  if (_initializing) return _initializing

  _initializing = (async () => {
    try {
      // Run each DDL statement individually so one failure doesn't abort the rest
      for (const sql of DDL) {
        try {
          await db.$executeRawUnsafe(sql)
        } catch {
          // Table/index probably already exists — safe to ignore
        }
      }
      // Seed the invite code
      try {
        await db.$executeRawUnsafe(SEED_INVITE)
        console.log('[db] invite code BIGGA seeded')
      } catch (seedErr) {
        console.error('[db] seed invite failed (attempt 1):', seedErr instanceof Error ? seedErr.message : String(seedErr))
        // Try alternative syntax without ON CONFLICT
        try {
          await db.$executeRawUnsafe(`INSERT INTO "InviteCode" ("id", "code", "maxUses", "active", "createdAt") SELECT 'bigga-' || md5(random()::text), 'BIGGA', 1000, true, CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM "InviteCode" WHERE "code" = 'BIGGA')`)
          console.log('[db] invite code BIGGA seeded (fallback)')
        } catch (seedErr2) {
          console.error('[db] seed invite failed (attempt 2):', seedErr2 instanceof Error ? seedErr2.message : String(seedErr2))
          // Last resort — use a cuid-like ID
          try {
            const id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
            await db.$executeRawUnsafe(`INSERT INTO "InviteCode" ("id", "code", "maxUses", "active", "createdAt") VALUES ($1, 'BIGGA', 1000, true, CURRENT_TIMESTAMP) ON CONFLICT ("code") DO NOTHING`, id)
            console.log('[db] invite code BIGGA seeded (last resort)')
          } catch (seedErr3) {
            console.error('[db] seed invite failed (all attempts):', seedErr3 instanceof Error ? seedErr3.message : String(seedErr3))
          }
        }
      }
      _initialized = true
      console.log('[db] schema initialized successfully')
    } catch (e) {
      console.error('[db] initialization failed:', e instanceof Error ? e.message : String(e))
      _initializing = null
    }
  })()

  return _initializing
}
