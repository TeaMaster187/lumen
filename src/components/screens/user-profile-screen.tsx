'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Flame, Dumbbell, Apple, Lock, MessageCircle } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Avatar } from '@/components/glass'

export function UserProfileScreen() {
  const back = useApp((s) => s.back)
  const data = useApp((s) => s.userProfileData)
  const streaks = useApp((s) => s.streaks)
  const startDirectChatById = useApp((s) => s.startDirectChatById)
  const openChat = useApp((s) => s.openChat)

  if (!data) return <div className="grid min-h-dvh place-items-center"><div className="animate-pulse text-sm text-muted-foreground">Loading profile…</div></div>

  const { user, dailySummary, workoutPlans } = data
  const streak = streaks.find((s) => s.peer.id === user.id)
  const startChat = async () => { const res = await startDirectChatById(user.id); if (res.ok && res.chatId) openChat(res.chatId) }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <button type="button" onClick={back} className="grid h-10 w-10 place-items-center rounded-full active:scale-90"><ArrowLeft size={20} /></button>
          <div className="flex-1 text-sm font-semibold">Profile</div>
          {!user.isSelf && <button type="button" onClick={startChat} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground active:scale-95"><MessageCircle size={14} /> Message</button>}
        </div>
      </header>
      <div className="flex-1 space-y-3 px-3 pb-32 pt-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass specular flex flex-col items-center rounded-3xl p-6 text-center">
          <Avatar initials={user.avatarInitials} color={[user.avatarA, user.avatarB]} size={88} avatarUrl={user.avatarUrl} />
          <h2 className="mt-3 text-xl font-semibold">{user.name}</h2>
          {user.username && <p className="text-sm text-primary">@{user.username}</p>}
          {user.bio && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{user.bio}</p>}
          <div className="mt-1 text-[11px] text-muted-foreground font-mono">ID: {user.numericIdStr}</div>
          {streak && <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-medium text-orange-500"><Flame size={12} /> {streak.count} day streak</div>}
        </motion.div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Apple size={12} /> Daily</div>
          {user.dailyPublic ? (
            dailySummary ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between"><span className="text-2xl font-bold">{dailySummary.totals.calories}</span><span className="text-sm text-muted-foreground">/ {dailySummary.calorieGoal} kcal</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (dailySummary.totals.calories / dailySummary.calorieGoal) * 100)}%`, background: 'linear-gradient(90deg, var(--brand-1), var(--brand-2))' }} /></div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-foreground/5 py-2"><div className="text-sm font-bold">{dailySummary.totals.protein}g</div><div className="text-[10px] text-muted-foreground">Protein</div></div>
                  <div className="rounded-xl bg-foreground/5 py-2"><div className="text-sm font-bold">{dailySummary.totals.carbs}g</div><div className="text-[10px] text-muted-foreground">Carbs</div></div>
                  <div className="rounded-xl bg-foreground/5 py-2"><div className="text-sm font-bold">{dailySummary.totals.fat}g</div><div className="text-[10px] text-muted-foreground">Fat</div></div>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">{dailySummary.entryCount} foods logged today</div>
              </motion.div>
            ) : <div className="glass rounded-2xl px-4 py-3 text-sm text-muted-foreground">No food logged today yet.</div>
          ) : <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-muted-foreground"><Lock size={14} /> Daily stats are private</div>}
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Dumbbell size={12} /> Gym</div>
          {user.gymPublic ? (
            workoutPlans && workoutPlans.length > 0 ? (
              workoutPlans.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass mb-1.5 flex items-center gap-3 rounded-2xl p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg, var(--brand-1), var(--brand-3))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}><Dumbbell size={18} /></div>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.exerciseCount} exercises · {p.completedCount} done{p.day ? ` · ${p.day}` : ''}</div></div>
                </motion.div>
              ))
            ) : <div className="glass rounded-2xl px-4 py-3 text-sm text-muted-foreground">No workout plans yet.</div>
          ) : <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-muted-foreground"><Lock size={14} /> Gym stats are private</div>}
        </div>
      </div>
    </div>
  )
}
