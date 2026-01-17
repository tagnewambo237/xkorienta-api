import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { LeaderboardService } from "@/lib/services/LeaderboardService"

/**
 * GET /api/student/rankings
 * Get summary of student's rankings across all leaderboards
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

        const rankings = await LeaderboardService.getStudentAllRankings(session.user.id)

        return NextResponse.json({
            success: true,
            rankings
        })

    } catch (error: any) {
        console.error("[Student Rankings API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
