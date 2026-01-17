import EducationLevel from "@/models/EducationLevel"
import Field from "@/models/Field"
import Subject from "@/models/Subject"
import LearningUnit from "@/models/LearningUnit"
import Competency from "@/models/Competency"
import { SubSystem, Cycle } from "@/models/enums"
import { EducationalComponentFactory } from "@/lib/patterns/EducationalHierarchy"

/**
 * Service pour gérer la structure éducative
 * Utilise le Composite Pattern pour la navigation hiérarchique
 */
export class EducationStructureService {
    /**
     * Récupère les niveaux d'éducation avec filtres optionnels
     */
    static async getEducationLevels(filters: {
        subSystem?: SubSystem
        cycle?: Cycle
        isActive?: boolean
    } = {}) {
        const query: any = {}

        if (filters.subSystem) query.subSystem = filters.subSystem
        if (filters.cycle) query.cycle = filters.cycle
        if (filters.isActive !== undefined) query.isActive = filters.isActive

        return await EducationLevel.find(query)
            .sort({ order: 1 })
            .lean()
    }

    /**
     * Récupère un niveau par ID avec sa hiérarchie
     */
    static async getEducationLevelById(id: string) {
        const level = await EducationLevel.findById(id).lean()
        if (!level) return null

        const component = EducationalComponentFactory.create('EducationLevel', level)
        const children = await component.getChildren()

        return {
            ...level,
            children: children.map(c => ({ _id: c._id, name: c.name, code: c.code }))
        }
    }

    /**
     * Récupère les filières avec filtres
     */
    static async getFields(filters: {
        level?: string | string[]
        cycle?: Cycle
        category?: string
        isActive?: boolean
    } = {}) {
        const query: any = {}

        if (filters.level) {
            if (Array.isArray(filters.level)) {
                query.applicableLevels = { $in: filters.level }
            } else {
                query.applicableLevels = filters.level
            }
        }
        if (filters.cycle) query.cycle = filters.cycle
        if (filters.category) query.category = filters.category
        if (filters.isActive !== undefined) query.isActive = filters.isActive

        return await Field.find(query)
            .populate('applicableLevels', 'name code')
            .populate('parentField', 'name code')
            .lean()
    }

    /**
     * Récupère une filière par ID avec sa hiérarchie
     */
    static async getFieldById(id: string) {
        const field = await Field.findById(id)
            .populate('applicableLevels', 'name code cycle')
            .populate('parentField', 'name code')
            .populate('childFields', 'name code')
            .lean()

        if (!field) return null

        const component = EducationalComponentFactory.create('Field', field)
        const children = await component.getChildren()

        return {
            ...field,
            children: children.map(c => ({ _id: c._id, name: c.name, code: c.code }))
        }
    }

    /**
     * Récupère les matières avec filtres
     */
    static async getSubjects(filters: {
        level?: string | string[]
        field?: string
        subjectType?: string
        isActive?: boolean
    } = {}) {
        const query: any = {}

        if (filters.level) {
            if (Array.isArray(filters.level)) {
                query.applicableLevels = { $in: filters.level }
            } else {
                query.applicableLevels = filters.level
            }
        }
        if (filters.field) query.applicableFields = filters.field
        if (filters.subjectType) query.subjectType = filters.subjectType
        if (filters.isActive !== undefined) query.isActive = filters.isActive

        return await Subject.find(query)
            .populate('applicableLevels', 'name code')
            .populate('applicableFields', 'name code')
            .populate('parentSubject', 'name code')
            .lean()
    }

    /**
     * Récupère une matière par ID avec sa hiérarchie
     */
    static async getSubjectById(id: string) {
        const subject = await Subject.findById(id)
            .populate('applicableLevels', 'name code')
            .populate('applicableFields', 'name code')
            .populate('parentSubject', 'name code')
            .populate('childSubjects', 'name code')
            .lean()

        if (!subject) return null

        const component = EducationalComponentFactory.create('Subject', subject)
        const children = await component.getChildren()

        return {
            ...subject,
            children: children.map(c => ({ _id: c._id, name: c.name, code: c.code }))
        }
    }

    /**
     * Récupère les unités d'apprentissage avec filtres
     */
    static async getLearningUnits(filters: {
        subject?: string
        parentUnit?: string
        unitType?: string
        isActive?: boolean
    } = {}) {
        const query: any = {}

        if (filters.subject) query.subject = filters.subject
        if (filters.parentUnit) {
            query.parentUnit = filters.parentUnit
        } else if (filters.parentUnit === null) {
            query.parentUnit = { $exists: false }
        }
        if (filters.unitType) query.unitType = filters.unitType
        if (filters.isActive !== undefined) query.isActive = filters.isActive

        return await LearningUnit.find(query)
            .populate('subject', 'name code')
            .populate('parentUnit', 'name code')
            .lean()
    }

    /**
     * Récupère une unité d'apprentissage par ID avec sa hiérarchie
     */
    static async getLearningUnitById(id: string) {
        const unit = await LearningUnit.findById(id)
            .populate('subject', 'name code')
            .populate('parentUnit', 'name code')
            .populate('childUnits', 'name code')
            .lean()

        if (!unit) return null

        const component = EducationalComponentFactory.create('LearningUnit', unit)
        const children = await component.getChildren()

        return {
            ...unit,
            children: children.map(c => ({ _id: c._id, name: c.name, code: c.code }))
        }
    }

    /**
     * Récupère toutes les compétences
     */
    static async getCompetencies(filters: {
        type?: string
        isActive?: boolean
    } = {}) {
        const query: any = {}

        if (filters.type) query.type = filters.type
        if (filters.isActive !== undefined) query.isActive = filters.isActive

        return await Competency.find(query).lean()
    }

    /**
     * Récupère une compétence par ID
     */
    static async getCompetencyById(id: string) {
        return await Competency.findById(id).lean()
    }

    /**
     * Récupère le chemin complet d'un élément (breadcrumb)
     */
    static async getBreadcrumb(type: string, id: string) {
        const component = await EducationalComponentFactory.createFromId(type, id as any)
        if (!component) return []

        return await component.getPath()
    }
}
