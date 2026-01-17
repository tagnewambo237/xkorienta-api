import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import LateCode from "@/models/LateCode"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { randomBytes } from "crypto"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "TEACHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { examId } = await req.json()

        const code = randomBytes(3).toString("hex").toUpperCase()

        const lateCode = await LateCode.create({
            code,
            examId,
            usagesRemaining: 1, // Default to 1 use
            // expiresAt: ... optional
        })

        return NextResponse.json({ code: lateCode }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
