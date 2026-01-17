import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Syllabus, { SyllabusStatus } from "@/models/Syllabus"
import User from "@/models/User"
import { EventPublisher } from "@/lib/events/EventPublisher"
import { EventType } from "@/lib/events/types"
import mongoose from "mongoose"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { id } = await params
        const originalSyllabus = await Syllabus.findById(id).lean()

        if (!originalSyllabus) {
            return NextResponse.json({ success: false, message: "Original syllabus not found" }, { status: 404 })
        }

        // Deep copy logic
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, createdAt, updatedAt, __v, ...syllabusData } = originalSyllabus

        const newTitle = `Copie de ${syllabusData.title}`

        const newSyllabus = await Syllabus.create({
            ...syllabusData,
            title: newTitle,
            teacher: session.user.id, // Current user becomes the owner
            status: SyllabusStatus.DRAFT, // Reset status to draft
            version: 1,
            classes: [], // Do not copy class assignments
            createdAt: new Date(),
            updatedAt: new Date()
        })

        // Add to User's teachingSyllabuses
        await User.findByIdAndUpdate(session.user.id, {
            $addToSet: { teachingSyllabuses: newSyllabus._id }
        })

        // Initialize Event System (Ensure observers are registered)
        const { initEventSystem } = await import("@/lib/events")
        initEventSystem()

        // Publish Event
        const publisher = EventPublisher.getInstance()
        await publisher.publish({
            type: EventType.SYLLABUS_CREATED,
            timestamp: new Date(),
            userId: new mongoose.Types.ObjectId(session.user.id),
            data: {
                syllabusId: newSyllabus._id,
                teacherId: session.user.id,
                title: newSyllabus.title
            }
        })

        return NextResponse.json({ success: true, data: newSyllabus }, { status: 201 })

    } catch (error: any) {
        console.error("Clone Syllabus Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
