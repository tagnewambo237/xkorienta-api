import mongoose, { Schema, Document, Model } from 'mongoose'

export enum SyllabusStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED'
}

export interface ISyllabus extends Document {
    _id: mongoose.Types.ObjectId

    // Basic Info
    title: string
    description?: string

    // Context
    subject: mongoose.Types.ObjectId // Ref to Subject
    teacher: mongoose.Types.ObjectId // Ref to User (Owner)
    school?: mongoose.Types.ObjectId // Ref to School (Optional)

    // Content Structure (Flexible JSON)
    // Example: { chapters: [{ title: "Ch1", topics: [...] }] }
    structure: any

    classes: mongoose.Types.ObjectId[] // Assigned Classes

    learningObjectives: string[]

    status: SyllabusStatus
    version: number

    createdAt: Date
    updatedAt: Date
}

const SyllabusSchema = new Schema<ISyllabus>(
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
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true
        },
        teacher: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School'
        },
        structure: {
            type: Schema.Types.Mixed,
            default: {}
        },
        classes: [{
            type: Schema.Types.ObjectId,
            ref: 'Class'
        }],
        learningObjectives: [{
            type: String,
            trim: true
        }],
        status: {
            type: String,
            enum: Object.values(SyllabusStatus),
            default: SyllabusStatus.DRAFT
        },
        version: {
            type: Number,
            default: 1
        }
    },
    {
        timestamps: true
    }
)

// Indexes
SyllabusSchema.index({ teacher: 1, status: 1 })
SyllabusSchema.index({ school: 1 })
SyllabusSchema.index({ subject: 1 })

const Syllabus: Model<ISyllabus> = mongoose.models.Syllabus || mongoose.model<ISyllabus>('Syllabus', SyllabusSchema)

export default Syllabus
