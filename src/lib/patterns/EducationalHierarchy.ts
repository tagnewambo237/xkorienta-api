import mongoose from 'mongoose'

/**
 * Composite Pattern pour la Hiérarchie Éducative
 * 
 * Permet de traiter uniformément les éléments individuels et les compositions
 * d'éléments dans la structure éducative.
 * 
 * Hiérarchie:
 * SubSystem
 *   └─ EducationLevel (Cycle)
 *       └─ Field (Filière/Série)
 *           ├─ Field (Sous-spécialité)
 *           └─ Subject (Matière)
 *               ├─ Subject (Sous-matière)
 *               └─ LearningUnit (Chapitre)
 *                   └─ LearningUnit (Sous-chapitre)
 */

/**
 * Interface commune pour tous les composants de la hiérarchie
 */
export interface EducationalComponent {
    _id: mongoose.Types.ObjectId
    name: string
    code: string

    // Méthodes du Composite Pattern
    getChildren(): Promise<EducationalComponent[]>
    getParent(): Promise<EducationalComponent | null>
    getPath(): Promise<string[]>
    getDepth(): Promise<number>
    isLeaf(): Promise<boolean>

    // Méthodes de navigation
    getAncestors(): Promise<EducationalComponent[]>
    getDescendants(): Promise<EducationalComponent[]>
    getSiblings(): Promise<EducationalComponent[]>

    // Méthodes de comptage
    countChildren(): Promise<number>
    countDescendants(): Promise<number>
}

/**
 * Classe de base abstraite pour les composants éducatifs
 */
export abstract class BaseEducationalComponent implements EducationalComponent {
    _id: mongoose.Types.ObjectId
    name: string
    code: string

    constructor(data: { _id: mongoose.Types.ObjectId; name: string; code: string }) {
        this._id = data._id
        this.name = data.name
        this.code = data.code
    }

    abstract getChildren(): Promise<EducationalComponent[]>
    abstract getParent(): Promise<EducationalComponent | null>

    async getPath(): Promise<string[]> {
        const ancestors = await this.getAncestors()
        return [...ancestors.map(a => a.name), this.name]
    }

    async getDepth(): Promise<number> {
        const ancestors = await this.getAncestors()
        return ancestors.length
    }

    async isLeaf(): Promise<boolean> {
        const children = await this.getChildren()
        return children.length === 0
    }

    async getAncestors(): Promise<EducationalComponent[]> {
        const ancestors: EducationalComponent[] = []
        let current: EducationalComponent | null = this

        while (current) {
            const parent = await current.getParent()
            if (parent) {
                ancestors.unshift(parent)
                current = parent
            } else {
                break
            }
        }

        return ancestors
    }

    async getDescendants(): Promise<EducationalComponent[]> {
        const descendants: EducationalComponent[] = []
        const children = await this.getChildren()

        for (const child of children) {
            descendants.push(child)
            const childDescendants = await child.getDescendants()
            descendants.push(...childDescendants)
        }

        return descendants
    }

    async getSiblings(): Promise<EducationalComponent[]> {
        const parent = await this.getParent()
        if (!parent) {
            return []
        }

        const siblings = await parent.getChildren()
        return siblings.filter(s => s._id.toString() !== this._id.toString())
    }

    async countChildren(): Promise<number> {
        const children = await this.getChildren()
        return children.length
    }

    async countDescendants(): Promise<number> {
        const descendants = await this.getDescendants()
        return descendants.length
    }
}

/**
 * Composant pour EducationLevel
 */
export class EducationLevelComponent extends BaseEducationalComponent {
    subSystem: string
    cycle: string

    constructor(data: any) {
        super(data)
        this.subSystem = data.subSystem
        this.cycle = data.cycle
    }

    async getChildren(): Promise<EducationalComponent[]> {
        const Field = (await import('@/models/Field')).default
        const fields = await Field.find({
            applicableLevels: this._id,
            isActive: true
        }).lean()

        return fields.map(f => new FieldComponent(f))
    }

    async getParent(): Promise<EducationalComponent | null> {
        // EducationLevel est au sommet de la hiérarchie (après SubSystem)
        return null
    }
}

/**
 * Composant pour Field (Filière/Série)
 */
export class FieldComponent extends BaseEducationalComponent {
    parentField?: mongoose.Types.ObjectId
    childFields: mongoose.Types.ObjectId[]

    constructor(data: any) {
        super(data)
        this.parentField = data.parentField
        this.childFields = data.childFields || []
    }

    async getChildren(): Promise<EducationalComponent[]> {
        const Field = (await import('@/models/Field')).default
        const Subject = (await import('@/models/Subject')).default

        // Récupérer les sous-filières
        const childFields = await Field.find({
            parentField: this._id,
            isActive: true
        }).lean()

        // Récupérer les matières
        const subjects = await Subject.find({
            applicableFields: this._id,
            isActive: true
        }).lean()

        return [
            ...childFields.map(f => new FieldComponent(f)),
            ...subjects.map(s => new SubjectComponent(s))
        ]
    }

    async getParent(): Promise<EducationalComponent | null> {
        if (!this.parentField) {
            // Récupérer l'EducationLevel parent
            const Field = (await import('@/models/Field')).default
            const EducationLevel = (await import('@/models/EducationLevel')).default

            const field = await Field.findById(this._id).lean()
            if (field && field.applicableLevels && field.applicableLevels.length > 0) {
                const level = await EducationLevel.findById(field.applicableLevels[0]).lean()
                if (level) {
                    return new EducationLevelComponent(level)
                }
            }
            return null
        }

        const Field = (await import('@/models/Field')).default
        const parent = await Field.findById(this.parentField).lean()
        return parent ? new FieldComponent(parent) : null
    }
}

/**
 * Composant pour Subject (Matière)
 */
export class SubjectComponent extends BaseEducationalComponent {
    parentSubject?: mongoose.Types.ObjectId

    constructor(data: any) {
        super(data)
        this.parentSubject = data.parentSubject
    }

    async getChildren(): Promise<EducationalComponent[]> {
        const Subject = (await import('@/models/Subject')).default
        const LearningUnit = (await import('@/models/LearningUnit')).default

        // Récupérer les sous-matières
        const childSubjects = await Subject.find({
            parentSubject: this._id,
            isActive: true
        }).lean()

        // Récupérer les unités d'apprentissage
        const learningUnits = await LearningUnit.find({
            subject: this._id,
            parentUnit: { $exists: false },
            isActive: true
        }).lean()

        return [
            ...childSubjects.map(s => new SubjectComponent(s)),
            ...learningUnits.map(u => new LearningUnitComponent(u))
        ]
    }

    async getParent(): Promise<EducationalComponent | null> {
        if (this.parentSubject) {
            const Subject = (await import('@/models/Subject')).default
            const parent = await Subject.findById(this.parentSubject).lean()
            return parent ? new SubjectComponent(parent) : null
        }

        // Récupérer le Field parent
        const Subject = (await import('@/models/Subject')).default
        const Field = (await import('@/models/Field')).default

        const subject = await Subject.findById(this._id).lean()
        if (subject && subject.applicableFields && subject.applicableFields.length > 0) {
            const field = await Field.findById(subject.applicableFields[0]).lean()
            if (field) {
                return new FieldComponent(field)
            }
        }

        return null
    }
}

/**
 * Composant pour LearningUnit (Chapitre)
 */
export class LearningUnitComponent extends BaseEducationalComponent {
    parentUnit?: mongoose.Types.ObjectId
    subject: mongoose.Types.ObjectId

    constructor(data: any) {
        super(data)
        this.parentUnit = data.parentUnit
        this.subject = data.subject
    }

    async getChildren(): Promise<EducationalComponent[]> {
        const LearningUnit = (await import('@/models/LearningUnit')).default

        // Récupérer les sous-chapitres
        const childUnits = await LearningUnit.find({
            parentUnit: this._id,
            isActive: true
        }).lean()

        return childUnits.map(u => new LearningUnitComponent(u))
    }

    async getParent(): Promise<EducationalComponent | null> {
        if (this.parentUnit) {
            const LearningUnit = (await import('@/models/LearningUnit')).default
            const parent = await LearningUnit.findById(this.parentUnit).lean()
            return parent ? new LearningUnitComponent(parent) : null
        }

        // Récupérer le Subject parent
        const Subject = (await import('@/models/Subject')).default
        const subject = await Subject.findById(this.subject).lean()
        return subject ? new SubjectComponent(subject) : null
    }
}

/**
 * Factory pour créer le bon type de composant
 */
export class EducationalComponentFactory {
    static create(type: string, data: any): EducationalComponent {
        switch (type) {
            case 'EducationLevel':
                return new EducationLevelComponent(data)
            case 'Field':
                return new FieldComponent(data)
            case 'Subject':
                return new SubjectComponent(data)
            case 'LearningUnit':
                return new LearningUnitComponent(data)
            default:
                throw new Error(`Unknown component type: ${type}`)
        }
    }

    /**
     * Crée un composant à partir de son ID et type
     */
    static async createFromId(
        type: string,
        id: mongoose.Types.ObjectId
    ): Promise<EducationalComponent | null> {
        let data: any = null

        switch (type) {
            case 'EducationLevel': {
                const Model = (await import('@/models/EducationLevel')).default
                data = await Model.findById(id).lean()
                break
            }
            case 'Field': {
                const Model = (await import('@/models/Field')).default
                data = await Model.findById(id).lean()
                break
            }
            case 'Subject': {
                const Model = (await import('@/models/Subject')).default
                data = await Model.findById(id).lean()
                break
            }
            case 'LearningUnit': {
                const Model = (await import('@/models/LearningUnit')).default
                data = await Model.findById(id).lean()
                break
            }
            default:
                throw new Error(`Unknown component type: ${type}`)
        }

        return data ? this.create(type, data) : null
    }
}
