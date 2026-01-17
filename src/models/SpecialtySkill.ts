import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISpecialtySkill extends Document {
    _id: mongoose.Types.ObjectId
    specialty: mongoose.Types.ObjectId // Ref: 'Specialty'
    skill: mongoose.Types.ObjectId // Ref: 'Skill'
    createdAt: Date
    updatedAt: Date
}

const SpecialtySkillSchema = new Schema<ISpecialtySkill>(
    {
        specialty: {
            type: Schema.Types.ObjectId,
            ref: 'Specialty',
            required: true
        },
        skill: {
            type: Schema.Types.ObjectId,
            ref: 'Skill',
            required: true
        }
    },
    {
        timestamps: true
    }
)

// Indexes
SpecialtySkillSchema.index({ specialty: 1, skill: 1 }, { unique: true })
SpecialtySkillSchema.index({ specialty: 1 })
SpecialtySkillSchema.index({ skill: 1 })

// Prevent model recompilation in development
const SpecialtySkill: Model<ISpecialtySkill> = mongoose.models.SpecialtySkill || mongoose.model<ISpecialtySkill>('SpecialtySkill', SpecialtySkillSchema)

export default SpecialtySkill
