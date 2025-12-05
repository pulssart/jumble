-- Schéma Supabase simplifié pour Jumble
-- À exécuter dans l'éditeur SQL de Supabase

-- Table des backups (un seul backup par utilisateur)
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  backup_data JSONB NOT NULL,
  session_id TEXT NOT NULL, -- ID de session pour gérer les sessions multiples
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id) -- Un seul backup actif par utilisateur
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_backups_user_id ON backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_backups_updated_at BEFORE UPDATE ON backups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Les utilisateurs ne peuvent accéder qu'à leurs propres backups
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- Politique pour backups : les utilisateurs peuvent voir/modifier uniquement leurs propres backups
CREATE POLICY "Users can view their own backups"
  ON backups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backups"
  ON backups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backups"
  ON backups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backups"
  ON backups FOR DELETE
  USING (auth.uid() = user_id);
