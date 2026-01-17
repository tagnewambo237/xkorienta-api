import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Attempt from "@/models/Attempt"
import Option from "@/models/Option"
import Response from "@/models/Response"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { attemptId, questionId, selectedOptionId, textResponse } = await req.json()

        const attempt = await Attempt.findById(attemptId)

        if (!attempt || attempt.userId.toString() !== session.user.id) {
            return NextResponse.json({ message: "Invalid attempt" }, { status: 403 })
        }

        if (attempt.status === "COMPLETED") {
            return NextResponse.json({ message: "Attempt already completed" }, { status: 400 })
        }

        let isCorrect = false
        // Check if the selected option is correct (if provided)
        if (selectedOptionId) {
            const option = await Option.findById(selectedOptionId)
            isCorrect = option?.isCorrect || false
            console.log(`[ANSWER] Question: ${questionId}, Option: ${selectedOptionId}, isCorrect: ${isCorrect}`)
        } else if (textResponse) {
            console.log(`[ANSWER] Question: ${questionId}, Text Response: ${textResponse}`)
            // Open questions are pending grading, so defaults to false or could be handled by AI later
            isCorrect = false
        }

        // Find existing response for this question in this attempt
        const existingResponse = await Response.findOne({
            attemptId,
            questionId,
        })

        // Update existing response or create new one
        if (existingResponse) {
            await Response.findByIdAndUpdate(existingResponse._id, {
                selectedOptionId: selectedOptionId || undefined,
                textResponse: textResponse || undefined,
                isCorrect
            })
            console.log(`[ANSWER] Updated existing response: ${existingResponse._id}`)
        } else {
            const newResponse = await Response.create({
                attemptId,
                questionId,
                selectedOptionId: selectedOptionId || undefined,
                textResponse: textResponse || undefined,
                isCorrect,
            })
            console.log(`[ANSWER] Created new response: ${newResponse._id}`)
        }

        return NextResponse.json({ message: "Saved" })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { message: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
