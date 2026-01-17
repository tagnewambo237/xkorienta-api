/**
 * API Route: /api/predictions
 * Get predictions and analytics for students
 */

import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PredictionEngine } from "@/lib/services/PredictionEngine"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { searchParams } = new URL(req.url)
        const type = searchParams.get("type") // score, probability, rank, class, risk, weak, trend, benchmark
        const studentId = searchParams.get("studentId") || session.user?.id || ""
        const classId = searchParams.get("classId")
        const syllabusId = searchParams.get("syllabusId")
        const schoolId = searchParams.get("schoolId")

        // Students can only access their own predictions
        if (session.user?.role === 'STUDENT' && studentId !== session.user?.id) {
            return NextResponse.json({ message: "Access denied" }, { status: 403 })
        }

        let result: any

        switch (type) {
            case "score":
                result = await PredictionEngine.predictStudentScore(studentId, syllabusId || undefined)
                break

            case "probability":
                const passingScore = parseInt(searchParams.get("passingScore") || "50")
                result = await PredictionEngine.calculateSuccessProbability(studentId, passingScore)
                break

            case "rank":
                if (!classId) {
                    return NextResponse.json({ message: "classId required" }, { status: 400 })
                }
                const anonymize = searchParams.get("anonymize") !== "false"
                result = await PredictionEngine.getRankAmongPeers(studentId, classId, anonymize)
                break

            case "class":
                if (!classId) {
                    return NextResponse.json({ message: "classId required" }, { status: 400 })
                }
                // Only teachers/admins can access class-level predictions
                if (!session.user?.role || !['TEACHER', 'SCHOOL_ADMIN', 'INSPECTOR', 'PRINCIPAL'].includes(session.user.role)) {
                    return NextResponse.json({ message: "Access denied" }, { status: 403 })
                }
                result = await PredictionEngine.getClassPerformancePrediction(classId)
                break

            case "risk":
                // Only teachers/admins can access risk assessments
                if (!session.user?.role || !['TEACHER', 'SCHOOL_ADMIN', 'INSPECTOR', 'PRINCIPAL'].includes(session.user.role)) {
                    return NextResponse.json({ message: "Access denied" }, { status: 403 })
                }
                result = await PredictionEngine.detectDropoutRisk(studentId)
                break

            case "weak":
                result = await PredictionEngine.identifyWeakConcepts(studentId, syllabusId || undefined)
                break

            case "trend":
                const weeks = parseInt(searchParams.get("weeks") || "8")
                result = await PredictionEngine.getProgressionTrend(studentId, weeks)
                break

            case "benchmark":
                if (!schoolId) {
                    return NextResponse.json({ message: "schoolId required" }, { status: 400 })
                }
                // Only teachers/admins can access benchmarks
                if (!session.user?.role || !['TEACHER', 'SCHOOL_ADMIN', 'INSPECTOR', 'PRINCIPAL', 'RECTOR'].includes(session.user.role)) {
                    return NextResponse.json({ message: "Access denied" }, { status: 403 })
                }
                result = await PredictionEngine.getBenchmark(schoolId)
                break

            case "risk-students":
                if (!classId) {
                    return NextResponse.json({ message: "classId required" }, { status: 400 })
                }
                // Only teachers/admins can access
                if (!session.user?.role || !['TEACHER', 'SCHOOL_ADMIN', 'INSPECTOR', 'PRINCIPAL'].includes(session.user.role)) {
                    return NextResponse.json({ message: "Access denied" }, { status: 403 })
                }
                result = await PredictionEngine.getAtRiskStudentsForClass(classId)
                break

            default:
                // Return all available predictions for a student
                result = {
                    score: await PredictionEngine.predictStudentScore(studentId, syllabusId || undefined),
                    probability: await PredictionEngine.calculateSuccessProbability(studentId),
                    weakConcepts: await PredictionEngine.identifyWeakConcepts(studentId, syllabusId || undefined),
                    trend: await PredictionEngine.getProgressionTrend(studentId, 8)
                }
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("[Predictions API Error]", error)
        return NextResponse.json(
            { message: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
