import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IEmploymentMetric extends Document {
    _id: mongoose.Types.ObjectId
    school: mongoose.Types.ObjectId // Ref: 'School'
    year: number // Année de référence
    employmentRate6m?: number // Taux d'emploi à 6 mois (0-100)
    employmentRate12m?: number // Taux d'emploi à 12 mois (0-100)
    topEmployersJson?: Record<string, any> // Top employeurs en JSON
    alumniTracking: boolean // Suivi des anciens étudiants
    createdAt: Date
    updatedAt: Date
}

const EmploymentMetricSchema = new Schema<IEmploymentMetric>(
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
        employmentRate6m: {
            type: Number,
            min: 0,
            max: 100
        },
        employmentRate12m: {
            type: Number,
            min: 0,
            max: 100
        },
        topEmployersJson: {
            type: Schema.Types.Mixed
        },
        alumniTracking: {
            type: Boolean,
            required: true,
            default: false
        }
    },
    {
        timestamps: true
    }
)

// Indexes
EmploymentMetricSchema.index({ school: 1, year: 1 }, { unique: true })
EmploymentMetricSchema.index({ school: 1 })
EmploymentMetricSchema.index({ year: 1 })
EmploymentMetricSchema.index({ employmentRate6m: 1 })
EmploymentMetricSchema.index({ employmentRate12m: 1 })
EmploymentMetricSchema.index({ alumniTracking: 1 })

// Prevent model recompilation in development
const EmploymentMetric: Model<IEmploymentMetric> = mongoose.models.EmploymentMetric || mongoose.model<IEmploymentMetric>('EmploymentMetric', EmploymentMetricSchema)

export default EmploymentMetric
