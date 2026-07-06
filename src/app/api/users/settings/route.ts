import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { serializeUser } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH /api/users/settings — update privacy / notification / haptics toggles
// Body: { readReceipts?, notificationsEnabled?, hapticsEnabled?, dailyPublic?, gymPublic?, progressPicsPublic? }
export async function PATCH(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const {
      readReceipts,
      notificationsEnabled,
      hapticsEnabled,
      dailyPublic,
      gymPublic,
      progressPicsPublic,
    } = body as {
      readReceipts?: boolean
      notificationsEnabled?: boolean
      hapticsEnabled?: boolean
      dailyPublic?: boolean
      gymPublic?: boolean
      progressPicsPublic?: boolean
    }

    const data: Record<string, boolean> = {}
    if (typeof readReceipts === 'boolean') data.readReceipts = readReceipts
    if (typeof notificationsEnabled === 'boolean') data.notificationsEnabled = notificationsEnabled
    if (typeof hapticsEnabled === 'boolean') data.hapticsEnabled = hapticsEnabled
    if (typeof dailyPublic === 'boolean') data.dailyPublic = dailyPublic
    if (typeof gymPublic === 'boolean') data.gymPublic = gymPublic
    if (typeof progressPicsPublic === 'boolean') data.progressPicsPublic = progressPicsPublic

    const updated = await db.user.update({
      where: { id: me.id },
      data,
    })
    return NextResponse.json({ user: serializeUser(updated) })
  } catch (e) {
    console.error('[users/settings PATCH] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
