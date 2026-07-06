import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/daily/ai-estimate — analyze a food photo and estimate calories + macros
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { image } = body as { image?: string }

    if (!image) return NextResponse.json({ error: 'Missing image' }, { status: 400 })

    // Try to use the z-ai-web-dev-sdk VLM for real food recognition
    try {
      const { ZAI } = await import('z-ai-web-dev-sdk').catch(() => ({ ZAI: null as unknown }))
      if (ZAI && typeof ZAI === 'function') {
        const zai = new (ZAI as unknown as { new (): { chat: { create: (opts: unknown) => Promise<unknown> } } })()
        const result = await zai.chat.create({
          model: 'glm-4v-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: image } },
                {
                  type: 'text',
                  text: 'You are a nutrition expert. Analyze this food image and estimate the calories and macros. Respond ONLY with valid JSON in this exact format: {"foods":[{"foodName":"string","calories":number,"protein":number,"carbs":number,"fat":number}],"totalCalories":number,"notes":"brief string"}. Use grams for protein/carbs/fat. Be realistic. If you cannot identify the food, return {"foods":[],"totalCalories":0,"notes":"Could not identify food"}.',
                },
              ],
            },
          ],
        })
        // Parse the AI response — it should be JSON
        const text = (result as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content || ''
        // Extract JSON from the response (in case it's wrapped in markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return NextResponse.json(parsed)
        }
        throw new Error('No JSON in AI response')
      }
    } catch (e) {
      console.warn('[ai-estimate] VLM failed, using fallback', e)
    }

    // Fallback: return a generic estimate so the UI doesn't break
    return NextResponse.json({
      foods: [
        {
          foodName: 'Mixed meal (estimated)',
          calories: 450,
          protein: 25,
          carbs: 45,
          fat: 18,
          confidence: 'low',
        },
      ],
      totalCalories: 450,
      notes: 'AI vision unavailable — this is a rough estimate. Please edit the values manually.',
    })
  } catch (e) {
    console.error('[ai-estimate] error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
