import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Class from "@/models/Class"
import Syllabus from "@/models/Syllabus"
import User from "@/models/User"

/**
 * GET /api/teachers/students
 * Get all students from teacher's classes (for messaging)
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Non autorisé" },
                { status: 401 }
            )
        }

        await connectDB()

        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const classId = searchParams.get('classId')

        // 1. Get classes where teacher is mainTeacher
        const mainTeacherClassIds = await Class.find({
            mainTeacher: session.user.id,
            isActive: true
        }).distinct('_id')

        // 2. Get classes from teacher's syllabuses
        const syllabuses = await Syllabus.find({
            teacher: session.user.id
        }).select('classes').lean()

        const syllabusClassIds = syllabuses.flatMap(s => s.classes || [])

        // 3. Combine and deduplicate
        const allClassIds = [...new Set([
            ...mainTeacherClassIds.map(id => id.toString()),
            ...syllabusClassIds.map(id => id.toString())
        ])]

        // Build query for classes
        const classQuery: any = {
            _id: { $in: allClassIds },
            isActive: true
        }

        if (classId) {
            classQuery._id = classId
        }

        // Fetch classes with students
        const classes = await Class.find(classQuery)
            .populate('students', 'name email image studentCode')
            .select('name students')
            .lean()

        // Build students list with class info
        const studentsMap = new Map<string, any>()

        for (const cls of classes) {
            const classStudents = (cls.students || []) as any[]
            for (const student of classStudents) {
                const studentId = student._id?.toString()
                if (!studentId) continue

                // Apply search filter
                if (search) {
                    const searchLower = search.toLowerCase()
                    const matchName = student.name?.toLowerCase().includes(searchLower)
                    const matchEmail = student.email?.toLowerCase().includes(searchLower)
                    const matchCode = student.studentCode?.toLowerCase().includes(searchLower)
                    if (!matchName && !matchEmail && !matchCode) continue
                }

                if (!studentsMap.has(studentId)) {
                    studentsMap.set(studentId, {
                        _id: studentId,
                        name: student.name,
                        email: student.email,
                        image: student.image,
                        studentCode: student.studentCode,
                        classes: []
                    })
                }

                studentsMap.get(studentId).classes.push({
                    _id: cls._id?.toString(),
                    name: cls.name
                })
            }
        }

        const students = Array.from(studentsMap.values())

        // Also get list of classes for filter dropdown
        const classOptions = classes.map(c => ({
            _id: c._id?.toString(),
            name: c.name,
            studentCount: ((c.students || []) as any[]).length
        }))

        return NextResponse.json({
            success: true,
            data: {
                students,
                classes: classOptions
            }
        })

    } catch (error: any) {
        console.error("[Get Teacher Students] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Erreur serveur" },
            { status: 500 }
        )
    }
}
