import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"

/**
 * GET /api/education-levels/[id]
 * Récupère un niveau d'éducation par ID avec sa hiérarchie
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
                const { id } = await params
await connectDB()

        const level = await EducationStructureService.getEducationLevelById(id)

        if (!level) {
            return NextResponse.json(
                { success: false, message: "Education level not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: level
        })
    } catch (error) {
        console.error("[EducationLevel API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/education-levels/[id]
 * Met à jour un niveau d'éducation (Admin only)
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
        console.error("[EducationLevel API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/education-levels/[id]
 * Supprime (soft delete) un niveau d'éducation (Admin only)
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // TODO: Implémenter la suppression (soft delete: isActive = false)
        return NextResponse.json(
            { success: true, message: "Not implemented yet" },
            { status: 501 }
        )
    } catch (error) {
        console.error("[EducationLevel API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
