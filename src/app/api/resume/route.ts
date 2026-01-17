import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Attempt from "@/models/Attempt"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
    try {
        await connectDB()

        const { token } = await req.json()

        const attempt = await Attempt.findOne({ resumeToken: token })

        if (!attempt) {
            return NextResponse.json({ message: "Invalid token" }, { status: 404 })
        }

        // Check if user is logged in
        const session = await getServerSession(authOptions)

        // If not logged in, or logged in as wrong user, we can't just redirect to exam
        // because exam page checks session.
        // If we want to support "use friend's phone", we should prompt login.
        // But we can return the URL and let the frontend handle the redirect.
        // If they are not logged in, the middleware/page will redirect them to login.
        // But we need to make sure they log in as the RIGHT user.

        if (session && session.user.id !== attempt.userId.toString()) {
            return NextResponse.json({ message: "Logged in as wrong user. Please logout first." }, { status: 403 })
        }

        return NextResponse.json({ redirectUrl: `/student/exam/${attempt.examId.toString()}/take` })
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
