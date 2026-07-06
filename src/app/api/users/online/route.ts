import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, initials } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/users/online — list of currently-online users (via chat-service presence)
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ask chat-service for the list of online user IDs. The endpoint may not
    // exist on older chat-service builds — gracefully degrade to an empty list.
    let onlineIds: string[] = []
    try {
      const r = await fetch('http://localhost:3004/internal/online', {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })
      if (r.ok) {
        const data = (await r.json()) as { userIds?: string[] }
        if (Array.isArray(data?.userIds)) onlineIds = data.userIds
      }
    } catch (e) {
      // chat-service down or endpoint missing — return empty list
      console.warn('[users/online] chat-service /internal/online unavailable', e)
    }

    // Exclude the current user and any unknown IDs
    const filtered = onlineIds.filter((id) => id && id !== me.id)
    if (filtered.length === 0) return NextResponse.json({ users: [] })

    const users = await db.user.findMany({
      where: { id: { in: filtered } },
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

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        numericId: u.numericId,
        name: u.name,
        username: u.username,
        avatarA: u.avatarA,
        avatarB: u.avatarB,
        avatarUrl: u.avatarUrl,
        avatarInitials: initials(u.name),
      })),
    })
  } catch (e) {
    console.error('[users/online] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
