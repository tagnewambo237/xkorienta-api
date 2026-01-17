import EducationLevel, { IEducationLevel } from '../../../models/EducationLevel'
import { findOrCreate, validateSeedDataArray, logSeedProgress } from './utils/seed-helpers'
import francopheneLevelsData from './data/francophone/levels.json'
import anglophoneLevelsData from './data/anglophone/levels.json'

/**
 * Seed des niveaux d'éducation (EducationLevel)
 *
 * Crée les niveaux pour les systèmes francophone et anglophone
 * - Francophone: 6ème → Tle (13 niveaux)
 * - Anglophone: Form 1 → Upper Sixth (9 niveaux)
 *
 * @example
 * ```typescript
 * await seedEducationLevels()
 * ```
 *
 * @returns Nombre total de niveaux créés
 * @throws Error si la validation des données échoue
 */
export async function seedEducationLevels(): Promise<number> {
  logSeedProgress('Starting EducationLevel seeding...', 'info')

  const requiredFields = ['name', 'code', 'cycle', 'subSystem', 'order']

  // Validation des données
  try {
    validateSeedDataArray(francopheneLevelsData, requiredFields)
    validateSeedDataArray(anglophoneLevelsData, requiredFields)
  } catch (error) {
    logSeedProgress(`Validation failed: ${(error as Error).message}`, 'error')
    throw error
  }

  let createdCount = 0

  // Seed Francophone levels
  logSeedProgress('Seeding Francophone levels...', 'info')
  for (const levelData of francopheneLevelsData) {
    await findOrCreate(
      EducationLevel,
      { code: levelData.code },
      levelData as Partial<IEducationLevel>
    )
    createdCount++
  }

  // Seed Anglophone levels
  logSeedProgress('Seeding Anglophone levels...', 'info')
  for (const levelData of anglophoneLevelsData) {
    await findOrCreate(
      EducationLevel,
      { code: levelData.code },
      levelData as Partial<IEducationLevel>
    )
    createdCount++
  }

  const totalCount = await EducationLevel.countDocuments()
  logSeedProgress(`EducationLevel seeding complete: ${totalCount} levels total`, 'success')

  return totalCount
}
