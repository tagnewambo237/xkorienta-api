/**
 * API Route: /api/insights
 * Get AI-powered insights and recommendations for students
 */

import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AIInsightsService } from "@/lib/services/AIInsightsService"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { searchParams } = new URL(req.url)
        const type = searchParams.get("type") // insights, recommendations, coaching, profile, anomalies, forecast, plan
        const studentId = searchParams.get("studentId") || session.user?.id || ""

        // Students can only access their own insights
        if (session.user?.role === 'STUDENT' && studentId !== session.user?.id) {
            return NextResponse.json({ message: "Access denied" }, { status: 403 })
        }

        let result: any

        switch (type) {
            case "insights":
                result = await AIInsightsService.generatePersonalizedInsights(studentId)
                break

            case "recommendations":
                const limit = parseInt(searchParams.get("limit") || "5")
                result = await AIInsightsService.generateLearningRecommendations(studentId, limit)
                break

            case "coaching":
                result = await AIInsightsService.generateCoachingMessage(studentId)
                break

            case "profile":
                result = await AIInsightsService.buildLearningProfile(studentId)
                break

            case "anomalies":
                // Only teachers/admins can access anomaly detection
                if (!session.user?.role || !['TEACHER', 'SCHOOL_ADMIN', 'INSPECTOR', 'PRINCIPAL'].includes(session.user.role)) {
                    return NextResponse.json({ message: "Access denied" }, { status: 403 })
                }
                result = await AIInsightsService.detectAnomalies(studentId)
                break

            case "forecast":
                result = await AIInsightsService.generatePerformanceForecast(studentId)
                break

            case "plan":
                const minutes = parseInt(searchParams.get("minutes") || "60")
                result = await AIInsightsService.generateDailyStudyPlan(studentId, minutes)
                break

            default:
                // Return comprehensive insights bundle
                const [insights, recommendations, coaching, forecast] = await Promise.all([
                    AIInsightsService.generatePersonalizedInsights(studentId),
                    AIInsightsService.generateLearningRecommendations(studentId, 5),
                    AIInsightsService.generateCoachingMessage(studentId),
                    AIInsightsService.generatePerformanceForecast(studentId)
                ])

                result = {
                    insights,
                    recommendations,
                    coaching,
                    forecast
                }
        }

        return NextResponse.json({ success: true, data: result })
    } catch (error: any) {
        console.error("[Insights API Error]", error)
        return NextResponse.json(
            { success: false, message: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
