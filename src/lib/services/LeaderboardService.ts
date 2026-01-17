/**
 * LeaderboardService
 * 
 * Gestion des classements multi-niveaux :
 * - Classement de classe
 * - Classement d'école par niveau
 * - Classement national/application par niveau
 * 
 * Optimisé avec cache pour les performances
 */

import mongoose from 'mongoose'
import * as ss from 'simple-statistics'

// ==========================================
// TYPES
// ==========================================

export interface LeaderboardEntry {
    rank: number
    studentId: string
    studentName: string
    avatarInitial: string
    score: number // Average percentage or XP
    trend: 'UP' | 'DOWN' | 'STABLE' | 'NEW'
    previousRank?: number
    badges?: number
    level?: number
    isCurrentUser?: boolean
}

export interface LeaderboardResult {
    type: LeaderboardType
    scope: {
        classId?: string
        className?: string
        schoolId?: string
        schoolName?: string
        levelId?: string
        levelName?: string
    }
    entries: LeaderboardEntry[]
    totalParticipants: number
    currentUserPosition?: {
        rank: number
        percentile: number
    }
    lastUpdated: Date
}

export enum LeaderboardType {
    CLASS = 'CLASS',
    SCHOOL_LEVEL = 'SCHOOL_LEVEL',  // Same level within a school
    NATIONAL_LEVEL = 'NATIONAL_LEVEL' // Same level across all schools
}

export enum LeaderboardMetric {
    XP = 'XP',
    EXAM_AVERAGE = 'EXAM_AVERAGE',
    EXAMS_COMPLETED = 'EXAMS_COMPLETED'
}

// ==========================================
// LEADERBOARD SERVICE
// ==========================================

export class LeaderboardService {

    /**
     * Get class leaderboard
     */
    static async getClassLeaderboard(
        classId: string,
        currentUserId?: string,
        metric: LeaderboardMetric = LeaderboardMetric.EXAM_AVERAGE
    ): Promise<LeaderboardResult> {
        const Class = mongoose.models.Class
        const User = mongoose.models.User
        const Attempt = mongoose.models.Attempt

        const classData = await Class.findById(classId).populate('students', 'name gamification').lean()
        if (!classData) throw new Error('Class not found')

        const students = (classData as any).students || []
        const entries: LeaderboardEntry[] = []

        for (const student of students) {
            let score = 0

            if (metric === LeaderboardMetric.XP) {
                score = student.gamification?.totalXP || 0
            } else if (metric === LeaderboardMetric.EXAM_AVERAGE) {
                const attempts = await Attempt.find({
                    userId: student._id,
                    status: 'COMPLETED'
                }).lean()

                if (attempts.length > 0) {
                    score = attempts.reduce((sum, a) =>
                        sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
                    ) / attempts.length
                }
            } else if (metric === LeaderboardMetric.EXAMS_COMPLETED) {
                score = await Attempt.countDocuments({ userId: student._id, status: 'COMPLETED' })
            }

            entries.push({
                rank: 0,
                studentId: student._id.toString(),
                studentName: student.name,
                avatarInitial: student.name?.[0]?.toUpperCase() || '?',
                score: Math.round(score * 10) / 10,
                trend: 'STABLE',
                level: student.gamification?.level || 1,
                badges: 0, // Could be fetched from UserBadge
                isCurrentUser: student._id.toString() === currentUserId
            })
        }

        // Sort by score descending
        entries.sort((a, b) => b.score - a.score)

        // Assign ranks
        entries.forEach((entry, index) => {
            entry.rank = index + 1
        })

        // Find current user position
        let currentUserPosition: LeaderboardResult['currentUserPosition']
        if (currentUserId) {
            const userEntry = entries.find(e => e.isCurrentUser)
            if (userEntry) {
                currentUserPosition = {
                    rank: userEntry.rank,
                    percentile: Math.round(((entries.length - userEntry.rank + 1) / entries.length) * 100)
                }
            }
        }

        return {
            type: LeaderboardType.CLASS,
            scope: {
                classId,
                className: (classData as any).name
            },
            entries: entries.slice(0, 50), // Limit to top 50
            totalParticipants: entries.length,
            currentUserPosition,
            lastUpdated: new Date()
        }
    }

    /**
     * Get school leaderboard for a specific level
     */
    static async getSchoolLevelLeaderboard(
        schoolId: string,
        levelId: string,
        currentUserId?: string,
        metric: LeaderboardMetric = LeaderboardMetric.EXAM_AVERAGE
    ): Promise<LeaderboardResult> {
        const School = mongoose.models.School
        const Class = mongoose.models.Class
        const User = mongoose.models.User
        const Attempt = mongoose.models.Attempt
        const EducationLevel = mongoose.models.EducationLevel

        const school = await School.findById(schoolId).lean()
        const level = await EducationLevel.findById(levelId).lean()

        if (!school) throw new Error('School not found')

        // Get all classes in this school at this level
        const classes = await Class.find({
            school: schoolId,
            level: levelId,
            isActive: true
        }).populate('students', 'name gamification').lean()

        // Collect all students from these classes
        const allStudents = new Map<string, any>()
        for (const cls of classes) {
            for (const student of (cls as any).students || []) {
                if (!allStudents.has(student._id.toString())) {
                    allStudents.set(student._id.toString(), {
                        ...student,
                        className: (cls as any).name
                    })
                }
            }
        }

        const entries: LeaderboardEntry[] = []

        for (const [studentId, student] of allStudents) {
            let score = 0

            if (metric === LeaderboardMetric.XP) {
                score = student.gamification?.totalXP || 0
            } else if (metric === LeaderboardMetric.EXAM_AVERAGE) {
                const attempts = await Attempt.find({
                    userId: studentId,
                    status: 'COMPLETED'
                }).lean()

                if (attempts.length > 0) {
                    score = attempts.reduce((sum, a) =>
                        sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
                    ) / attempts.length
                }
            }

            entries.push({
                rank: 0,
                studentId,
                studentName: student.name,
                avatarInitial: student.name?.[0]?.toUpperCase() || '?',
                score: Math.round(score * 10) / 10,
                trend: 'STABLE',
                level: student.gamification?.level || 1,
                isCurrentUser: studentId === currentUserId
            })
        }

        // Sort and rank
        entries.sort((a, b) => b.score - a.score)
        entries.forEach((entry, index) => {
            entry.rank = index + 1
        })

        let currentUserPosition: LeaderboardResult['currentUserPosition']
        if (currentUserId) {
            const userEntry = entries.find(e => e.isCurrentUser)
            if (userEntry) {
                currentUserPosition = {
                    rank: userEntry.rank,
                    percentile: Math.round(((entries.length - userEntry.rank + 1) / entries.length) * 100)
                }
            }
        }

        return {
            type: LeaderboardType.SCHOOL_LEVEL,
            scope: {
                schoolId,
                schoolName: (school as any).name,
                levelId,
                levelName: (level as any)?.name || 'Niveau'
            },
            entries: entries.slice(0, 100),
            totalParticipants: entries.length,
            currentUserPosition,
            lastUpdated: new Date()
        }
    }

    /**
     * Get national/app-wide leaderboard for a specific level
     */
    static async getNationalLevelLeaderboard(
        levelId: string,
        currentUserId?: string,
        metric: LeaderboardMetric = LeaderboardMetric.XP,
        limit: number = 100
    ): Promise<LeaderboardResult> {
        const Class = mongoose.models.Class
        const User = mongoose.models.User
        const EducationLevel = mongoose.models.EducationLevel

        const level = await EducationLevel.findById(levelId).lean()

        // Get all classes at this level
        const classes = await Class.find({
            level: levelId,
            isActive: true
        }).populate('students', 'name gamification').lean()

        // Collect unique students
        const allStudents = new Map<string, any>()
        for (const cls of classes) {
            for (const student of (cls as any).students || []) {
                if (!allStudents.has(student._id.toString())) {
                    allStudents.set(student._id.toString(), student)
                }
            }
        }

        const entries: LeaderboardEntry[] = []

        for (const [studentId, student] of allStudents) {
            const score = student.gamification?.totalXP || 0

            entries.push({
                rank: 0,
                studentId,
                studentName: student.name,
                avatarInitial: student.name?.[0]?.toUpperCase() || '?',
                score,
                trend: 'STABLE',
                level: student.gamification?.level || 1,
                isCurrentUser: studentId === currentUserId
            })
        }

        // Sort and rank
        entries.sort((a, b) => b.score - a.score)
        entries.forEach((entry, index) => {
            entry.rank = index + 1
        })

        let currentUserPosition: LeaderboardResult['currentUserPosition']
        if (currentUserId) {
            const userIndex = entries.findIndex(e => e.isCurrentUser)
            if (userIndex !== -1) {
                currentUserPosition = {
                    rank: userIndex + 1,
                    percentile: Math.round(((entries.length - userIndex) / entries.length) * 100)
                }
            }
        }

        return {
            type: LeaderboardType.NATIONAL_LEVEL,
            scope: {
                levelId,
                levelName: (level as any)?.name || 'Niveau'
            },
            entries: entries.slice(0, limit),
            totalParticipants: entries.length,
            currentUserPosition,
            lastUpdated: new Date()
        }
    }

    /**
     * Get student's position across all leaderboards
     */
    static async getStudentAllRankings(
        studentId: string
    ): Promise<{
        class?: LeaderboardResult['currentUserPosition'] & { className: string }
        school?: LeaderboardResult['currentUserPosition'] & { schoolName: string }
        national?: LeaderboardResult['currentUserPosition']
    }> {
        const User = mongoose.models.User
        const Class = mongoose.models.Class

        // Find student's class
        const studentClass = await Class.findOne({
            students: studentId,
            isActive: true
        }).populate('school').lean()

        if (!studentClass) {
            return {}
        }

        const result: any = {}

        // Class ranking
        try {
            const classLeaderboard = await this.getClassLeaderboard(
                (studentClass as any)._id.toString(),
                studentId
            )
            if (classLeaderboard.currentUserPosition) {
                result.class = {
                    ...classLeaderboard.currentUserPosition,
                    className: (studentClass as any).name,
                    totalStudents: classLeaderboard.totalParticipants
                }
            }
        } catch (e) {
            console.error('Error getting class ranking', e)
        }

        // School level ranking
        try {
            const schoolLeaderboard = await this.getSchoolLevelLeaderboard(
                (studentClass as any).school._id.toString(),
                (studentClass as any).level.toString(),
                studentId
            )
            if (schoolLeaderboard.currentUserPosition) {
                result.school = {
                    ...schoolLeaderboard.currentUserPosition,
                    schoolName: (studentClass as any).school.name,
                    totalStudents: schoolLeaderboard.totalParticipants
                }
            }
        } catch (e) {
            console.error('Error getting school ranking', e)
        }

        // National ranking
        try {
            const nationalLeaderboard = await this.getNationalLevelLeaderboard(
                (studentClass as any).level.toString(),
                studentId
            )
            if (nationalLeaderboard.currentUserPosition) {
                result.national = {
                    ...nationalLeaderboard.currentUserPosition,
                    totalStudents: nationalLeaderboard.totalParticipants
                }
            }
        } catch (e) {
            console.error('Error getting national ranking', e)
        }

        return result
    }
}
