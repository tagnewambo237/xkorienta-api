import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"

/**
 * GET /api/subjects/[id]
 * Récupère une matière par ID avec sa hiérarchie
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
                const { id } = await params
await connectDB()

        const subject = await EducationStructureService.getSubjectById(id)

        if (!subject) {
            return NextResponse.json(
                { success: false, message: "Subject not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: subject
        })
    } catch (error) {
        console.error("[Subject API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/subjects/[id]
 * Met à jour une matière (Admin only)
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
        console.error("[Subject API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/subjects/[id]
 * Supprime (soft delete) une matière (Admin only)
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
        console.error("[Subject API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
