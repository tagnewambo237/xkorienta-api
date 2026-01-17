# Data Seeding - Système Éducatif Camerounais

Ce module contient les scripts et données pour peupler la base de données Xkorin School avec la structure éducative camerounaise (systèmes francophone et anglophone).

## 📚 Table des Matières

- [Description](#description)
- [Structure Éducative](#structure-éducative)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [Données Créées](#données-créées)
- [Tests](#tests)
- [Dépendances](#dépendances)
- [Troubleshooting](#troubleshooting)

---

## Description

Le système de seeding permet de créer automatiquement toute la hiérarchie éducative camerounaise:
- **EducationLevels** (Niveaux d'études)
- **Fields** (Filières/Séries/Streams)
- **Subjects** (Matières/Disciplines)
- **Competencies** (Compétences transversales)

### Caractéristiques

✅ **Idempotent** : Peut être exécuté plusieurs fois sans créer de doublons
✅ **Relations automatiques** : Résout les références ObjectId entre les collections
✅ **Validation** : Valide toutes les données avant insertion
✅ **Performance** : S'exécute en < 10 secondes
✅ **Logs informatifs** : Affiche la progression en couleur

---

## Structure Éducative

### Système Francophone

#### Collège (4 ans)
- 6ème (Form 1 equivalent)
- 5ème (Form 2 equivalent)
- 4ème (Form 3 equivalent)
- 3ème (Form 4 equivalent)

#### Lycée (4 ans)
- 2nde (Form 5 equivalent) - Classe de détermination
- **1ère** (Lower Sixth) - Séries:
  - **Série A** (Littéraire)
  - **Série C** (Maths-Sciences Physiques)
  - **Série D** (Maths-Sciences Naturelles)
  - **Série TI** (Technique Industrielle)
- **Terminale** (Upper Sixth) - Mêmes séries

### Système Anglophone

#### Forms (5 ans)
- Form 1, 2, 3, 4, 5

#### Sixth Form (2 ans)
- **Lower Sixth** - Streams:
  - **Arts Stream** (Humanities)
  - **Science Stream** (Pure Sciences)
- **Upper Sixth** - Mêmes streams

---

## Installation

### Prérequis

- Node.js ≥ 18
- MongoDB (local ou Atlas)
- npm ou yarn

### Dépendances

Le seeding utilise :
- `mongoose` - ODM pour MongoDB
- `ts-node` - Exécution des scripts TypeScript

```bash
# Installer ts-node si pas déjà fait
npm install --save-dev ts-node
```

---

## Usage

### Seed Complet

```bash
# Seed normal (idempotent - ne crée pas de doublons)
npm run seed

# OU avec yarn
yarn seed
```

### Seed avec Nettoyage

⚠️ **ATTENTION** : Supprime toutes les données existantes

```bash
# Nettoie puis seed
npm run seed:clean
```

### Seed Partiel (avancé)

```typescript
import { seedEducationLevels } from './scripts/seed/education-levels'
import { seedFields } from './scripts/seed/fields'
import connectDB from './lib/mongodb'

async function customSeed() {
  await connectDB()

  // Seed seulement les niveaux
  await seedEducationLevels()

  // Puis les filières
  await seedFields()
}

customSeed()
```

---

## Architecture

### Structure des Fichiers

```
scripts/seed/
├── index.ts                    # Script principal
├── education-levels.ts         # Seed des niveaux
├── fields.ts                   # Seed des filières
├── subjects.ts                 # Seed des matières
├── competencies.ts             # Seed des compétences
├── utils/
│   └── seed-helpers.ts         # Utilitaires (findOrCreate, etc.)
└── data/
    ├── francophone/
    │   ├── levels.json         # Niveaux francophone
    │   ├── fields.json         # Séries francophone
    │   └── subjects.json       # Matières francophone
    ├── anglophone/
    │   ├── levels.json         # Niveaux anglophone
    │   ├── fields.json         # Streams anglophone
    │   └── subjects.json       # Subjects anglophone
    └── competencies.json       # Compétences (transversal)
```

### Ordre d'Exécution

Le seeding suit l'ordre des dépendances :

```
1. EducationLevels (pas de dépendances)
   ↓
2. Fields (dépend de EducationLevels)
   ↓
3. Subjects (dépend de EducationLevels + Fields)
   ↓
4. Competencies (dépend de Subjects)
```

### Helpers Disponibles

#### `findOrCreate<T>`

Trouve ou crée un document (garantit l'idempotence).

```typescript
import { findOrCreate } from './utils/seed-helpers'
import EducationLevel from '../../models/EducationLevel'

const level = await findOrCreate(
  EducationLevel,
  { code: '6EME' },  // Query
  { name: 'Sixième', code: '6EME', cycle: 'COLLEGE', ... }  // Data
)
```

#### `resolveReferences<T>`

Résout des codes en ObjectIds.

```typescript
import { resolveReferences } from './utils/seed-helpers'

const levelIds = await resolveReferences(
  EducationLevel,
  ['6EME', '5EME', '4EME'],
  'code'
)
// Returns: [ObjectId(...), ObjectId(...), ObjectId(...)]
```

#### Autres helpers

- `findOrUpsert` - Trouve ou met à jour
- `validateSeedData` - Valide un objet
- `validateSeedDataArray` - Valide un tableau
- `countDocuments` - Compte les documents
- `cleanCollection` - Supprime tous les documents (⚠️ dangereux)

---

## Données Créées

### Statistiques

Après un seed complet, la base de données contient :

| Collection        | Nombre | Détails                                    |
|-------------------|--------|--------------------------------------------|
| EducationLevel    | ~22    | 13 francophone + 9 anglophone              |
| Field             | ~9     | 6 francophone + 3 anglophone               |
| Subject           | ~18    | 8 francophone + 10 anglophone              |
| Competency        | ~8     | Compétences transversales (21st century)   |

### Exemples de Données

#### EducationLevel

```json
{
  "name": "Terminale C",
  "code": "TLE_C",
  "cycle": "LYCEE",
  "subSystem": "FRANCOPHONE",
  "order": 11,
  "isActive": true,
  "metadata": {
    "displayName": {
      "fr": "Tle C",
      "en": "Upper Sixth C (Francophone)"
    },
    "description": "Série Scientifique (Maths-Sciences Physiques) - Baccalauréat"
  }
}
```

#### Field

```json
{
  "name": "Série C (Scientifique)",
  "code": "SERIE_C",
  "category": "SERIE",
  "cycle": "LYCEE",
  "subSystem": "FRANCOPHONE",
  "applicableLevels": [ObjectId("TLE_C"), ObjectId("1ERE_C")],
  "metadata": {
    "color": "#3B82F6",
    "icon": "calculator"
  }
}
```

#### Subject

```json
{
  "name": "Mathématiques",
  "code": "MATH",
  "subjectType": "DISCIPLINE",
  "subSystem": "FRANCOPHONE",
  "isTransversal": true,
  "applicableLevels": [ObjectId("6EME"), ObjectId("5EME"), ...],
  "applicableFields": [ObjectId("SERIE_C"), ObjectId("SERIE_D"), ...],
  "metadata": {
    "coefficient": 4,
    "color": "#3B82F6"
  }
}
```

#### Competency

```json
{
  "name": "Compétence Numérique",
  "code": "COMP_DIGITAL",
  "type": "DIGITAL",
  "description": "Utilisation des outils numériques...",
  "relatedSubjects": [ObjectId("INFO"), ObjectId("COMP_SCI")],
  "assessmentCriteria": [
    { "criterion": "Utilisation des logiciels bureautiques", "weight": 0.3 },
    { "criterion": "Pensée algorithmique", "weight": 0.3 },
    ...
  ]
}
```

---

## Tests

### Lancer les Tests

```bash
# Tests unitaires (helpers)
npm run test:unit -- __tests__/unit/seed

# Tests d'intégration (seed complet)
npm run test:integration -- __tests__/integration/seed

# Tous les tests avec coverage
npm run test:coverage
```

### Tests Disponibles

#### Unit Tests

- `findOrCreate` - Création sans doublons
- `findOrUpsert` - Mise à jour ou création
- `validateSeedData` - Validation des données
- `resolveReferences` - Résolution des ObjectIds

#### Integration Tests

- Seed complet des 4 collections
- Vérification des relations
- Idempotence (re-run)
- Performance (< 10 secondes)

---

## Dépendances

### Ordre de Seed

**IMPORTANT** : Respecter cet ordre car il y a des dépendances entre les collections.

1. **EducationLevels** ← Pas de dépendances
2. **Fields** ← Dépend de EducationLevels
3. **Subjects** ← Dépend de EducationLevels + Fields
4. **Competencies** ← Dépend de Subjects

### Relations

```
EducationLevel
    ↓ (applicableLevels)
Field
    ↓ (applicableFields, applicableLevels)
Subject
    ↓ (relatedSubjects)
Competency
```

---

## Troubleshooting

### Problème : MongoDB non connecté

**Erreur** :
```
Error: MongoDB not connected
```

**Solution** :
```bash
# Vérifier que MONGO_URI est défini dans .env
cat .env | grep MONGO_URI

# Ou définir manuellement
export MONGO_URI="mongodb://localhost:27017/Xkorin School"

# Relancer le seed
npm run seed
```

### Problème : Doublons créés

**Erreur** :
```
E11000 duplicate key error
```

**Solution** :
Le seed est censé être idempotent. Si des doublons sont créés, c'est probablement parce que le champ `code` n'est pas unique dans les données JSON.

```bash
# Nettoyer et re-seed
npm run seed:clean
```

### Problème : Relations manquantes

**Erreur** :
```
Warning: Some references not found in EducationLevel: XYZ
```

**Solution** :
Vérifier que les codes référencés existent dans les fichiers JSON.

Exemple :
```json
// Dans fields.json
"applicableLevelCodes": ["TLE_C", "1ERE_C"]

// TLE_C et 1ERE_C doivent exister dans levels.json
```

### Problème : Seed trop lent

**Symptôme** : Le seed prend > 30 secondes

**Causes possibles** :
1. Connexion MongoDB lente
2. Index non créés
3. Trop de logs

**Solution** :
```bash
# Vérifier les index
db.educationlevels.getIndexes()

# Si manquants, créer manuellement
db.educationlevels.createIndex({ code: 1 }, { unique: true })
```

---

## Maintenance

### Ajouter un Nouveau Niveau

1. Éditer `data/francophone/levels.json` ou `data/anglophone/levels.json`
2. Ajouter le niveau avec tous les champs requis
3. Relancer le seed : `npm run seed`

### Ajouter une Nouvelle Matière

1. Éditer `data/francophone/subjects.json` ou `data/anglophone/subjects.json`
2. Définir les `applicableLevelCodes` et `applicableFieldCodes`
3. Relancer le seed : `npm run seed`

### Modifier des Données Existantes

⚠️ **Attention** : `findOrCreate` ne met pas à jour les données existantes.

Options :
1. Utiliser `findOrUpsert` dans le script
2. Ou supprimer manuellement les documents puis re-seed
3. Ou utiliser `npm run seed:clean`

---

## Contribuer

Pour ajouter de nouvelles données :

1. Respecter le format JSON existant
2. Valider que tous les champs requis sont présents
3. Vérifier que les références (`applicableLevelCodes`, etc.) existent
4. Tester avec `npm run seed` (idempotent)
5. Tester les relations avec MongoDB Compass

---

## Licence

© 2025 Xkorin School. Tous droits réservés.

---

**Créé par :** Xkorin School Team
**Dernière mise à jour :** 2025-01-29
**Version :** 2.0.0
