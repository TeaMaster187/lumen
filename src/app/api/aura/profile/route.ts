import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/aura/profile?userId=X — list a user's aura cards
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const cards = await db.auraCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, photoUrl: true, caption: true, createdAt: true },
    })

    return NextResponse.json({
      cards: cards.map((c) => ({
        id: c.id,
        photoUrl: c.photoUrl,
        caption: c.caption,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('[aura/profile] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
