import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICity extends Document {
    _id: mongoose.Types.ObjectId
    department: mongoose.Types.ObjectId // Ref: 'Department'
    name: string
    lat?: number // Latitude
    lng?: number // Longitude
    costOfLivingIndex?: number // Indice du coût de la vie (optionnel)
    createdAt: Date
    updatedAt: Date
}

const CitySchema = new Schema<ICity>(
    {
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        lat: {
            type: Number,
            min: -90,
            max: 90
        },
        lng: {
            type: Number,
            min: -180,
            max: 180
        },
        costOfLivingIndex: {
            type: Number,
            min: 0
        }
    },
    {
        timestamps: true
    }
)

// Indexes
CitySchema.index({ department: 1, name: 1 }, { unique: true }) // Une ville est unique par département
CitySchema.index({ department: 1 })
CitySchema.index({ lat: 1, lng: 1 }) // Index géospatial pour les recherches de proximité

// Prevent model recompilation in development
const City: Model<ICity> = mongoose.models.City || mongoose.model<ICity>('City', CitySchema)

export default City
