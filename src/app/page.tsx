'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '@/lib/store'
import { BottomNav } from '@/components/bottom-nav'
import { OnboardingScreen } from '@/components/screens/onboarding-screen'
import { LoginScreen } from '@/components/screens/login-screen'
import { ChatsScreen } from '@/components/screens/chats-screen'
import { ChatScreen } from '@/components/screens/chat-screen'
import { CallsScreen } from '@/components/screens/calls-screen'
import { ContactsScreen } from '@/components/screens/contacts-screen'
import { SettingsScreen } from '@/components/screens/settings-screen'
import { ProfileScreen } from '@/components/screens/profile-screen'
import { NewChatScreen } from '@/components/screens/new-chat-screen'
import { CallScreen } from '@/components/screens/call-screen'
import { IncomingCallOverlay } from '@/components/incoming-call-overlay'
import { AuraScreen } from '@/components/screens/aura-screen'
import { AuraProfileScreen } from '@/components/screens/aura-profile-screen'
import { StreaksScreen } from '@/components/screens/streaks-screen'
import { GymScreen } from '@/components/screens/gym-screen'
import { GymPlanScreen } from '@/components/screens/gym-plan-screen'
import { DailyScreen } from '@/components/screens/daily-screen'
import { OnlineUsersScreen } from '@/components/screens/online-users-screen'
import { UserProfileScreen } from '@/components/screens/user-profile-screen'

const screenVariants = {
  initial: { opacity: 0, x: 24, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -24, scale: 0.98 },
}

// Modal-style screens (slide up)
const modalScreens = ['chat', 'profile', 'new-chat', 'login', 'aura-profile', 'streaks', 'gym-plan', 'online-users', 'user-profile']

export default function Home() {
  const screen = useApp((s) => s.screen)
  const activeCall = useApp((s) => s.activeCall)
  const incomingCall = useApp((s) => s.incomingCall)

  if (screen === 'splash' || screen === 'onboarding') {
    return (
      <>
        {screen === 'onboarding' && <OnboardingScreen />}
        <BottomNav />
      </>
    )
  }

  const isModal = modalScreens.includes(screen)

  return (
    <div className="relative min-h-dvh w-full">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={screen}
          initial={isModal ? { opacity: 0, y: 24 } : screenVariants.initial}
          animate={isModal ? { opacity: 1, y: 0 } : screenVariants.animate}
          exit={isModal ? { opacity: 0, y: 24 } : screenVariants.exit}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative z-10"
        >
          {screen === 'chats' && <ChatsScreen />}
          {screen === 'chat' && <ChatScreen />}
          {screen === 'calls' && <CallsScreen />}
          {screen === 'contacts' && <ContactsScreen />}
          {screen === 'settings' && <SettingsScreen />}
          {screen === 'profile' && <ProfileScreen />}
          {screen === 'new-chat' && <NewChatScreen />}
          {screen === 'login' && <LoginScreen />}
          {screen === 'aura' && <AuraScreen />}
          {screen === 'aura-profile' && <AuraProfileScreen />}
          {screen === 'streaks' && <StreaksScreen />}
          {screen === 'gym' && <GymScreen />}
          {screen === 'gym-plan' && <GymPlanScreen />}
          {screen === 'daily' && <DailyScreen />}
          {screen === 'online-users' && <OnlineUsersScreen />}
          {screen === 'user-profile' && <UserProfileScreen />}
        </motion.div>
      </AnimatePresence>

      {/* Active call overlay — renders on top of any screen */}
      <AnimatePresence>
        {activeCall && <CallScreen key="call-overlay" />}
      </AnimatePresence>

      {/* Incoming call overlay — renders above everything */}
      <AnimatePresence>
        {incomingCall && !activeCall && <IncomingCallOverlay key="incoming-overlay" />}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}
