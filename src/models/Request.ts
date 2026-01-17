import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Request Model
 * 
 * Represents assistance requests between students and teachers:
 * - Tutoring requests
 * - Supplementary evaluation requests
 * - General assistance requests
 */

export enum RequestType {
    TUTORING = 'TUTORING',           // Demande de tutorat
    EVALUATION = 'EVALUATION',       // Évaluation supplémentaire
    ASSISTANCE = 'ASSISTANCE',       // Aide générale
    REMEDIATION = 'REMEDIATION'      // Remédiation ciblée
}

export enum RequestStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    SCHEDULED = 'SCHEDULED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum RequestPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export interface IRequest extends Document {
    _id: mongoose.Types.ObjectId

    // Participants
    studentId: mongoose.Types.ObjectId
    teacherId: mongoose.Types.ObjectId

    // Request details
    type: RequestType
    subject?: mongoose.Types.ObjectId
    title: string
    message: string
    priority: RequestPriority

    // Response
    status: RequestStatus
    responseMessage?: string
    respondedAt?: Date

    // Scheduling (for tutoring/evaluation)
    scheduledAt?: Date
    scheduledDuration?: number // minutes
    meetingLink?: string

    // Related content
    relatedExam?: mongoose.Types.ObjectId
    relatedAttempt?: mongoose.Types.ObjectId
    relatedConcepts?: mongoose.Types.ObjectId[]

    // Completion
    completedAt?: Date
    feedback?: {
        rating: number // 1-5
        comment?: string
    }

    createdAt: Date
    updatedAt: Date
}

const RequestSchema = new Schema<IRequest>(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        teacherId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        type: {
            type: String,
            enum: Object.values(RequestType),
            required: true
        },
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject'
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        message: {
            type: String,
            required: true,
            maxlength: 2000
        },
        priority: {
            type: String,
            enum: Object.values(RequestPriority),
            default: RequestPriority.MEDIUM
        },
        status: {
            type: String,
            enum: Object.values(RequestStatus),
            default: RequestStatus.PENDING
        },
        responseMessage: {
            type: String,
            maxlength: 1000
        },
        respondedAt: {
            type: Date
        },
        scheduledAt: {
            type: Date
        },
        scheduledDuration: {
            type: Number,
            min: 15,
            max: 180
        },
        meetingLink: {
            type: String
        },
        relatedExam: {
            type: Schema.Types.ObjectId,
            ref: 'Exam'
        },
        relatedAttempt: {
            type: Schema.Types.ObjectId,
            ref: 'Attempt'
        },
        relatedConcepts: [{
            type: Schema.Types.ObjectId,
            ref: 'Concept'
        }],
        completedAt: {
            type: Date
        },
        feedback: {
            rating: {
                type: Number,
                min: 1,
                max: 5
            },
            comment: {
                type: String,
                maxlength: 500
            }
        }
    },
    {
        timestamps: true
    }
)

// Indexes
RequestSchema.index({ studentId: 1, status: 1 })
RequestSchema.index({ teacherId: 1, status: 1 })
RequestSchema.index({ type: 1, status: 1 })
RequestSchema.index({ createdAt: -1 })
RequestSchema.index({ priority: -1, createdAt: -1 })

const Request: Model<IRequest> = mongoose.models.Request || mongoose.model<IRequest>('Request', RequestSchema)

export default Request
