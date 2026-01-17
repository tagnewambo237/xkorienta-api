import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Class from "@/models/Class"
import Subject from "@/models/Subject"
import Syllabus from "@/models/Syllabus"
import ConceptEvaluation from "@/models/ConceptEvaluation"
import Attempt from "@/models/Attempt"
import Exam from "@/models/Exam"
import Concept from "@/models/Concept"
import { MASTERY_LEVEL_PERCENTAGES, MasteryLevel } from "@/lib/patterns/EvaluationStrategy"
import mongoose from "mongoose"

/**
 * GET /api/student/subjects
 * Get all subjects for the current student with their progress
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
        }).lean()

        if (classes.length === 0) {
            return NextResponse.json({
                success: true,
                subjects: []
            })
        }

        // Get all syllabi for these classes
        const classIds = classes.map(c => c._id)
        const syllabi = await Syllabus.find({
            classes: { $in: classIds }
        }).populate('subject').lean()

        // Get unique subjects
        const subjectMap = new Map<string, any>()

        for (const syllabus of syllabi) {
            const subject = syllabus.subject as any
            if (!subject) continue

            const subjectId = subject._id.toString()

            if (!subjectMap.has(subjectId)) {
                subjectMap.set(subjectId, {
                    id: subjectId,
                    name: subject.name,
                    description: subject.description,
                    syllabi: [],
                    concepts: []
                })
            }

            subjectMap.get(subjectId).syllabi.push(syllabus._id)
        }

        // For each subject, calculate progress
        const subjects = []

        for (const [subjectId, subjectData] of subjectMap) {
            // Get exams for this subject
            const exams = await Exam.find({
                subject: subjectId,
                isPublished: true
            }).lean()

            const examIds = exams.map(e => e._id)

            // Get student's attempts
            const attempts = await Attempt.find({
                userId: new mongoose.Types.ObjectId(studentId),
                examId: { $in: examIds },
                status: 'COMPLETED'
            }).lean()

            // Calculate average score
            let averageScore = 0
            if (attempts.length > 0) {
                averageScore = attempts.reduce((sum, a) =>
                    sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
                ) / attempts.length
            }

            // Calculate trend (compare recent to older)
            let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE'
            if (attempts.length >= 4) {
                const sorted = [...attempts].sort((a, b) =>
                    new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
                )
                const recent = sorted.slice(0, Math.floor(sorted.length / 2))
                const older = sorted.slice(Math.floor(sorted.length / 2))

                const recentAvg = recent.reduce((sum, a) =>
                    sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
                ) / recent.length
                const olderAvg = older.reduce((sum, a) =>
                    sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
                ) / older.length

                if (recentAvg > olderAvg + 5) trend = 'IMPROVING'
                else if (recentAvg < olderAvg - 5) trend = 'DECLINING'
            }

            // Get concepts from syllabi
            const concepts = await Concept.find({
                syllabus: { $in: subjectData.syllabi }
            }).lean()

            // Get concept evaluations
            const conceptEvals = await ConceptEvaluation.find({
                student: new mongoose.Types.ObjectId(studentId),
                syllabus: { $in: subjectData.syllabi }
            }).lean()

            const conceptsCount = concepts.length
            const conceptsMastered = conceptEvals.filter(e =>
                MASTERY_LEVEL_PERCENTAGES[e.level as MasteryLevel] >= 80
            ).length

            // Build concepts array for UI
            const conceptsWithEval = concepts.map(concept => {
                const evaluation = conceptEvals.find(e =>
                    e.concept.toString() === concept._id.toString()
                )
                return {
                    id: concept._id.toString(),
                    title: (concept as any).title || (concept as any).name,
                    description: (concept as any).description,
                    currentLevel: evaluation?.level,
                    lastEvaluated: evaluation?.evaluatedAt?.toISOString()
                }
            })

            subjects.push({
                id: subjectId,
                name: subjectData.name,
                description: subjectData.description,
                averageScore: Math.round(averageScore * 10) / 10,
                conceptsCount,
                conceptsMastered,
                trend,
                concepts: conceptsWithEval
            })
        }

        return NextResponse.json({
            success: true,
            subjects
        })

    } catch (error: any) {
        console.error("[Student Subjects API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
