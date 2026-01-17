import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { UserRole } from "@/models/enums"

/**
 * GET /api/teachers
 * Search for teachers by name or email
 * Used for inviting teachers to classes
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        await connectDB()

        const { searchParams } = new URL(req.url)
        const search = searchParams.get("search") || ""
        const schoolId = searchParams.get("schoolId")
        const limit = parseInt(searchParams.get("limit") || "20")

        // Build query for teachers
        const query: any = {
            role: UserRole.TEACHER,
            isActive: true
        }

        // Add search filter if provided
        if (search && search.length >= 2) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        }

        // Optionally filter by school
        if (schoolId) {
            query.schools = schoolId
        }

        const teachers = await User.find(query)
            .select("_id name email image schools isActive")
            .sort({ name: 1 })
            .limit(limit)

        return NextResponse.json({
            success: true,
            data: teachers
        })
    } catch (error) {
        console.error("Error searching teachers:", error)
        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/teachers
 * Create a new teacher account
 * Used for manual teacher creation
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        await connectDB()

        const body = await req.json()
        const { name, email, schoolId } = body

        if (!name || !email) {
            return NextResponse.json(
                { success: false, error: "Nom et email requis" },
                { status: 400 }
            )
        }

        // Check if user already exists
        let teacher = await User.findOne({ email: email.toLowerCase() })

        if (teacher) {
            // If teacher exists, just return them (they can be added to class)
            return NextResponse.json({
                success: true,
                data: teacher,
                message: "Enseignant existant trouvé"
            })
        }

        // Create new teacher account
        teacher = await User.create({
            name,
            email: email.toLowerCase(),
            role: UserRole.TEACHER,
            isActive: true,
            // Generate a temporary password (they'll need to reset it)
            password: Math.random().toString(36).slice(-12),
            schools: schoolId ? [schoolId] : []
        })

        return NextResponse.json({
            success: true,
            data: {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email
            },
            message: "Enseignant créé avec succès"
        }, { status: 201 })

    } catch (error: any) {
        console.error("Error creating teacher:", error)

        // Handle duplicate email error
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, error: "Cet email existe déjà" },
                { status: 409 }
            )
        }

        return NextResponse.json(
            { success: false, error: "Erreur serveur" },
            { status: 500 }
        )
    }
}
