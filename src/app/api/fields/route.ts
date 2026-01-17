import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"
import { Cycle } from "@/models/enums"

/**
 * GET /api/fields
 * Récupère les filières/séries avec filtres optionnels
 * Query params: level, cycle, category, isActive
 */
export async function GET(req: Request) {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const filters: any = {}

        if (searchParams.get('level')) {
            const levelParam = searchParams.get('level')
            if (levelParam?.includes(',')) {
                filters.level = levelParam.split(',')
            } else {
                filters.level = levelParam
            }
        }
        if (searchParams.get('cycle')) {
            filters.cycle = searchParams.get('cycle') as Cycle
        }
        if (searchParams.get('category')) {
            filters.category = searchParams.get('category')
        }
        if (searchParams.get('isActive')) {
            filters.isActive = searchParams.get('isActive') === 'true'
        }

        const fields = await EducationStructureService.getFields(filters)

        return NextResponse.json({
            success: true,
            count: fields.length,
            data: fields
        })
    } catch (error) {
        console.error("[Fields API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/fields
 * Crée une nouvelle filière (Admin only)
 */
export async function POST(req: Request) {
    try {
        // TODO: Implémenter la création
        return NextResponse.json(
            { success: true, message: "Not implemented yet" },
            { status: 501 }
        )
    } catch (error) {
        console.error("[Fields API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
