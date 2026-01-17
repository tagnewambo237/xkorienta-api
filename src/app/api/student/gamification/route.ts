import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { GamificationService } from "@/lib/services/GamificationService"

/**
 * GET /api/student/gamification
 * Get gamification stats for the current student
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

        const stats = await GamificationService.getUserStats(session.user.id)

        return NextResponse.json({
            success: true,
            stats
        })

    } catch (error: any) {
        console.error("[Student Gamification API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
