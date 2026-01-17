import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Exam from "@/models/Exam"
import Question from "@/models/Question"
import Option from "@/models/Option"
import Attempt from "@/models/Attempt"
import Response from "@/models/Response"
import LateCode from "@/models/LateCode"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

const examSchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    startTime: z.string(),
    endTime: z.string(),
    duration: z.coerce.number().min(1),
    closeMode: z.enum(["STRICT", "PERMISSIVE"]),
    questions: z.array(
        z.object({
            text: z.string().min(1),
            imageUrl: z.string().optional().or(z.literal("")),
            points: z.coerce.number().min(1),
            options: z.array(
                z.object({
                    text: z.string().min(1),
                    isCorrect: z.boolean(),
                })
            ),
        })
    ),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "TEACHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { id } = await params
        const body = await req.json()
        const data = examSchema.parse(body)

        // Check ownership
        const existingExam = await Exam.findById(id)
        if (!existingExam || existingExam.createdById.toString() !== session.user.id) {
            return NextResponse.json({ message: "Not found or unauthorized" }, { status: 404 })
        }

        // Check for existing attempts
        const attemptsCount = await Attempt.countDocuments({ examId: id })

        if (attemptsCount > 0) {
            // Partial update (no questions)
            const updatedExam = await Exam.findByIdAndUpdate(
                id,
                {
                    title: data.title,
                    description: data.description,
                    startTime: new Date(data.startTime),
                    endTime: new Date(data.endTime),
                    duration: data.duration,
                    closeMode: data.closeMode,
                },
                { new: true }
            )
            return NextResponse.json({
                message: "Exam updated. Questions were not modified because students have already taken this exam.",
                exam: updatedExam,
                warning: true
            })
        }

        // Full update - delete old questions and create new ones
        const questions = await Question.find({ examId: id })
        const questionIds = questions.map(q => q._id)

        // Delete old options and questions
        await Option.deleteMany({ questionId: { $in: questionIds } })
        await Question.deleteMany({ examId: id })

        // Update exam
        const updatedExam = await Exam.findByIdAndUpdate(
            id,
            {
                title: data.title,
                description: data.description,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                duration: data.duration,
                closeMode: data.closeMode,
            },
            { new: true }
        )

        // Create new questions with options
        for (const questionData of data.questions) {
            const question = await Question.create({
                examId: id,
                text: questionData.text,
                imageUrl: questionData.imageUrl || undefined,
                points: questionData.points,
            })

            await Option.insertMany(
                questionData.options.map((o) => ({
                    questionId: question._id,
                    text: o.text,
                    isCorrect: o.isCorrect,
                }))
            )
        }

        return NextResponse.json({ message: "Exam updated successfully", exam: updatedExam })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { message: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "TEACHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { id } = await params

        // Check ownership
        const existingExam = await Exam.findById(id)
        if (!existingExam || existingExam.createdById.toString() !== session.user.id) {
            return NextResponse.json({ message: "Not found or unauthorized" }, { status: 404 })
        }

        // Manual cascade delete
        // 1. Delete Responses (via Attempts)
        const attempts = await Attempt.find({ examId: id }).select('_id')
        const attemptIds = attempts.map(a => a._id)

        if (attemptIds.length > 0) {
            await Response.deleteMany({ attemptId: { $in: attemptIds } })
            await Attempt.deleteMany({ examId: id })
        }

        // 2. Delete Options (via Questions)
        const questions = await Question.find({ examId: id }).select('_id')
        const questionIds = questions.map(q => q._id)

        if (questionIds.length > 0) {
            await Option.deleteMany({ questionId: { $in: questionIds } })
            await Question.deleteMany({ examId: id })
        }

        // 3. Delete Late Codes
        await LateCode.deleteMany({ examId: id })

        // 4. Delete Exam
        await Exam.findByIdAndDelete(id)

        return NextResponse.json({ message: "Exam deleted successfully" })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { message: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
