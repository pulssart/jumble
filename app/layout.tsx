import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Jumble - Infinite Canvas",
  description: "Un canvas infini pour organiser vos idées",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="overscroll-none">
      <body className={`${inter.className} overflow-hidden overscroll-none`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
