import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { OnboardingController } from "@/lib/controllers/OnboardingController"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()

        const { role, details } = await req.json()

        return await OnboardingController.submit(role, details, session.user.email)

    } catch (error) {
        console.error("Onboarding Route Error:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}
