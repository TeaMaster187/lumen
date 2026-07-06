'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Video, VideoOff, Phone } from 'lucide-react'
import { useApp } from '@/lib/store'
import { Avatar, formatDuration } from '@/components/glass'
import { cn } from '@/lib/utils'

export function CallScreen() {
  const activeCall = useApp((s) => s.activeCall)
  const endCall = useApp((s) => s.endCall)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  const [videoOn, setVideoOn] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [activeCall])

  if (!activeCall) return null

  const status = activeCall.status
  const statusText =
    status === 'calling' ? 'Calling…' :
    status === 'ringing' ? 'Ringing…' :
    status === 'connected' ? formatDuration(elapsed) :
    'Call ended'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-black px-6 py-12"
    >
      {/* Background — animated gradient using peer's avatar colors */}
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${activeCall.peerAvatarA}, transparent 60%),
                       radial-gradient(circle at 70% 70%, ${activeCall.peerAvatarB}, transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 -z-10 bg-black/40 backdrop-blur-3xl" />

      {/* Top — call kind + status */}
      <div className="flex flex-col items-center gap-1 pt-8">
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
          {activeCall.kind === 'video' ? <Video size={12} /> : <Phone size={12} />}
          {activeCall.kind === 'video' ? 'Video call' : 'Voice call'}
        </div>
        <p className="text-sm text-white/60">{statusText}</p>
      </div>

      {/* Center — peer avatar (or video feed) */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <AnimatePresence mode="wait">
          {activeCall.kind === 'video' && videoOn && status === 'connected' ? (
            <motion.div
              key="video"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative aspect-[3/4] w-64 overflow-hidden rounded-3xl bg-foreground/10 ring-1 ring-white/20"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${activeCall.peerAvatarA}, ${activeCall.peerAvatarB})`,
                }}
              />
              <div className="absolute inset-0 grid place-items-center">
                <span className="text-4xl font-bold text-white/80">{activeCall.peerInitials}</span>
              </div>
              <div className="absolute bottom-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                {activeCall.peerName}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="avatar"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <motion.div
                animate={status === 'calling' || status === 'ringing' ? {
                  scale: [1, 1.08, 1],
                  opacity: [1, 0.85, 1],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Avatar
                  initials={activeCall.peerInitials}
                  color={[activeCall.peerAvatarA, activeCall.peerAvatarB]}
                  size={160}
                  avatarUrl={activeCall.peerAvatarUrl}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold text-white"
        >
          {activeCall.peerName}
        </motion.h2>
        {status === 'calling' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-white/60"
          >
            Lumen Audio
          </motion.p>
        )}
      </div>

      {/* Bottom — controls */}
      <div className="flex w-full max-w-sm flex-col items-center gap-6 pb-8">
        {/* Inline controls */}
        <div className="flex items-center gap-4">
          <CallControl
            active={!muted}
            onClick={() => setMuted(!muted)}
            icon={muted ? MicOff : Mic}
            label={muted ? 'Unmute' : 'Mute'}
          />
          {activeCall.kind === 'video' && (
            <CallControl
              active={videoOn}
              onClick={() => setVideoOn(!videoOn)}
              icon={videoOn ? Video : VideoOff}
              label={videoOn ? 'Video on' : 'Video off'}
            />
          )}
          <CallControl
            active={speaker}
            onClick={() => setSpeaker(!speaker)}
            icon={speaker ? Volume2 : VolumeX}
            label={speaker ? 'Speaker' : 'Earpiece'}
          />
        </div>

        {/* End call */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={endCall}
          className="grid h-16 w-16 place-items-center rounded-full bg-destructive text-white shadow-2xl"
          style={{ boxShadow: '0 12px 30px -8px color-mix(in oklch, var(--destructive) 70%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.25)' }}
          aria-label="End call"
        >
          <PhoneOff size={26} />
        </motion.button>
      </div>
    </motion.div>
  )
}

function CallControl({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Mic
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
      aria-label={label}
    >
      <motion.div
        whileTap={{ scale: 0.9 }}
        className={cn(
          'grid h-14 w-14 place-items-center rounded-full backdrop-blur transition',
          active ? 'bg-white/15 text-white' : 'bg-white text-black',
        )}
      >
        <Icon size={22} />
      </motion.div>
      <span className="text-[10px] text-white/60">{label}</span>
    </button>
  )
}
