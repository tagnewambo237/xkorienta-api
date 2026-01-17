import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISchoolProgramScore extends Document {
    _id: mongoose.Types.ObjectId
    schoolProgram: mongoose.Types.ObjectId // Ref: 'SchoolProgram'
    matchScoreAvg: number // Moyenne des matchs élèves (0-100)
    lnobAccessibilityScore: number // Score LNOB d'accessibilité (0-100)
    valueForMoneyScore: number // Score rapport qualité/prix (0-100)
    createdAt: Date
    updatedAt: Date
}

const SchoolProgramScoreSchema = new Schema<ISchoolProgramScore>(
    {
        schoolProgram: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolProgram',
            required: true,
            unique: true
        },
        matchScoreAvg: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0
        },
        lnobAccessibilityScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0
        },
        valueForMoneyScore: {
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
// L'index unique pour schoolProgram est déjà créé automatiquement par unique: true dans la définition du schéma
SchoolProgramScoreSchema.index({ valueForMoneyScore: 1 })
SchoolProgramScoreSchema.index({ matchScoreAvg: 1 })

// Prevent model recompilation in development
const SchoolProgramScore: Model<ISchoolProgramScore> = mongoose.models.SchoolProgramScore || mongoose.model<ISchoolProgramScore>('SchoolProgramScore', SchoolProgramScoreSchema)

export default SchoolProgramScore
