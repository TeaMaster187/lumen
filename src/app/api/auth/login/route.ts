import { NextRequest, NextResponse } from 'next/server'
import { createSession, findUserByPhone } from '@/lib/auth'
import { ensureDbInitialized } from '@/lib/db-init'
import { serializeUser } from '@/lib/serialize'
import { verifyPassword } from '@/lib/password'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Ensure tables exist (handles cold starts on serverless platforms)
    await ensureDbInitialized()

    const body = await req.json()
    const { phone, password } = body as { phone?: string; password?: string }
    if (!phone) return NextResponse.json({ error: 'Missing phone' }, { status: 400 })
    if (!password) return NextResponse.json({ error: 'Missing password' }, { status: 400 })

    const user = await findUserByPhone(phone)
    if (!user) return NextResponse.json({ error: 'No account with that phone' }, { status: 404 })

    // Verify password. If the account has no password hash (legacy or migrated),
    // we treat it as "must reset password" rather than allowing login.
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Account has no password set — please re-register or reset' }, { status: 401 })
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    }

    const token = await createSession(user.id)
    const res = NextResponse.json({ user: serializeUser(user), token })
    res.cookies.set('lumen-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch (e) {
    console.error('[login] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
