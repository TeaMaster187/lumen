import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, initials, formatNumericId } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ userId: string }> }

// GET /api/users/[userId]/profile — public profile data with optional daily/gym/progress sections
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId } = await ctx.params

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        numericId: true,
        name: true,
        username: true,
        bio: true,
        avatarA: true,
        avatarB: true,
        avatarUrl: true,
        dailyPublic: true,
        gymPublic: true,
        progressPicsPublic: true,
      },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isSelf = user.id === me.id
    const startOfToday = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
    )

    // Build the public user object
    const publicUser = {
      id: user.id,
      numericId: user.numericId,
      numericIdStr: formatNumericId(user.numericId),
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatarA: user.avatarA,
      avatarB: user.avatarB,
      avatarUrl: user.avatarUrl,
      avatarInitials: initials(user.name),
      isSelf,
      dailyPublic: user.dailyPublic,
      gymPublic: user.gymPublic,
      progressPicsPublic: user.progressPicsPublic,
    }

    // Daily summary + entries (only if public OR self)
    let dailySummary: {
      calorieGoal: number
      proteinGoal: number
      carbGoal: number
      fatGoal: number
      totals: { calories: number; protein: number; carbs: number; fat: number }
      entryCount: number
    } | null = null
    let dailyEntries: {
      meal: string
      items: {
        id: string
        foodName: string
        quantity: number
        unit: string
        calories: number
        protein: number
        carbs: number
        fat: number
        aiEstimated: boolean
      }[]
    }[] = []

    const showDaily = user.dailyPublic || isSelf
    if (showDaily) {
      const log = await db.dailyLog.findFirst({
        where: { userId: user.id, date: startOfToday },
        include: { entries: { orderBy: { createdAt: 'asc' } } },
      })
      const totals = (log?.entries ?? []).reduce(
        (acc, e) => {
          acc.calories += e.calories
          acc.protein += e.protein
          acc.carbs += e.carbs
          acc.fat += e.fat
          return acc
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
      if (log) {
        dailySummary = {
          calorieGoal: log.calorieGoal,
          proteinGoal: log.proteinGoal,
          carbGoal: log.carbGoal,
          fatGoal: log.fatGoal,
          totals: {
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein * 10) / 10,
            carbs: Math.round(totals.carbs * 10) / 10,
            fat: Math.round(totals.fat * 10) / 10,
          },
          entryCount: log.entries.length,
        }
      } else {
        dailySummary = {
          calorieGoal: 2000,
          proteinGoal: 150,
          carbGoal: 200,
          fatGoal: 65,
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          entryCount: 0,
        }
      }
      // Group entries by meal
      const byMeal: Record<string, typeof dailyEntries[number]['items']> = {}
      for (const e of log?.entries ?? []) {
        const m = e.meal in byMeal ? e.meal : (byMeal[e.meal] ? e.meal : e.meal)
        if (!byMeal[m]) byMeal[m] = []
        byMeal[m].push({
          id: e.id,
          foodName: e.foodName,
          quantity: e.quantity,
          unit: e.unit,
          calories: Math.round(e.calories),
          protein: Math.round(e.protein * 10) / 10,
          carbs: Math.round(e.carbs * 10) / 10,
          fat: Math.round(e.fat * 10) / 10,
          aiEstimated: e.aiEstimated,
        })
      }
      dailyEntries = Object.entries(byMeal).map(([meal, items]) => ({ meal, items }))
    }

    // Workout plans (only if public OR self)
    let workoutPlans: {
      id: string
      name: string
      day: string | null
      exerciseCount: number
      completedCount: number
      exercises: {
        id: string
        exerciseName: string
        bodyPart: string | null
        target: string | null
        equipment: string | null
        gifUrl: string | null
        sets: number
        reps: number
        weight: number | null
        completed: boolean
      }[]
    }[] = []
    const showGym = user.gymPublic || isSelf
    if (showGym) {
      const plans = await db.workoutPlan.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        include: { exercises: { orderBy: { order: 'asc' } } },
      })
      workoutPlans = plans.map((p) => ({
        id: p.id,
        name: p.name,
        day: p.day,
        exerciseCount: p.exercises.length,
        completedCount: p.exercises.filter((e) => e.completed).length,
        exercises: p.exercises.map((e) => ({
          id: e.id,
          exerciseName: e.exerciseName,
          bodyPart: e.bodyPart,
          target: e.target,
          equipment: e.equipment,
          gifUrl: e.gifUrl,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          completed: e.completed,
        })),
      }))
    }

    // Progress pics (only if public OR self)
    let progressPics: {
      id: string
      photoUrl: string
      weekLabel: string
      note: string | null
      createdAt: string
    }[] = []
    const showPics = user.progressPicsPublic || isSelf
    if (showPics) {
      const pics = await db.progressPic.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })
      progressPics = pics.map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        weekLabel: p.weekLabel,
        note: p.note,
        createdAt: p.createdAt.toISOString(),
      }))
    }

    return NextResponse.json({
      user: publicUser,
      dailySummary,
      dailyEntries,
      workoutPlans,
      progressPics,
    })
  } catch (e) {
    console.error('[users/[userId]/profile] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
