import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { AttemptService } from "@/lib/services/AttemptService"

/**
 * POST /api/attempts/[id]/resume
 * Reprend une tentative avec le token de reprise
 * Body: { resumeToken: string }
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()
        const { id } = await params

        const { resumeToken } = await req.json()

        if (!resumeToken) {
            return NextResponse.json(
                { success: false, message: "resumeToken is required" },
                { status: 400 }
            )
        }

        const result = await AttemptService.resumeAttempt(
            id,
            resumeToken,
            session.user.id
        )

        return NextResponse.json({
            success: true,
            data: result,
            message: "Attempt resumed successfully"
        })
    } catch (error: any) {
        console.error("[ResumeAttempt API] Error:", error)

        if (error.message.includes("not found")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 404 }
            )
        }

        if (error.message.includes("Invalid token") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("not in progress")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
