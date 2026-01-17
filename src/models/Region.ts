import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IRegion extends Document {
    _id: mongoose.Types.ObjectId
    country: mongoose.Types.ObjectId // Ref: 'Country'
    name: string
    createdAt: Date
    updatedAt: Date
}

const RegionSchema = new Schema<IRegion>(
    {
        country: {
            type: Schema.Types.ObjectId,
            ref: 'Country',
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
)

// Indexes
RegionSchema.index({ country: 1, name: 1 }, { unique: true }) // Une région est unique par pays
RegionSchema.index({ country: 1 })

// Prevent model recompilation in development
const Region: Model<IRegion> = mongoose.models.Region || mongoose.model<IRegion>('Region', RegionSchema)

export default Region
