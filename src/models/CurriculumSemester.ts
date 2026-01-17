import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICurriculumSemester extends Document {
    _id: mongoose.Types.ObjectId
    specialty: mongoose.Types.ObjectId // Ref: 'Specialty'
    semesterNumber: number // 1 à 10
    createdAt: Date
    updatedAt: Date
}

const CurriculumSemesterSchema = new Schema<ICurriculumSemester>(
    {
        specialty: {
            type: Schema.Types.ObjectId,
            ref: 'Specialty',
            required: true
        },
        semesterNumber: {
            type: Number,
            required: true,
            min: 1,
            max: 10
        }
    },
    {
        timestamps: true
    }
)

// Indexes
CurriculumSemesterSchema.index({ specialty: 1, semesterNumber: 1 }, { unique: true })
CurriculumSemesterSchema.index({ specialty: 1 })

// Prevent model recompilation in development
const CurriculumSemester: Model<ICurriculumSemester> = mongoose.models.CurriculumSemester || mongoose.model<ICurriculumSemester>('CurriculumSemester', CurriculumSemesterSchema)

export default CurriculumSemester
