import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { ClassService } from "@/lib/services/ClassService"
import { UserRole } from "@/models/enums"
import mongoose from "mongoose"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Validate ID
        if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: "Invalid class ID" }, { status: 400 })
        }

        await connectDB()
        const classData = await ClassService.getClassById(id)

        if (!classData) {
            return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 })
        }

        // Access control: only teacher or admin/inspector
        if (session.user.role === UserRole.TEACHER && classData.mainTeacher._id.toString() !== session.user.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
        }

        return NextResponse.json({ success: true, data: classData })

    } catch (error: any) {
        console.error("Get Class Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id || session.user.role !== UserRole.TEACHER) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { id } = await params

        // Validate ID
        if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: "Invalid class ID" }, { status: 400 })
        }

        await connectDB()

        // Check ownership
        const existingClass = await ClassService.getClassById(id)
        if (!existingClass) {
            return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 })
        }

        if (existingClass.mainTeacher._id.toString() !== session.user.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
        }

        const updatedClass = await ClassService.updateClass(id, body)
        return NextResponse.json({ success: true, data: updatedClass })

    } catch (error: any) {
        console.error("Update Class Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id || session.user.role !== UserRole.TEACHER) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Validate ID
        if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: "Invalid class ID" }, { status: 400 })
        }

        await connectDB()

        // Check ownership
        const existingClass = await ClassService.getClassById(id)
        if (!existingClass) {
            return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 })
        }

        if (existingClass.mainTeacher._id.toString() !== session.user.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
        }

        await ClassService.deleteClass(id)
        return NextResponse.json({ success: true, message: "Class deleted successfully" })

    } catch (error: any) {
        console.error("Delete Class Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
