import mongoose, { Schema, Document, Model } from 'mongoose'

export enum ConversationType {
    DIRECT = 'DIRECT',           // 1-to-1
    GROUP = 'GROUP',             // Multiple participants
    SUPPORT = 'SUPPORT',         // Student asking teacher
    CROSS_SCHOOL = 'CROSS_SCHOOL' // Teachers from different schools
}

export enum ConversationStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    CLOSED = 'CLOSED'
}

export interface IConversation extends Document {
    _id: mongoose.Types.ObjectId
    title?: string
    type: ConversationType
    participants: mongoose.Types.ObjectId[] // User refs
    createdBy: mongoose.Types.ObjectId
    
    // For cross-school or support context
    relatedSchools?: mongoose.Types.ObjectId[]
    relatedSubject?: mongoose.Types.ObjectId
    
    // Last message preview
    lastMessage?: {
        content: string
        senderId: mongoose.Types.ObjectId
        sentAt: Date
    }
    
    // For paid features later
    isPremium: boolean
    premiumFeatures?: {
        evaluationRequest: boolean
        priority: boolean
    }
    
    unreadCount: Map<string, number> // userId -> unread count
    
    status: ConversationStatus
    createdAt: Date
    updatedAt: Date
}

const ConversationSchema = new Schema<IConversation>(
    {
        title: {
            type: String,
            trim: true
        },
        type: {
            type: String,
            enum: Object.values(ConversationType),
            required: true,
            default: ConversationType.DIRECT
        },
        participants: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        relatedSchools: [{
            type: Schema.Types.ObjectId,
            ref: 'School'
        }],
        relatedSubject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject'
        },
        lastMessage: {
            content: String,
            senderId: { type: Schema.Types.ObjectId, ref: 'User' },
            sentAt: Date
        },
        isPremium: {
            type: Boolean,
            default: false
        },
        premiumFeatures: {
            evaluationRequest: { type: Boolean, default: false },
            priority: { type: Boolean, default: false }
        },
        unreadCount: {
            type: Map,
            of: Number,
            default: new Map()
        },
        status: {
            type: String,
            enum: Object.values(ConversationStatus),
            default: ConversationStatus.ACTIVE
        }
    },
    {
        timestamps: true
    }
)

// Indexes
ConversationSchema.index({ participants: 1 })
ConversationSchema.index({ createdBy: 1 })
ConversationSchema.index({ type: 1, status: 1 })
ConversationSchema.index({ updatedAt: -1 })

const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema)

export default Conversation
