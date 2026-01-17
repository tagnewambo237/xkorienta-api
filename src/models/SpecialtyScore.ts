import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISpecialtyScore extends Document {
    _id: mongoose.Types.ObjectId
    specialty: mongoose.Types.ObjectId // Ref: 'Specialty'
    employabilityScore: number // Score d'employabilité (0-100)
    accessibilityScore: number // Score d'accessibilité (0-100)
    difficultyScore: number // Score de difficulté (0-100)
    lnobScore: number // Score LNOB (Leave No One Behind) - accessibilité sociale (0-100)
    globalScore: number // Score global (0-100)
    createdAt: Date
    updatedAt: Date
}

const SpecialtyScoreSchema = new Schema<ISpecialtyScore>(
    {
        specialty: {
            type: Schema.Types.ObjectId,
            ref: 'Specialty',
            required: true,
            unique: true
        },
        employabilityScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0
        },
        accessibilityScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0
        },
        difficultyScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0
        },
        lnobScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0
        },
        globalScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0
        }
    },
    {
        timestamps: true
    }
)

// Indexes
// L'index unique pour specialty est déjà créé automatiquement par unique: true dans la définition du schéma
SpecialtyScoreSchema.index({ globalScore: 1 })

// Prevent model recompilation in development
const SpecialtyScore: Model<ISpecialtyScore> = mongoose.models.SpecialtyScore || mongoose.model<ISpecialtyScore>('SpecialtyScore', SpecialtyScoreSchema)

export default SpecialtyScore
