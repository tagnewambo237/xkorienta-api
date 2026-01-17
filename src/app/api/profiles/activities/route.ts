import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { ProfileService } from "@/lib/services/ProfileService"

/**
 * GET /api/profiles/activities
 * Retrieves recent activities for the current user
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const activities = await ProfileService.getRecentActivities(session.user.id)

        return NextResponse.json({
            success: true,
            data: activities
        })
    } catch (error) {
        console.error("[ProfileActivities API] Error:", error)
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}
