import Competency, { ICompetency } from '../../../models/Competency'
import Subject from '../../../models/Subject'
import {
  findOrCreate,
  validateSeedDataArray,
  resolveReferences,
  logSeedProgress
} from './utils/seed-helpers'
import competenciesData from './data/competencies.json'

/**
 * Seed des compétences (Competency)
 *
 * Crée les compétences transversales pour tous les systèmes
 * - Digital (Numérique)
 * - Entrepreneurial (Entrepreneuriat)
 * - Soft Skills (Communication, Collaboration, Créativité)
 * - Cognitive Skills (Pensée Critique, Résolution de Problèmes, Raisonnement Logique)
 *
 * Résout les références vers Subject
 *
 * @example
 * ```typescript
 * await seedCompetencies()
 * ```
 *
 * @returns Nombre total de compétences créées
 * @throws Error si la validation des données échoue ou si les références sont invalides
 */
export async function seedCompetencies(): Promise<number> {
  logSeedProgress('Starting Competency seeding...', 'info')

  const requiredFields = ['name', 'code', 'type', 'description']

  // Validation
  try {
    validateSeedDataArray(competenciesData, requiredFields)
  } catch (error) {
    logSeedProgress(`Validation failed: ${(error as Error).message}`, 'error')
    throw error
  }

  let createdCount = 0

  for (const competencyData of competenciesData) {
    // Résoudre les références vers Subject
    const relatedSubjects = await resolveReferences(
      Subject,
      competencyData.relatedSubjectCodes || [],
      'code'
    )

    const { relatedSubjectCodes, ...dataWithoutCodes } = competencyData

    await findOrCreate(
      Competency,
      { code: competencyData.code },
      {
        ...dataWithoutCodes,
        relatedSubjects
      } as Partial<ICompetency>
    )
    createdCount++
  }

  const totalCount = await Competency.countDocuments()
  logSeedProgress(`Competency seeding complete: ${totalCount} competencies total`, 'success')

  return totalCount
}
