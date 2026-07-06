// Seed the database with the invite code + test accounts.
// Run with: npx tsx scripts/seed.ts
// This is also called automatically during deployment build.
import { PrismaClient } from '@prisma/client'

const INVITE_CODE = 'BIGGA'

async function main() {
  const prisma = new PrismaClient()
  try {
    // 1. Invite code
    let invite = await prisma.inviteCode.findUnique({ where: { code: INVITE_CODE } })
    if (!invite) {
      invite = await prisma.inviteCode.create({
        data: { code: INVITE_CODE, maxUses: 1000, active: true },
      })
      console.log(`[seed] Created invite code ${INVITE_CODE}`)
    } else {
      console.log(`[seed] Invite code ${INVITE_CODE} already exists`)
    }

    console.log('[seed] Done.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error('[seed] error', e); process.exit(1) })
