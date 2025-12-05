-- Script de nettoyage minimal - Version simplifiée
-- Exécutez cette version si la version complète échoue

-- Supprimer directement les tables (CASCADE supprime automatiquement tout ce qui est lié)
DROP TABLE IF EXISTS elements CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;
