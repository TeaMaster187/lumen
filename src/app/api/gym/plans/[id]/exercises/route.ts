import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/gym/plans/[id]/exercises — add an exercise to a plan
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: planId } = await ctx.params
    const body = await req.json()
    const { exerciseId, exerciseName, bodyPart, target, equipment, gifUrl, sets, reps, weight } = body as {
      exerciseId?: string; exerciseName?: string; bodyPart?: string; target?: string; equipment?: string
      gifUrl?: string; sets?: number; reps?: number; weight?: number
    }

    if (!exerciseName?.trim()) return NextResponse.json({ error: 'exerciseName is required' }, { status: 400 })

    // Verify ownership
    const plan = await db.workoutPlan.findUnique({ where: { id: planId }, select: { userId: true } })
    if (!plan || plan.userId !== me.id) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    // Determine the next order value
    const maxOrder = await db.workoutExercise.findFirst({
      where: { planId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    await db.workoutExercise.create({
      data: {
        planId,
        exerciseId: exerciseId || `manual-${Date.now()}`,
        exerciseName: exerciseName.trim(),
        bodyPart: bodyPart || null,
        target: target || null,
        equipment: equipment || null,
        gifUrl: gifUrl || null,
        sets: sets ?? 3,
        reps: reps ?? 10,
        weight: weight ?? null,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[gym/exercises POST] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/gym/plans/[id]/exercises — toggle exercise completed status
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: planId } = await ctx.params
    const body = await req.json()
    const { exerciseId, completed } = body as { exerciseId?: string; completed?: boolean }

    if (!exerciseId) return NextResponse.json({ error: 'Missing exerciseId' }, { status: 400 })

    // Verify ownership
    const plan = await db.workoutPlan.findUnique({ where: { id: planId }, select: { userId: true } })
    if (!plan || plan.userId !== me.id) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    if (typeof completed === 'boolean') {
      await db.workoutExercise.update({ where: { id: exerciseId }, data: { completed } })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[gym/exercises PATCH] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/gym/plans/[id]/exercises — remove an exercise from a plan
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: planId } = await ctx.params
    const body = await req.json()
    const { exerciseId } = body as { exerciseId?: string }
    if (!exerciseId) return NextResponse.json({ error: 'Missing exerciseId' }, { status: 400 })

    // Verify ownership
    const plan = await db.workoutPlan.findUnique({ where: { id: planId }, select: { userId: true } })
    if (!plan || plan.userId !== me.id) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    await db.workoutExercise.delete({ where: { id: exerciseId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[gym/exercises DELETE] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
