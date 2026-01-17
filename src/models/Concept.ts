import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IConcept extends Document {
    _id: mongoose.Types.ObjectId
    title: string
    description?: string
    syllabus: mongoose.Types.ObjectId // Parent Syllabus
    parent?: mongoose.Types.ObjectId // Parent Concept (for hierarchy)
    order: number

    // Links to resources
    learningUnit?: mongoose.Types.ObjectId

    createdAt: Date
    updatedAt: Date
}

const ConceptSchema = new Schema<IConcept>(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        syllabus: {
            type: Schema.Types.ObjectId,
            ref: 'Syllabus',
            required: true
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: 'Concept',
            default: null
        },
        order: {
            type: Number,
            default: 0
        },
        learningUnit: {
            type: Schema.Types.ObjectId,
            ref: 'LearningUnit'
        }
    },
    {
        timestamps: true
    }
)

ConceptSchema.index({ syllabus: 1, parent: 1, order: 1 })

const Concept: Model<IConcept> = mongoose.models.Concept || mongoose.model<IConcept>('Concept', ConceptSchema)

export default Concept
