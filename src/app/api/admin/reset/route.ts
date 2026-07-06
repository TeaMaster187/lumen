import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { INVITE_CODE } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/reset — wipe all data EXCEPT the BIGGA invite code, then re-seed it.
// Useful for testing the full flow from scratch.
export async function POST() {
  // Delete in FK-safe order
  await db.message.deleteMany({})
  await db.chatMember.deleteMany({})
  await db.chat.deleteMany({})
  await db.session.deleteMany({})
  await db.user.deleteMany({})

  // Recreate invite code
  await db.inviteCode.upsert({
    where: { code: INVITE_CODE },
    update: { uses: 0, maxUses: 1000, active: true },
    create: { code: INVITE_CODE, maxUses: 1000, active: true, uses: 0 },
  })

  return NextResponse.json({ ok: true, message: 'All data wiped. Invite code BIGGA recreated with 1000 uses.' })
}
