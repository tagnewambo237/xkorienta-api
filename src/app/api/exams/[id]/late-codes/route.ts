import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import LateCode from "@/models/LateCode"
import Exam from "@/models/Exam"

/**
 * GET /api/exams/[id]/late-codes
 * Récupère tous les codes d'accès tardifs pour un examen donné
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Non autorisé" },
                { status: 401 }
            )
        }

        await connectDB()
        const { id: examId } = await params

        // Verify exam ownership
        const exam = await Exam.findById(examId)
        if (!exam) {
            return NextResponse.json(
                { success: false, message: "Examen non trouvé" },
                { status: 404 }
            )
        }

        if (exam.createdById?.toString() !== session.user.id) {
            return NextResponse.json(
                { success: false, message: "Accès non autorisé" },
                { status: 403 }
            )
        }

        // Fetch late codes
        const lateCodes = await LateCode.find({ examId })
            .populate('assignedUserId', 'name email')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean()

        return NextResponse.json({
            success: true,
            data: lateCodes
        })

    } catch (error) {
        console.error("[GetLateCodes API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Erreur serveur" },
            { status: 500 }
        )
    }
}
