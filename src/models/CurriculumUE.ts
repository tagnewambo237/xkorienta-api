import mongoose, { Schema, Document, Model } from 'mongoose'

export enum UEType {
    FUNDAMENTAL = 'Fundamental',
    PROFESSIONAL = 'Professional',
    TRANSVERSAL = 'Transversal'
}

export interface ICurriculumUE extends Document {
    _id: mongoose.Types.ObjectId
    semester: mongoose.Types.ObjectId // Ref: 'CurriculumSemester'
    ueCode: string // Code de l'UE
    title: string
    ueType: UEType
    hoursTotal: number // Heures totales
    hoursCm: number // Heures de cours magistraux
    hoursTd: number // Heures de travaux dirigés
    hoursTp: number // Heures de travaux pratiques
    hoursTpe?: number // Heures de travaux personnels encadrés (optionnel)
    credits: number // Crédits ECTS
    createdAt: Date
    updatedAt: Date
}

const CurriculumUESchema = new Schema<ICurriculumUE>(
    {
        semester: {
            type: Schema.Types.ObjectId,
            ref: 'CurriculumSemester',
            required: true
        },
        ueCode: {
            type: String,
            required: true,
            trim: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        ueType: {
            type: String,
            enum: Object.values(UEType),
            required: true
        },
        hoursTotal: {
            type: Number,
            required: true,
            min: 0
        },
        hoursCm: {
            type: Number,
            required: true,
            min: 0
        },
        hoursTd: {
            type: Number,
            required: true,
            min: 0
        },
        hoursTp: {
            type: Number,
            required: true,
            min: 0
        },
        hoursTpe: {
            type: Number,
            min: 0
        },
        credits: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
)

// Indexes
CurriculumUESchema.index({ semester: 1, ueCode: 1 }, { unique: true })
CurriculumUESchema.index({ semester: 1 })
CurriculumUESchema.index({ ueType: 1 })

// Prevent model recompilation in development
const CurriculumUE: Model<ICurriculumUE> = mongoose.models.CurriculumUE || mongoose.model<ICurriculumUE>('CurriculumUE', CurriculumUESchema)

export default CurriculumUE
