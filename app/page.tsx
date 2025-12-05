"use client"

import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas"
import { OnboardingDialog } from "@/components/OnboardingDialog"
import { UpdateModal } from "@/components/UpdateModal"
import { AuthDialog } from "@/components/AuthDialog"
import { LanguageProvider } from "@/lib/language"
import { useAuth } from "@/lib/auth"

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <LanguageProvider>
        <AuthDialog />
      </LanguageProvider>
    )
  }

  return (
    <LanguageProvider>
      <InfiniteCanvas />
      <OnboardingDialog />
      <UpdateModal />
    </LanguageProvider>
  )
}

export default function Home() {
  return <AppContent />
}

