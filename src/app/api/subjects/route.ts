import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"

/**
 * GET /api/subjects
 * Récupère les matières avec filtres optionnels
 * Query params: level, field, subjectType, isActive
 */
export async function GET(req: Request) {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const filters: any = {}

        if (searchParams.get('level')) {
            const levelParam = searchParams.get('level')!;
            filters.level = levelParam.includes(',') ? levelParam.split(',') : levelParam;
        }
        if (searchParams.get('field')) {
            filters.field = searchParams.get('field')
        }
        if (searchParams.get('subjectType')) {
            filters.subjectType = searchParams.get('subjectType')
        }
        if (searchParams.get('isActive')) {
            filters.isActive = searchParams.get('isActive') === 'true'
        }

        const subjects = await EducationStructureService.getSubjects(filters)

        return NextResponse.json({
            success: true,
            count: subjects.length,
            data: subjects
        })
    } catch (error) {
        console.error("[Subjects API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/subjects
 * Crée une nouvelle matière (Admin only)
 */
export async function POST(req: Request) {
    try {
        // TODO: Implémenter la création
        return NextResponse.json(
            { success: true, message: "Not implemented yet" },
            { status: 501 }
        )
    } catch (error) {
        console.error("[Subjects API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
