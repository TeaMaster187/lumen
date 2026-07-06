import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-memory cache for food search results (30 min TTL)
type CachedFood = { foods: FoodResult[]; expiresAt: number }
let _cache: Map<string, CachedFood> = new Map()
const CACHE_TTL_MS = 30 * 60 * 1000

type FoodResult = {
  fdcId: number
  name: string
  brand?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize?: number
  servingUnit?: string
}

// GET /api/daily/food?search=&limit= — search USDA FoodData Central
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    if (!search) return NextResponse.json({ foods: [] })

    // Check cache
    const cacheKey = `${search}::${limit}`
    const cached = _cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ foods: cached.foods })
    }

    const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY'

    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(search)}&pageSize=${limit}&dataType=SR%20Legacy,Branded`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })

      if (!res.ok) {
        // Return a small static fallback so the UI doesn't break
        return NextResponse.json({ foods: getFallbackFoods(search) })
      }

      const data = await res.json() as { foods?: Array<Record<string, unknown>> }
      const foods: FoodResult[] = (data.foods ?? []).map((f) => {
        const nutrients = (f.foodNutrients as Array<{ nutrientName: string; value?: number }>) ?? []
        const get = (name: string) => {
          const n = nutrients.find((nut) => nut.nutrientName?.toLowerCase().includes(name))
          return n?.value ?? 0
        }
        return {
          fdcId: Number(f.fdcId ?? 0),
          name: String(f.description ?? 'Unknown food'),
          brand: f.brandOwner ? String(f.brandOwner) : undefined,
          calories: Math.round(get('energy') * 10) / 10,
          protein: Math.round(get('protein') * 10) / 10,
          carbs: Math.round(get('carbohydrate') * 10) / 10,
          fat: Math.round(get('total lipid') * 10) / 10,
          servingSize: f.servingSize ? Number(f.servingSize) : 100,
          servingUnit: f.servingSizeUnit ? String(f.servingSizeUnit) : 'g',
        }
      })

      _cache.set(cacheKey, { foods, expiresAt: Date.now() + CACHE_TTL_MS })
      return NextResponse.json({ foods })
    } catch {
      // Network error or API failure → return fallback
      return NextResponse.json({ foods: getFallbackFoods(search) })
    }
  } catch (e) {
    console.error('[daily/food] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Minimal fallback food list for when the USDA API is unavailable
function getFallbackFoods(search: string): FoodResult[] {
  const common: FoodResult[] = [
    { fdcId: 1, name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: 'g' },
    { fdcId: 2, name: 'White Rice (cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 100, servingUnit: 'g' },
    { fdcId: 3, name: 'Brown Rice (cooked)', calories: 112, protein: 2.6, carbs: 24, fat: 0.9, servingSize: 100, servingUnit: 'g' },
    { fdcId: 4, name: 'Whole Egg', calories: 155, protein: 13, carbs: 1.1, fat: 11, servingSize: 100, servingUnit: 'g' },
    { fdcId: 5, name: 'Egg White', calories: 52, protein: 11, carbs: 0.7, fat: 0.2, servingSize: 100, servingUnit: 'g' },
    { fdcId: 6, name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: 100, servingUnit: 'g' },
    { fdcId: 7, name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, servingSize: 100, servingUnit: 'g' },
    { fdcId: 8, name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, servingSize: 100, servingUnit: 'g' },
    { fdcId: 9, name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: 100, servingUnit: 'g' },
    { fdcId: 10, name: 'Oatmeal (cooked)', calories: 71, protein: 2.5, carbs: 12, fat: 1.5, servingSize: 100, servingUnit: 'g' },
    { fdcId: 11, name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, servingSize: 100, servingUnit: 'g' },
    { fdcId: 12, name: 'Peanut Butter', calories: 588, protein: 25, carbs: 20, fat: 50, servingSize: 100, servingUnit: 'g' },
    { fdcId: 13, name: 'Beef Steak (sirloin)', calories: 271, protein: 25, carbs: 0, fat: 19, servingSize: 100, servingUnit: 'g' },
    { fdcId: 14, name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, servingSize: 100, servingUnit: 'g' },
    { fdcId: 15, name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: 100, servingUnit: 'g' },
    { fdcId: 16, name: 'Milk (whole)', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, servingSize: 100, servingUnit: 'g' },
    { fdcId: 17, name: 'Cheese (cheddar)', calories: 402, protein: 25, carbs: 1.3, fat: 33, servingSize: 100, servingUnit: 'g' },
    { fdcId: 18, name: 'Bread (white)', calories: 265, protein: 9, carbs: 49, fat: 3.2, servingSize: 100, servingUnit: 'g' },
    { fdcId: 19, name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, servingSize: 100, servingUnit: 'g' },
    { fdcId: 20, name: 'Tuna (canned)', calories: 116, protein: 26, carbs: 0, fat: 1, servingSize: 100, servingUnit: 'g' },
  ]
  const q = search.toLowerCase()
  return common.filter((f) => f.name.toLowerCase().includes(q))
}
