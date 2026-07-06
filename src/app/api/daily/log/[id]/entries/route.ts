import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/daily/log/[id]/entries — add a food entry to the log
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: logId } = await ctx.params
    const body = await req.json()
    const { meal, foodName, fdcId, quantity, unit, calories, protein, carbs, fat, imageUrl, aiEstimated } = body as {
      meal?: string; foodName?: string; fdcId?: string; quantity?: number; unit?: string
      calories?: number; protein?: number; carbs?: number; fat?: number; imageUrl?: string; aiEstimated?: boolean
    }

    if (!foodName?.trim()) return NextResponse.json({ error: 'foodName is required' }, { status: 400 })

    // Verify the log belongs to the current user
    const log = await db.dailyLog.findUnique({ where: { id: logId }, select: { userId: true } })
    if (!log || log.userId !== me.id) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

    await db.foodEntry.create({
      data: {
        logId,
        meal: meal || 'snack',
        foodName: foodName.trim(),
        fdcId: fdcId || null,
        quantity: quantity ?? 1,
        unit: unit || 'serving',
        calories: calories ?? 0,
        protein: protein ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
        imageUrl: imageUrl || null,
        aiEstimated: aiEstimated ?? false,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[daily/entries POST] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/daily/log/[id]/entries — remove a food entry
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: logId } = await ctx.params
    const body = await req.json()
    const { entryId } = body as { entryId?: string }
    if (!entryId) return NextResponse.json({ error: 'Missing entryId' }, { status: 400 })

    // Verify the log belongs to the current user
    const log = await db.dailyLog.findUnique({ where: { id: logId }, select: { userId: true } })
    if (!log || log.userId !== me.id) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

    await db.foodEntry.delete({ where: { id: entryId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[daily/entries DELETE] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
