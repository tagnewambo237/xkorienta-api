import mongoose from 'mongoose'
import EducationLevel from '../../models/EducationLevel'
import Field from '../../models/Field'
import Subject from '../../models/Subject'
import LearningUnit from '../../models/LearningUnit'
import Competency from '../../models/Competency'
import { Cycle, SubSystem, FieldCategory, SubjectType, UnitType, DifficultyLevel, CompetencyType } from '../../models/enums'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env')
    process.exit(1)
}

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI as string)
        console.log('Connected to MongoDB')

        // Clear existing V2 data
        await EducationLevel.deleteMany({})
        await Field.deleteMany({})
        await Subject.deleteMany({})
        await LearningUnit.deleteMany({})
        await Competency.deleteMany({})
        console.log('Cleared existing V2 data')

        // --- 1. Seed Education Levels ---
        console.log('Seeding Education Levels...')

        // Francophone System
        const levelsFr = [
            { name: '6ème', code: '6EME', cycle: Cycle.COLLEGE, order: 1 },
            { name: '5ème', code: '5EME', cycle: Cycle.COLLEGE, order: 2 },
            { name: '4ème', code: '4EME', cycle: Cycle.COLLEGE, order: 3 },
            { name: '3ème', code: '3EME', cycle: Cycle.COLLEGE, order: 4 },
            { name: 'Seconde', code: '2NDE', cycle: Cycle.LYCEE, order: 5 },
            { name: 'Première', code: '1ERE', cycle: Cycle.LYCEE, order: 6 },
            { name: 'Terminale', code: 'TLE', cycle: Cycle.LYCEE, order: 7 },
        ]

        const createdLevelsFr = []
        for (const l of levelsFr) {
            const level = await EducationLevel.create({
                ...l,
                subSystem: SubSystem.FRANCOPHONE,
                metadata: { displayName: { fr: l.name, en: l.name } }
            })
            createdLevelsFr.push(level)
        }

        // Anglophone System
        const levelsEn = [
            { name: 'Form 1', code: 'FORM1', cycle: Cycle.COLLEGE, order: 1 },
            { name: 'Form 2', code: 'FORM2', cycle: Cycle.COLLEGE, order: 2 },
            { name: 'Form 3', code: 'FORM3', cycle: Cycle.COLLEGE, order: 3 },
            { name: 'Form 4', code: 'FORM4', cycle: Cycle.COLLEGE, order: 4 },
            { name: 'Form 5', code: 'FORM5', cycle: Cycle.COLLEGE, order: 5 },
            { name: 'Lower Sixth', code: 'LOWER6', cycle: Cycle.LYCEE, order: 6 },
            { name: 'Upper Sixth', code: 'UPPER6', cycle: Cycle.LYCEE, order: 7 },
        ]

        const createdLevelsEn = []
        for (const l of levelsEn) {
            const level = await EducationLevel.create({
                ...l,
                subSystem: SubSystem.ANGLOPHONE,
                metadata: { displayName: { fr: l.name, en: l.name } }
            })
            createdLevelsEn.push(level)
        }

        // --- 2. Seed Fields (Series) ---
        console.log('Seeding Fields...')

        // Francophone Lycée Series
        const lyceeLevelsFr = createdLevelsFr.filter(l => l.cycle === Cycle.LYCEE)
        const seriesFr = [
            { name: 'Série A', code: 'SERIE_A', category: FieldCategory.SERIE },
            { name: 'Série C', code: 'SERIE_C', category: FieldCategory.SERIE },
            { name: 'Série D', code: 'SERIE_D', category: FieldCategory.SERIE },
            { name: 'Série TI', code: 'SERIE_TI', category: FieldCategory.SERIE },
        ]

        const createdFieldsFr = []
        for (const s of seriesFr) {
            const field = await Field.create({
                ...s,
                cycle: Cycle.LYCEE,
                subSystem: SubSystem.FRANCOPHONE,
                applicableLevels: lyceeLevelsFr.map(l => l._id),
                metadata: { displayName: { fr: s.name, en: s.name } }
            })
            createdFieldsFr.push(field)
        }

        // Anglophone Arts/Science
        const lyceeLevelsEn = createdLevelsEn.filter(l => l.cycle === Cycle.LYCEE)
        const fieldsEn = [
            { name: 'Arts', code: 'ARTS', category: FieldCategory.SERIE },
            { name: 'Science', code: 'SCIENCE', category: FieldCategory.SERIE },
        ]

        const createdFieldsEn = []
        for (const f of fieldsEn) {
            const field = await Field.create({
                ...f,
                cycle: Cycle.LYCEE,
                subSystem: SubSystem.ANGLOPHONE,
                applicableLevels: lyceeLevelsEn.map(l => l._id),
                metadata: { displayName: { fr: f.name, en: f.name } }
            })
            createdFieldsEn.push(field)
        }

        // --- 3. Seed Subjects ---
        console.log('Seeding Subjects...')

        // Common Subjects Francophone
        const subjectsFr = [
            { name: 'Mathématiques', code: 'MATH_FR', type: SubjectType.DISCIPLINE },
            { name: 'Physique', code: 'PHYS_FR', type: SubjectType.DISCIPLINE },
            { name: 'Chimie', code: 'CHIM_FR', type: SubjectType.DISCIPLINE },
            { name: 'SVT', code: 'SVT_FR', type: SubjectType.DISCIPLINE },
            { name: 'Informatique', code: 'INFO_FR', type: SubjectType.DISCIPLINE },
            { name: 'Anglais', code: 'ANG_FR', type: SubjectType.DISCIPLINE },
            { name: 'Français', code: 'FRA_FR', type: SubjectType.DISCIPLINE },
        ]

        const createdSubjectsFr = []
        for (const s of subjectsFr) {
            const subject = await Subject.create({
                ...s,
                subSystem: SubSystem.FRANCOPHONE,
                subjectType: s.type,
                applicableLevels: createdLevelsFr.map(l => l._id),
                applicableFields: createdFieldsFr.map(f => f._id),
                metadata: { displayName: { fr: s.name, en: s.name } }
            })
            createdSubjectsFr.push(subject)
        }

        // Common Subjects Anglophone
        const subjectsEn = [
            { name: 'Mathematics', code: 'MATH_EN', type: SubjectType.DISCIPLINE },
            { name: 'Physics', code: 'PHYS_EN', type: SubjectType.DISCIPLINE },
            { name: 'Chemistry', code: 'CHIM_EN', type: SubjectType.DISCIPLINE },
            { name: 'Biology', code: 'BIO_EN', type: SubjectType.DISCIPLINE },
            { name: 'Computer Science', code: 'CS_EN', type: SubjectType.DISCIPLINE },
            { name: 'English', code: 'ENG_EN', type: SubjectType.DISCIPLINE },
            { name: 'French', code: 'FRE_EN', type: SubjectType.DISCIPLINE },
        ]

        const createdSubjectsEn = []
        for (const s of subjectsEn) {
            const subject = await Subject.create({
                ...s,
                subSystem: SubSystem.ANGLOPHONE,
                subjectType: s.type,
                applicableLevels: createdLevelsEn.map(l => l._id),
                applicableFields: createdFieldsEn.map(f => f._id),
                metadata: { displayName: { fr: s.name, en: s.name } }
            })
            createdSubjectsEn.push(subject)
        }

        // --- 4. Seed Learning Units ---
        console.log('Seeding Learning Units...')

        const allSubjects = [...createdSubjectsFr, ...createdSubjectsEn]

        for (const subject of allSubjects) {
            // Create 3-5 units per subject
            const numUnits = Math.floor(Math.random() * 3) + 3

            for (let i = 1; i <= numUnits; i++) {
                await LearningUnit.create({
                    subject: subject._id,
                    type: UnitType.CHAPTER,
                    title: `Chapitre ${i}: Introduction à ${subject.name}`,
                    description: `Contenu fondamental du chapitre ${i}`,
                    order: i,
                    content: {
                        objectives: [`Comprendre les bases de ${subject.name}`, "Appliquer les concepts"],
                        difficulty: DifficultyLevel.INTERMEDIATE
                    },
                    metadata: {
                        tags: ["fondamental", "théorie"],
                        resources: []
                    }
                })
            }
        }

        // --- 5. Seed Competencies ---
        console.log('Seeding Competencies...')

        const competencies = [
            { name: "Analyse critique", code: "COMP_ANA", type: CompetencyType.LOGIC_REASONING },
            { name: "Résolution de problèmes", code: "COMP_PROB", type: CompetencyType.PROBLEM_SOLVING },
            { name: "Communication écrite", code: "COMP_COMM", type: CompetencyType.SOFT_SKILL },
        ]

        for (const comp of competencies) {
            await Competency.create({
                ...comp,
                relatedSubjects: allSubjects.slice(0, 3).map(s => s._id), // Link to first 3 subjects
                metadata: {
                    displayName: { fr: comp.name, en: comp.name }
                }
            })
        }

        console.log('Seeding completed successfully!')
        process.exit(0)
    } catch (error) {
        console.error('Error seeding data:', error)
        process.exit(1)
    }
}

seed()
