import mongoose, { Model, Document } from 'mongoose'

/**
 * Trouve un document existant ou en crée un nouveau (idempotence)
 *
 * @example
 * ```typescript
 * const level = await findOrCreate(
 *   EducationLevel,
 *   { code: '6EME' },
 *   { name: 'Sixième', code: '6EME', cycle: 'COLLEGE' }
 * )
 * ```
 *
 * @param model - Le modèle Mongoose
 * @param query - Critères de recherche (ex: { code: '6EME' })
 * @param data - Données complètes à insérer si non trouvé
 * @returns Le document trouvé ou créé
 */
export async function findOrCreate<T extends Document>(
  model: Model<T>,
  query: Partial<T>,
  data: Partial<T>
): Promise<T> {
  try {
    let doc = await model.findOne(query as any)

    if (!doc) {
      const created = await model.create(data as any)
      doc = Array.isArray(created) ? created[0] : created
      console.log(`✅ Created: ${model.modelName} - ${JSON.stringify(query)}`)
    } else {
      console.log(`⏭️  Skipped (exists): ${model.modelName} - ${JSON.stringify(query)}`)
    }

    return doc as T
  } catch (error) {
    console.error(`❌ Error in findOrCreate for ${model.modelName}:`, error)
    throw error
  }
}

/**
 * Trouve un document existant ou en crée un nouveau avec mise à jour si existant
 *
 * @example
 * ```typescript
 * const level = await findOrUpsert(
 *   EducationLevel,
 *   { code: '6EME' },
 *   { name: 'Sixième', order: 1 }
 * )
 * ```
 *
 * @param model - Le modèle Mongoose
 * @param query - Critères de recherche
 * @param data - Données à insérer ou mettre à jour
 * @returns Le document créé ou mis à jour
 */
export async function findOrUpsert<T extends Document>(
  model: Model<T>,
  query: Partial<T>,
  data: Partial<T>
): Promise<T> {
  try {
    const doc = await model.findOneAndUpdate(
      query as any,
      data as any,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    if (doc) {
      console.log(`✅ Upserted: ${model.modelName} - ${JSON.stringify(query)}`)
    }

    return doc!
  } catch (error) {
    console.error(`❌ Error in findOrUpsert for ${model.modelName}:`, error)
    throw error
  }
}

/**
 * Valide les données JSON avant insertion
 *
 * @param data - Données à valider
 * @param requiredFields - Champs obligatoires
 * @throws Error si validation échoue
 */
export function validateSeedData(data: any, requiredFields: string[]): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: must be an object')
  }

  const missingFields = requiredFields.filter(field => !(field in data))

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }
}

/**
 * Valide un tableau de données JSON
 *
 * @param dataArray - Tableau de données
 * @param requiredFields - Champs obligatoires pour chaque élément
 * @throws Error si validation échoue
 */
export function validateSeedDataArray(dataArray: any[], requiredFields: string[]): void {
  if (!Array.isArray(dataArray)) {
    throw new Error('Invalid data: must be an array')
  }

  dataArray.forEach((data, index) => {
    try {
      validateSeedData(data, requiredFields)
    } catch (error) {
      throw new Error(`Validation failed at index ${index}: ${(error as Error).message}`)
    }
  })
}

/**
 * Résout les références ObjectId à partir de codes
 *
 * @example
 * ```typescript
 * const levelIds = await resolveReferences(
 *   EducationLevel,
 *   ['6EME', '5EME', '4EME'],
 *   'code'
 * )
 * ```
 *
 * @param model - Le modèle Mongoose
 * @param codes - Codes à résoudre
 * @param field - Nom du champ de référence (par défaut: 'code')
 * @returns Tableau d'ObjectIds
 */
export async function resolveReferences<T extends Document>(
  model: Model<T>,
  codes: string[],
  field: string = 'code'
): Promise<mongoose.Types.ObjectId[]> {
  if (!codes || codes.length === 0) {
    return []
  }

  const query: any = {}
  query[field] = { $in: codes }

  const docs = await model.find(query).select('_id')

  if (docs.length !== codes.length) {
    const foundCodes = docs.map((doc: any) => doc[field])
    const missingCodes = codes.filter(code => !foundCodes.includes(code))
    console.warn(`⚠️  Warning: Some references not found in ${model.modelName}: ${missingCodes.join(', ')}`)
  }

  return docs.map(doc => doc._id as mongoose.Types.ObjectId)
}

/**
 * Log de progression du seeding
 *
 * @param message - Message à logger
 * @param type - Type de log (info, success, error, warning)
 */
export function logSeedProgress(
  message: string,
  type: 'info' | 'success' | 'error' | 'warning' = 'info'
): void {
  const icons = {
    info: '📘',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }

  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warning: '\x1b[33m'  // yellow
  }

  const reset = '\x1b[0m'

  console.log(`${icons[type]} ${colors[type]}${message}${reset}`)
}

/**
 * Compte les documents dans une collection
 *
 * @param model - Le modèle Mongoose
 * @param query - Critères de comptage (optionnel)
 * @returns Nombre de documents
 */
export async function countDocuments<T extends Document>(
  model: Model<T>,
  query: Partial<T> = {}
): Promise<number> {
  return await model.countDocuments(query as any)
}

/**
 * Nettoie une collection (ATTENTION: supprime toutes les données)
 *
 * @param model - Le modèle Mongoose
 * @param confirm - Confirmation (doit être true)
 */
export async function cleanCollection<T extends Document>(
  model: Model<T>,
  confirm: boolean = false
): Promise<void> {
  if (!confirm) {
    throw new Error('cleanCollection requires explicit confirmation (confirm=true)')
  }

  const count = await model.countDocuments()
  await model.deleteMany({})

  logSeedProgress(`Cleaned ${model.modelName}: ${count} documents deleted`, 'warning')
}
