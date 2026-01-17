import mongoose, { Schema, Document, Model } from 'mongoose'

export enum InternetQuality {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High'
}

export interface IInfrastructureMetric extends Document {
    _id: mongoose.Types.ObjectId
    school: mongoose.Types.ObjectId // Ref: 'School'
    labsAvailable: boolean // Laboratoires disponibles
    labQualityScore?: number // Score qualité labos (1-5)
    itEquipmentScore?: number // Score équipement IT (1-5)
    internetQuality?: InternetQuality // Qualité internet
    libraryScore?: number // Score bibliothèque (1-5)
    accessibilityDisability: boolean // Accessibilité handicap
    campusSecurityScore?: number // Score sécurité campus (1-5)
    createdAt: Date
    updatedAt: Date
}

const InfrastructureMetricSchema = new Schema<IInfrastructureMetric>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            unique: true // Une seule métrique d'infrastructure par école
        },
        labsAvailable: {
            type: Boolean,
            required: true,
            default: false
        },
        labQualityScore: {
            type: Number,
            min: 1,
            max: 5
        },
        itEquipmentScore: {
            type: Number,
            min: 1,
            max: 5
        },
        internetQuality: {
            type: String,
            enum: Object.values(InternetQuality)
        },
        libraryScore: {
            type: Number,
            min: 1,
            max: 5
        },
        accessibilityDisability: {
            type: Boolean,
            required: true,
            default: false
        },
        campusSecurityScore: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    {
        timestamps: true
    }
)

// Indexes
// L'index unique pour school est déjà créé automatiquement par unique: true dans la définition du schéma
InfrastructureMetricSchema.index({ labsAvailable: 1 })
InfrastructureMetricSchema.index({ internetQuality: 1 })
InfrastructureMetricSchema.index({ accessibilityDisability: 1 })

// Prevent model recompilation in development
const InfrastructureMetric: Model<IInfrastructureMetric> = mongoose.models.InfrastructureMetric || mongoose.model<IInfrastructureMetric>('InfrastructureMetric', InfrastructureMetricSchema)

export default InfrastructureMetric
