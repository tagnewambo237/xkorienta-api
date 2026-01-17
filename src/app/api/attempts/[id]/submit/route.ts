import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { AttemptService } from "@/lib/services/AttemptService"

/**
 * POST /api/attempts/[id]/submit
 * Soumet une tentative avec les réponses et l'évalue
 * Body: { 
 *   responses: Array<{
 *     questionId: string
 *     selectedOptionId?: string
 *     textAnswer?: string
 *     timeSpent?: number
 *   }>
 * }
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

        const { responses } = await req.json()

        if (!responses || !Array.isArray(responses)) {
            return NextResponse.json(
                { success: false, message: "responses array is required" },
                { status: 400 }
            )
        }

        const result = await AttemptService.submitAttempt(
            id,
            session.user.id,
            responses
        )

        return NextResponse.json({
            success: true,
            data: {
                attempt: result.attempt,
                evaluation: result.evaluation,
                totalResponses: result.responses.length
            },
            message: "Attempt submitted and evaluated successfully"
        })
    } catch (error: any) {
        console.error("[SubmitAttempt API] Error:", error)

        if (error.message.includes("not found")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 404 }
            )
        }

        if (error.message.includes("Unauthorized") ||
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
