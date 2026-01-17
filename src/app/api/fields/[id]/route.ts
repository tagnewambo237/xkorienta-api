import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { EducationStructureService } from "@/lib/services/EducationStructureService"

/**
 * GET /api/fields/[id]
 * Récupère une filière par ID avec sa hiérarchie
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
                const { id } = await params
await connectDB()

        const field = await EducationStructureService.getFieldById(id)

        if (!field) {
            return NextResponse.json(
                { success: false, message: "Field not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: field
        })
    } catch (error) {
        console.error("[Field API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/fields/[id]
 * Met à jour une filière (Admin only)
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
        console.error("[Field API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/fields/[id]
 * Supprime (soft delete) une filière (Admin only)
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
        console.error("[Field API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
