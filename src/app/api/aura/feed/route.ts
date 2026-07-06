import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, initials, formatNumericId } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/aura/feed — discovery feed of users with their latest aura card
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get all users who have at least one aura card, with their latest card
    const usersWithCards = await db.user.findMany({
      where: { auraCards: { some: {} } },
      select: {
        id: true,
        numericId: true,
        name: true,
        username: true,
        bio: true,
        avatarA: true,
        avatarB: true,
        avatarUrl: true,
        auraCards: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, photoUrl: true, caption: true, createdAt: true } },
        _count: { select: { auraCards: true } },
      },
    })

    // Check which users the current user has already matched with
    const matches = await db.auraMatch.findMany({
      where: { initiatorId: me.id },
      select: { targetId: true },
    })
    const matchedIds = new Set(matches.map((m) => m.targetId))

    const feed = usersWithCards
      .filter((u) => u.id !== me.id)
      .map((u) => ({
        id: u.id,
        numericId: u.numericId,
        numericIdStr: formatNumericId(u.numericId),
        name: u.name,
        username: u.username,
        bio: u.bio,
        avatarA: u.avatarA,
        avatarB: u.avatarB,
        avatarUrl: u.avatarUrl,
        avatarInitials: initials(u.name),
        cardCount: u._count.auraCards,
        latestCard: u.auraCards[0] ? { id: u.auraCards[0].id, photoUrl: u.auraCards[0].photoUrl, caption: u.auraCards[0].caption, createdAt: u.auraCards[0].createdAt.toISOString() } : null,
        matched: matchedIds.has(u.id),
      }))

    return NextResponse.json({ feed })
  } catch (e) {
    console.error('[aura/feed] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
