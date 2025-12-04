"use client"

import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas"
import { OnboardingDialog } from "@/components/OnboardingDialog"
import { LanguageProvider } from "@/lib/language"

export default function Home() {
  return (
    <LanguageProvider>
      <InfiniteCanvas />
      <OnboardingDialog />
    </LanguageProvider>
  )
}

