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

        if (session.user.role !== UserRole.STUDENT) {
            return NextResponse.json({ success: false, message: "Forbidden: Not a student" }, { status: 403 })
        }

        await connectDB()
        const profile = await ProfileService.getLearnerProfile(session.user.id)

        if (!profile) {
            return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: profile
        })
    } catch (error) {
        console.error("[LearnerProfile API] Error:", error)
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        if (session.user.role !== UserRole.STUDENT) {
            return NextResponse.json({ success: false, message: "Forbidden: Not a student" }, { status: 403 })
        }

        const data = await req.json()

        // Security: Prevent updating restricted fields (like stats, gamification) via this endpoint
        // Only allow updating: currentLevel, currentField, cognitiveProfile, learnerType, preferredLearningMode
        const allowedFields = [
            'currentLevel',
            'currentField',
            'cognitiveProfile',
            'learnerType',
            'preferredLearningMode',
            'enrollmentDate',
            'expectedGraduationDate'
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
        const updatedProfile = await ProfileService.updateLearnerProfile(session.user.id, updateData)

        if (!updatedProfile) {
            return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            data: updatedProfile,
            message: "Profile updated successfully"
        })
    } catch (error) {
        console.error("[LearnerProfile API] Error:", error)
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
    }
}
