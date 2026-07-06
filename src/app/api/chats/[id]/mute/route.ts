import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/chats/[id]/mute — toggle mute / archive on the current user's membership
// Body: { action: 'mute' | 'unmute' | 'archive' | 'unarchive' }
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await ctx.params

    const membership = await db.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: me.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const { action } = body as { action?: string }
    const validActions = ['mute', 'unmute', 'archive', 'unarchive']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const data: { muted?: boolean; archived?: boolean } = {}
    if (action === 'mute') data.muted = true
    else if (action === 'unmute') data.muted = false
    else if (action === 'archive') data.archived = true
    else if (action === 'unarchive') data.archived = false

    await db.chatMember.update({
      where: { chatId_userId: { chatId: id, userId: me.id } },
      data,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[chats/[id]/mute] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
