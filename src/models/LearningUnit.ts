import mongoose, { Schema, Document, Model } from 'mongoose'
import { UnitType, DifficultyLevel } from './enums'

export interface ILearningUnit extends Document {
    subject: mongoose.Types.ObjectId
    type: UnitType
    title: string
    description?: string
    order: number
    parentUnit?: mongoose.Types.ObjectId
    content: {
        objectives: string[]
        prerequisites: mongoose.Types.ObjectId[]
        duration?: number // hours
        difficulty: DifficultyLevel
    }
    isActive: boolean
    metadata: {
        tags: string[]
        resources: {
            type: string
            url: string
            title: string
        }[]
    }
    _cachedExamCount: number
    createdAt: Date
    updatedAt: Date
}

const LearningUnitSchema = new Schema<ILearningUnit>(
    {
        subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        type: { type: String, enum: Object.values(UnitType), required: true },
        title: { type: String, required: true },
        description: String,
        order: { type: Number, required: true },
        parentUnit: { type: Schema.Types.ObjectId, ref: 'LearningUnit' },
        content: {
            objectives: [String],
            prerequisites: [{ type: Schema.Types.ObjectId, ref: 'LearningUnit' }],
            duration: Number,
            difficulty: { type: String, enum: Object.values(DifficultyLevel), default: DifficultyLevel.INTERMEDIATE }
        },
        isActive: { type: Boolean, default: true },
        metadata: {
            tags: [String],
            resources: [{
                type: String,
                url: String,
                title: String
            }]
        },
        _cachedExamCount: { type: Number, default: 0 }
    },
    { timestamps: true }
)

// Indexes
LearningUnitSchema.index({ subject: 1, order: 1 })
LearningUnitSchema.index({ subject: 1, isActive: 1 })

const LearningUnit: Model<ILearningUnit> = mongoose.models.LearningUnit || mongoose.model<ILearningUnit>('LearningUnit', LearningUnitSchema)

export default LearningUnit
