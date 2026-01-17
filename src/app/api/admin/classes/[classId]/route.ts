import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import School from "@/models/School"
import Class from "@/models/Class"
import { ClassService } from "@/lib/services/ClassService"
import { UserRole } from "@/models/enums"

interface RouteParams {
    params: Promise<{ classId: string }>
}

/**
 * PATCH /api/admin/classes/[classId]
 * Validate or reject a class
 * Body: { action: 'VALIDATE' | 'REJECT', reason?: string }
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        // Verify user is a school admin
        if (session.user.role !== UserRole.SCHOOL_ADMIN) {
            return NextResponse.json(
                { success: false, message: "Only school administrators can validate classes" },
                { status: 403 }
            )
        }

        await connectDB()

        const { classId } = await params
        const body = await req.json()
        const { action, reason } = body

        if (!action || !['VALIDATE', 'REJECT'].includes(action)) {
            return NextResponse.json(
                { success: false, message: "Invalid action. Must be 'VALIDATE' or 'REJECT'" },
                { status: 400 }
            )
        }

        if (action === 'REJECT' && !reason) {
            return NextResponse.json(
                { success: false, message: "Rejection reason is required" },
                { status: 400 }
            )
        }

        // Find the class and verify admin has permission
        const classData = await Class.findById(classId).populate('school')

        if (!classData) {
            return NextResponse.json(
                { success: false, message: "Class not found" },
                { status: 404 }
            )
        }

        // Verify admin is administrator of this class's school
        const school = await School.findOne({
            _id: classData.school._id,
            admins: session.user.id
        })

        if (!school) {
            return NextResponse.json(
                { success: false, message: "You are not authorized to manage this class" },
                { status: 403 }
            )
        }

        // Perform the action
        let updatedClass
        if (action === 'VALIDATE') {
            updatedClass = await ClassService.validateClass(classId, session.user.id)
        } else {
            updatedClass = await ClassService.rejectClass(classId, session.user.id, reason)
        }

        return NextResponse.json({
            success: true,
            message: action === 'VALIDATE' ? "Class validated successfully" : "Class rejected",
            data: updatedClass
        })

    } catch (error: any) {
        console.error("Error validating class:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
