import mongoose, { Schema, Document, Model } from 'mongoose'

export enum TutelleType {
    STATE_UNIVERSITY = 'StateUniversity',
    MINISTRY = 'Ministry',
    AGREEMENT = 'Agreement',
    SEAT_AGREEMENT = 'SeatAgreement',
    OTHER = 'Other'
}

export interface IAcademicTutelle extends Document {
    _id: mongoose.Types.ObjectId
    school: mongoose.Types.ObjectId // Ref: 'School'
    tutelleName: string // Université de Douala, Yaoundé I, etc.
    tutelleType: TutelleType
    rank: number // 1-10
    documentsUrl?: string // URL vers les documents de tutelle
    createdAt: Date
    updatedAt: Date
}

const AcademicTutelleSchema = new Schema<IAcademicTutelle>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true
        },
        tutelleName: {
            type: String,
            required: true,
            trim: true
        },
        tutelleType: {
            type: String,
            enum: Object.values(TutelleType),
            required: true
        },
        rank: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
            default: 1
        },
        documentsUrl: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
)

// Indexes
AcademicTutelleSchema.index({ school: 1, tutelleName: 1 }, { unique: true })
AcademicTutelleSchema.index({ school: 1 })
AcademicTutelleSchema.index({ tutelleType: 1 })
AcademicTutelleSchema.index({ rank: 1 })

// Prevent model recompilation in development
const AcademicTutelle: Model<IAcademicTutelle> = mongoose.models.AcademicTutelle || mongoose.model<IAcademicTutelle>('AcademicTutelle', AcademicTutelleSchema)

export default AcademicTutelle
