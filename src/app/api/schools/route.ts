import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import School, { SchoolType } from "@/models/School"
import User from "@/models/User"

/**
 * GET /api/schools
 * List schools with optional filtering
 */
export async function GET(req: Request) {
    try {
        await connectDB()
        const { searchParams } = new URL(req.url)

        const query: any = { isActive: true }

        if (searchParams.get('type')) {
            query.type = searchParams.get('type')
        }

        if (searchParams.get('search')) {
            query.name = { $regex: searchParams.get('search'), $options: 'i' }
        }

        const schools = await School.find(query)
            .populate('admins', 'name email')
            .sort({ name: 1 })
            .lean()

        return NextResponse.json({ success: true, data: schools })
    } catch (error) {
        console.error("[Schools API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/schools
 * Create a new school
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
        if (!data.name) {
            return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 })
        }

        const schools = await School.create([{
            name: data.name,
            type: data.type || SchoolType.OTHER,
            address: data.address,
            contactInfo: data.contactInfo,
            admins: [session.user.id], // Creator is admin by default
            teachers: [session.user.id] // Creator is teacher by default
        }] as any) as any
        const school = schools[0]

        // Add school to user's profile
        await User.findByIdAndUpdate(session.user.id, {
            $addToSet: { schools: school._id }
        })

        return NextResponse.json({ success: true, data: school }, { status: 201 })
    } catch (error) {
        console.error("[Schools API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
