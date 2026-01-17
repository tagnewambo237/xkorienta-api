import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { ProfileService } from "@/lib/services/ProfileService"
import { UserRole } from "@/models/enums"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        // Check if user has a pedagogical role
        const pedagogicalRoles = [
            UserRole.TEACHER, UserRole.INSPECTOR, UserRole.SURVEILLANT,
            UserRole.PREFET, UserRole.PRINCIPAL, UserRole.DG_ISIMMA,
            UserRole.RECTOR, UserRole.DG_M4M, UserRole.TECH_SUPPORT
        ]

        if (!pedagogicalRoles.includes(session.user.role as UserRole)) {
            return NextResponse.json({ success: false, message: "Forbidden: Not a pedagogical user" }, { status: 403 })
        }

        await connectDB()
        const profile = await ProfileService.getPedagogicalProfile(session.user.id)

        if (!profile) {
            return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: profile
        })
    } catch (error) {
        console.error("[PedagogicalProfile API] Error:", error)
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        // Check role again
        const pedagogicalRoles = [
            UserRole.TEACHER, UserRole.INSPECTOR, UserRole.SURVEILLANT,
            UserRole.PREFET, UserRole.PRINCIPAL, UserRole.DG_ISIMMA,
            UserRole.RECTOR, UserRole.DG_M4M, UserRole.TECH_SUPPORT
        ]

        if (!pedagogicalRoles.includes(session.user.role as UserRole)) {
            return NextResponse.json({ success: false, message: "Forbidden: Not a pedagogical user" }, { status: 403 })
        }

        const data = await req.json()

        // Security: Prevent updating restricted fields
        // Only allow updating: teachingSubjects, interventionLevels, interventionFields, qualifications
        const allowedFields = [
            'teachingSubjects',
            'interventionLevels',
            'interventionFields',
            'qualifications'
        ]

        const updateData: any = {}
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updateData[field] = data[field]
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({
                success: false,
                message: "No valid fields to update"
            }, { status: 400 })
        }

        await connectDB()
        const updatedProfile = await ProfileService.updatePedagogicalProfile(session.user.id, updateData)

        if (!updatedProfile) {
            return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: updatedProfile,
            message: "Profile updated successfully"
        })
    } catch (error) {
        console.error("[PedagogicalProfile API] Error:", error)
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
    }
}
