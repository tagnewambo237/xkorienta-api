import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { PredictionEngine } from "@/lib/services/PredictionEngine"
import { AnalyticsEngine } from "@/lib/services/AnalyticsEngine"

/**
 * GET /api/student/analytics
 * Get comprehensive analytics for the current student
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

        // Get prediction
        let prediction
        try {
            prediction = await PredictionEngine.predictStudentScore(studentId)
        } catch (error) {
            console.error('Error getting prediction:', error)
        }

        // Get success probability
        let successProbability
        try {
            successProbability = await PredictionEngine.calculateSuccessProbability(studentId)
        } catch (error) {
            console.error('Error calculating success probability:', error)
        }

        // Get strengths and weaknesses
        let strengthsWeaknesses
        try {
            strengthsWeaknesses = await AnalyticsEngine.identifyStrengthsAndWeaknesses(studentId)
        } catch (error) {
            console.error('Error identifying strengths/weaknesses:', error)
            strengthsWeaknesses = {
                strengths: [],
                weaknesses: [],
                overallLevel: 'UNKNOWN',
                recommendations: []
            }
        }

        return NextResponse.json({
            success: true,
            analytics: {
                prediction: prediction ? {
                    predictedPercentage: prediction.predictedPercentage,
                    confidenceLevel: prediction.confidenceLevel,
                    trendDirection: prediction.trendDirection,
                    factors: prediction.factors
                } : null,
                successProbability: successProbability ? {
                    probability: successProbability.probability,
                    riskLevel: successProbability.riskLevel,
                    recommendedActions: successProbability.recommendedActions
                } : null,
                strengths: strengthsWeaknesses.strengths,
                weaknesses: strengthsWeaknesses.weaknesses,
                overallLevel: strengthsWeaknesses.overallLevel,
                recommendations: strengthsWeaknesses.recommendations
            }
        })

    } catch (error: any) {
        console.error("[Student Analytics API] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
