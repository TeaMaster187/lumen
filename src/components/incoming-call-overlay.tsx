'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Avatar } from '@/components/glass'

export function IncomingCallOverlay() {
  const incomingCall = useApp((s) => s.incomingCall)
  const acceptCall = useApp((s) => s.acceptCall)
  const declineCall = useApp((s) => s.declineCall)
  const chats = useApp((s) => s.chats)

  if (!incomingCall) return null

  const chat = chats.find((c) => c.otherUserId === incomingCall.fromUserId)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-between overflow-hidden bg-black px-6 py-12"
    >
      {/* Background */}
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background: chat
            ? `radial-gradient(circle at 30% 20%, ${chat.avatarA}, transparent 60%), radial-gradient(circle at 70% 70%, ${chat.avatarB}, transparent 60%)`
            : `radial-gradient(circle at 30% 20%, oklch(0.62 0.24 285), transparent 60%), radial-gradient(circle at 70% 70%, oklch(0.66 0.22 330), transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 -z-10 bg-black/50 backdrop-blur-3xl" />

      {/* Top — incoming label */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center gap-2 pt-8"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur"
        >
          {incomingCall.kind === 'video' ? 'Incoming video call' : 'Incoming voice call'}
        </motion.div>
      </motion.div>

      {/* Center — peer avatar + name */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Avatar
            initials={chat?.avatarInitials ?? '??'}
            color={[chat?.avatarA ?? 'oklch(0.62 0.24 285)', chat?.avatarB ?? 'oklch(0.66 0.22 330)']}
            size={140}
            avatarUrl={chat?.otherUserAvatarUrl ?? undefined}
          />
        </motion.div>
        <h2 className="text-2xl font-semibold text-white">{incomingCall.fromName}</h2>
        <p className="text-sm text-white/50">Lumen Audio</p>
      </motion.div>

      {/* Bottom — accept / decline */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex w-full max-w-xs items-center justify-around pb-8"
      >
        {/* Decline */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={declineCall}
          className="flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ rotate: [0, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            className="grid h-16 w-16 place-items-center rounded-full bg-destructive text-white shadow-2xl"
            style={{ boxShadow: '0 12px 30px -8px color-mix(in oklch, var(--destructive) 70%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
          >
            <PhoneOff size={26} />
          </motion.div>
          <span className="text-xs text-white/60">Decline</span>
        </motion.button>

        {/* Accept */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={acceptCall}
          className="flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-2xl"
            style={{ boxShadow: '0 12px 30px -8px oklch(0.7 0.2 150), inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
          >
            {incomingCall.kind === 'video' ? <Video size={26} /> : <Phone size={26} />}
          </motion.div>
          <span className="text-xs text-white/60">Accept</span>
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
