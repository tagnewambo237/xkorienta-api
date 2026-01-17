import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { ProfileService } from "@/lib/services/ProfileService"
import { UserRole } from "@/models/enums"

/**
 * GET /api/profiles/stats
 * Récupère les statistiques détaillées du profil de l'utilisateur connecté
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        let stats = null

        if (session.user.role === UserRole.STUDENT) {
            stats = await ProfileService.getLearnerStats(session.user.id)
        } else {
            // Use real-time stats for detailed dashboard
            stats = await ProfileService.getRealTimeTeacherStats(session.user.id)
        }

        if (!stats) {
            return NextResponse.json({ message: "Profile not found" }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: stats
        })
    } catch (error) {
        console.error("[ProfileStats API] Error:", error)
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}
