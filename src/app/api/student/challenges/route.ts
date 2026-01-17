import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { Challenge, ChallengeProgress, ChallengeStatus } from "@/models/Challenge"
import Class from "@/models/Class"
import mongoose from "mongoose"

/**
 * GET /api/student/challenges
 * Get all available and participated challenges for the student
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()

        const studentId = session.user.id

        // Find student's class
        const studentClass = await Class.findOne({
            students: new mongoose.Types.ObjectId(studentId),
            isActive: true
        }).lean()

        // Get all active and upcoming challenges accessible to the student
        const now = new Date()

        const challengeQuery: any = {
            status: { $in: [ChallengeStatus.ACTIVE, ChallengeStatus.UPCOMING] },
            $or: [
                { targetClass: { $exists: false } }, // Global challenges
                { targetClass: null },
            ]
        }

        // Add class-specific challenges if student is in a class
        if (studentClass) {
            challengeQuery.$or.push({ targetClass: studentClass._id })

            if ((studentClass as any).school) {
                challengeQuery.$or.push({ targetSchool: (studentClass as any).school })
            }
            if ((studentClass as any).level) {
                challengeQuery.$or.push({ targetLevel: (studentClass as any).level })
            }
        }

        const challenges = await Challenge.find(challengeQuery)
            .populate('rewards.badgeId', 'name icon')
            .sort({ startDate: -1 })
            .limit(20)
            .lean()

        // Get student's progress for each challenge
        const challengeIds = challenges.map(c => c._id)
        const progressRecords = await ChallengeProgress.find({
            userId: new mongoose.Types.ObjectId(studentId),
            challengeId: { $in: challengeIds }
        }).lean()

        const progressMap = new Map(
            progressRecords.map(p => [p.challengeId.toString(), p])
        )

        // Format challenges with progress
        const formattedChallenges = challenges.map(challenge => {
            const progress = progressMap.get(challenge._id.toString())

            return {
                id: challenge._id.toString(),
                title: challenge.title,
                description: challenge.description,
                type: challenge.type,
                status: challenge.status,
                startDate: challenge.startDate,
                endDate: challenge.endDate,
                goals: challenge.goals,
                rewards: {
                    xpBonus: challenge.rewards.xpBonus,
                    badgeName: (challenge.rewards.badgeId as any)?.name,
                    specialReward: challenge.rewards.specialReward
                },
                progress: progress ? {
                    progress: progress.progress,
                    overallProgress: progress.overallProgress,
                    completed: progress.completed
                } : null,
                participantsCount: challenge.participants.length,
                completedCount: challenge.completedBy.length
            }
        })

        return NextResponse.json({
            success: true,
            challenges: formattedChallenges
        })

    } catch (error: any) {
        console.error("[Student Challenges API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
