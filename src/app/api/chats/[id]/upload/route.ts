import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { serializeMessage } from '@/lib/serialize'
import type { MessageMeta } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/chats/[id]/upload — send a media message (photo/video/gif/file) as a data URL
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params

    // Verify membership
    const membership = await db.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: me.id } },
    })
    if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

    const body = await req.json()
    const { kind, dataUrl, aspect, width, height, caption, fileName, fileSize } = body as {
      kind?: string
      dataUrl?: string
      aspect?: number
      width?: number
      height?: number
      caption?: string
      fileName?: string
      fileSize?: string
    }

    if (!dataUrl) return NextResponse.json({ error: 'Missing dataUrl' }, { status: 400 })

    // Validate kind
    const validKinds = ['photo', 'video', 'gif', 'file']
    const finalKind = (kind ?? 'photo') as string
    if (!validKinds.includes(finalKind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
    }

    // Cap data URL size to prevent DB bloat (4.5MB raw ≈ 6MB base64)
    if (dataUrl.length > 6 * 1024 * 1024) {
      return NextResponse.json({ error: 'Media too large (max 4.5MB)' }, { status: 413 })
    }

    // Build the message meta — stores the media URL + dimensions inside the JSON meta column
    const meta: MessageMeta = {
      mediaUrl: dataUrl,
      mediaKind: finalKind === 'file' ? undefined : (finalKind as 'photo' | 'video' | 'gif'),
      mediaAspect: aspect,
      mediaWidth: width,
      mediaHeight: height,
      fileName: fileName,
      fileSize: fileSize,
    }

    const msg = await db.message.create({
      data: {
        chatId: id,
        senderId: me.id,
        kind: finalKind,
        text: caption ?? null,
        meta: JSON.stringify(meta),
      },
      include: {
        sender: { select: { name: true } },
        replyTo: { select: { id: true, kind: true, text: true, sender: { select: { name: true } } } },
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
      console.error('[upload] broadcast failed', e)
    }

    return NextResponse.json({ message: serializeMessage(msg) })
  } catch (e) {
    console.error('[upload] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
