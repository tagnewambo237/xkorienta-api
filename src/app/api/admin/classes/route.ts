import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import School from "@/models/School"
import { ClassService } from "@/lib/services/ClassService"
import { UserRole, ClassValidationStatus } from "@/models/enums"

/**
 * GET /api/admin/classes
 * Get classes for school admin's school(s)
 * Supports filter by validationStatus query param
 */
export async function GET(req: NextRequest) {
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
                { success: false, message: "Only school administrators can access this resource" },
                { status: 403 }
            )
        }

        await connectDB()

        // Find schools where user is admin
        const adminSchools = await School.find({ admins: session.user.id }).select('_id name')

        if (adminSchools.length === 0) {
            return NextResponse.json(
                { success: false, message: "You are not an administrator of any school" },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(req.url)
        const statusFilter = searchParams.get("status") as ClassValidationStatus | null

        // Get classes from all schools this admin manages
        const allClasses = []
        for (const school of adminSchools) {
            const classes = await ClassService.getSchoolClassesWithValidation(
                school._id.toString(),
                statusFilter || undefined
            )
            allClasses.push(...classes.map((c: any) => ({
                ...c.toObject(),
                schoolName: school.name
            })))
        }

        return NextResponse.json({
            success: true,
            data: allClasses,
            schools: adminSchools
        })

    } catch (error: any) {
        console.error("Error fetching admin classes:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
