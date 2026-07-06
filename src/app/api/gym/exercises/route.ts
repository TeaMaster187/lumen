import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory cache for exercise search results (1 hour TTL)
type CachedResult = { exercises: ExerciseResult[]; bodyParts: string[]; expiresAt: number }
let _cache: Map<string, CachedResult> = new Map()
const CACHE_TTL_MS = 60 * 60 * 1000

type ExerciseResult = {
  id: string
  name: string
  bodyPart: string
  target: string
  equipment: string
  gifUrl: string
}

// Static fallback exercises (used when no API key is available)
const FALLBACK_EXERCISES: ExerciseResult[] = [
  { id: 'fb-1', name: 'Barbell Bench Press', bodyPart: 'chest', target: 'pectorals', equipment: 'barbell', gifUrl: 'https://via.placeholder.com/300/6D3BD1/ffffff?text=Bench+Press' },
  { id: 'fb-2', name: 'Incline Dumbbell Press', bodyPart: 'chest', target: 'pectorals', equipment: 'dumbbell', gifUrl: 'https://via.placeholder.com/300/6D3BD1/ffffff?text=Incline+Press' },
  { id: 'fb-3', name: 'Push Up', bodyPart: 'chest', target: 'pectorals', equipment: 'body weight', gifUrl: 'https://via.placeholder.com/300/6D3BD1/ffffff?text=Push+Up' },
  { id: 'fb-4', name: 'Pull Up', bodyPart: 'back', target: 'lats', equipment: 'body weight', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=Pull+Up' },
  { id: 'fb-5', name: 'Barbell Row', bodyPart: 'back', target: 'lats', equipment: 'barbell', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=Barbell+Row' },
  { id: 'fb-6', name: 'Deadlift', bodyPart: 'back', target: 'glutes', equipment: 'barbell', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=Deadlift' },
  { id: 'fb-7', name: 'Lat Pulldown', bodyPart: 'back', target: 'lats', equipment: 'cable', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=Lat+Pulldown' },
  { id: 'fb-8', name: 'Barbell Squat', bodyPart: 'legs', target: 'quads', equipment: 'barbell', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Squat' },
  { id: 'fb-9', name: 'Leg Press', bodyPart: 'legs', target: 'quads', equipment: 'machine', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Leg+Press' },
  { id: 'fb-10', name: 'Lunges', bodyPart: 'legs', target: 'quads', equipment: 'dumbbell', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Lunges' },
  { id: 'fb-11', name: 'Leg Curl', bodyPart: 'legs', target: 'hamstrings', equipment: 'machine', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Leg+Curl' },
  { id: 'fb-12', name: 'Standing Calf Raise', bodyPart: 'legs', target: 'calves', equipment: 'machine', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Calf+Raise' },
  { id: 'fb-13', name: 'Dumbbell Shoulder Press', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell', gifUrl: 'https://via.placeholder.com/300/6D3BD1/ffffff?text=Shoulder+Press' },
  { id: 'fb-14', name: 'Lateral Raise', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell', gifUrl: 'https://via.placeholder.com/300/6D3BD1/ffffff?text=Lateral+Raise' },
  { id: 'fb-15', name: 'Front Raise', bodyPart: 'shoulders', target: 'delts', equipment: 'dumbbell', gifUrl: 'https://via.placeholder.com/300/6D3BD1/ffffff?text=Front+Raise' },
  { id: 'fb-16', name: 'Barbell Curl', bodyPart: 'arms', target: 'biceps', equipment: 'barbell', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=Barbell+Curl' },
  { id: 'fb-17', name: 'Dumbbell Curl', bodyPart: 'arms', target: 'biceps', equipment: 'dumbbell', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=DB+Curl' },
  { id: 'fb-18', name: 'Triceps Pushdown', bodyPart: 'arms', target: 'triceps', equipment: 'cable', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=Pushdown' },
  { id: 'fb-19', name: 'Skull Crushers', bodyPart: 'arms', target: 'triceps', equipment: 'barbell', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=Skull+Crushers' },
  { id: 'fb-20', name: 'Hammer Curl', bodyPart: 'arms', target: 'biceps', equipment: 'dumbbell', gifUrl: 'https://via.placeholder.com/300/C7439C/ffffff?text=Hammer+Curl' },
  { id: 'fb-21', name: 'Plank', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Plank' },
  { id: 'fb-22', name: 'Crunches', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Crunches' },
  { id: 'fb-23', name: 'Hanging Leg Raise', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Leg+Raise' },
  { id: 'fb-24', name: 'Russian Twist', bodyPart: 'waist', target: 'abs', equipment: 'body weight', gifUrl: 'https://via.placeholder.com/300/5EB8DC/ffffff?text=Russian+Twist' },
]

// GET /api/gym/exercises?search=&bodyPart=&limit= — browse exercises
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.toLowerCase().trim() || ''
    const bodyPart = searchParams.get('bodyPart')?.toLowerCase().trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // Cache key
    const cacheKey = `${search}::${bodyPart}::${limit}`
    const cached = _cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ exercises: cached.exercises, bodyParts: cached.bodyParts })
    }

    // Try ExerciseDB API if key is available, otherwise use fallback
    const apiKey = process.env.EXERCISEDB_API_KEY || process.env.RAPIDAPI_KEY
    let exercises: ExerciseResult[]

    if (apiKey) {
      try {
        const headers: Record<string, string> = { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com' }
        let url: string
        if (bodyPart) {
          url = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}`
        } else if (search) {
          url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(search)}?limit=${limit}`
        } else {
          url = `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}`
        }
        const res = await fetch(url, { headers })
        if (res.ok) {
          const data = await res.json() as Array<Record<string, unknown>>
          exercises = data.map((e) => ({
            id: String(e.id ?? ''),
            name: String(e.name ?? 'Exercise'),
            bodyPart: String(e.bodyPart ?? 'other'),
            target: String(e.target ?? ''),
            equipment: String(e.equipment ?? ''),
            gifUrl: String(e.gifUrl ?? ''),
          }))
        } else {
          exercises = FALLBACK_EXERCISES
        }
      } catch {
        exercises = FALLBACK_EXERCISES
      }
    } else {
      exercises = FALLBACK_EXERCISES
    }

    // Apply filters to fallback/local results
    let filtered = exercises
    if (search) {
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(search) || e.target.toLowerCase().includes(search))
    }
    if (bodyPart) {
      filtered = filtered.filter((e) => e.bodyPart === bodyPart)
    }

    // Collect unique body parts from the full set (not filtered) for the filter chips
    const allBodyParts = [...new Set(exercises.map((e) => e.bodyPart))].sort()

    // Cache the result
    _cache.set(cacheKey, { exercises: filtered, bodyParts: allBodyParts, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json({ exercises: filtered, bodyParts: allBodyParts })
  } catch (e) {
    console.error('[gym/exercises] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
