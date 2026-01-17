import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"
import { SubSystem, Cycle } from "@/models/enums"

/**
 * GET /api/education-levels
 * Récupère les niveaux d'éducation avec filtres optionnels
 * Query params: subSystem, cycle, isActive
 */
export async function GET(req: Request) {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const filters: any = {}

        if (searchParams.get('subSystem')) {
            filters.subSystem = searchParams.get('subSystem') as SubSystem
        }
        if (searchParams.get('cycle')) {
            filters.cycle = searchParams.get('cycle') as Cycle
        }
        if (searchParams.get('isActive')) {
            filters.isActive = searchParams.get('isActive') === 'true'
        }

        const levels = await EducationStructureService.getEducationLevels(filters)

        return NextResponse.json({
            success: true,
            count: levels.length,
            data: levels
        })
    } catch (error) {
        console.error("[EducationLevels API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/education-levels
 * Crée un nouveau niveau d'éducation (Admin only)
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        // TODO: Vérifier que l'utilisateur est admin
        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()
        const data = await req.json()

        // TODO: Validation avec Zod
        // TODO: Créer le niveau via le service

        return NextResponse.json(
            { success: true, message: "Not implemented yet" },
            { status: 501 }
        )
    } catch (error) {
        console.error("[EducationLevels API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
