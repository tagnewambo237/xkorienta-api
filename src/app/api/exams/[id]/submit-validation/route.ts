import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { ExamWorkflowService } from "@/lib/services/ExamWorkflowService"

/**
 * POST /api/exams/[id]/submit-validation
 * Soumet un examen pour validation
 * DRAFT → PENDING_VALIDATION
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

        const exam = await ExamWorkflowService.submitForValidation(
            id,
            session.user.id
        )

        return NextResponse.json({
            success: true,
            data: exam,
            message: "Exam submitted for validation successfully"
        })
    } catch (error: any) {
        console.error("[SubmitValidation API] Error:", error)

        if (error.message.includes("not found")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 404 }
            )
        }

        if (error.message.includes("Unauthorized") || error.message.includes("Cannot submit")) {
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
