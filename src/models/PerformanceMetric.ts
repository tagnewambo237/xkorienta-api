import mongoose, { Schema, Document, Model } from 'mongoose'

export enum ExamType {
    BTS = 'BTS',
    HND = 'HND',
    OTHER = 'Other'
}

export interface IPerformanceMetric extends Document {
    _id: mongoose.Types.ObjectId
    school: mongoose.Types.ObjectId // Ref: 'School'
    year: number // Année de référence
    examType?: ExamType // Type d'examen (BTS, HND, Other)
    successRate?: number // Taux de réussite (0-100)
    rankingPosition?: number // Position au classement
    officialSourceUrl?: string // URL source officielle
    createdAt: Date
    updatedAt: Date
}

const PerformanceMetricSchema = new Schema<IPerformanceMetric>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true
        },
        year: {
            type: Number,
            required: true
        },
        examType: {
            type: String,
            enum: Object.values(ExamType)
        },
        successRate: {
            type: Number,
            min: 0,
            max: 100
        },
        rankingPosition: {
            type: Number,
            min: 1
        },
        officialSourceUrl: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
)

// Indexes
PerformanceMetricSchema.index({ school: 1, year: 1, examType: 1 }, { unique: true })
PerformanceMetricSchema.index({ school: 1 })
PerformanceMetricSchema.index({ year: 1 })
PerformanceMetricSchema.index({ examType: 1 })
PerformanceMetricSchema.index({ successRate: 1 })
PerformanceMetricSchema.index({ rankingPosition: 1 })

// Prevent model recompilation in development
const PerformanceMetric: Model<IPerformanceMetric> = mongoose.models.PerformanceMetric || mongoose.model<IPerformanceMetric>('PerformanceMetric', PerformanceMetricSchema)

export default PerformanceMetric
