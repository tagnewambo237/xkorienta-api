import mongoose, { Schema, Document, Model } from 'mongoose'

export enum ChallengeType {
    DAILY = 'DAILY',           // Daily challenges
    WEEKLY = 'WEEKLY',         // Weekly challenges
    SUBJECT = 'SUBJECT',       // Subject-specific challenges
    CLASS = 'CLASS',           // Class competition
    SCHOOL = 'SCHOOL',         // School-wide competition
    SPECIAL = 'SPECIAL'        // Special events
}

export enum ChallengeStatus {
    UPCOMING = 'UPCOMING',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

/**
 * Challenge definition
 */
export interface IChallenge extends Document {
    _id: mongoose.Types.ObjectId
    title: string
    description: string
    type: ChallengeType
    status: ChallengeStatus

    // Timing
    startDate: Date
    endDate: Date

    // Scope
    targetClass?: mongoose.Types.ObjectId
    targetSchool?: mongoose.Types.ObjectId
    targetSubject?: mongoose.Types.ObjectId
    targetLevel?: mongoose.Types.ObjectId

    // Goals
    goals: {
        type: 'EXAMS_COMPLETED' | 'SCORE_AVERAGE' | 'CONCEPTS_MASTERED' | 'STREAK_DAYS' | 'POINTS_EARNED'
        target: number
        description: string
    }[]

    // Rewards
    rewards: {
        xpBonus: number
        badgeId?: mongoose.Types.ObjectId
        specialReward?: string
    }

    // Tracking
    participants: mongoose.Types.ObjectId[]
    completedBy: mongoose.Types.ObjectId[]

    createdBy: mongoose.Types.ObjectId
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

/**
 * User's challenge progress
 */
export interface IChallengeProgress extends Document {
    _id: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    challengeId: mongoose.Types.ObjectId

    progress: {
        goalIndex: number
        current: number
        target: number
        completed: boolean
    }[]

    overallProgress: number // 0-100
    completed: boolean
    completedAt?: Date

    // Rewards claimed
    xpClaimed: number
    badgeClaimed: boolean

    startedAt: Date
    lastUpdated: Date
}

const ChallengeSchema = new Schema<IChallenge>(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: Object.values(ChallengeType),
            required: true
        },
        status: {
            type: String,
            enum: Object.values(ChallengeStatus),
            default: ChallengeStatus.UPCOMING
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        targetClass: {
            type: Schema.Types.ObjectId,
            ref: 'Class'
        },
        targetSchool: {
            type: Schema.Types.ObjectId,
            ref: 'School'
        },
        targetSubject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject'
        },
        targetLevel: {
            type: Schema.Types.ObjectId,
            ref: 'EducationLevel'
        },
        goals: [{
            type: {
                type: String,
                enum: ['EXAMS_COMPLETED', 'SCORE_AVERAGE', 'CONCEPTS_MASTERED', 'STREAK_DAYS', 'POINTS_EARNED'],
                required: true
            },
            target: {
                type: Number,
                required: true
            },
            description: {
                type: String,
                required: true
            }
        }],
        rewards: {
            xpBonus: {
                type: Number,
                default: 100
            },
            badgeId: {
                type: Schema.Types.ObjectId,
                ref: 'Badge'
            },
            specialReward: String
        },
        participants: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        completedBy: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        createdBy: {
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

const ChallengeProgressSchema = new Schema<IChallengeProgress>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        challengeId: {
            type: Schema.Types.ObjectId,
            ref: 'Challenge',
            required: true
        },
        progress: [{
            goalIndex: Number,
            current: { type: Number, default: 0 },
            target: Number,
            completed: { type: Boolean, default: false }
        }],
        overallProgress: {
            type: Number,
            default: 0
        },
        completed: {
            type: Boolean,
            default: false
        },
        completedAt: Date,
        xpClaimed: {
            type: Number,
            default: 0
        },
        badgeClaimed: {
            type: Boolean,
            default: false
        },
        startedAt: {
            type: Date,
            default: Date.now
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
)

ChallengeSchema.index({ status: 1, startDate: 1 })
ChallengeSchema.index({ targetClass: 1, status: 1 })
ChallengeSchema.index({ targetSchool: 1, status: 1 })
ChallengeProgressSchema.index({ userId: 1, challengeId: 1 }, { unique: true })
ChallengeProgressSchema.index({ challengeId: 1, completed: 1 })

export const Challenge: Model<IChallenge> = mongoose.models.Challenge || mongoose.model<IChallenge>('Challenge', ChallengeSchema)
export const ChallengeProgress: Model<IChallengeProgress> = mongoose.models.ChallengeProgress || mongoose.model<IChallengeProgress>('ChallengeProgress', ChallengeProgressSchema)

export default Challenge
