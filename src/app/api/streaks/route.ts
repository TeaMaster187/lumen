import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/streaks — list of streaks for the current user (with the peer user populated)
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const streaks = await db.streak.findMany({
      where: {
        OR: [{ userAId: me.id }, { userBId: me.id }],
      },
      orderBy: { count: 'desc' },
    })

    // Hydrate the peer user for each streak
    const peerIds = Array.from(
      new Set(streaks.map((s) => (s.userAId === me.id ? s.userBId : s.userAId))),
    )
    const peers = await db.user.findMany({
      where: { id: { in: peerIds } },
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
    const peerMap = new Map(peers.map((p) => [p.id, p]))

    const result = streaks
      .map((s) => {
        const peerId = s.userAId === me.id ? s.userBId : s.userAId
        const peer = peerMap.get(peerId)
        if (!peer) return null
        return {
          id: s.id,
          count: s.count,
          lastActivityDate: s.lastActivityDate.toISOString(),
          peer: {
            id: peer.id,
            name: peer.name,
            numericId: peer.numericId,
            username: peer.username,
            avatarA: peer.avatarA,
            avatarB: peer.avatarB,
            avatarUrl: peer.avatarUrl,
          },
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    return NextResponse.json({ streaks: result })
  } catch (e) {
    console.error('[streaks] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
