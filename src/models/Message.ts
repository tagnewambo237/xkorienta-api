import mongoose, { Schema, Document, Model } from 'mongoose'

export enum MessageType {
    TEXT = 'TEXT',
    FILE = 'FILE',
    EVALUATION_REQUEST = 'EVALUATION_REQUEST',
    SYSTEM = 'SYSTEM'
}

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId
    conversationId: mongoose.Types.ObjectId
    senderId: mongoose.Types.ObjectId

    content: string
    type: MessageType

    // For file attachments
    attachments?: {
        url: string
        name: string
        mimeType: string
        size: number
    }[]

    // Read receipts
    readBy: mongoose.Types.ObjectId[]

    // For replies
    replyTo?: mongoose.Types.ObjectId

    createdAt: Date
    updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: Object.values(MessageType),
            default: MessageType.TEXT
        },
        attachments: [{
            url: String,
            name: String,
            mimeType: String,
            size: Number
        }],
        readBy: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: 'Message'
        }
    },
    {
        timestamps: true
    }
)

// Indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: -1 })
MessageSchema.index({ senderId: 1 })

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema)

export default Message
