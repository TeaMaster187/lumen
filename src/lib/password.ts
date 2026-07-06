// Password hashing using Node's built-in crypto (scrypt) — no external deps needed.
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const KEY_LEN = 64
const SALT_LEN = 16
const N = 16384 // CPU/memory cost parameter (must be a power of 2)
const R = 8     // Block size parameter
const P = 1     // Parallelization parameter

/**
 * Hash a plaintext password using scrypt.
 * Returns a string of the form: `scrypt:N:R:P:saltHex:hashHex`
 */
export function hashPassword(plain: string): string {
  if (!plain || plain.length < 4) throw new Error('Password must be at least 4 characters')
  const salt = randomBytes(SALT_LEN)
  const hash = scryptSync(plain, salt, KEY_LEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 })
  return `scrypt:${N}:${R}:${P}:${salt.toString('hex')}:${hash.toString('hex')}`
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports the `scrypt:N:R:P:saltHex:hashHex` format produced by hashPassword.
 * Returns false for null/empty/unknown hashes (instead of throwing), so
 * callers can treat "no password set" and "wrong password" identically.
 */
export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!plain || !stored) return false
  const parts = stored.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts
  const N = parseInt(nStr, 10)
  const r = parseInt(rStr, 10)
  const p = parseInt(pStr, 10)
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  if (salt.length === 0 || expected.length === 0) return false
  let computed: Buffer
  try {
    computed = scryptSync(plain, salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 })
  } catch {
    return false
  }
  if (computed.length !== expected.length) return false
  return timingSafeEqual(computed, expected)
}
