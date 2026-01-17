import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { LateCodeService } from "@/lib/services/LateCodeService"

/**
 * POST /api/late-codes/validate
 * Valide et utilise un code d'accès tardif (Student)
 * Body: {
 *   code: string
 *   examId: string
 * }
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

        const { code, examId } = await req.json()

        if (!code || !examId) {
            return NextResponse.json(
                { success: false, message: "code and examId are required" },
                { status: 400 }
            )
        }

        // Normaliser le code (uppercase, trim)
        const normalizedCode = code.trim().toUpperCase()

        const result = await LateCodeService.validateLateCode(
            normalizedCode,
            examId,
            session.user.id
        )

        return NextResponse.json({
            success: true,
            data: {
                examId: result.lateCode.examId,
                expiresAt: result.lateCode.expiresAt,
                usagesRemaining: result.lateCode.usagesRemaining
            },
            message: result.message
        })
    } catch (error: any) {
        console.error("[ValidateLateCode API] Error:", error)

        if (error.message.includes("Invalid") ||
            error.message.includes("expired") ||
            error.message.includes("deactivated") ||
            error.message.includes("no remaining") ||
            error.message.includes("assigned to another") ||
            error.message.includes("already used")) {
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
