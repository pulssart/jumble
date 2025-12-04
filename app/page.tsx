"use client"

import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas"
import { OnboardingDialog } from "@/components/OnboardingDialog"
import { UpdateModal } from "@/components/UpdateModal"
import { LanguageProvider } from "@/lib/language"

export default function Home() {
  return (
    <LanguageProvider>
      <InfiniteCanvas />
      <OnboardingDialog />
      <UpdateModal />
    </LanguageProvider>
  )
}

