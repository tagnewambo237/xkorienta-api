import connectDB from '../../../lib/mongodb'
import { seedEducationLevels } from './education-levels'
import { seedFields } from './fields'
import { seedSubjects } from './subjects'
import { seedCompetencies } from './competencies'
import { logSeedProgress, cleanCollection } from './utils/seed-helpers'
import EducationLevel from '../../../models/EducationLevel'
import Field from '../../../models/Field'
import Subject from '../../../models/Subject'
import Competency from '../../../models/Competency'

/**
 * Script principal de seeding du système éducatif camerounais
 *
 * Exécute le seeding dans l'ordre correct des dépendances:
 * 1. EducationLevels (pas de dépendances)
 * 2. Fields (dépend de EducationLevels)
 * 3. Subjects (dépend de EducationLevels et Fields)
 * 4. Competencies (dépend de Subjects)
 *
 * @example
 * ```bash
 * npm run seed              # Seed normal (idempotent)
 * npm run seed:clean        # Nettoie puis seed
 * ```
 *
 * Options via arguments:
 * - --clean : Nettoie les collections avant de seed
 */
async function main() {
  try {
    const startTime = Date.now()

    logSeedProgress('='.repeat(60), 'info')
    logSeedProgress('Xkorin School V2 - Data Seeding', 'info')
    logSeedProgress('Cameroon Education System (Francophone & Anglophone)', 'info')
    logSeedProgress('='.repeat(60), 'info')

    // Connexion à la base de données
    logSeedProgress('Connecting to MongoDB...', 'info')
    await connectDB()
    logSeedProgress('Connected to MongoDB', 'success')

    // Check --clean flag
    const shouldClean = process.argv.includes('--clean')

    if (shouldClean) {
      logSeedProgress('', 'info')
      logSeedProgress('⚠️  CLEAN MODE: Deleting all existing data...', 'warning')
      logSeedProgress('', 'info')

      await cleanCollection(Competency, true)
      await cleanCollection(Subject, true)
      await cleanCollection(Field, true)
      await cleanCollection(EducationLevel, true)

      logSeedProgress('All collections cleaned', 'warning')
      logSeedProgress('', 'info')
    }

    // Seeding (ordre important)
    logSeedProgress('', 'info')
    logSeedProgress('Starting seeding process...', 'info')
    logSeedProgress('', 'info')

    // 1. EducationLevels
    const levelCount = await seedEducationLevels()
    logSeedProgress('', 'info')

    // 2. Fields
    const fieldCount = await seedFields()
    logSeedProgress('', 'info')

    // 3. Subjects
    const subjectCount = await seedSubjects()
    logSeedProgress('', 'info')

    // 4. Competencies
    const competencyCount = await seedCompetencies()
    logSeedProgress('', 'info')

    // Résumé
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    logSeedProgress('='.repeat(60), 'success')
    logSeedProgress('Seeding Complete! 🎉', 'success')
    logSeedProgress('='.repeat(60), 'success')
    logSeedProgress(`Duration: ${duration}s`, 'info')
    logSeedProgress('', 'info')
    logSeedProgress('Summary:', 'info')
    logSeedProgress(`  - EducationLevels: ${levelCount}`, 'success')
    logSeedProgress(`  - Fields: ${fieldCount}`, 'success')
    logSeedProgress(`  - Subjects: ${subjectCount}`, 'success')
    logSeedProgress(`  - Competencies: ${competencyCount}`, 'success')
    logSeedProgress('', 'info')
    logSeedProgress(`Total documents: ${levelCount + fieldCount + subjectCount + competencyCount}`, 'success')
    logSeedProgress('='.repeat(60), 'success')

    process.exit(0)
  } catch (error) {
    logSeedProgress('Seeding failed!', 'error')
    console.error(error)
    process.exit(1)
  }
}

// Exécution
main()
