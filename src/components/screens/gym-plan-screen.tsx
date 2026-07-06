'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Dumbbell, Check, Trash2, Plus, X, Loader2, PenLine } from 'lucide-react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'

type ManualExercise = { name: string; bodyPart: string; sets: string; reps: string; weight: string }

export function GymPlanScreen() {
  const back = useApp((s) => s.back)
  const activeGymPlanId = useApp((s) => s.activeGymPlanId)
  const workoutPlans = useApp((s) => s.workoutPlans)
  const toggleExerciseCompleted = useApp((s) => s.toggleExerciseCompleted)
  const removeExerciseFromPlan = useApp((s) => s.removeExerciseFromPlan)
  const addExerciseToPlan = useApp((s) => s.addExerciseToPlan)
  const plan = workoutPlans.find((p) => p.id === activeGymPlanId)

  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState<ManualExercise>({ name: '', bodyPart: '', sets: '3', reps: '10', weight: '' })
  const [adding, setAdding] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  const onAddManual = async () => {
    if (!plan) return
    setManualError(null)
    if (!manual.name.trim()) { setManualError('Exercise name is required'); return }
    setAdding(true)
    const res = await addExerciseToPlan(plan.id, { exerciseId: `manual-${Date.now()}`, exerciseName: manual.name.trim(), bodyPart: manual.bodyPart.trim() || null, target: null, equipment: null, gifUrl: null, sets: parseInt(manual.sets) || 3, reps: parseInt(manual.reps) || 10, weight: manual.weight ? parseFloat(manual.weight) : undefined })
    setAdding(false)
    if (res.ok) { setShowManual(false); setManual({ name: '', bodyPart: '', sets: '3', reps: '10', weight: '' }) } else { setManualError(res.error ?? 'Failed to add exercise') }
  }

  if (!plan) { back(); return null }
  const completed = plan.exercises.filter((e) => e.completed).length
  const total = plan.exercises.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <button type="button" onClick={back} className="grid h-10 w-10 place-items-center rounded-full active:scale-90"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0"><div className="truncate text-sm font-semibold">{plan.name}</div><div className="text-xs text-muted-foreground">{plan.day ? `${plan.day} · ` : ''}{completed}/{total} done · {pct}%</div></div>
        </div>
        {total > 0 && <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--brand-1), var(--brand-3))' }} /></div>}
      </header>
      <div className="flex-1 px-3 pb-32 pt-3">
        {plan.notes && <div className="glass mb-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground">{plan.notes}</div>}
        {plan.exercises.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 px-4 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground/8"><Dumbbell size={22} className="text-muted-foreground" /></div>
            <div className="text-sm font-medium">No exercises yet</div>
            <div className="max-w-xs text-xs text-muted-foreground">Add exercises to start building your workout.</div>
            <button type="button" onClick={() => setShowManual(true)} className="mt-2 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95"><PenLine size={15} /> Add manually</button>
          </div>
        ) : (
          <div className="space-y-2">
            {plan.exercises.map((ex, i) => (
              <motion.div key={ex.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className={cn('glass overflow-hidden rounded-2xl', ex.completed && 'opacity-60')}>
                <div className="flex items-start gap-3 p-3">
                  <button type="button" onClick={() => toggleExerciseCompleted(plan.id, ex.id)} className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full transition active:scale-90', ex.completed ? 'bg-emerald-500 text-white' : 'bg-foreground/10 text-transparent border-2 border-foreground/20')} aria-label={ex.completed ? 'Mark incomplete' : 'Mark complete'}>{ex.completed && <Check size={16} />}</button>
                  <div className="min-w-0 flex-1">
                    <div className={cn('truncate text-sm font-semibold capitalize', ex.completed && 'line-through')}>{ex.exerciseName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-foreground/8 px-2 py-0.5">{ex.sets} × {ex.reps}</span>
                      {ex.weight && <span className="rounded-full bg-foreground/8 px-2 py-0.5">{ex.weight} kg</span>}
                      {ex.bodyPart && <span className="capitalize">{ex.bodyPart}</span>}
                      {ex.equipment && <span className="capitalize">· {ex.equipment}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeExerciseFromPlan(plan.id, ex.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-destructive active:scale-90" aria-label="Remove exercise"><Trash2 size={16} /></button>
                </div>
                {ex.gifUrl && <div className="overflow-hidden bg-foreground/5"><img src={ex.gifUrl} alt={ex.exerciseName} className="mx-auto h-32 object-contain" loading="lazy" /></div>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <div className="fixed bottom-[max(env(safe-area-inset-bottom),5.5rem)] left-0 right-0 z-30 flex justify-center">
        <button type="button" onClick={() => setShowManual(true)} className="glass-strong flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-xl active:scale-95" style={{ boxShadow: '0 10px 30px -8px color-mix(in oklch, var(--brand-1) 50%, transparent)' }}><Plus size={18} className="text-primary" /> Add exercise</button>
      </div>
      <AnimatePresence>
        {showManual && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !adding && setShowManual(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-strong w-full max-w-sm rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><PenLine size={16} className="text-primary" /> Add custom exercise</h3><button onClick={() => !adding && setShowManual(false)} disabled={adding} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"><X size={16} /></button></div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Exercise name *</label>
              <input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="e.g. Push-ups, Plank, Custom curl" autoFocus className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" />
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Body part (optional)</label>
              <input value={manual.bodyPart} onChange={(e) => setManual({ ...manual, bodyPart: e.target.value })} placeholder="e.g. Chest, Back, Legs" className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" />
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Sets</label><input type="number" value={manual.sets} onChange={(e) => setManual({ ...manual, sets: e.target.value })} className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
                <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Reps</label><input type="number" value={manual.reps} onChange={(e) => setManual({ ...manual, reps: e.target.value })} className="w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" /></div>
              </div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight in kg (optional)</label>
              <input type="number" value={manual.weight} onChange={(e) => setManual({ ...manual, weight: e.target.value })} placeholder="e.g. 20" className="mb-3 w-full rounded-2xl bg-white/40 px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-ring dark:bg-white/5" />
              <AnimatePresence>{manualError && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{manualError}</motion.div>}</AnimatePresence>
              <button type="button" disabled={adding} onClick={onAddManual} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-50">{adding ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : <><Plus size={16} /> Add to plan</>}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
