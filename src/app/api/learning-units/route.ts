import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"

/**
 * GET /api/learning-units
 * Récupère les unités d'apprentissage avec filtres optionnels
 * Query params: subject, parentUnit, unitType, isActive
 */
export async function GET(req: Request) {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const filters: any = {}

        if (searchParams.get('subject')) {
            filters.subject = searchParams.get('subject')
        }
        if (searchParams.has('parentUnit')) {
            const parentUnit = searchParams.get('parentUnit')
            filters.parentUnit = parentUnit === 'null' ? null : parentUnit
        }
        if (searchParams.get('unitType')) {
            filters.unitType = searchParams.get('unitType')
        }
        if (searchParams.get('isActive')) {
            filters.isActive = searchParams.get('isActive') === 'true'
        }

        const units = await EducationStructureService.getLearningUnits(filters)

        return NextResponse.json({
            success: true,
            count: units.length,
            data: units
        })
    } catch (error) {
        console.error("[LearningUnits API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/learning-units
 * Crée une nouvelle unité d'apprentissage (Teacher/Admin)
 */
export async function POST(req: Request) {
    try {
        // TODO: Implémenter la création
        return NextResponse.json(
            { success: true, message: "Not implemented yet" },
            { status: 501 }
        )
    } catch (error) {
        console.error("[LearningUnits API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
