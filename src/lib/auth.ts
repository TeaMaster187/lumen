import { db } from '@/lib/db'
import { ensureDbInitialized } from '@/lib/db-init'
import { cookies } from 'next/headers'

export const INVITE_CODE = 'BIGGA'
export const MAX_NUMERIC_ID = 99999

export type SessionUser = {
  id: string
  numericId: number
  phone: string
  name: string
  username: string | null
  bio: string | null
  avatarA: string
  avatarB: string
  avatarUrl: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // No token → not logged in. Return early before touching the DB.
  const cookieStore = await cookies()
  const token = cookieStore.get('lumen-token')?.value
  if (!token) return null

  // Try to init the DB schema (creates tables if missing). If this fails,
  // the user just appears "not logged in" rather than crashing the request.
  try {
    await ensureDbInitialized()
  } catch {
    return null
  }

  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session) return null
    const u = session.user
    return {
      id: u.id,
      numericId: u.numericId,
      phone: u.phone,
      name: u.name,
      username: u.username,
      bio: u.bio,
      avatarA: u.avatarA,
      avatarB: u.avatarB,
      avatarUrl: u.avatarUrl,
    }
  } catch {
    // DB error (table missing, engine not loaded, etc.) — treat as not logged in
    return null
  }
}

export async function createSession(userId: string): Promise<string> {
  const session = await db.session.create({ data: { userId } })
  return session.token
}

// Assign the next available numeric ID (1..99999). Tries sequential, falls back to random.
export async function assignNumericId(): Promise<number> {
  // Try sequential from 1
  const used = await db.user.findMany({ select: { numericId: true } })
  const usedSet = new Set(used.map((u) => u.numericId))
  for (let i = 1; i <= MAX_NUMERIC_ID; i++) {
    if (!usedSet.has(i)) return i
  }
  throw new Error('No available numeric IDs')
}

export function formatNumericId(n: number): string {
  return n.toString().padStart(5, '0')
}

// Pick 2 oklch colors for an avatar based on a seed string
const PALETTES: [string, string][] = [
  ['oklch(0.62 0.24 285)', 'oklch(0.66 0.22 330)'],
  ['oklch(0.72 0.15 195)', 'oklch(0.65 0.2 220)'],
  ['oklch(0.7 0.22 30)', 'oklch(0.75 0.2 60)'],
  ['oklch(0.68 0.2 330)', 'oklch(0.72 0.2 290)'],
  ['oklch(0.65 0.18 155)', 'oklch(0.7 0.15 175)'],
  ['oklch(0.7 0.18 95)', 'oklch(0.75 0.16 60)'],
  ['oklch(0.65 0.2 270)', 'oklch(0.7 0.18 250)'],
  ['oklch(0.72 0.18 130)', 'oklch(0.68 0.2 165)'],
]

export function pickAvatar(seed: string): [string, string] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTES[h % PALETTES.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Normalize a phone number by stripping everything except digits and a leading +
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

// Try every reasonable normalization to find a user by phone.
// Returns the matching user or null.
export async function findUserByPhone(phone: string) {
  const { db } = await import('@/lib/db')
  const candidates = new Set<string>()
  const trimmed = phone.trim()
  candidates.add(trimmed)
  candidates.add(normalizePhone(trimmed))
  const digits = trimmed.replace(/\D/g, '')
  candidates.add(digits)
  candidates.add(`+${digits}`)
  // Build spaced-US-format candidates for any digit length
  // e.g. "15550200" → "+1 555 0200"
  const buildSpaced = (d: string) => {
    if (d.length === 11 && d.startsWith('1')) {
      return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
    }
    if (d.length === 8 && d.startsWith('1')) {
      // +1 555 0200 (7-digit local)
      return `+1 ${d.slice(1, 4)} ${d.slice(4)}`
    }
    if (d.length === 7) {
      return `+1 ${d.slice(0, 3)} ${d.slice(3)}`
    }
    return null
  }
  const spaced = buildSpaced(digits)
  if (spaced) candidates.add(spaced)
  // Also try with 1 prefix stripped/added
  if (digits.startsWith('1')) {
    const stripped = digits.slice(1)
    candidates.add(stripped)
    candidates.add(`+${stripped}`)
    const strippedSpaced = buildSpaced(stripped)
    if (strippedSpaced) candidates.add(strippedSpaced)
  } else {
    const prefixed = `1${digits}`
    candidates.add(prefixed)
    candidates.add(`+${prefixed}`)
    const prefixedSpaced = buildSpaced(prefixed)
    if (prefixedSpaced) candidates.add(prefixedSpaced)
  }
  for (const candidate of candidates) {
    const u = await db.user.findUnique({ where: { phone: candidate } })
    if (u) return u
  }
  return null
}
