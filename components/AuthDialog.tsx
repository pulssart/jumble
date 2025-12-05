"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { useLanguage } from "@/lib/language"
import Logo from "../logo.png"

export function AuthDialog() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const { language } = useLanguage()

  const isFrench = language === "fr"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password)

      if (error) {
        setError(error.message)
      } else if (isSignUp) {
        // Inscription réussie - informer l'utilisateur de vérifier son email
        setSuccess(
          isFrench
            ? "Compte créé ! Veuillez vérifier votre email pour confirmer votre compte."
            : "Account created! Please check your email to confirm your account."
        )
      }
    } catch (err) {
      setError(isFrench ? "Une erreur est survenue" : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex justify-center pb-6 pt-4">
            <img
              src={Logo.src}
              alt="Jumble"
              className="h-12 w-auto rounded-xl object-contain"
            />
          </div>
          <DialogTitle>
            {isSignUp
              ? isFrench
                ? "Créer un compte"
                : "Create an account"
              : isFrench
              ? "Se connecter"
              : "Sign in"}
          </DialogTitle>
          <DialogDescription>
            {isSignUp
              ? isFrench
                ? "Entrez votre email et mot de passe pour créer un compte"
                : "Enter your email and password to create an account"
              : isFrench
              ? "Entrez votre email et mot de passe pour vous connecter"
              : "Enter your email and password to sign in"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {isFrench ? "Email" : "Email"}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={isFrench ? "votre@email.com" : "your@email.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {isFrench ? "Mot de passe" : "Password"}
            </label>
            <Input
              id="password"
              type="password"
              placeholder={isFrench ? "••••••••" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              {success}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? isFrench
                ? "Chargement..."
                : "Loading..."
              : isSignUp
              ? isFrench
                ? "Créer un compte"
                : "Create account"
              : isFrench
              ? "Se connecter"
              : "Sign in"}
          </Button>
        </form>
        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="text-primary hover:underline"
          >
            {isSignUp
              ? isFrench
                ? "Déjà un compte ? Se connecter"
                : "Already have an account? Sign in"
              : isFrench
              ? "Pas de compte ? Créer un compte"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
