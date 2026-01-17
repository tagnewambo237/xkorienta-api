import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Forum Model
 * 
 * Represents a discussion forum for a class or subject.
 * Forums enable group discussions between teachers and students.
 */

export enum ForumType {
    CLASS = 'CLASS',       // Forum linked to a specific class
    SUBJECT = 'SUBJECT',   // Forum linked to a subject across classes
    GENERAL = 'GENERAL'    // General discussion forum
}

export enum ForumStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    CLOSED = 'CLOSED'
}

export interface IForum extends Document {
    _id: mongoose.Types.ObjectId
    name: string
    description?: string
    type: ForumType

    // Relations
    relatedClass?: mongoose.Types.ObjectId
    relatedSubject?: mongoose.Types.ObjectId
    createdBy: mongoose.Types.ObjectId
    members: mongoose.Types.ObjectId[]

    // Stats
    postCount: number
    lastPostAt?: Date
    lastPostBy?: mongoose.Types.ObjectId

    // Settings
    isPrivate: boolean
    allowStudentPosts: boolean
    requireApproval: boolean

    status: ForumStatus
    createdAt: Date
    updatedAt: Date
}

const ForumSchema = new Schema<IForum>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500
        },
        type: {
            type: String,
            enum: Object.values(ForumType),
            required: true,
            default: ForumType.CLASS
        },
        relatedClass: {
            type: Schema.Types.ObjectId,
            ref: 'Class'
        },
        relatedSubject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject'
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        members: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        postCount: {
            type: Number,
            default: 0
        },
        lastPostAt: {
            type: Date
        },
        lastPostBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        isPrivate: {
            type: Boolean,
            default: false
        },
        allowStudentPosts: {
            type: Boolean,
            default: true
        },
        requireApproval: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            enum: Object.values(ForumStatus),
            default: ForumStatus.ACTIVE
        }
    },
    {
        timestamps: true
    }
)

// Indexes
ForumSchema.index({ createdBy: 1 })
ForumSchema.index({ relatedClass: 1 })
ForumSchema.index({ relatedSubject: 1 })
ForumSchema.index({ members: 1 })
ForumSchema.index({ type: 1, status: 1 })
ForumSchema.index({ lastPostAt: -1 })

const Forum: Model<IForum> = mongoose.models.Forum || mongoose.model<IForum>('Forum', ForumSchema)

export default Forum
