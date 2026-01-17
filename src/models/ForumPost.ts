import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * ForumPost Model
 * 
 * Represents a post or reply in a forum discussion.
 * Supports nested replies, pinning, and reactions.
 */

export enum PostStatus {
    PUBLISHED = 'PUBLISHED',
    PENDING = 'PENDING',    // Awaiting approval
    HIDDEN = 'HIDDEN',
    DELETED = 'DELETED'
}

export interface IForumReply {
    _id: mongoose.Types.ObjectId
    authorId: mongoose.Types.ObjectId
    content: string
    createdAt: Date
    updatedAt?: Date
    likes: mongoose.Types.ObjectId[]
}

export interface IForumPost extends Document {
    _id: mongoose.Types.ObjectId
    forumId: mongoose.Types.ObjectId
    authorId: mongoose.Types.ObjectId

    // Content
    title?: string
    content: string
    attachments?: {
        type: 'image' | 'file' | 'link'
        url: string
        name?: string
    }[]

    // Features
    isPinned: boolean
    isAnnouncement: boolean

    // Replies (embedded for performance)
    replies: IForumReply[]
    replyCount: number

    // Engagement
    likes: mongoose.Types.ObjectId[]
    viewCount: number

    status: PostStatus
    createdAt: Date
    updatedAt: Date
}

const ForumReplySchema = new Schema<IForumReply>(
    {
        authorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: 5000
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date
        },
        likes: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    { _id: true }
)

const ForumPostSchema = new Schema<IForumPost>(
    {
        forumId: {
            type: Schema.Types.ObjectId,
            ref: 'Forum',
            required: true
        },
        authorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            trim: true,
            maxlength: 200
        },
        content: {
            type: String,
            required: true,
            maxlength: 10000
        },
        attachments: [{
            type: {
                type: String,
                enum: ['image', 'file', 'link']
            },
            url: String,
            name: String
        }],
        isPinned: {
            type: Boolean,
            default: false
        },
        isAnnouncement: {
            type: Boolean,
            default: false
        },
        replies: [ForumReplySchema],
        replyCount: {
            type: Number,
            default: 0
        },
        likes: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        viewCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: Object.values(PostStatus),
            default: PostStatus.PUBLISHED
        }
    },
    {
        timestamps: true
    }
)

// Indexes
ForumPostSchema.index({ forumId: 1, createdAt: -1 })
ForumPostSchema.index({ authorId: 1 })
ForumPostSchema.index({ forumId: 1, isPinned: -1, createdAt: -1 })
ForumPostSchema.index({ status: 1 })

const ForumPost: Model<IForumPost> = mongoose.models.ForumPost || mongoose.model<IForumPost>('ForumPost', ForumPostSchema)

export default ForumPost
