import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { ExamServiceV2 } from "@/lib/services/ExamServiceV2"
import { EvaluationType, DifficultyLevel, PedagogicalObjective, ExamStatus } from "@/models/enums"

/**
 * GET /api/exams/v2/filter
 * Filtrage avancé avec critères multiples
 * Query params: targetLevels[], targetFields[], competencies[], subject, evaluationType, difficultyLevel, pedagogicalObjective, status
 */
export async function GET(req: Request) {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const criteria: any = {}

        // Récupérer les tableaux de paramètres
        const targetLevels = searchParams.getAll('targetLevels[]')
        if (targetLevels.length > 0) {
            criteria.targetLevels = targetLevels
        }

        const targetFields = searchParams.getAll('targetFields[]')
        if (targetFields.length > 0) {
            criteria.targetFields = targetFields
        }

        const competencies = searchParams.getAll('competencies[]')
        if (competencies.length > 0) {
            criteria.competencies = competencies
        }

        // Paramètres simples
        if (searchParams.get('subject')) {
            criteria.subject = searchParams.get('subject')
        }
        if (searchParams.get('evaluationType')) {
            criteria.evaluationType = searchParams.get('evaluationType') as EvaluationType
        }
        if (searchParams.get('difficultyLevel')) {
            criteria.difficultyLevel = searchParams.get('difficultyLevel') as DifficultyLevel
        }
        if (searchParams.get('pedagogicalObjective')) {
            criteria.pedagogicalObjective = searchParams.get('pedagogicalObjective') as PedagogicalObjective
        }
        if (searchParams.get('status')) {
            criteria.status = searchParams.get('status') as ExamStatus
        }

        const exams = await ExamServiceV2.filterExams(criteria)

        return NextResponse.json({
            success: true,
            count: exams.length,
            data: exams,
            filters: criteria
        })
    } catch (error) {
        console.error("[ExamsV2 Filter API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
