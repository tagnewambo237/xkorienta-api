import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { ExamWorkflowService } from "@/lib/services/ExamWorkflowService"
import { UserRole } from "@/models/enums"

/**
 * POST /api/exams/[id]/validate
 * Valide un examen (Inspector/Teacher avec permissions)
 * PENDING_VALIDATION → VALIDATED
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id || !session.user.role) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        // Vérifier que l'utilisateur a un rôle pédagogique
        const allowedRoles = [UserRole.TEACHER, UserRole.INSPECTOR]
        if (!allowedRoles.includes(session.user.role as UserRole)) {
            return NextResponse.json(
                { success: false, message: "Forbidden: Only teachers and inspectors can validate exams" },
                { status: 403 }
            )
        }

        await connectDB()
        const { id } = await params

        const exam = await ExamWorkflowService.validateExam(
            id,
            session.user.id,
            session.user.role as UserRole
        )

        return NextResponse.json({
            success: true,
            data: exam,
            message: "Exam validated successfully"
        })
    } catch (error: any) {
        console.error("[ValidateExam API] Error:", error)

        if (error.message.includes("not found")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 404 }
            )
        }

        if (error.message.includes("Unauthorized") || error.message.includes("Cannot validate")) {
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
