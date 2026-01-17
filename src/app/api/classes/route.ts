import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { ClassService } from "@/lib/services/ClassService"
import { UserRole } from "@/models/enums"
// Import models to ensure they are registered
import "@/models/Class"
import "@/models/EducationLevel"
import "@/models/School"
import "@/models/Field"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        // If teacher, get their classes
        if (session.user.role === UserRole.TEACHER) {
            const classes = await ClassService.getTeacherClasses(session.user.id)
            return NextResponse.json({ success: true, data: classes })
        }

        // If admin/inspector, might want to see all classes or filter by school
        // For now, let's restrict to teacher's classes or return empty for others
        return NextResponse.json({ success: true, data: [] })

    } catch (error: any) {
        console.error("Get Classes Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id || session.user.role !== UserRole.TEACHER) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { name, school, level, academicYear, field, specialty } = body

        if (!name || !school || !level || !academicYear) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            )
        }

        await connectDB()

        const newClass = await ClassService.createClass(
            { name, school, level, academicYear, field, specialty },
            session.user.id
        )

        return NextResponse.json({ success: true, data: newClass }, { status: 201 })

    } catch (error: any) {
        console.error("Create Class Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
