-- Script pour vérifier l'état des tables avant nettoyage
-- Exécutez ceci d'abord pour voir ce qui existe

-- Vérifier si les tables existent
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('spaces', 'elements', 'backups')
ORDER BY table_name;

-- Compter les lignes dans chaque table (si elles existent)
SELECT 
  'spaces' as table_name,
  COUNT(*) as row_count
FROM spaces
UNION ALL
SELECT 
  'elements' as table_name,
  COUNT(*) as row_count
FROM elements
UNION ALL
SELECT 
  'backups' as table_name,
  COUNT(*) as row_count
FROM backups;
