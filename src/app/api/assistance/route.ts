import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import AssistanceRequest from "@/models/AssistanceRequest"
import Class from "@/models/Class"
import mongoose from "mongoose"

/**
 * POST /api/assistance
 * Create a new assistance request
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()

        const { type, title, description, priority, subjectId, conceptId, syllabusId } = await req.json()

        if (!type || !title || !description) {
            return NextResponse.json(
                { success: false, message: "type, title, and description are required" },
                { status: 400 }
            )
        }

        const studentId = session.user.id

        // Find student's class to associate the request
        const studentClass = await Class.findOne({
            students: new mongoose.Types.ObjectId(studentId),
            isActive: true
        }).lean()

        const request = await AssistanceRequest.create({
            student: new mongoose.Types.ObjectId(studentId),
            class: studentClass?._id,
            subject: subjectId ? new mongoose.Types.ObjectId(subjectId) : undefined,
            concept: conceptId ? new mongoose.Types.ObjectId(conceptId) : undefined,
            syllabus: syllabusId ? new mongoose.Types.ObjectId(syllabusId) : undefined,
            type,
            title,
            description,
            priority: priority || 'MEDIUM',
            status: 'PENDING'
        })

        return NextResponse.json({
            success: true,
            request: {
                id: request._id,
                type: request.type,
                title: request.title,
                status: request.status,
                createdAt: request.createdAt
            }
        })

    } catch (error: any) {
        console.error("[Assistance API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * GET /api/assistance
 * Get all assistance requests for the current student
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()

        const requests = await AssistanceRequest.find({
            student: new mongoose.Types.ObjectId(session.user.id)
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()

        return NextResponse.json({
            success: true,
            requests: requests.map(r => ({
                id: r._id.toString(),
                type: r.type,
                title: r.title,
                description: r.description,
                priority: r.priority,
                status: r.status,
                createdAt: r.createdAt,
                resolution: r.resolution
            }))
        })

    } catch (error: any) {
        console.error("[Assistance API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
