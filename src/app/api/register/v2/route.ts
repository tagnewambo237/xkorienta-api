import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import School from "@/models/School"
import LearnerProfile from "@/models/LearnerProfile"
import PedagogicalProfile from "@/models/PedagogicalProfile"
import { ClassService } from "@/lib/services/ClassService"
import { UserRole, SchoolStatus } from "@/models/enums"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
    try {
        await connectDB()
        const data = await req.json()

        const { name, email, password, role, schoolId, classId } = data

        // 1. Check if user exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "User already exists" },
                { status: 400 }
            )
        }

        // 2. Role Validation
        if (!role || ![UserRole.STUDENT, UserRole.TEACHER, UserRole.SCHOOL_ADMIN].includes(role)) {
            return NextResponse.json(
                { success: false, message: "Invalid role" },
                { status: 400 }
            )
        }

        // 3. School Validation for TEACHER and SCHOOL_ADMIN
        if (role === UserRole.TEACHER || role === UserRole.SCHOOL_ADMIN) {
            if (!schoolId) {
                return NextResponse.json(
                    { success: false, message: "School selection is required" },
                    { status: 400 }
                )
            }

            const school = await School.findById(schoolId)
            if (!school) {
                return NextResponse.json(
                    { success: false, message: "Selected school does not exist" },
                    { status: 400 }
                )
            }

            // For School Admin, school must be VALIDATED (partner)
            if (role === UserRole.SCHOOL_ADMIN && school.status !== SchoolStatus.VALIDATED) {
                return NextResponse.json(
                    { success: false, message: "Only validated partner schools can have administrators" },
                    { status: 400 }
                )
            }
        }

        // 4. Create User
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            isActive: true,
            schools: schoolId ? [schoolId] : []
        })

        // 5. Handle Role Specific Logic
        if (role === UserRole.STUDENT) {
            // Create LearnerProfile
            const profile = await LearnerProfile.create({
                user: user._id,
                currentLevel: data.levelId,
                currentField: data.fieldId,
            })

            // Link profile to user
            user.learnerProfile = profile._id

            // Enroll in class if selected
            if (classId) {
                await ClassService.enrollStudent(classId, user._id.toString())
            }

        } else if (role === UserRole.TEACHER) {
            // Create PedagogicalProfile
            const profile = await PedagogicalProfile.create({
                user: user._id,
                teachingSubjects: data.subjects || [],
            })

            // Link profile to user
            user.pedagogicalProfile = profile._id

            // Add teacher to school's applicants list (pending approval)
            await School.findByIdAndUpdate(schoolId, {
                $addToSet: { applicants: user._id }
            })

        } else if (role === UserRole.SCHOOL_ADMIN) {
            // Create PedagogicalProfile (shared with teachers)
            const profile = await PedagogicalProfile.create({
                user: user._id,
                teachingSubjects: [],
            })

            // Link profile to user
            user.pedagogicalProfile = profile._id

            // Add directly to school's admins array
            await School.findByIdAndUpdate(schoolId, {
                $addToSet: { admins: user._id }
            })
        }

        await user.save()

        return NextResponse.json({ success: true, message: "Registration successful" })
    } catch (error: any) {
        console.error("Registration Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
