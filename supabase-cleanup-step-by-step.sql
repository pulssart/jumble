-- Script de nettoyage Supabase pour Jumble - VERSION PAR ÉTAPES
-- Exécutez chaque section séparément dans l'éditeur SQL de Supabase
-- Si une section échoue, passez à la suivante

-- ============================================
-- ÉTAPE 1 : Supprimer les politiques RLS de la table spaces
-- ============================================
DROP POLICY IF EXISTS "Users can view their own spaces" ON spaces;
DROP POLICY IF EXISTS "Users can insert their own spaces" ON spaces;
DROP POLICY IF EXISTS "Users can update their own spaces" ON spaces;
DROP POLICY IF EXISTS "Users can delete their own spaces" ON spaces;

-- ============================================
-- ÉTAPE 2 : Supprimer les politiques RLS de la table elements
-- ============================================
DROP POLICY IF EXISTS "Users can view their own elements" ON elements;
DROP POLICY IF EXISTS "Users can insert their own elements" ON elements;
DROP POLICY IF EXISTS "Users can update their own elements" ON elements;
DROP POLICY IF EXISTS "Users can delete their own elements" ON elements;

-- ============================================
-- ÉTAPE 3 : Désactiver RLS sur les tables
-- ============================================
ALTER TABLE IF EXISTS spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS elements DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 4 : Supprimer les triggers
-- ============================================
DROP TRIGGER IF EXISTS update_spaces_updated_at ON spaces;
DROP TRIGGER IF EXISTS update_elements_updated_at ON elements;

-- ============================================
-- ÉTAPE 5 : Supprimer les index
-- ============================================
DROP INDEX IF EXISTS idx_spaces_user_id;
DROP INDEX IF EXISTS idx_spaces_last_modified;
DROP INDEX IF EXISTS idx_elements_space_id;
DROP INDEX IF EXISTS idx_elements_user_id;
DROP INDEX IF EXISTS idx_elements_parent_id;

-- ============================================
-- ÉTAPE 6 : Supprimer les tables (ATTENTION : supprime toutes les données)
-- ============================================
DROP TABLE IF EXISTS elements CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;
