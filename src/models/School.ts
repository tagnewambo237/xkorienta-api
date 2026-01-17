import mongoose, { Schema, Document, Model } from 'mongoose'
import { SchoolStatus } from './enums'

export enum SchoolType {
    PRIMARY = 'PRIMARY',
    SECONDARY = 'SECONDARY',
    HIGHER_ED = 'HIGHER_ED',
    TRAINING_CENTER = 'TRAINING_CENTER',
    OTHER = 'OTHER'
}

export interface ISchool extends Document {
    _id: mongoose.Types.ObjectId
    name: string
    type: SchoolType
    address?: string
    contactInfo?: {
        email?: string
        phone?: string
        website?: string
    }

    // Relationships
    teachers: mongoose.Types.ObjectId[] // Refs to User
    admins: mongoose.Types.ObjectId[] // Refs to User
    applicants: mongoose.Types.ObjectId[] // Refs to User

    // Metadata
    logoUrl?: string
    certificationBadge?: string // URL or Badge ID
    status: SchoolStatus
    owner: mongoose.Types.ObjectId // Ref to User (Teacher who created it)
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const SchoolSchema = new Schema<ISchool>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        type: {
            type: String,
            enum: Object.values(SchoolType),
            default: SchoolType.OTHER
        },
        address: {
            type: String,
            trim: true
        },
        contactInfo: {
            email: String,
            phone: String,
            website: String
        },
        teachers: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        admins: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        applicants: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        logoUrl: String,
        certificationBadge: String,
        status: {
            type: String,
            enum: Object.values(SchoolStatus),
            default: SchoolStatus.PENDING
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)

// Indexes
SchoolSchema.index({ teachers: 1 })
SchoolSchema.index({ admins: 1 })
SchoolSchema.index({ status: 1 })
SchoolSchema.index({ owner: 1 })

const School: Model<ISchool> = mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema)

export default School
