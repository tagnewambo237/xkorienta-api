import mongoose, { Schema, Document, Model } from 'mongoose'

export enum MasteryLevel {
    UNKNOWN = 'UNKNOWN',            // Je ne sais pas
    TOTALLY_UNABLE = 'TOTALLY_UNABLE', // Totalement incapable
    UNABLE_WITH_HELP = 'UNABLE_WITH_HELP', // Incapable même avec aide
    UNABLE_ALONE = 'UNABLE_ALONE',   // Incapable sans aide
    ABLE_WITH_HELP = 'ABLE_WITH_HELP', // Capable avec aide
    ABLE_ALONE = 'ABLE_ALONE',       // Capable sans aide
    PERFECTLY_ABLE = 'PERFECTLY_ABLE' // Je suis parfaitement capable
}

export interface IConceptEvaluation extends Document {
    _id: mongoose.Types.ObjectId
    student: mongoose.Types.ObjectId // User
    concept: mongoose.Types.ObjectId // Concept (defined in Syllabus structure or separate model)
    syllabus: mongoose.Types.ObjectId
    level: MasteryLevel
    reflection?: string // Réflexion guidée
    evaluatedAt: Date
}

const ConceptEvaluationSchema = new Schema<IConceptEvaluation>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        concept: {
            type: Schema.Types.ObjectId,
            ref: 'Concept', // Assuming we create a Concept model
            required: true
        },
        syllabus: {
            type: Schema.Types.ObjectId,
            ref: 'Syllabus',
            required: true
        },
        level: {
            type: String,
            enum: Object.values(MasteryLevel),
            required: true
        },
        reflection: {
            type: String,
            trim: true
        },
        evaluatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
)

// Indexes for analytics
ConceptEvaluationSchema.index({ student: 1, concept: 1 })
ConceptEvaluationSchema.index({ syllabus: 1, evaluatedAt: 1 })

const ConceptEvaluation: Model<IConceptEvaluation> = mongoose.models.ConceptEvaluation || mongoose.model<IConceptEvaluation>('ConceptEvaluation', ConceptEvaluationSchema)

export default ConceptEvaluation
