'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Flame } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Avatar } from '@/components/glass'

export function StreaksScreen() {
  const back = useApp((s) => s.back)
  const streaks = useApp((s) => s.streaks)
  const openChat = useApp((s) => s.openChat)
  const chats = useApp((s) => s.chats)
  const findChatWith = (peerId: string) => chats.find((c) => c.otherUserId === peerId)

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <button type="button" onClick={back} className="grid h-10 w-10 place-items-center rounded-full active:scale-90"><ArrowLeft size={20} /></button>
          <h1 className="flex-1 text-base font-semibold">Streaks</h1>
        </div>
      </header>
      <div className="flex-1 px-3 pb-32 pt-3">
        {streaks.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 px-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-foreground/8"><Flame size={24} className="text-muted-foreground" /></div>
            <div className="text-sm font-medium">No streaks yet</div>
            <div className="max-w-xs text-xs text-muted-foreground">Message someone every day to build a streak. Come back tomorrow to keep it going!</div>
          </div>
        ) : (
          <>
            <div className="mb-3 px-2 text-xs text-muted-foreground">Message each other every day to keep your streak alive. Miss a day and it resets to 🔥 1.</div>
            {streaks.map((s, i) => {
              const chat = findChatWith(s.peer.id)
              return (
                <motion.button key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} type="button" onClick={() => chat && openChat(chat.id)} className="glass specular mb-2 flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99]">
                  <Avatar initials={s.peer.name.slice(0, 2).toUpperCase()} color={[s.peer.avatarA, s.peer.avatarB]} size={48} avatarUrl={s.peer.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{s.peer.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.peer.username ? `@${s.peer.username}` : `ID ${s.peer.numericId.toString().padStart(5, '0')}`}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-lg font-bold text-primary"><Flame size={16} className="text-orange-500" />{s.count}</div>
                    <div className="text-[10px] text-muted-foreground">days</div>
                  </div>
                </motion.button>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
