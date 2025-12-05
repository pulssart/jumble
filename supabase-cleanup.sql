-- Script de nettoyage Supabase pour Jumble
-- Supprime les anciennes tables spaces et elements qui ne sont plus utilisées
-- À exécuter dans l'éditeur SQL de Supabase après avoir migré vers le système simplifié

-- ⚠️ ATTENTION : Ce script supprime définitivement toutes les données des tables spaces et elements
-- Assurez-vous d'avoir migré toutes les données importantes vers le système de backup JSON avant d'exécuter ce script

-- 1. Supprimer les politiques RLS des anciennes tables
DROP POLICY IF EXISTS "Users can view their own spaces" ON spaces;
DROP POLICY IF EXISTS "Users can insert their own spaces" ON spaces;
DROP POLICY IF EXISTS "Users can update their own spaces" ON spaces;
DROP POLICY IF EXISTS "Users can delete their own spaces" ON spaces;

DROP POLICY IF EXISTS "Users can view their own elements" ON elements;
DROP POLICY IF EXISTS "Users can insert their own elements" ON elements;
DROP POLICY IF EXISTS "Users can update their own elements" ON elements;
DROP POLICY IF EXISTS "Users can delete their own elements" ON elements;

-- 2. Désactiver RLS sur les anciennes tables (optionnel, mais propre)
ALTER TABLE IF EXISTS spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS elements DISABLE ROW LEVEL SECURITY;

-- 3. Supprimer les triggers des anciennes tables
DROP TRIGGER IF EXISTS update_spaces_updated_at ON spaces;
DROP TRIGGER IF EXISTS update_elements_updated_at ON elements;

-- 4. Supprimer les index des anciennes tables
DROP INDEX IF EXISTS idx_spaces_user_id;
DROP INDEX IF EXISTS idx_spaces_last_modified;
DROP INDEX IF EXISTS idx_elements_space_id;
DROP INDEX IF EXISTS idx_elements_user_id;
DROP INDEX IF EXISTS idx_elements_parent_id;

-- 5. Supprimer les tables (CASCADE supprime automatiquement les contraintes de clés étrangères)
DROP TABLE IF EXISTS elements CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;

-- Note : La fonction update_updated_at_column() est conservée car elle est toujours utilisée
-- par la table backups dans le nouveau schéma simplifié

