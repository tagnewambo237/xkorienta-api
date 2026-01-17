import mongoose from 'mongoose'

/**
 * Types d'événements du système
 */
export enum EventType {
    // Événements d'examen
    EXAM_CREATED = 'EXAM_CREATED',
    EXAM_PUBLISHED = 'EXAM_PUBLISHED',
    EXAM_STARTED = 'EXAM_STARTED',
    EXAM_COMPLETED = 'EXAM_COMPLETED',
    EXAM_VALIDATED = 'EXAM_VALIDATED',
    EXAM_SUBMITTED_FOR_VALIDATION = 'EXAM_SUBMITTED_FOR_VALIDATION',
    EXAM_ARCHIVED = 'EXAM_ARCHIVED',
    EXAM_STATUS_CHANGED = 'EXAM_STATUS_CHANGED',

    // Événements de tentative
    ATTEMPT_STARTED = 'ATTEMPT_STARTED',
    ATTEMPT_SUBMITTED = 'ATTEMPT_SUBMITTED',
    ATTEMPT_GRADED = 'ATTEMPT_GRADED',

    // Événements de réponse
    QUESTION_ANSWERED = 'QUESTION_ANSWERED',

    // Événements de gamification
    BADGE_EARNED = 'BADGE_EARNED',
    LEVEL_UP = 'LEVEL_UP',
    XP_GAINED = 'XP_GAINED',
    STREAK_ACHIEVED = 'STREAK_ACHIEVED',

    // Événements de code tardif
    LATE_CODE_GENERATED = 'LATE_CODE_GENERATED',
    LATE_CODE_USED = 'LATE_CODE_USED',

    // Événements de syllabus
    SYLLABUS_CREATED = 'SYLLABUS_CREATED',
    SYLLABUS_UPDATED = 'SYLLABUS_UPDATED',

    // Événements utilisateur
    USER_REGISTERED = 'USER_REGISTERED',
    USER_PROFILE_COMPLETED = 'USER_PROFILE_COMPLETED',

    // Événements de demande d'assistance
    REQUEST_CREATED = 'REQUEST_CREATED',
    REQUEST_ACCEPTED = 'REQUEST_ACCEPTED',
    REQUEST_REJECTED = 'REQUEST_REJECTED',
    REQUEST_COMPLETED = 'REQUEST_COMPLETED',

    // Événements de forum
    FORUM_CREATED = 'FORUM_CREATED',
    FORUM_POST_CREATED = 'FORUM_POST_CREATED',
    FORUM_REPLY_CREATED = 'FORUM_REPLY_CREATED'
}

/**
 * Interface de base pour tous les événements
 */
export interface Event {
    type: EventType
    timestamp: Date
    userId?: mongoose.Types.ObjectId
    data: Record<string, any>
}

/**
 * Événements spécifiques
 */
export interface ExamCompletedEvent extends Event {
    type: EventType.EXAM_COMPLETED
    data: {
        examId: mongoose.Types.ObjectId
        attemptId: mongoose.Types.ObjectId
        score: number
        maxScore: number
        percentage: number
        passed: boolean
        timeSpent: number
    }
}

export interface BadgeEarnedEvent extends Event {
    type: EventType.BADGE_EARNED
    data: {
        badgeId: string
        badgeName: string
        reason: string
    }
}

export interface XPGainedEvent extends Event {
    type: EventType.XP_GAINED
    data: {
        amount: number
        source: string
        newTotal: number
    }
}

export interface LevelUpEvent extends Event {
    type: EventType.LEVEL_UP
    data: {
        oldLevel: number
        newLevel: number
        rewards: string[]
    }
}

export interface AttemptGradedEvent extends Event {
    type: EventType.ATTEMPT_GRADED
    data: {
        attemptId: mongoose.Types.ObjectId
        examId: mongoose.Types.ObjectId
        score: number
        percentage: number
        passed: boolean
    }
}
