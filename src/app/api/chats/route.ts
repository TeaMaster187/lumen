import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { serializeChat } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await db.chatMember.findMany({
    where: { userId: me.id },
    include: { chat: true },
    orderBy: { chat: { updatedAt: 'desc' } },
  })

  const chats = await Promise.all(memberships.map((m) => serializeChat(m.chat, me.id)))
  // Sort: Saved Messages first, then by last message time desc
  chats.sort((a, b) => {
    if (a.kind === 'saved' && b.kind !== 'saved') return -1
    if (b.kind === 'saved' && a.kind !== 'saved') return 1
    const at = (c: typeof a) => c.lastMessage ? Date.parse(c.lastMessage.createdAt) : Date.parse(c.createdAt)
    return at(b) - at(a)
  })
  return NextResponse.json({ chats })
}
