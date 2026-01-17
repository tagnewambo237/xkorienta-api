import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDepartment extends Document {
    _id: mongoose.Types.ObjectId
    region: mongoose.Types.ObjectId // Ref: 'Region'
    name: string
    createdAt: Date
    updatedAt: Date
}

const DepartmentSchema = new Schema<IDepartment>(
    {
        region: {
            type: Schema.Types.ObjectId,
            ref: 'Region',
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
DepartmentSchema.index({ region: 1, name: 1 }, { unique: true }) // Un département est unique par région
DepartmentSchema.index({ region: 1 })

// Prevent model recompilation in development
const Department: Model<IDepartment> = mongoose.models.Department || mongoose.model<IDepartment>('Department', DepartmentSchema)

export default Department
