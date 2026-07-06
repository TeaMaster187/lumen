import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { serializeMessage } from '@/lib/serialize'
import type { MessageMeta } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/chats/[id]/messages?before=<messageId>&limit=<n> — list messages in a chat
// - Without `before`: returns the most recent `limit` messages (default 50)
// - With `before`: returns the `limit` messages older than the given message id (for pagination)
// Response includes `hasMore` so the client knows whether to keep loading.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await ctx.params

    // Verify membership
    const membership = await db.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: me.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const before = searchParams.get('before') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    // Build cursor-based pagination
    // We fetch `limit + 1` rows to know if there are more older messages.
    const cursor = before ? { id: before } : undefined
    const rows = await db.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor, skip: 1 } : {}),
      include: {
        sender: { select: { name: true } },
        replyTo: { select: { id: true, kind: true, text: true, sender: { select: { name: true } } } },
        reactions: { include: { user: { select: { name: true } } } },
      },
    })

    const hasMore = rows.length > limit
    const slice = hasMore ? rows.slice(0, limit) : rows
    // Reverse so oldest-first (the UI renders top-down)
    const messages = slice.reverse().map(serializeMessage)

    // Mark as read (only on the initial load, not on pagination)
    if (!before) {
      await db.chatMember.update({
        where: { chatId_userId: { chatId: id, userId: me.id } },
        data: { lastReadAt: new Date() },
      })
    }

    return NextResponse.json({ messages, hasMore })
  } catch (e) {
    console.error('[messages GET] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/chats/[id]/messages — send a message
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await ctx.params

    const membership = await db.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: me.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const body = await req.json()
    const { text, kind, meta, replyToId, selfDestructSec } = body as {
      text?: string
      kind?: string
      meta?: MessageMeta
      replyToId?: string
      selfDestructSec?: number
    }

    const finalKind = (kind ?? 'text') as string
    if (finalKind === 'text' && (!text || !text.trim())) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    // Self-destruct: convert seconds-from-now into an absolute timestamp
    let expiresAt: Date | null = null
    if (typeof selfDestructSec === 'number' && selfDestructSec > 0) {
      expiresAt = new Date(Date.now() + selfDestructSec * 1000)
    }

    const msg = await db.message.create({
      data: {
        chatId: id,
        senderId: me.id,
        kind: finalKind,
        text: text ?? null,
        meta: meta ? JSON.stringify(meta) : null,
        replyToId: replyToId ?? null,
        expiresAt,
      },
      include: {
        sender: { select: { name: true } },
        replyTo: { select: { id: true, kind: true, text: true, sender: { select: { name: true } } } },
        reactions: { include: { user: { select: { name: true } } } },
      },
    })

    // Bump chat.updatedAt so it sorts to top
    await db.chat.update({ where: { id }, data: { updatedAt: new Date() } })

    // Broadcast to other chat members via the chat-service
    try {
      const memberIds = await db.chatMember.findMany({
        where: { chatId: id },
        select: { userId: true },
      })
      const serialized = serializeMessage(msg)
      // Notify all members (including sender — sender's other devices should see it too)
      await fetch('http://localhost:3004/internal/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: id,
          message: serialized,
          memberIds: memberIds.map((m) => m.userId),
        }),
      })
    } catch (e) {
      console.error('[messages] broadcast failed', e)
    }

    return NextResponse.json({ message: serializeMessage(msg) })
  } catch (e) {
    console.error('[messages POST] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
