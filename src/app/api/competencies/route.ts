import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"

/**
 * GET /api/competencies
 * Récupère les compétences avec filtres optionnels
 * Query params: type, isActive
 */
export async function GET(req: Request) {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const filters: any = {}

        if (searchParams.get('type')) {
            filters.type = searchParams.get('type')
        }
        if (searchParams.get('isActive')) {
            filters.isActive = searchParams.get('isActive') === 'true'
        }

        const competencies = await EducationStructureService.getCompetencies(filters)

        return NextResponse.json({
            success: true,
            count: competencies.length,
            data: competencies
        })
    } catch (error) {
        console.error("[Competencies API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/competencies
 * Crée une nouvelle compétence (Admin only)
 */
export async function POST(req: Request) {
    try {
        // TODO: Implémenter la création
        return NextResponse.json(
            { success: true, message: "Not implemented yet" },
            { status: 501 }
        )
    } catch (error) {
        console.error("[Competencies API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
