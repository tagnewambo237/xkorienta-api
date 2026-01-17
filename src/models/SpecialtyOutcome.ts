import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISpecialtyOutcome extends Document {
    _id: mongoose.Types.ObjectId
    specialty: mongoose.Types.ObjectId // Ref: 'Specialty'
    outcome: mongoose.Types.ObjectId // Ref: 'CareerOutcome'
    createdAt: Date
    updatedAt: Date
}

const SpecialtyOutcomeSchema = new Schema<ISpecialtyOutcome>(
    {
        specialty: {
            type: Schema.Types.ObjectId,
            ref: 'Specialty',
            required: true
        },
        outcome: {
            type: Schema.Types.ObjectId,
            ref: 'CareerOutcome',
            required: true
        }
    },
    {
        timestamps: true
    }
)

// Indexes
SpecialtyOutcomeSchema.index({ specialty: 1, outcome: 1 }, { unique: true })
SpecialtyOutcomeSchema.index({ specialty: 1 })
SpecialtyOutcomeSchema.index({ outcome: 1 })

// Prevent model recompilation in development
const SpecialtyOutcome: Model<ISpecialtyOutcome> = mongoose.models.SpecialtyOutcome || mongoose.model<ISpecialtyOutcome>('SpecialtyOutcome', SpecialtyOutcomeSchema)

export default SpecialtyOutcome
