import mongoose, { Schema, Document, Model } from 'mongoose'
import { ContributionType, AccessScope, ReportingAccess } from './enums'

export interface IPedagogicalProfile extends Document {
    user: mongoose.Types.ObjectId

    teachingSubjects: mongoose.Types.ObjectId[]
    interventionLevels: mongoose.Types.ObjectId[]
    interventionFields: mongoose.Types.ObjectId[]

    contributionTypes: ContributionType[]

    accessScope: AccessScope
    scopeDetails: {
        specificInstitution?: string
        specificSubjects: mongoose.Types.ObjectId[]
        specificLevels: mongoose.Types.ObjectId[]
        specificFields: mongoose.Types.ObjectId[]
    }

    reportingAccess: ReportingAccess

    stats: {
        totalExamsCreated: number
        totalExamsValidated: number
        totalStudentsSupervised: number
        averageStudentScore: number
        lastActivityDate?: Date
    }

    qualifications: {
        title: string
        issuedBy: string
        issuedDate: Date
        expiryDate?: Date
        certificateUrl?: string
    }[]

    createdAt: Date
    updatedAt: Date
}

const PedagogicalProfileSchema = new Schema<IPedagogicalProfile>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        teachingSubjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
        interventionLevels: [{ type: Schema.Types.ObjectId, ref: 'EducationLevel' }],
        interventionFields: [{ type: Schema.Types.ObjectId, ref: 'Field' }],

        contributionTypes: [{ type: String, enum: Object.values(ContributionType) }],

        accessScope: { type: String, enum: Object.values(AccessScope), default: AccessScope.LOCAL },
        scopeDetails: {
            specificInstitution: String,
            specificSubjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
            specificLevels: [{ type: Schema.Types.ObjectId, ref: 'EducationLevel' }],
            specificFields: [{ type: Schema.Types.ObjectId, ref: 'Field' }]
        },

        reportingAccess: { type: String, enum: Object.values(ReportingAccess), default: ReportingAccess.CLASS },

        stats: {
            totalExamsCreated: { type: Number, default: 0 },
            totalExamsValidated: { type: Number, default: 0 },
            totalStudentsSupervised: { type: Number, default: 0 },
            averageStudentScore: { type: Number, default: 0 },
            lastActivityDate: Date
        },

        qualifications: [{
            title: String,
            issuedBy: String,
            issuedDate: Date,
            expiryDate: Date,
            certificateUrl: String
        }]
    },
    { timestamps: true }
)

// Indexes
PedagogicalProfileSchema.index({ teachingSubjects: 1 })
PedagogicalProfileSchema.index({ accessScope: 1 })

const PedagogicalProfile: Model<IPedagogicalProfile> = mongoose.models.PedagogicalProfile || mongoose.model<IPedagogicalProfile>('PedagogicalProfile', PedagogicalProfileSchema)

export default PedagogicalProfile
