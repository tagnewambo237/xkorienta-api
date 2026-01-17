import Subject, { ISubject } from '../../../models/Subject'
import EducationLevel from '../../../models/EducationLevel'
import Field from '../../../models/Field'
import {
  findOrCreate,
  validateSeedDataArray,
  resolveReferences,
  logSeedProgress
} from './utils/seed-helpers'
import francophoneSubjectsData from './data/francophone/subjects.json'
import anglophoneSubjectsData from './data/anglophone/subjects.json'

/**
 * Seed des matières (Subject)
 *
 * Crée les matières pour les systèmes francophone et anglophone
 * - Francophone: Mathématiques, Physique-Chimie, SVT, Français, etc.
 * - Anglophone: Mathematics, Physics, Chemistry, Biology, English, etc.
 *
 * Résout les références vers EducationLevel et Field
 *
 * @example
 * ```typescript
 * await seedSubjects()
 * ```
 *
 * @returns Nombre total de matières créées
 * @throws Error si la validation des données échoue ou si les références sont invalides
 */
export async function seedSubjects(): Promise<number> {
  logSeedProgress('Starting Subject seeding...', 'info')

  const requiredFields = ['name', 'code', 'subSystem', 'subjectType']

  // Validation
  try {
    validateSeedDataArray(francophoneSubjectsData, requiredFields)
    validateSeedDataArray(anglophoneSubjectsData, requiredFields)
  } catch (error) {
    logSeedProgress(`Validation failed: ${(error as Error).message}`, 'error')
    throw error
  }

  let createdCount = 0

  // Seed Francophone subjects
  logSeedProgress('Seeding Francophone subjects...', 'info')
  for (const subjectData of francophoneSubjectsData) {
    // Résoudre les références
    const applicableLevels = await resolveReferences(
      EducationLevel,
      subjectData.applicableLevelCodes || [],
      'code'
    )

    const applicableFields = await resolveReferences(
      Field,
      subjectData.applicableFieldCodes || [],
      'code'
    )

    const { applicableLevelCodes, applicableFieldCodes, ...dataWithoutCodes } = subjectData

    await findOrCreate(
      Subject,
      { code: subjectData.code },
      {
        ...dataWithoutCodes,
        applicableLevels,
        applicableFields
      } as Partial<ISubject>
    )
    createdCount++
  }

  // Seed Anglophone subjects
  logSeedProgress('Seeding Anglophone subjects...', 'info')
  for (const subjectData of anglophoneSubjectsData) {
    const applicableLevels = await resolveReferences(
      EducationLevel,
      subjectData.applicableLevelCodes || [],
      'code'
    )

    const applicableFields = await resolveReferences(
      Field,
      subjectData.applicableFieldCodes || [],
      'code'
    )

    const { applicableLevelCodes, applicableFieldCodes, ...dataWithoutCodes } = subjectData

    await findOrCreate(
      Subject,
      { code: subjectData.code },
      {
        ...dataWithoutCodes,
        applicableLevels,
        applicableFields
      } as Partial<ISubject>
    )
    createdCount++
  }

  const totalCount = await Subject.countDocuments()
  logSeedProgress(`Subject seeding complete: ${totalCount} subjects total`, 'success')

  return totalCount
}
