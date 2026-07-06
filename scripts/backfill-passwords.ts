// Backfill password hashes for existing users who had passwordHash = NULL.
// Sets every existing account to the same temporary password (passed as argv[2]
// or defaulting to "password123"), so the user can log in immediately.
//
// Usage: npx tsx scripts/backfill-passwords.ts [password]
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

async function main() {
  const prisma = new PrismaClient()
  try {
    const TEMP_PASSWORD = process.argv[2] ?? 'password123'
    const users = await prisma.user.findMany({ select: { id: true, name: true, phone: true, passwordHash: true } })
    console.log(`\nFound ${users.length} user(s). Backfilling with password "${TEMP_PASSWORD}"…\n`)
    for (const u of users) {
      const status = u.passwordHash ? '(already set, skipping)' : '(setting)'
      if (!u.passwordHash) {
        const passwordHash = hashPassword(TEMP_PASSWORD)
        await prisma.user.update({ where: { id: u.id }, data: { passwordHash } })
      }
      console.log(`  ${u.name.padEnd(14)} ${u.phone.padEnd(18)} ${status}`)
    }
    console.log(`\nDone. All accounts now have password: "${TEMP_PASSWORD}"`)
    console.log('You can log in with any registered phone + this password.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
