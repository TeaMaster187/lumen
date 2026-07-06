import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, initials, findUserByPhone } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/users/lookup?id=<userId|numericId>|&phone=<phone>|&username=<username>
// Returns a sanitized public profile (id, numericId, name, username, avatar) for starting a DM.
// Does NOT leak phone numbers or other private fields.
export async function GET(req: NextRequest) {
  const me = await getSessionUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')?.trim()
  const phone = url.searchParams.get('phone')?.trim()
  const username = url.searchParams.get('username')?.trim().toLowerCase().replace(/^@/, '')

  let user = null
  const select = {
    id: true,
    numericId: true,
    name: true,
    username: true,
    avatarA: true,
    avatarB: true,
    avatarUrl: true,
  }

  if (id) {
    // Try cuid first, then numeric id
    user = await db.user.findUnique({ where: { id }, select })
    if (!user && /^\d+$/.test(id)) {
      user = await db.user.findUnique({ where: { numericId: parseInt(id, 10) }, select })
    }
  } else if (phone) {
    user = await findUserByPhone(phone)
  } else if (username) {
    user = await db.user.findUnique({ where: { username }, select })
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (user.id === me.id) {
    return NextResponse.json({ error: 'That\'s you — open Saved Messages instead' }, { status: 400 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      numericId: user.numericId,
      name: user.name,
      username: user.username,
      avatarA: user.avatarA,
      avatarB: user.avatarB,
      avatarUrl: user.avatarUrl,
      avatarInitials: initials(user.name),
    },
  })
}

