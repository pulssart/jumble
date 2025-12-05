-- Script de nettoyage sécurisé - Supprime d'abord les données, puis les tables
-- Cette approche évite les timeouts sur les grandes tables

-- ÉTAPE 1 : Supprimer toutes les données des tables (plus rapide que DROP TABLE)
TRUNCATE TABLE IF EXISTS elements CASCADE;
TRUNCATE TABLE IF EXISTS spaces CASCADE;

-- ÉTAPE 2 : Attendre un peu (optionnel, commenté par défaut)
-- SELECT pg_sleep(1);

-- ÉTAPE 3 : Supprimer les tables vides (beaucoup plus rapide)
DROP TABLE IF EXISTS elements CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;
