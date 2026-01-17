import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"

/**
 * GET /api/learning-units/[id]
 * Récupère une unité d'apprentissage par ID avec sa hiérarchie
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
                const { id } = await params
await connectDB()

        const unit = await EducationStructureService.getLearningUnitById(id)

        if (!unit) {
            return NextResponse.json(
                { success: false, message: "Learning unit not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: unit
        })
    } catch (error) {
        console.error("[LearningUnit API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/learning-units/[id]
 * Met à jour une unité d'apprentissage (Teacher/Admin)
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
        console.error("[LearningUnit API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/learning-units/[id]
 * Supprime (soft delete) une unité d'apprentissage (Teacher/Admin)
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
        console.error("[LearningUnit API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
