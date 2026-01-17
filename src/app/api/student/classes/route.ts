import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Class from "@/models/Class"
import { LeaderboardService } from "@/lib/services/LeaderboardService"
import mongoose from "mongoose"

/**
 * GET /api/student/classes
 * Get all classes the student is enrolled in
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()

        const studentId = session.user.id

        // Find all classes the student is enrolled in
        const classes = await Class.find({
            students: new mongoose.Types.ObjectId(studentId),
            isActive: true
        })
            .populate('school', 'name logoUrl')
            .populate('level', 'name')
            .populate('field', 'name')
            .populate('mainTeacher', 'name')
            .lean()

        // Get rankings for each class
        const classesWithRanks = await Promise.all(
            classes.map(async (cls) => {
                let myRank: number | undefined
                let myAverage: number | undefined

                try {
                    const leaderboard = await LeaderboardService.getClassLeaderboard(
                        cls._id.toString(),
                        studentId
                    )
                    if (leaderboard.currentUserPosition) {
                        myRank = leaderboard.currentUserPosition.rank
                    }
                    const myEntry = leaderboard.entries.find(e => e.isCurrentUser)
                    if (myEntry) {
                        myAverage = myEntry.score
                    }
                } catch (error) {
                    console.error('Error getting class leaderboard:', error)
                }

                return {
                    id: cls._id.toString(),
                    name: cls.name,
                    schoolName: (cls.school as any)?.name || 'École inconnue',
                    schoolLogo: (cls.school as any)?.logoUrl,
                    level: (cls.level as any)?.name || 'Niveau',
                    field: (cls.field as any)?.name,
                    mainTeacher: {
                        name: (cls.mainTeacher as any)?.name || 'Enseignant'
                    },
                    studentCount: cls.students?.length || 0,
                    academicYear: cls.academicYear,
                    myRank,
                    myAverage
                }
            })
        )

        return NextResponse.json({
            success: true,
            classes: classesWithRanks
        })

    } catch (error: any) {
        console.error("[Student Classes API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
