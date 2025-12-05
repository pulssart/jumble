-- Schéma Supabase pour Jumble
-- À exécuter dans l'éditeur SQL de Supabase

-- Table des espaces (spaces)
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  last_modified BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
  canvas_offset JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  canvas_zoom NUMERIC DEFAULT 1,
  bg_color TEXT DEFAULT 'bg-gray-50',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des éléments (cards)
CREATE TABLE IF NOT EXISTS elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}'::jsonb,
  width NUMERIC,
  height NUMERIC,
  z_index INTEGER DEFAULT 0,
  parent_id UUID REFERENCES elements(id) ON DELETE SET NULL,
  connections TEXT[] DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Contient toutes les données spécifiques au type d'élément
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_spaces_user_id ON spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_spaces_last_modified ON spaces(last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_elements_space_id ON elements(space_id);
CREATE INDEX IF NOT EXISTS idx_elements_user_id ON elements(user_id);
CREATE INDEX IF NOT EXISTS idx_elements_parent_id ON elements(parent_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour mettre à jour updated_at
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elements_updated_at BEFORE UPDATE ON elements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Les utilisateurs ne peuvent accéder qu'à leurs propres données
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;

-- Politique pour spaces : les utilisateurs peuvent voir/modifier uniquement leurs propres spaces
CREATE POLICY "Users can view their own spaces"
  ON spaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spaces"
  ON spaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spaces"
  ON spaces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spaces"
  ON spaces FOR DELETE
  USING (auth.uid() = user_id);

-- Politique pour elements : les utilisateurs peuvent voir/modifier uniquement leurs propres elements
CREATE POLICY "Users can view their own elements"
  ON elements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own elements"
  ON elements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own elements"
  ON elements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own elements"
  ON elements FOR DELETE
  USING (auth.uid() = user_id);
