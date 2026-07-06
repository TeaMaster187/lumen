import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, findUserByPhone } from '@/lib/auth'
import { serializeChat } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Find or create a 1:1 chat with another user by phone, numeric id, or cuid
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { phone, userId, numericId } = body as {
      phone?: string
      userId?: string
      numericId?: number | string
    }

    let other = null
    if (userId) {
      other = await db.user.findUnique({ where: { id: userId } })
    } else if (numericId != null) {
      const n = typeof numericId === 'string' ? parseInt(numericId, 10) : numericId
      if (!Number.isNaN(n)) other = await db.user.findUnique({ where: { numericId: n } })
    } else if (phone) {
      other = await findUserByPhone(phone)
    }

    if (!other) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (other.id === me.id) {
      return NextResponse.json({ error: 'Cannot DM yourself — use Saved Messages' }, { status: 400 })
    }

    // Look for an existing private chat containing both users
    const myChats = await db.chatMember.findMany({
      where: { userId: me.id },
      select: { chatId: true },
    })
    const otherChats = await db.chatMember.findMany({
      where: { userId: other.id },
      select: { chatId: true },
    })
    const mySet = new Set(myChats.map((m) => m.chatId))
    const shared = otherChats.map((m) => m.chatId).filter((cid) => mySet.has(cid))

    for (const chatId of shared) {
      const chat = await db.chat.findUnique({ where: { id: chatId } })
      if (chat?.kind === 'private') {
        return NextResponse.json({ chat: await serializeChat(chat, me.id) })
      }
    }

    // Create new private chat
    const chat = await db.chat.create({
      data: {
        kind: 'private',
        createdBy: me.id,
        members: {
          create: [
            { userId: me.id, role: 'owner' },
            { userId: other.id, role: 'member' },
          ],
        },
      },
    })
    return NextResponse.json({ chat: await serializeChat(chat, me.id) })
  } catch (e) {
    console.error('[direct] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
