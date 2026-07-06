// Seed the database with the invite code.
// Run with: node scripts/seed.js
// Called automatically during build.
const { PrismaClient } = require('@prisma/client')

const INVITE_CODE = 'BIGGA'

async function main() {
  const prisma = new PrismaClient()
  try {
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
