'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, Sparkles, Plus } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Avatar } from '@/components/glass'

export function AuraScreen() {
  const navigate = useApp((s) => s.navigate)
  const auraFeed = useApp((s) => s.auraFeed)
  const refreshAuraFeed = useApp((s) => s.refreshAuraFeed)
  const openAuraProfile = useApp((s) => s.openAuraProfile)
  const streaks = useApp((s) => s.streaks)
  const refreshStreaks = useApp((s) => s.refreshStreaks)
  const me = useApp((s) => s.me)

  useEffect(() => { refreshAuraFeed(); refreshStreaks() }, [refreshAuraFeed, refreshStreaks])
  const totalStreaks = streaks.reduce((sum, s) => sum + s.count, 0)
  const maxStreak = streaks.reduce((max, s) => Math.max(max, s.count), 0)

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass rounded-3xl px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Sparkles size={20} className="text-primary" /> Aura</h1>
            <button type="button" onClick={() => me && openAuraProfile(me.id)} className="glass-pill grid h-10 w-10 place-items-center rounded-full active:scale-90" aria-label="My aura"><Plus size={18} /></button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Discover people · share photos</p>
        </div>
      </header>
      <div className="mt-3 flex-1 px-3 pb-32">
        <button type="button" onClick={() => navigate('streaks')} className="glass specular mb-3 flex w-full items-center gap-4 rounded-3xl p-4 text-left active:scale-[0.99]">
          <div className="grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, oklch(0.7 0.22 25), oklch(0.75 0.2 60))', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.25)' }}><Flame size={26} /></div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Your streaks</div>
            <div className="text-xs text-muted-foreground">{streaks.length} {streaks.length === 1 ? 'streak' : 'streaks'} · best: 🔥 {maxStreak} days</div>
          </div>
          <div className="text-right"><div className="text-2xl font-bold text-primary">{totalStreaks}</div><div className="text-[10px] text-muted-foreground">total 🔥</div></div>
        </button>
        <div className="mb-2 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles size={12} /> Discover</div>
        {auraFeed.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-2 px-4 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground/8"><Sparkles size={22} className="text-muted-foreground" /></div>
            <div className="text-sm font-medium">No one here yet</div>
            <div className="max-w-xs text-xs text-muted-foreground">Start a chat with someone, then check back here to see their Aura.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {auraFeed.map((u, i) => (
              <motion.button key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} type="button" onClick={() => openAuraProfile(u.id)} className="glass specular overflow-hidden rounded-3xl text-left active:scale-[0.98]">
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  {u.latestCard ? <img src={u.latestCard.photoUrl} alt={u.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center" style={{ background: `linear-gradient(135deg, ${u.avatarA}, ${u.avatarB})` }}><span className="text-4xl font-bold text-white/80">{u.avatarInitials}</span></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">{u.name}</span>
                      {u.matched && <span className="rounded-full bg-emerald-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white">connected</span>}
                    </div>
                    <div className="text-[11px] text-white/70">{u.cardCount > 0 ? `${u.cardCount} ${u.cardCount === 1 ? 'photo' : 'photos'}` : 'No photos yet'}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
