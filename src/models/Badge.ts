import mongoose, { Schema, Document, Model } from 'mongoose'

/**
 * Badge categories for different types of achievements
 */
export enum BadgeCategory {
    LEARNING = 'LEARNING',       // Related to learning progress
    PERFORMANCE = 'PERFORMANCE', // Related to exam scores
    CONSISTENCY = 'CONSISTENCY', // Related to regular activity
    SOCIAL = 'SOCIAL',           // Related to helping others
    MASTERY = 'MASTERY',         // Related to concept mastery
    CHALLENGE = 'CHALLENGE',     // Related to completing challenges
    SPECIAL = 'SPECIAL'          // Special/seasonal badges
}

export enum BadgeRarity {
    COMMON = 'COMMON',
    UNCOMMON = 'UNCOMMON',
    RARE = 'RARE',
    EPIC = 'EPIC',
    LEGENDARY = 'LEGENDARY'
}

/**
 * Badge definition (template)
 */
export interface IBadge extends Document {
    _id: mongoose.Types.ObjectId
    name: string
    description: string
    icon: string // Emoji or icon identifier
    category: BadgeCategory
    rarity: BadgeRarity
    pointsValue: number // XP awarded when earned

    // Unlock criteria
    criteria: {
        type: 'EXAM_SCORE' | 'EXAM_COUNT' | 'STREAK' | 'MASTERY' | 'FIRST' | 'HELP_GIVEN' | 'CHALLENGE' | 'SPECIAL'
        threshold: number // e.g., score >= 90, count >= 10
        subject?: mongoose.Types.ObjectId // Optional subject-specific
        description: string
    }

    // Visual
    colors: {
        primary: string
        secondary: string
    }

    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

/**
 * User's earned badges
 */
export interface IUserBadge extends Document {
    _id: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    badgeId: mongoose.Types.ObjectId
    earnedAt: Date
    earnedFromExam?: mongoose.Types.ObjectId
    earnedFromChallenge?: mongoose.Types.ObjectId
    pointsAwarded: number
}

const BadgeSchema = new Schema<IBadge>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            required: true,
            default: '🏆'
        },
        category: {
            type: String,
            enum: Object.values(BadgeCategory),
            required: true
        },
        rarity: {
            type: String,
            enum: Object.values(BadgeRarity),
            default: BadgeRarity.COMMON
        },
        pointsValue: {
            type: Number,
            default: 50
        },
        criteria: {
            type: {
                type: String,
                enum: ['EXAM_SCORE', 'EXAM_COUNT', 'STREAK', 'MASTERY', 'FIRST', 'HELP_GIVEN', 'CHALLENGE', 'SPECIAL'],
                required: true
            },
            threshold: {
                type: Number,
                required: true
            },
            subject: {
                type: Schema.Types.ObjectId,
                ref: 'Subject'
            },
            description: {
                type: String,
                required: true
            }
        },
        colors: {
            primary: {
                type: String,
                default: '#FFD700'
            },
            secondary: {
                type: String,
                default: '#FFA500'
            }
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

const UserBadgeSchema = new Schema<IUserBadge>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        badgeId: {
            type: Schema.Types.ObjectId,
            ref: 'Badge',
            required: true
        },
        earnedAt: {
            type: Date,
            default: Date.now
        },
        earnedFromExam: {
            type: Schema.Types.ObjectId,
            ref: 'Exam'
        },
        earnedFromChallenge: {
            type: Schema.Types.ObjectId,
            ref: 'Challenge'
        },
        pointsAwarded: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
)

// Unique constraint: user can earn each badge only once
UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true })

export const Badge: Model<IBadge> = mongoose.models.Badge || mongoose.model<IBadge>('Badge', BadgeSchema)
export const UserBadge: Model<IUserBadge> = mongoose.models.UserBadge || mongoose.model<IUserBadge>('UserBadge', UserBadgeSchema)

export default Badge
