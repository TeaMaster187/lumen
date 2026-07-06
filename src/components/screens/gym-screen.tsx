'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Plus, Search, ChevronRight, Trash2, Loader2, X } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

type Exercise = { id: string; name: string; bodyPart: string; target: string; equipment: string; gifUrl: string }

export function GymScreen() {
  const workoutPlans = useApp((s) => s.workoutPlans)
  const refreshWorkoutPlans = useApp((s) => s.refreshWorkoutPlans)
  const createWorkoutPlan = useApp((s) => s.createWorkoutPlan)
  const deleteWorkoutPlan = useApp((s) => s.deleteWorkoutPlan)
  const openGymPlan = useApp((s) => s.openGymPlan)
  const addExerciseToPlan = useApp((s) => s.addExerciseToPlan)

  const [showCreate, setShowCreate] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planDay, setPlanDay] = useState('')
  const [creating, setCreating] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)
  const [search, setSearch] = useState('')
  const [bodyPartFilter, setBodyPartFilter] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [bodyParts, setBodyParts] = useState<string[]>([])
  const [loadingEx, setLoadingEx] = useState(false)
  const [selectedPlanForAdd, setSelectedPlanForAdd] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => { refreshWorkoutPlans() }, [refreshWorkoutPlans])

  const fetchExercises = async () => {
    setLoadingEx(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (bodyPartFilter) params.set('bodyPart', bodyPartFilter)
      params.set('limit', '50')
      const res = await fetch(`/api/gym/exercises?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) { setExercises(data.exercises); setBodyParts(data.bodyParts ?? []) }
    } catch (e) { console.error('[fetchExercises] error', e) } finally { setLoadingEx(false) }
  }

  const openBrowser = (planId: string) => { setSelectedPlanForAdd(planId); setShowBrowser(true); setSearch(''); setBodyPartFilter(''); fetchExercises() }
  const onAddExercise = async (ex: Exercise) => {
    if (!selectedPlanForAdd) return
    setAddingId(ex.id)
    await addExerciseToPlan(selectedPlanForAdd, { exerciseId: ex.id, exerciseName: ex.name, bodyPart: ex.bodyPart, target: ex.target, equipment: ex.equipment, gifUrl: ex.gifUrl, sets: 3, reps: 10 })
    setAddingId(null)
  }
  const onCreate = async () => {
    if (!planName.trim()) return
    setCreating(true)
    const res = await createWorkoutPlan(planName.trim(), planDay.trim() || undefined)
    setCreating(false)
    if (res.ok) { setPlanName(''); setPlanDay(''); setShowCreate(false); if (res.planId) openGymPlan(res.planId) }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass rounded-3xl px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Dumbbell size={20} className="text-primary" /> Gym</h1>
            <button type="button" onClick={() => setShowCreate(true)} className="glass-pill grid h-10 w-10 place-items-center rounded-full active:scale-90" aria-label="New plan"><Plus size={18} /></button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Workout planner · {workoutPlans.length} plans</p>
        </div>
      </header>
      <div className="mt-3 flex-1 px-3 pb-32">
        {workoutPlans.length === 0 && !showCreate ? (
          <div className="mt-12 flex flex-col items-center gap-3 px-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-foreground/8"><Dumbbell size={24} className="text-muted-foreground" /></div>
            <div className="text-sm font-medium">No workout plans yet</div>
            <div className="max-w-xs text-xs text-muted-foreground">Create a workout plan, browse 1300+ exercises, and build your routine.</div>
            <button type="button" onClick={() => setShowCreate(true)} className="mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95">Create your first plan</button>
          </div>
        ) : (
          workoutPlans.map((plan, i) => {
            const completed = plan.exercises.filter((e) => e.completed).length
            const total = plan.exercises.length
            const pct = total > 0 ? (completed / total) * 100 : 0
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass specular mb-2 overflow-hidden rounded-3xl">
                <button type="button" onClick={() => openGymPlan(plan.id)} className="flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, var(--brand-1), var(--brand-3))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}><Dumbbell size={22} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">{total} {total === 1 ? 'exercise' : 'exercises'}{plan.day ? ` · ${plan.day}` : ''}{total > 0 && ` · ${completed}/${total} done`}</div>
                    {total > 0 && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--brand-1), var(--brand-3))' }} /></div>}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                </button>
                <div className="flex gap-2 border-t border-foreground/8 px-4 py-2">
                  <button type="button" onClick={() => openBrowser(plan.id)} className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary active:scale-95"><Plus size={13} /> Add exercise</button>
                  <button type="button" onClick={() => deleteWorkoutPlan(plan.id)} className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive active:scale-95"><Trash2 size={13} /> Delete</button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-strong w-full max-w-sm rounded-3xl p-5">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">New workout plan</h3><button onClick={() => setShowCreate(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"><X size={16} /></button></div>
              <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Push Day" autoFocus className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" />
              <input value={planDay} onChange={(e) => setPlanDay(e.target.value)} placeholder="Day (optional, e.g. Monday)" className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" />
              <button type="button" disabled={creating || !planName.trim()} onClick={onCreate} className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-50">{creating ? 'Creating…' : 'Create plan'}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBrowser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md">
            <div className="glass-strong flex items-center gap-2 p-2 pt-[max(env(safe-area-inset-top),0.5rem)]">
              <button onClick={() => setShowBrowser(false)} className="grid h-10 w-10 place-items-center rounded-full active:scale-90"><X size={20} /></button>
              <h3 className="flex-1 text-sm font-semibold">Browse exercises</h3>
            </div>
            <div className="px-3 pb-2">
              <div className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchExercises() }} placeholder="Search exercises…" className="w-full rounded-2xl bg-white/10 py-2.5 pl-10 pr-3 text-sm text-white outline-none ring-1 ring-white/20 placeholder:text-white/40" /></div>
              <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
                <button type="button" onClick={() => { setBodyPartFilter(''); fetchExercises() }} className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-medium transition', !bodyPartFilter ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/70')}>All</button>
                {bodyParts.slice(0, 10).map((bp) => <button key={bp} type="button" onClick={() => { setBodyPartFilter(bp); fetchExercises() }} className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition', bodyPartFilter === bp ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/70')}>{bp}</button>)}
              </div>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-8">
              {loadingEx ? <div className="grid place-items-center py-12"><Loader2 size={24} className="animate-spin text-white/60" /></div> : exercises.length === 0 ? <div className="py-12 text-center text-sm text-white/40">No exercises found.</div> : (
                <div className="grid grid-cols-2 gap-3">
                  {exercises.map((ex) => (
                    <div key={ex.id} className="glass overflow-hidden rounded-2xl">
                      {ex.gifUrl && <div className="aspect-square overflow-hidden bg-foreground/10"><img src={ex.gifUrl} alt={ex.name} className="h-full w-full object-contain" loading="lazy" /></div>}
                      <div className="p-2">
                        <div className="truncate text-xs font-semibold capitalize">{ex.name}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{ex.bodyPart} · {ex.equipment}</div>
                        <button type="button" disabled={addingId === ex.id} onClick={() => onAddExercise(ex)} className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-1.5 text-[11px] font-semibold text-primary-foreground active:scale-95 disabled:opacity-50">{addingId === ex.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
