import mongoose, { Schema, Document, Model } from 'mongoose'

export enum DeliveryMode {
    ONSITE = 'Onsite',
    HYBRID = 'Hybrid',
    ONLINE = 'Online'
}

export enum ProgramStatus {
    OPEN = 'Open',
    CLOSED = 'Closed',
    LIMITED_SEATS = 'LimitedSeats'
}

export interface ISchoolProgram extends Document {
    _id: mongoose.Types.ObjectId
    school: mongoose.Types.ObjectId // Ref: 'School'
    specialty: mongoose.Types.ObjectId // Ref: 'Specialty'
    campusCity?: mongoose.Types.ObjectId // Ref: 'City' (si multi-campus)
    admissionRequirements?: string
    annualCostTotal: number // Coût annuel total
    costBreakdownJson?: Record<string, any> // Détail des coûts en JSON
    otherFeesJson?: Record<string, any> // Autres frais en JSON
    scholarshipAvailable: boolean // Bourses disponibles
    paymentFacilities: boolean // Facilités de paiement
    mandatoryInternship: boolean // Stage obligatoire
    internshipDurationMonths?: number // Durée du stage en mois
    deliveryMode: DeliveryMode
    programStatus: ProgramStatus
    createdAt: Date
    updatedAt: Date
}

const SchoolProgramSchema = new Schema<ISchoolProgram>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true
        },
        specialty: {
            type: Schema.Types.ObjectId,
            ref: 'Specialty',
            required: true
        },
        campusCity: {
            type: Schema.Types.ObjectId,
            ref: 'City'
        },
        admissionRequirements: {
            type: String,
            trim: true
        },
        annualCostTotal: {
            type: Number,
            required: true,
            min: 0
        },
        costBreakdownJson: {
            type: Schema.Types.Mixed
        },
        otherFeesJson: {
            type: Schema.Types.Mixed
        },
        scholarshipAvailable: {
            type: Boolean,
            required: true,
            default: false
        },
        paymentFacilities: {
            type: Boolean,
            required: true,
            default: false
        },
        mandatoryInternship: {
            type: Boolean,
            required: true,
            default: false
        },
        internshipDurationMonths: {
            type: Number,
            min: 0
        },
        deliveryMode: {
            type: String,
            enum: Object.values(DeliveryMode),
            required: true
        },
        programStatus: {
            type: String,
            enum: Object.values(ProgramStatus),
            required: true,
            default: ProgramStatus.OPEN
        }
    },
    {
        timestamps: true
    }
)

// Indexes
SchoolProgramSchema.index({ school: 1, specialty: 1 }, { unique: true })
SchoolProgramSchema.index({ school: 1 })
SchoolProgramSchema.index({ specialty: 1 })
SchoolProgramSchema.index({ campusCity: 1 })
SchoolProgramSchema.index({ programStatus: 1 })
SchoolProgramSchema.index({ deliveryMode: 1 })
SchoolProgramSchema.index({ scholarshipAvailable: 1 })
SchoolProgramSchema.index({ mandatoryInternship: 1 })

// Prevent model recompilation in development
const SchoolProgram: Model<ISchoolProgram> = mongoose.models.SchoolProgram || mongoose.model<ISchoolProgram>('SchoolProgram', SchoolProgramSchema)

export default SchoolProgram
