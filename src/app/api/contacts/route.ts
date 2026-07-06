import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, initials, formatNumericId } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/contacts — list of users the current user has a private chat with
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // All memberships for the current user, joined with the chat
    const myMemberships = await db.chatMember.findMany({
      where: { userId: me.id },
      include: { chat: { include: { members: true } } },
    })

    // Keep only private chats, then find the other member in each
    const contacts: {
      id: string
      numericId: number
      numericIdStr: string
      name: string
      username: string | null
      avatarA: string
      avatarB: string
      avatarUrl: string | null
      avatarInitials: string
      chatId: string
    }[] = []

    for (const m of myMemberships) {
      if (m.chat.kind !== 'private') continue
      const other = m.chat.members.find((mem) => mem.userId !== me.id)
      if (!other) continue
      const otherUser = await db.user.findUnique({
        where: { id: other.userId },
        select: {
          id: true,
          numericId: true,
          name: true,
          username: true,
          avatarA: true,
          avatarB: true,
          avatarUrl: true,
        },
      })
      if (!otherUser) continue
      contacts.push({
        id: otherUser.id,
        numericId: otherUser.numericId,
        numericIdStr: formatNumericId(otherUser.numericId),
        name: otherUser.name,
        username: otherUser.username,
        avatarA: otherUser.avatarA,
        avatarB: otherUser.avatarB,
        avatarUrl: otherUser.avatarUrl,
        avatarInitials: initials(otherUser.name),
        chatId: m.chatId,
      })
    }

    return NextResponse.json({ contacts })
  } catch (e) {
    console.error('[contacts] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
