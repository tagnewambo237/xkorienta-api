import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { ExamServiceV2 } from "@/lib/services/ExamServiceV2"
import { ExamStatus } from "@/models/enums"

/**
 * GET /api/exams/v2/search
 * Recherche full-text dans les examens
 * Query params: q (query), status, subject, level
 */
export async function GET(req: Request) {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('q')

        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: "Search query is required" },
                { status: 400 }
            )
        }

        // Filtres additionnels optionnels
        const filters: any = {}
        if (searchParams.get('status')) {
            filters.status = searchParams.get('status') as ExamStatus
        }
        if (searchParams.get('subject')) {
            filters.subject = searchParams.get('subject')
        }
        if (searchParams.get('level')) {
            filters.level = searchParams.get('level')
        }

        const exams = await ExamServiceV2.searchExams(query, filters)

        return NextResponse.json({
            success: true,
            count: exams.length,
            data: exams,
            query: query,
            filters: filters
        })
    } catch (error) {
        console.error("[ExamsV2 Search API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
