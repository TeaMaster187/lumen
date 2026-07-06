'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, X, Loader2, Camera, Trash2, Droplets, Flame, Beef, Wheat, PenLine, Sparkles, Check } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

type FoodResult = { fdcId: string; name: string; brand: string | null; calories: number; protein: number; carbs: number; fat: number; servingSize: string; foodCategory: string | null }
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export function DailyScreen() {
  const dailyLog = useApp((s) => s.dailyLog)
  const dailyTotals = useApp((s) => s.dailyTotals)
  const refreshDailyLog = useApp((s) => s.refreshDailyLog)
  const addFoodEntry = useApp((s) => s.addFoodEntry)
  const removeFoodEntry = useApp((s) => s.removeFoodEntry)
  const addWater = useApp((s) => s.addWater)
  const updateDailyGoals = useApp((s) => s.updateDailyGoals)
  const aiEstimateFood = useApp((s) => s.aiEstimateFood)

  const [showSearch, setShowSearch] = useState(false)
  const [activeMeal, setActiveMeal] = useState<string>('snack')
  const [searchQuery, setSearchQuery] = useState('')
  const [foodResults, setFoodResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [aiPhoto, setAiPhoto] = useState<string | null>(null)
  const [aiEstimating, setAiEstimating] = useState(false)
  const [aiResult, setAiResult] = useState<{ foodName: string; calories: number; protein: number; carbs: number; fat: number; confidence: string } | null>(null)
  const aiFileRef = useRef<HTMLInputElement>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [custom, setCustom] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [showGoals, setShowGoals] = useState(false)
  const [goals, setGoals] = useState({ calorieGoal: '2000', proteinGoal: '150', carbGoal: '200', fatGoal: '65' })

  useEffect(() => { refreshDailyLog() }, [refreshDailyLog])
  useEffect(() => { if (dailyLog) setGoals({ calorieGoal: String(dailyLog.calorieGoal), proteinGoal: String(dailyLog.proteinGoal), carbGoal: String(dailyLog.carbGoal), fatGoal: String(dailyLog.fatGoal) }) }, [dailyLog?.id])

  const doSearch = async () => {
    if (searchQuery.trim().length < 2) return
    setSearching(true)
    try { const res = await fetch(`/api/daily/food?search=${encodeURIComponent(searchQuery.trim())}&limit=20`, { credentials: 'include' }); const data = await res.json(); setFoodResults(data.foods ?? []) } catch (e) { console.error('[search] error', e) } finally { setSearching(false) }
  }
  const onAddFood = async (food: FoodResult) => { setAdding(food.fdcId); await addFoodEntry({ meal: activeMeal, foodName: food.name, fdcId: food.fdcId, quantity: 1, unit: food.servingSize, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat }); setAdding(null); setShowSearch(false); setSearchQuery(''); setFoodResults([]) }
  const onAddCustom = async () => { if (!custom.name.trim()) return; await addFoodEntry({ meal: activeMeal, foodName: custom.name.trim(), quantity: 1, unit: 'serving', calories: parseFloat(custom.calories) || 0, protein: parseFloat(custom.protein) || 0, carbs: parseFloat(custom.carbs) || 0, fat: parseFloat(custom.fat) || 0 }); setShowCustom(false); setCustom({ name: '', calories: '', protein: '', carbs: '', fat: '' }) }
  const onAIPhoto = () => aiFileRef.current?.click()
  const onAIFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; if (file.size > 4 * 1024 * 1024) { alert('Image too large (max 4MB)'); return }
    setAiEstimating(true); setAiResult(null)
    const reader = new FileReader()
    reader.onload = async () => { const dataUrl = reader.result as string; setAiPhoto(dataUrl); const res = await aiEstimateFood(dataUrl); setAiEstimating(false); if (res.ok && res.result) setAiResult(res.result); else alert(res.error ?? 'AI estimation failed') }
    reader.readAsDataURL(file)
  }
  const onConfirmAI = async () => { if (!aiResult) return; await addFoodEntry({ meal: activeMeal, foodName: aiResult.foodName, quantity: 1, unit: 'serving', calories: aiResult.calories, protein: aiResult.protein, carbs: aiResult.carbs, fat: aiResult.fat, imageUrl: aiPhoto ?? undefined, aiEstimated: true }); setShowAI(false); setAiPhoto(null); setAiResult(null) }
  const onSaveGoals = async () => { await updateDailyGoals({ calorieGoal: parseInt(goals.calorieGoal) || 2000, proteinGoal: parseInt(goals.proteinGoal) || 150, carbGoal: parseInt(goals.carbGoal) || 200, fatGoal: parseInt(goals.fatGoal) || 65 }); setShowGoals(false) }
  const openSearch = (meal: string) => { setActiveMeal(meal); setShowSearch(true); setSearchQuery(''); setFoodResults([]) }

  if (!dailyLog || !dailyTotals) return <div className="grid min-h-dvh place-items-center"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>

  const remaining = dailyLog.calorieGoal - dailyTotals.calories
  const caloriePct = Math.min(100, (dailyTotals.calories / dailyLog.calorieGoal) * 100)
  const proteinPct = Math.min(100, (dailyTotals.protein / dailyLog.proteinGoal) * 100)
  const carbPct = Math.min(100, (dailyTotals.carbs / dailyLog.carbGoal) * 100)
  const fatPct = Math.min(100, (dailyTotals.fat / dailyLog.fatGoal) * 100)
  const waterPct = Math.min(100, (dailyLog.waterIntake / dailyLog.waterGoal) * 100)
  const entriesByMeal = (meal: string) => dailyLog.entries.filter((e) => e.meal === meal)

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <input ref={aiFileRef} type="file" accept="image/*" className="hidden" onChange={onAIFileChange} />
      <header className="sticky top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass rounded-3xl px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Daily</h1>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowGoals(true)} className="glass-pill grid h-10 w-10 place-items-center rounded-full active:scale-90" aria-label="Set goals"><PenLine size={16} /></button>
              <button type="button" onClick={() => { setActiveMeal('snack'); setShowAI(true) }} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground active:scale-90" style={{ boxShadow: '0 6px 14px -4px color-mix(in oklch, var(--brand-1) 70%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.25)' }} aria-label="AI photo estimate"><Camera size={18} /></button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 px-3 pb-32 pt-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass specular mb-3 rounded-3xl p-5">
          <div className="flex items-center gap-5">
            <div className="relative grid h-28 w-28 shrink-0 place-items-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-foreground/10" /><circle cx="50" cy="50" r="42" fill="none" stroke="url(#calGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - caloriePct / 100)}`} className="transition-all duration-500" /><defs><linearGradient id="calGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--brand-1)" /><stop offset="100%" stopColor="var(--brand-2)" /></linearGradient></defs></svg>
              <div className="flex flex-col items-center"><span className="text-2xl font-bold">{dailyTotals.calories}</span><span className="text-[10px] text-muted-foreground">/ {dailyLog.calorieGoal}</span></div>
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-1.5"><Flame size={16} className={remaining < 0 ? 'text-destructive' : 'text-primary'} /><span className="text-sm font-semibold">{remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over`}</span></div>
              <div className="space-y-1.5">
                <MacroBar label="Protein" icon={Beef} value={dailyTotals.protein} goal={dailyLog.proteinGoal} pct={proteinPct} color="var(--brand-1)" />
                <MacroBar label="Carbs" icon={Wheat} value={dailyTotals.carbs} goal={dailyLog.carbGoal} pct={carbPct} color="var(--brand-4)" />
                <MacroBar label="Fat" icon={Droplets} value={dailyTotals.fat} goal={dailyLog.fatGoal} pct={fatPct} color="var(--brand-2)" />
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass specular mb-3 flex items-center gap-3 rounded-3xl p-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.15 230), oklch(0.7 0.15 200))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}><Droplets size={22} /></div>
          <div className="flex-1"><div className="text-sm font-semibold">{dailyLog.waterIntake} / {dailyLog.waterGoal} ml</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full transition-all" style={{ width: `${waterPct}%`, background: 'linear-gradient(90deg, oklch(0.6 0.15 230), oklch(0.7 0.15 200))' }} /></div></div>
          <div className="flex gap-1.5"><button type="button" onClick={() => addWater(250)} className="rounded-full bg-foreground/8 px-3 py-1.5 text-xs font-semibold active:scale-95">+250ml</button><button type="button" onClick={() => addWater(500)} className="rounded-full bg-foreground/8 px-3 py-1.5 text-xs font-semibold active:scale-95">+500ml</button></div>
        </motion.div>
        {MEALS.map((meal, mi) => {
          const entries = entriesByMeal(meal); const mealCals = entries.reduce((s, e) => s + e.calories, 0)
          return (
            <motion.div key={meal} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + mi * 0.03 }} className="glass mb-2 overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between px-4 py-3"><div><span className="text-sm font-semibold capitalize">{meal}</span><span className="ml-2 text-xs text-muted-foreground">{mealCals} kcal</span></div><button type="button" onClick={() => openSearch(meal)} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary active:scale-95"><Plus size={13} /> Add</button></div>
              {entries.length > 0 && <div className="border-t border-foreground/8">{entries.map((e) => (<div key={e.id} className="flex items-center gap-3 px-4 py-2.5">{e.imageUrl ? <img src={e.imageUrl} alt={e.foodName} className="h-10 w-10 rounded-xl object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground/8 text-xs">{e.aiEstimated ? <Sparkles size={14} className="text-primary" /> : <Beef size={14} className="text-muted-foreground" />}</div>}<div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{e.foodName}</div><div className="text-[11px] text-muted-foreground">{e.calories} kcal · P{e.protein}g · C{e.carbs}g · F{e.fat}g{e.aiEstimated && <span className="ml-1 text-primary">· AI</span>}</div></div><button type="button" onClick={() => removeFoodEntry(e.id)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-destructive active:scale-90" aria-label="Remove"><Trash2 size={15} /></button></div>))}</div>}
            </motion.div>
          )
        })}
      </div>
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md">
            <div className="glass-strong flex items-center gap-2 p-2 pt-[max(env(safe-area-inset-top),0.5rem)]"><button onClick={() => setShowSearch(false)} className="grid h-10 w-10 place-items-center rounded-full active:scale-90"><X size={20} /></button><h3 className="flex-1 text-sm font-semibold capitalize">Add to {activeMeal}</h3><button type="button" onClick={() => { setShowSearch(false); setShowCustom(true) }} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground active:scale-95"><PenLine size={13} /> Custom</button></div>
            <div className="px-3 pb-2"><div className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doSearch() }} placeholder="Search 26,000+ foods…" autoFocus className="w-full rounded-2xl bg-white/10 py-2.5 pl-10 pr-3 text-sm text-white outline-none ring-1 ring-white/20 placeholder:text-white/40" /></div></div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-8">
              {searching ? <div className="grid place-items-center py-12"><Loader2 size={24} className="animate-spin text-white/60" /></div> : foodResults.length === 0 ? <div className="py-12 text-center text-sm text-white/40">{searchQuery ? 'No results.' : 'Search for any food.'}</div> : <div className="space-y-1.5">{foodResults.map((f) => (<button key={f.fdcId} type="button" disabled={adding === f.fdcId} onClick={() => onAddFood(f)} className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99] disabled:opacity-50"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground/10"><Beef size={16} className="text-white/60" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{f.name}</div><div className="text-[11px] text-white/50">{f.calories} kcal · P{f.protein}g · C{f.carbs}g · F{f.fat}g{f.brand && ` · ${f.brand}`}</div></div>{adding === f.fdcId ? <Loader2 size={16} className="animate-spin text-white/60" /> : <Plus size={18} className="shrink-0 text-primary" />}</button>))}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCustom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCustom(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-strong w-full max-w-sm rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><PenLine size={16} className="text-primary" /> Custom food</h3><button onClick={() => setShowCustom(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"><X size={16} /></button></div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Food name *</label>
              <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="e.g. Homemade salad" autoFocus className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" />
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Calories</label><input type="number" value={custom.calories} onChange={(e) => setCustom({ ...custom, calories: e.target.value })} placeholder="0" className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Protein (g)</label><input type="number" value={custom.protein} onChange={(e) => setCustom({ ...custom, protein: e.target.value })} placeholder="0" className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Carbs (g)</label><input type="number" value={custom.carbs} onChange={(e) => setCustom({ ...custom, carbs: e.target.value })} placeholder="0" className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Fat (g)</label><input type="number" value={custom.fat} onChange={(e) => setCustom({ ...custom, fat: e.target.value })} placeholder="0" className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
              </div>
              <button type="button" disabled={!custom.name.trim()} onClick={onAddCustom} className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-50">Add to {activeMeal}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAI && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md">
            <div className="glass-strong flex items-center gap-2 p-2 pt-[max(env(safe-area-inset-top),0.5rem)]"><button onClick={() => { setShowAI(false); setAiPhoto(null); setAiResult(null) }} className="grid h-10 w-10 place-items-center rounded-full active:scale-90"><X size={20} /></button><h3 className="flex-1 text-sm font-semibold flex items-center gap-2"><Sparkles size={16} className="text-primary" /> AI Food Estimate</h3></div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-8">
              {!aiPhoto ? (
                <><div className="grid h-20 w-20 place-items-center rounded-3xl text-white" style={{ background: 'linear-gradient(135deg, var(--brand-1), var(--brand-3))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}><Camera size={36} /></div><div className="text-center"><div className="text-lg font-semibold text-white">Snap a photo of your food</div><div className="mt-1 text-sm text-white/50">AI will estimate calories, protein, carbs, and fat</div></div><button type="button" onClick={onAIPhoto} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground active:scale-95">Take photo</button></>
              ) : aiEstimating ? (
                <><img src={aiPhoto} alt="food" className="max-h-64 rounded-3xl object-cover" /><div className="flex items-center gap-2 text-white"><Loader2 size={20} className="animate-spin" /><span className="text-sm">Analyzing food…</span></div></>
              ) : aiResult ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                  <img src={aiPhoto} alt="food" className="mx-auto mb-4 max-h-48 rounded-3xl object-cover" />
                  <div className="glass-strong rounded-3xl p-5">
                    <div className="mb-1 flex items-center gap-2"><span className="text-lg font-semibold text-white">{aiResult.foodName}</span><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', aiResult.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' : aiResult.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400')}>{aiResult.confidence}</span></div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-xl bg-foreground/8 py-2"><div className="text-lg font-bold text-white">{aiResult.calories}</div><div className="text-[10px] text-white/50">kcal</div></div>
                      <div className="rounded-xl bg-foreground/8 py-2"><div className="text-lg font-bold text-white">{aiResult.protein}g</div><div className="text-[10px] text-white/50">protein</div></div>
                      <div className="rounded-xl bg-foreground/8 py-2"><div className="text-lg font-bold text-white">{aiResult.carbs}g</div><div className="text-[10px] text-white/50">carbs</div></div>
                      <div className="rounded-xl bg-foreground/8 py-2"><div className="text-lg font-bold text-white">{aiResult.fat}g</div><div className="text-[10px] text-white/50">fat</div></div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2"><button type="button" onClick={() => { setAiPhoto(null); setAiResult(null) }} className="flex-1 rounded-2xl bg-white/10 py-3 text-sm font-medium text-white active:scale-95">Retake</button><button type="button" onClick={onConfirmAI} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-95"><Check size={16} /> Add to {activeMeal}</button></div>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showGoals && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGoals(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-strong w-full max-w-sm rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold">Daily goals</h3><button onClick={() => setShowGoals(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"><X size={16} /></button></div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Calorie goal (kcal)</label>
              <input type="number" value={goals.calorieGoal} onChange={(e) => setGoals({ ...goals, calorieGoal: e.target.value })} className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" />
              <div className="mb-3 grid grid-cols-3 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Protein (g)</label><input type="number" value={goals.proteinGoal} onChange={(e) => setGoals({ ...goals, proteinGoal: e.target.value })} className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Carbs (g)</label><input type="number" value={goals.carbGoal} onChange={(e) => setGoals({ ...goals, carbGoal: e.target.value })} className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Fat (g)</label><input type="number" value={goals.fatGoal} onChange={(e) => setGoals({ ...goals, fatGoal: e.target.value })} className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
              </div>
              <button type="button" onClick={onSaveGoals} className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98]">Save goals</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MacroBar({ label, icon: Icon, value, goal, pct, color }: { label: string; icon: typeof Beef; value: number; goal: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="shrink-0 text-muted-foreground" />
      <span className="w-12 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} /></div>
      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{Math.round(value * 10) / 10}/{goal}g</span>
    </div>
  )
}
