import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { serializeMessage } from '@/lib/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// DELETE /api/chats/[id]/messages/[messageId] — soft-delete a message (sets deletedAt)
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: chatId, messageId } = await ctx.params

    // Verify the message exists and the sender is the current user
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { chatId: true, senderId: true },
    })
    if (!message || message.chatId !== chatId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    if (message.senderId !== me.id) {
      return NextResponse.json({ error: 'Can only delete your own messages' }, { status: 403 })
    }

    await db.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    })

    // Broadcast the deletion to all chat members
    try {
      const memberIds = await db.chatMember.findMany({
        where: { chatId },
        select: { userId: true },
      })
      await fetch('http://localhost:3004/internal/message-deleted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          messageId,
          memberIds: memberIds.map((m) => m.userId),
        }),
      })
    } catch (e) {
      console.error('[message DELETE] broadcast failed', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[message DELETE] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/chats/[id]/messages/[messageId] — edit a message's text
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: chatId, messageId } = await ctx.params

    const body = await req.json()
    const { text } = body as { text?: string }
    if (!text || !text.trim()) return NextResponse.json({ error: 'Text is required' }, { status: 400 })

    // Verify ownership
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { chatId: true, senderId: true },
    })
    if (!message || message.chatId !== chatId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    if (message.senderId !== me.id) {
      return NextResponse.json({ error: 'Can only edit your own messages' }, { status: 403 })
    }

    const updated = await db.message.update({
      where: { id: messageId },
      data: { text: text.trim(), editedAt: new Date() },
      include: {
        sender: { select: { name: true } },
        replyTo: { select: { id: true, kind: true, text: true, sender: { select: { name: true } } } },
        reactions: { include: { user: { select: { name: true } } } },
      },
    })

    const serialized = serializeMessage(updated)

    // Broadcast the update to all chat members
    try {
      const memberIds = await db.chatMember.findMany({
        where: { chatId },
        select: { userId: true },
      })
      await fetch('http://localhost:3004/internal/message-updated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          message: serialized,
          memberIds: memberIds.map((m) => m.userId),
        }),
      })
    } catch (e) {
      console.error('[message PATCH] broadcast failed', e)
    }

    return NextResponse.json({ message: serialized })
  } catch (e) {
    console.error('[message PATCH] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
