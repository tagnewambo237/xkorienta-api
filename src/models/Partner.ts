import mongoose, { Schema, Document, Model } from 'mongoose'

export enum PartnerType {
    LOCAL = 'Local',
    INTERNATIONAL = 'International'
}

export interface IPartner extends Document {
    _id: mongoose.Types.ObjectId
    name: string
    country?: mongoose.Types.ObjectId // Ref: 'Country' (nullable)
    partnerType: PartnerType
    sector: string // Secteur d'activité
    website?: string
    createdAt: Date
    updatedAt: Date
}

const PartnerSchema = new Schema<IPartner>(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: 'Country'
        },
        partnerType: {
            type: String,
            enum: Object.values(PartnerType),
            required: true
        },
        sector: {
            type: String,
            required: true,
            trim: true
        },
        website: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
)

// Indexes
PartnerSchema.index({ name: 1 })
PartnerSchema.index({ country: 1 })
PartnerSchema.index({ partnerType: 1 })
PartnerSchema.index({ sector: 1 })

// Prevent model recompilation in development
const Partner: Model<IPartner> = mongoose.models.Partner || mongoose.model<IPartner>('Partner', PartnerSchema)

export default Partner
