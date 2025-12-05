# Configuration Supabase pour Jumble

## Étapes de configuration

### 1. Exécuter le schéma SQL

1. Connectez-vous à votre projet Supabase : https://ogmohzywzjcngxggozbz.supabase.co
2. Allez dans l'éditeur SQL (SQL Editor dans le menu de gauche)
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier `supabase-schema.sql`
5. Exécutez la requête

Ce schéma va créer :
- La table `spaces` pour stocker les espaces (jumbles) de chaque utilisateur
- La table `elements` pour stocker les cartes/éléments de chaque espace
- Les index pour améliorer les performances
- Les politiques RLS (Row Level Security) pour que chaque utilisateur ne voie que ses propres données

### 2. Vérifier que tout fonctionne

Une fois le schéma exécuté, l'application devrait automatiquement :
- Migrer les données locales (localStorage/IndexedDB) vers Supabase lors de la première connexion
- Sauvegarder toutes les nouvelles données dans Supabase
- Charger les données depuis Supabase à chaque connexion

### 3. Structure des données

**Table `spaces`** :
- `id` : UUID unique
- `user_id` : ID de l'utilisateur (référence à auth.users)
- `name` : Nom de l'espace
- `last_modified` : Timestamp de dernière modification
- `canvas_offset` : Position du canvas (JSON)
- `canvas_zoom` : Niveau de zoom
- `bg_color` : Couleur de fond

**Table `elements`** :
- `id` : UUID unique
- `space_id` : ID de l'espace parent
- `user_id` : ID de l'utilisateur
- `type` : Type d'élément (text, image, youtube, etc.)
- `position` : Position sur le canvas (JSON)
- `width`, `height` : Dimensions
- `z_index` : Ordre d'affichage
- `parent_id` : ID de l'élément parent (optionnel)
- `connections` : IDs des éléments connectés
- `data` : Données spécifiques au type (JSON)

### 4. Sécurité

Les politiques RLS (Row Level Security) sont activées :
- Chaque utilisateur ne peut voir/modifier que ses propres données
- Les requêtes sont automatiquement filtrées par `user_id`
- Impossible d'accéder aux données d'un autre utilisateur

### 5. Migration des données existantes

Lors de la première connexion d'un utilisateur, le système :
1. Vérifie s'il existe déjà des données dans Supabase
2. Si non, charge les données depuis localStorage/IndexedDB
3. Migre automatiquement toutes les données vers Supabase
4. Les données locales restent intactes (backup)
