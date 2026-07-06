import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/health — lightweight health check.
// Deliberately doesn't touch the DB so it always returns 200
// (z.ai's deployment platform uses this to verify the app is up).
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'lumen',
    timestamp: new Date().toISOString(),
  })
}
