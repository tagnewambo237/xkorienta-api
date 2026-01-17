import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Syllabus, { SyllabusStatus } from "@/models/Syllabus"
import User from "@/models/User"
import { SyllabusBuilder } from "@/lib/patterns/SyllabusBuilder"

/**
 * GET /api/syllabuses
 * List syllabuses with filtering
 */
export async function GET(req: Request) {
    try {
        await connectDB()
        const { searchParams } = new URL(req.url)
        const session = await getServerSession(authOptions)

        const query: any = {}

        // If teacher, show their syllabuses + active ones
        // If student, show only active ones linked to their courses (future)
        // For now, let's show user's own syllabuses
        if (session?.user?.id) {
            query.teacher = session.user.id
        }

        if (searchParams.get('subject')) {
            query.subject = searchParams.get('subject')
        }

        if (searchParams.get('school')) {
            query.school = searchParams.get('school')
        }

        const syllabuses = await Syllabus.find(query)
            .populate('subject', 'name code')
            .populate('school', 'name')
            .sort({ updatedAt: -1 })
            .lean()

        return NextResponse.json({ success: true, data: syllabuses })
    } catch (error) {
        console.error("[Syllabuses API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/syllabuses
 * Create a new syllabus using the Builder pattern
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()
        const data = await req.json()

        // Validate required fields
        if (!data.title || !data.subject) {
            return NextResponse.json({ success: false, message: "Title and Subject are required" }, { status: 400 })
        }

        // Use Builder to construct the syllabus
        const builder = new SyllabusBuilder()
        builder.setBasicInfo(data.title, data.description)
        builder.setContext(session.user.id, data.subject, data.school)

        if (data.learningObjectives && Array.isArray(data.learningObjectives)) {
            data.learningObjectives.forEach((obj: string) => builder.addObjective(obj))
        }

        // If structure is provided directly (e.g. from UI editor), use it
        // Otherwise, we could use builder methods to construct it step by step
        // For this endpoint, we assume the UI sends a constructed structure or we initialize empty
        const syllabusData = builder.build()
        if (data.structure) {
            syllabusData.structure = data.structure
        }

        const syllabus = await Syllabus.create(syllabusData)

        // Add syllabus to user's profile
        await User.findByIdAndUpdate(session.user.id, {
            $addToSet: { teachingSyllabuses: syllabus._id }
        })

        return NextResponse.json({ success: true, data: syllabus }, { status: 201 })
    } catch (error) {
        console.error("[Syllabuses API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
