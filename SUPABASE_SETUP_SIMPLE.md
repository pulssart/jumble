# Configuration Supabase simplifiée pour Jumble

## Nouveau système de backup

Le système a été simplifié pour utiliser un backup JSON complet au lieu de tables complexes.

### 1. Exécuter le schéma SQL simplifié

1. Connectez-vous à votre projet Supabase : https://zoetbdwgtbmprbhforwf.supabase.co
2. Allez dans l'éditeur SQL (SQL Editor dans le menu de gauche)
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier `supabase-schema-simple.sql`
5. Exécutez la requête

Ce schéma va créer :
- La table `backups` pour stocker un backup JSON complet par utilisateur
- Les index pour améliorer les performances
- Les politiques RLS (Row Level Security) pour que chaque utilisateur ne voie que ses propres backups

### 2. Fonctionnement

**Backup automatique :**
- Toutes les 2 minutes, un backup JSON complet est sauvegardé sur Supabase
- Le backup contient tous les spaces, leurs éléments, positions, zoom, couleurs, etc.
- Format identique à l'export JSON

**Gestion des sessions :**
- Une seule session active à la fois par utilisateur
- Si vous ouvrez une session sur un autre navigateur/appareil :
  - Le dernier backup est chargé
  - Si une autre session est active (backup récent < 5 minutes), cette session est fermée automatiquement
  - Vous devez vous reconnecter pour prendre le contrôle

**Stockage local :**
- Les données sont d'abord sauvegardées localement (IndexedDB/localStorage)
- Le backup Supabase est une copie de sécurité
- Permet de travailler hors ligne

### 3. Structure du backup

Le backup JSON contient :
- `version` : Version du format (2)
- `timestamp` : Date de création
- `currentSpaceId` : ID du space actuellement actif
- `spaces` : Liste de tous les spaces
- `dataBySpace` : Données de chaque space (éléments, offset, zoom, bgColor)

### 4. Avantages

- **Simplicité** : Un seul backup JSON au lieu de multiples tables
- **Fiabilité** : Format identique à l'export/import
- **Performance** : Pas de requêtes complexes, juste un JSON
- **Maintenance** : Plus facile à déboguer et maintenir

### 5. Migration depuis l'ancien système

Si vous aviez déjà des données dans l'ancien système (tables spaces/elements), elles ne seront pas automatiquement migrées. Vous pouvez :
1. Exporter vos données avec l'ancien système
2. Importer dans le nouveau système
3. Ou simplement continuer à utiliser le nouveau système (les anciennes données resteront dans les tables mais ne seront plus utilisées)
