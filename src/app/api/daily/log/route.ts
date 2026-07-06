import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper: get today's date at midnight (local)
function todayMidnight(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// GET /api/daily/log — get today's DailyLog (create if missing), with entries + totals
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = todayMidnight()

    // Find or create today's log
    let log = await db.dailyLog.findUnique({
      where: { userId_date: { userId: me.id, date: today } },
      include: { entries: { orderBy: { createdAt: 'asc' } } },
    })

    if (!log) {
      log = await db.dailyLog.create({
        data: { userId: me.id, date: today },
        include: { entries: true },
      })
    }

    // Compute totals
    const totals = log.entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )

    return NextResponse.json({
      log: {
        id: log.id,
        date: log.date.toISOString(),
        calorieGoal: log.calorieGoal,
        proteinGoal: log.proteinGoal,
        carbGoal: log.carbGoal,
        fatGoal: log.fatGoal,
        waterGoal: log.waterGoal,
        waterIntake: log.waterIntake,
        entries: log.entries.map((e) => ({
          id: e.id,
          meal: e.meal,
          foodName: e.foodName,
          fdcId: e.fdcId,
          quantity: e.quantity,
          unit: e.unit,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          imageUrl: e.imageUrl,
          aiEstimated: e.aiEstimated,
          createdAt: e.createdAt.toISOString(),
        })),
      },
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      },
    })
  } catch (e) {
    console.error('[daily/log GET] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/daily/log — update goals or add water
export async function PATCH(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { calorieGoal, proteinGoal, carbGoal, fatGoal, waterGoal, addWater } = body as {
      calorieGoal?: number; proteinGoal?: number; carbGoal?: number; fatGoal?: number; waterGoal?: number; addWater?: number
    }

    const today = todayMidnight()

    // Find or create today's log
    let log = await db.dailyLog.findUnique({ where: { userId_date: { userId: me.id, date: today } } })
    if (!log) {
      log = await db.dailyLog.create({ data: { userId: me.id, date: today } })
    }

    const data: Record<string, number> = {}
    if (typeof calorieGoal === 'number') data.calorieGoal = calorieGoal
    if (typeof proteinGoal === 'number') data.proteinGoal = proteinGoal
    if (typeof carbGoal === 'number') data.carbGoal = carbGoal
    if (typeof fatGoal === 'number') data.fatGoal = fatGoal
    if (typeof waterGoal === 'number') data.waterGoal = waterGoal
    if (typeof addWater === 'number') data.waterIntake = Math.max(0, log.waterIntake + addWater)

    if (Object.keys(data).length > 0) {
      await db.dailyLog.update({ where: { id: log.id }, data })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[daily/log PATCH] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
