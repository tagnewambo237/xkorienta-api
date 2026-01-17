import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Class from "@/models/Class"
import { LeaderboardService, LeaderboardType, LeaderboardMetric } from "@/lib/services/LeaderboardService"
import mongoose from "mongoose"

/**
 * GET /api/student/leaderboard
 * Get leaderboard based on type (CLASS, SCHOOL, NATIONAL)
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') as LeaderboardType || 'CLASS'
        const metric = searchParams.get('metric') as LeaderboardMetric || LeaderboardMetric.XP

        const studentId = session.user.id

        // Find student's class
        const studentClass = await Class.findOne({
            students: new mongoose.Types.ObjectId(studentId),
            isActive: true
        }).populate('school').lean()

        if (!studentClass) {
            return NextResponse.json({
                success: true,
                leaderboard: null,
                message: "No class found for student"
            })
        }

        let leaderboard

        switch (type) {
            case LeaderboardType.CLASS:
                leaderboard = await LeaderboardService.getClassLeaderboard(
                    studentClass._id.toString(),
                    studentId,
                    metric
                )
                break

            case LeaderboardType.SCHOOL_LEVEL:
                leaderboard = await LeaderboardService.getSchoolLevelLeaderboard(
                    (studentClass.school as any)._id.toString(),
                    studentClass.level.toString(),
                    studentId,
                    metric
                )
                break

            case LeaderboardType.NATIONAL_LEVEL:
                leaderboard = await LeaderboardService.getNationalLevelLeaderboard(
                    studentClass.level.toString(),
                    studentId,
                    metric
                )
                break

            default:
                leaderboard = await LeaderboardService.getClassLeaderboard(
                    studentClass._id.toString(),
                    studentId
                )
        }

        return NextResponse.json({
            success: true,
            leaderboard
        })

    } catch (error: any) {
        console.error("[Student Leaderboard API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
