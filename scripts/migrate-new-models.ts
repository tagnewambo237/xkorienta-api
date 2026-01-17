import mongoose from 'mongoose'
import connectDB from '../../lib/mongodb'

// Importer tous les nouveaux modèles pour le module Orientation
import Country from '../../models/Country'
import Region from '../../models/Region'
import Department from '../../models/Department'
import City from '../../models/City'
import RegulatoryApproval from '../../models/RegulatoryApproval'
import AcademicTutelle from '../../models/AcademicTutelle'
import Partner from '../../models/Partner'
import InstitutionPartner from '../../models/InstitutionPartner'
import Specialty from '../../models/Specialty'
import Skill from '../../models/Skill'
import SpecialtySkill from '../../models/SpecialtySkill'
import CareerOutcome from '../../models/CareerOutcome'
import SpecialtyOutcome from '../../models/SpecialtyOutcome'
import CurriculumSemester from '../../models/CurriculumSemester'
import CurriculumUE from '../../models/CurriculumUE'
import SchoolProgram from '../../models/SchoolProgram'
import PerformanceMetric from '../../models/PerformanceMetric'
import EmploymentMetric from '../../models/EmploymentMetric'
import InfrastructureMetric from '../../models/InfrastructureMetric'
import SchoolScore from '../../models/SchoolScore'
import SpecialtyScore from '../../models/SpecialtyScore'
import SchoolProgramScore from '../../models/SchoolProgramScore'

async function migrate() {
  try {
    console.log('🔄 Connexion à MongoDB...')
    await connectDB()
    console.log('✅ Connecté à MongoDB')

    // Les collections et indexes sont créés automatiquement lors du premier accès
    // On force la création en faisant une requête simple sur chaque modèle

    console.log('\n📦 Création des collections et indexes...\n')

    const models = [
      { name: 'Country', model: Country },
      { name: 'Region', model: Region },
      { name: 'Department', model: Department },
      { name: 'City', model: City },
      { name: 'RegulatoryApproval', model: RegulatoryApproval },
      { name: 'AcademicTutelle', model: AcademicTutelle },
      { name: 'Partner', model: Partner },
      { name: 'InstitutionPartner', model: InstitutionPartner },
      { name: 'Specialty', model: Specialty },
      { name: 'Skill', model: Skill },
      { name: 'SpecialtySkill', model: SpecialtySkill },
      { name: 'CareerOutcome', model: CareerOutcome },
      { name: 'SpecialtyOutcome', model: SpecialtyOutcome },
      { name: 'CurriculumSemester', model: CurriculumSemester },
      { name: 'CurriculumUE', model: CurriculumUE },
      { name: 'SchoolProgram', model: SchoolProgram },
      { name: 'PerformanceMetric', model: PerformanceMetric },
      { name: 'EmploymentMetric', model: EmploymentMetric },
      { name: 'InfrastructureMetric', model: InfrastructureMetric },
      { name: 'SchoolScore', model: SchoolScore },
      { name: 'SpecialtyScore', model: SpecialtyScore },
      { name: 'SchoolProgramScore', model: SchoolProgramScore },
    ]

    for (const { name, model } of models) {
      try {
        // Force la création de la collection et des indexes
        await model.createIndexes()
        console.log(`✅ ${name} - Collection et indexes créés`)
      } catch (error: any) {
        console.error(`❌ ${name} - Erreur:`, error.message)
      }
    }

    console.log('\n✅ Migration terminée avec succès!')
    console.log('\n📊 Vérification des collections...')

    const db = mongoose.connection.db
    const collections = await db?.listCollections().toArray()
    const newCollections = models.map(m => {
      // Convertir le nom du modèle en nom de collection (Mongoose ajoute 's' par défaut)
      const modelName = m.name
      if (modelName.endsWith('y')) {
        return modelName.slice(0, -1) + 'ies'
      }
      return modelName.toLowerCase() + 's'
    })

    console.log(`\nCollections attendues: ${newCollections.length}`)
    const actualCollectionNames = collections?.map(c => c.name) || []

    newCollections.forEach(col => {
      const exists = actualCollectionNames.includes(col)
      console.log(`  ${exists ? '✅' : '❌'} ${col}`)
    })

    const missing = newCollections.filter(col => !actualCollectionNames.includes(col))

    if (missing.length === 0) {
      console.log('\n✅ Toutes les collections sont créées!')
    } else {
      console.log(`\n⚠️  Collections manquantes: ${missing.join(', ')}`)
      console.log('   (Cela peut être normal si les collections n\'ont pas encore été utilisées)')
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Connexion fermée')
    process.exit(0)
  }
}

migrate()
