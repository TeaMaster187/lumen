import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/gym/plans — list current user's workout plans with exercises
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const plans = await db.workoutPlan.findMany({
      where: { userId: me.id },
      include: { exercises: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        day: p.day,
        notes: p.notes,
        exercises: p.exercises.map((e) => ({
          id: e.id,
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          bodyPart: e.bodyPart,
          target: e.target,
          equipment: e.equipment,
          gifUrl: e.gifUrl,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          completed: e.completed,
          order: e.order,
        })),
      })),
    })
  } catch (e) {
    console.error('[gym/plans GET] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/gym/plans — create a new workout plan
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, day, notes } = body as { name?: string; day?: string; notes?: string }

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const plan = await db.workoutPlan.create({
      data: {
        userId: me.id,
        name: name.trim(),
        day: day?.trim() || null,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json({ plan: { id: plan.id } })
  } catch (e) {
    console.error('[gym/plans POST] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/gym/plans — delete a workout plan (cascades to exercises)
export async function DELETE(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { planId } = body as { planId?: string }
    if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

    // Verify ownership before deleting
    const plan = await db.workoutPlan.findUnique({ where: { id: planId }, select: { userId: true } })
    if (!plan || plan.userId !== me.id) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    await db.workoutPlan.delete({ where: { id: planId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[gym/plans DELETE] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
