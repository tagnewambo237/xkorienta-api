import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"

/**
 * GET /api/competencies/[id]
 * Récupère une compétence par ID
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
                const { id } = await params
await connectDB()

        const competency = await EducationStructureService.getCompetencyById(id)

        if (!competency) {
            return NextResponse.json(
                { success: false, message: "Competency not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: competency
        })
    } catch (error) {
        console.error("[Competency API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/competencies/[id]
 * Met à jour une compétence (Admin only)
 */
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // TODO: Implémenter la mise à jour
        return NextResponse.json(
            { success: true, message: "Not implemented yet" },
            { status: 501 }
        )
    } catch (error) {
        console.error("[Competency API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/competencies/[id]
 * Supprime (soft delete) une compétence (Admin only)
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // TODO: Implémenter la suppression
        return NextResponse.json(
            { success: true, message: "Not implemented yet" },
            { status: 501 }
        )
    } catch (error) {
        console.error("[Competency API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
