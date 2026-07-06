import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { serializeMessage } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/chats/[id]/messages/[messageId]/reactions — toggle a reaction on a message
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: chatId, messageId } = await ctx.params

    // Verify membership
    const membership = await db.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const body = await req.json()
    const { emoji } = body as { emoji?: string }
    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Missing emoji' }, { status: 400 })
    }

    // Find the message
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { chatId: true, senderId: true },
    })
    if (!message || message.chatId !== chatId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Toggle: if a reaction with this user+emoji exists, remove it; otherwise create it
    const existing = await db.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: me.id, emoji } },
    })

    if (existing) {
      await db.reaction.delete({ where: { id: existing.id } })
    } else {
      await db.reaction.create({
        data: { messageId, userId: me.id, emoji },
      })
    }

    // Reload the message with reactions + sender for the broadcast
    const updated = await db.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { name: true } },
        replyTo: { select: { id: true, kind: true, text: true, sender: { select: { name: true } } } },
        reactions: { include: { user: { select: { name: true } } } },
      },
    })
    if (!updated) return NextResponse.json({ error: 'Message vanished' }, { status: 404 })

    const serialized = serializeMessage(updated)

    // Broadcast the reaction event to all chat members
    try {
      const memberIds = await db.chatMember.findMany({
        where: { chatId },
        select: { userId: true },
      })
      await fetch('http://localhost:3004/internal/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          messageId,
          message: serialized,
          memberIds: memberIds.map((m) => m.userId),
        }),
      })
    } catch (e) {
      console.error('[reactions] broadcast failed', e)
    }

    return NextResponse.json({ message: serialized })
  } catch (e) {
    console.error('[reactions] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
