import mongoose, { Schema, Document, Model } from 'mongoose'

export enum RelationshipType {
    INTERNSHIP = 'Internship',
    EMPLOYMENT = 'Employment',
    DOUBLE_DEGREE = 'DoubleDegree',
    CERTIFICATION = 'Certification',
    EXCHANGE = 'Exchange',
    SPONSORSHIP = 'Sponsorship',
    OTHER = 'Other'
}

export interface IInstitutionPartner extends Document {
    _id: mongoose.Types.ObjectId
    school: mongoose.Types.ObjectId // Ref: 'School'
    partner: mongoose.Types.ObjectId // Ref: 'Partner'
    relationshipType: RelationshipType
    startDate?: Date
    endDate?: Date
    proofUrl?: string // URL vers les documents de preuve
    notes?: string
    createdAt: Date
    updatedAt: Date
}

const InstitutionPartnerSchema = new Schema<IInstitutionPartner>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true
        },
        partner: {
            type: Schema.Types.ObjectId,
            ref: 'Partner',
            required: true
        },
        relationshipType: {
            type: String,
            enum: Object.values(RelationshipType),
            required: true
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        proofUrl: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
)

// Indexes
InstitutionPartnerSchema.index({ school: 1, partner: 1, relationshipType: 1 }, { unique: true })
InstitutionPartnerSchema.index({ school: 1 })
InstitutionPartnerSchema.index({ partner: 1 })
InstitutionPartnerSchema.index({ relationshipType: 1 })
InstitutionPartnerSchema.index({ startDate: 1, endDate: 1 })

// Prevent model recompilation in development
const InstitutionPartner: Model<IInstitutionPartner> = mongoose.models.InstitutionPartner || mongoose.model<IInstitutionPartner>('InstitutionPartner', InstitutionPartnerSchema)

export default InstitutionPartner
