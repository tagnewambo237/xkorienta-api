import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { AttemptService } from "@/lib/services/AttemptService"

/**
 * POST /api/attempts/start
 * Démarre une nouvelle tentative d'examen
 * Body: { examId: string }
 * Returns: { attemptId, resumeToken, config, startedAt, duration }
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()

        const { examId } = await req.json()

        if (!examId) {
            return NextResponse.json(
                { success: false, message: "examId is required" },
                { status: 400 }
            )
        }

        const result = await AttemptService.startAttempt(examId, session.user.id)

        return NextResponse.json({
            success: true,
            data: result,
            message: "Attempt started successfully"
        }, { status: 201 })
    } catch (error: any) {
        console.error("[StartAttempt API] Error:", error)

        if (error.message.includes("not found")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 404 }
            )
        }

        if (error.message.includes("not published") ||
            error.message.includes("not started") ||
            error.message.includes("ended") ||
            error.message.includes("Maximum attempts") ||
            error.message.includes("wait")) {
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
