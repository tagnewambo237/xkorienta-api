import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { LateCodeService } from "@/lib/services/LateCodeService"

/**
 * POST /api/late-codes/generate
 * Génère un nouveau code d'accès tardif (Teacher only)
 * Body: {
 *   examId: string
 *   usagesRemaining?: number (default: 1)
 *   expiresAt?: Date (default: 7 days)
 *   assignedUserId?: string (optional, pour un étudiant spécifique)
 *   reason?: string
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

        const { examId, usagesRemaining, expiresAt, assignedUserId, reason } = await req.json()

        if (!examId) {
            return NextResponse.json(
                { success: false, message: "examId is required" },
                { status: 400 }
            )
        }

        // Valider expiresAt si fourni
        let expirationDate: Date | undefined
        if (expiresAt) {
            expirationDate = new Date(expiresAt)
            if (isNaN(expirationDate.getTime())) {
                return NextResponse.json(
                    { success: false, message: "Invalid expiresAt date" },
                    { status: 400 }
                )
            }
        }

        const lateCode = await LateCodeService.generateLateCode(
            examId,
            session.user.id,
            {
                usagesRemaining,
                expiresAt: expirationDate,
                assignedUserId,
                reason
            }
        )

        return NextResponse.json({
            success: true,
            data: {
                _id: (lateCode as any)._id,
                code: (lateCode as any).code,
                examId: (lateCode as any).examId,
                usagesRemaining: (lateCode as any).usagesRemaining,
                expiresAt: (lateCode as any).expiresAt,
                assignedUserId: (lateCode as any).assignedUserId,
                reason: (lateCode as any).reason
            },
            message: "Late code generated successfully"
        }, { status: 201 })
    } catch (error: any) {
        console.error("[GenerateLateCode API] Error:", error)

        if (error.message.includes("not found")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 404 }
            )
        }

        if (error.message.includes("Unauthorized")) {
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
