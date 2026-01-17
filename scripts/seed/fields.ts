import Field, { IField } from '../../../models/Field'
import EducationLevel from '../../../models/EducationLevel'
import {
  findOrCreate,
  validateSeedDataArray,
  resolveReferences,
  logSeedProgress
} from './utils/seed-helpers'
import francophoneFieldsData from './data/francophone/fields.json'
import anglophoneFieldsData from './data/anglophone/fields.json'

/**
 * Seed des filières/séries (Field)
 *
 * Crée les filières pour les systèmes francophone et anglophone
 * - Francophone: Séries A, C, D, TI + Groupes de compétences collège
 * - Anglophone: Arts Stream, Science Stream, General Studies
 *
 * Résout les références vers EducationLevel
 *
 * @example
 * ```typescript
 * await seedFields()
 * ```
 *
 * @returns Nombre total de filières créées
 * @throws Error si la validation des données échoue ou si les références sont invalides
 */
export async function seedFields(): Promise<number> {
  logSeedProgress('Starting Field seeding...', 'info')

  const requiredFields = ['name', 'code', 'category', 'cycle', 'subSystem']

  // Validation
  try {
    validateSeedDataArray(francophoneFieldsData, requiredFields)
    validateSeedDataArray(anglophoneFieldsData, requiredFields)
  } catch (error) {
    logSeedProgress(`Validation failed: ${(error as Error).message}`, 'error')
    throw error
  }

  let createdCount = 0

  // Seed Francophone fields
  logSeedProgress('Seeding Francophone fields...', 'info')
  for (const fieldData of francophoneFieldsData) {
    // Résoudre les références vers EducationLevel
    const applicableLevels = await resolveReferences(
      EducationLevel,
      fieldData.applicableLevelCodes,
      'code'
    )

    const { applicableLevelCodes, ...dataWithoutCodes } = fieldData

    await findOrCreate(
      Field,
      { code: fieldData.code },
      {
        ...dataWithoutCodes,
        applicableLevels
      } as Partial<IField>
    )
    createdCount++
  }

  // Seed Anglophone fields
  logSeedProgress('Seeding Anglophone fields...', 'info')
  for (const fieldData of anglophoneFieldsData) {
    const applicableLevels = await resolveReferences(
      EducationLevel,
      fieldData.applicableLevelCodes,
      'code'
    )

    const { applicableLevelCodes, ...dataWithoutCodes } = fieldData

    await findOrCreate(
      Field,
      { code: fieldData.code },
      {
        ...dataWithoutCodes,
        applicableLevels
      } as Partial<IField>
    )
    createdCount++
  }

  const totalCount = await Field.countDocuments()
  logSeedProgress(`Field seeding complete: ${totalCount} fields total`, 'success')

  return totalCount
}
