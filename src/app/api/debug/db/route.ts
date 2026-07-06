import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureDbInitialized } from '@/lib/db-init'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/debug/db — diagnostic endpoint to see DB state
// Returns table counts + the invite code status. Not for production use.
export async function GET() {
  const result: Record<string, unknown> = { timestamp: new Date().toISOString() }

  try {
    await ensureDbInitialized()
    result.init = 'ok'
  } catch (e) {
    result.init = 'failed'
    result.initError = e instanceof Error ? e.message : String(e)
  }

  try {
    const userCount = await db.user.count()
    result.userCount = userCount
  } catch (e) {
    result.userCountError = e instanceof Error ? e.message : String(e)
  }

  try {
    const invite = await db.inviteCode.findUnique({ where: { code: 'BIGGA' } })
    result.inviteCode = invite ? { code: invite.code, uses: invite.uses, maxUses: invite.maxUses, active: invite.active } : 'NOT FOUND'
  } catch (e) {
    result.inviteCodeError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(result)
}
