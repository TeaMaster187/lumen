'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Circle } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Avatar } from '@/components/glass'

export function OnlineUsersScreen() {
  const back = useApp((s) => s.back)
  const onlineUsers = useApp((s) => s.onlineUsers)
  const refreshOnlineUsers = useApp((s) => s.refreshOnlineUsers)
  const openUserProfile = useApp((s) => s.openUserProfile)

  useEffect(() => {
    refreshOnlineUsers()
    const t = setInterval(refreshOnlineUsers, 10000)
    return () => clearInterval(t)
  }, [refreshOnlineUsers])

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <button type="button" onClick={back} className="grid h-10 w-10 place-items-center rounded-full active:scale-90"><ArrowLeft size={20} /></button>
          <h1 className="flex-1 text-base font-semibold">Online Now</h1>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-500">{onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'}</span>
        </div>
      </header>
      <div className="flex-1 px-3 pb-32 pt-3">
        {onlineUsers.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 px-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-foreground/8"><Users size={24} className="text-muted-foreground" /></div>
            <div className="text-sm font-medium">No one's online right now</div>
            <div className="max-w-xs text-xs text-muted-foreground">When other users have the app open, they'll appear here. Check back soon!</div>
          </div>
        ) : (
          onlineUsers.map((u, i) => (
            <motion.button key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} type="button" onClick={() => openUserProfile(u.id)} className="glass specular mb-1.5 flex w-full items-center gap-3 rounded-2xl p-2.5 text-left active:scale-[0.99]">
              <div className="relative"><Avatar initials={u.avatarInitials} color={[u.avatarA, u.avatarB]} size={44} avatarUrl={u.avatarUrl} /><Circle size={12} className="absolute bottom-0 right-0 fill-emerald-400 text-emerald-400" /></div>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{u.name}</div><div className="flex items-center gap-1.5 text-xs text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online now{u.username && <span className="text-muted-foreground">· @{u.username}</span>}</div></div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  )
}
