import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attempt, { AttemptStatus } from "@/models/Attempt"
import Exam from "@/models/Exam"
import User from "@/models/User"

/**
 * GET /api/exams/[id]/results
 * Récupère les résultats et statistiques d'un examen
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Non autorisé" },
                { status: 401 }
            )
        }

        await connectDB()
        const { id: examId } = await params

        // Verify the exam exists and user has access
        const exam = await Exam.findById(examId)
        if (!exam) {
            return NextResponse.json(
                { success: false, message: "Examen non trouvé" },
                { status: 404 }
            )
        }

        // Check ownership (teacher who created it)
        if (exam.createdById?.toString() !== session.user.id) {
            return NextResponse.json(
                { success: false, message: "Accès non autorisé" },
                { status: 403 }
            )
        }

        // Fetch all attempts for this exam with user info
        const attempts = await Attempt.find({ examId })
            .populate('userId', 'name email image studentCode')
            .sort({ submittedAt: -1 })
            .lean()

        // Calculate statistics
        const completedAttempts = attempts.filter(a => a.status === AttemptStatus.COMPLETED)
        const scores = completedAttempts.map(a => a.percentage || 0)

        const stats = {
            totalAttempts: attempts.length,
            completedAttempts: completedAttempts.length,
            inProgressAttempts: attempts.filter(a => a.status === AttemptStatus.STARTED).length,
            averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
            highestScore: scores.length > 0 ? Math.max(...scores) : 0,
            lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
            passRate: completedAttempts.length > 0
                ? Math.round((completedAttempts.filter(a => a.passed).length / completedAttempts.length) * 100)
                : 0,
            averageTimeSpent: completedAttempts.length > 0
                ? Math.round(completedAttempts.reduce((acc, a) => acc + (a.timeSpent || 0), 0) / completedAttempts.length)
                : 0
        }

        // Calculate score distribution
        const distribution = [
            { range: '0-20', count: 0 },
            { range: '21-40', count: 0 },
            { range: '41-60', count: 0 },
            { range: '61-80', count: 0 },
            { range: '81-100', count: 0 },
        ]

        scores.forEach(score => {
            if (score <= 20) distribution[0].count++
            else if (score <= 40) distribution[1].count++
            else if (score <= 60) distribution[2].count++
            else if (score <= 80) distribution[3].count++
            else distribution[4].count++
        })

        // Format attempts for frontend
        const formattedAttempts = attempts.map(attempt => {
            const user = attempt.userId as any
            return {
                id: attempt._id,

                studentId: user?._id,
                studentName: user?.name || 'Étudiant inconnu',
                studentEmail: user?.email,
                studentCode: user?.studentCode,
                studentImage: user?.image,

                status: attempt.status,
                score: attempt.score || 0,
                maxScore: attempt.maxScore || 0,
                percentage: attempt.percentage || 0,
                passed: attempt.passed,

                timeSpent: attempt.timeSpent || 0,
                timeSpentFormatted: attempt.timeSpent ? `${attempt.timeSpent}m` : '-',

                startedAt: attempt.startedAt,
                submittedAt: attempt.submittedAt,

                // Anti-cheat info
                tabSwitchCount: attempt.tabSwitchCount || 0,
                suspiciousActivity: attempt.suspiciousActivityDetected
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                exam: {
                    id: exam._id,
                    title: exam.title,
                    duration: exam.duration,
                    passingScore: exam.config?.passingScore || 50
                },
                stats,
                distribution,
                attempts: formattedAttempts
            }
        })

    } catch (error) {
        console.error("[Exam Results API] Error:", error)
        return NextResponse.json(
            { success: false, message: "Erreur serveur" },
            { status: 500 }
        )
    }
}
