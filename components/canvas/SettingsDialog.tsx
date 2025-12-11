import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { Settings } from "lucide-react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialContext?: string
  onSave: (context: string) => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  initialContext = "",
  onSave,
}: SettingsDialogProps) {
  const [context, setContext] = useState(initialContext)

  useEffect(() => {
    if (open) {
      setContext(initialContext || "")
    }
  }, [open, initialContext])

  const handleSave = () => {
    onSave(context)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres du Space
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="ai-context" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Contexte IA Global
            </label>
            <Textarea
              id="ai-context"
              placeholder="Décrivez ici le contexte général de ce projet (ex: tonalité, objectifs, public cible...). Ce contexte sera utilisé par toutes les fonctionnalités d'IA."
              className="h-[200px]"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ce texte servira de base implicite à toutes les générations d'IA dans ce tableau.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
