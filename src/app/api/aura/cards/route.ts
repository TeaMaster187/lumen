import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/aura/cards — upload a new aura card (photo + caption)
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { userId, dataUrl, caption } = body as { userId?: string; dataUrl?: string; caption?: string }

    if (!userId || !dataUrl) {
      return NextResponse.json({ error: 'Missing userId or dataUrl' }, { status: 400 })
    }

    // Only allow posting your own card (or the current user's card)
    const targetUserId = userId === 'me' ? me.id : userId
    if (targetUserId !== me.id) {
      return NextResponse.json({ error: 'Can only post your own aura cards' }, { status: 403 })
    }

    // Validate dataUrl is a reasonable size (max ~2MB base64)
    if (dataUrl.length > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 2MB)' }, { status: 400 })
    }

    const card = await db.auraCard.create({
      data: {
        userId: me.id,
        posterId: me.id,
        photoUrl: dataUrl,
        caption: caption?.trim() || null,
      },
    })

    return NextResponse.json({ card: { id: card.id } })
  } catch (e) {
    console.error('[aura/cards] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
