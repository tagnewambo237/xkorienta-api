/**
 * PredictionEngine
 * 
 * Moteur de prédiction et d'analyse avancée pour :
 * - Prédiction des notes individuelles (régression linéaire)
 * - Estimation de la probabilité de réussite
 * - Classements par rapport aux pairs
 * - Détection des risques de décrochage
 * - Analyse des tendances
 * 
 * Utilise simple-statistics pour des calculs statistiques précis
 */

import mongoose from 'mongoose'
import * as ss from 'simple-statistics'
import { MasteryLevel, MASTERY_LEVEL_PERCENTAGES } from '@/lib/patterns/EvaluationStrategy'

// ==========================================
// TYPES
// ==========================================

export interface PredictedScore {
    studentId: string
    syllabusId?: string
    predictedPercentage: number
    confidenceLevel: number // 0-100
    rSquared?: number // Coefficient of determination (0-1)
    trendDirection: 'UP' | 'DOWN' | 'STABLE'
    factors: ScoreFactor[]
    generatedAt: Date
}

export interface ScoreFactor {
    name: string
    impact: number // -100 to +100
    description: string
    recommendation?: string
}

export interface SuccessProbability {
    probability: number // 0-100
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    keyFactors: string[]
    recommendedActions: string[]
}

export interface PeerRanking {
    studentId: string
    classId: string
    rank: number
    totalStudents: number
    percentile: number
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
    anonymized?: boolean
}

export interface ClassPrediction {
    classId: string
    averagePredictedScore: number
    expectedPassRate: number
    atRiskStudents: number
    topPerformers: number
    distributionByMastery: Record<MasteryLevel, number>
}

export interface RiskAssessment {
    studentId: string
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    riskScore: number // 0-100
    indicators: RiskIndicator[]
    interventionRecommendations: string[]
}

export interface RiskIndicator {
    type: 'ATTENDANCE' | 'PERFORMANCE' | 'ENGAGEMENT' | 'PROGRESSION' | 'SELF_EVAL'
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    description: string
    trend?: 'IMPROVING' | 'STABLE' | 'DECLINING'
}

export interface WeakPoint {
    conceptId: string
    conceptTitle: string
    mastery: number
    attempts: number
    lastAttempt?: Date
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
}

export interface ProgressionTrend {
    period: string // e.g., "Week 1", "Semaine 2"
    averageScore: number
    examsTaken: number
    conceptsMastered: number
    selfEvalLevel?: MasteryLevel
}

export interface SchoolBenchmark {
    schoolId: string
    averageScore: number
    passRate: number
    studentCount: number
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
    comparisonToNational?: {
        percentile: number
        difference: number
    }
}

export interface RiskStudentDetailed {
    studentId: string
    studentName: string
    className: string
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    riskScore: number
    indicators: RiskIndicator[]
    lastActivity?: Date
}

// ==========================================
// PREDICTION ENGINE
// ==========================================

export class PredictionEngine {

    /**
     * Predict a student's score for a specific syllabus or exam type
     * Uses linear regression for trend analysis and prediction
     */
    static async predictStudentScore(
        studentId: string,
        syllabusId?: string,
        options: { lookbackDays?: number } = {}
    ): Promise<PredictedScore> {
        const { lookbackDays = 90 } = options

        // Get student's historical attempts
        const Attempt = mongoose.models.Attempt
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

        const query: any = {
            userId: new mongoose.Types.ObjectId(studentId),
            status: 'COMPLETED',
            submittedAt: { $gte: cutoffDate }
        }

        const attempts = await Attempt.find(query)
            .sort({ submittedAt: 1 }) // Oldest first for regression
            .limit(30)
            .lean()

        if (attempts.length === 0) {
            return {
                studentId,
                syllabusId,
                predictedPercentage: 50,
                confidenceLevel: 10,
                trendDirection: 'STABLE',
                factors: [{
                    name: 'Données insuffisantes',
                    impact: 0,
                    description: 'Aucune tentative récente disponible pour la prédiction',
                    recommendation: 'Effectuez quelques évaluations pour obtenir une prédiction précise'
                }],
                generatedAt: new Date()
            }
        }

        const factors: ScoreFactor[] = []

        // Convert attempts to percentage scores
        const scores = attempts.map(a =>
            ((a.score || 0) / (a.maxScore || 100)) * 100
        )

        // Basic statistics
        const mean = ss.mean(scores)
        const stdDev = ss.standardDeviation(scores)
        const median = ss.median(scores)

        // Prepare data for linear regression: [index, score]
        const regressionData: [number, number][] = scores.map((score, index) => [index, score])

        let predictedPercentage: number
        let rSquared: number | undefined
        let trendDirection: 'UP' | 'DOWN' | 'STABLE' = 'STABLE'
        let slope = 0

        if (attempts.length >= 3) {
            // Perform linear regression
            const regression = ss.linearRegression(regressionData)
            const regressionLine = ss.linearRegressionLine(regression)

            // Calculate R² (coefficient of determination)
            rSquared = ss.rSquared(regressionData, regressionLine)
            slope = regression.m

            // Predict next score (at index = length)
            const nextPredicted = regressionLine(attempts.length)

            // Weighted combination: regression prediction (60%) + recent mean (40%)
            const recentMean = ss.mean(scores.slice(-5))
            predictedPercentage = Math.round(
                nextPredicted * 0.6 + recentMean * 0.4
            )

            // Determine trend direction based on slope
            if (slope > 1.5) trendDirection = 'UP'
            else if (slope < -1.5) trendDirection = 'DOWN'

            // Add regression factor
            if (rSquared > 0.5) {
                factors.push({
                    name: 'Modèle de régression linéaire',
                    impact: Math.round(slope * 3),
                    description: `Tendance ${trendDirection === 'UP' ? 'positive' : trendDirection === 'DOWN' ? 'négative' : 'stable'} (R²=${(rSquared * 100).toFixed(0)}%)`,
                    recommendation: trendDirection === 'UP'
                        ? 'Votre progression est excellente, continuez ainsi !'
                        : trendDirection === 'DOWN'
                            ? 'Vos résultats baissent, identifiez les points faibles'
                            : 'Vos résultats sont stables'
                })
            }
        } else {
            // Not enough data for regression, use weighted recent scores
            const weights = scores.map((_, i) => Math.pow(1.2, i)) // More recent = higher weight
            const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0)
            const weightTotal = weights.reduce((a, b) => a + b, 0)
            predictedPercentage = Math.round(weightedSum / weightTotal)
        }

        // Clamp prediction to valid range
        predictedPercentage = Math.max(0, Math.min(100, predictedPercentage))

        // Calculate confidence based on:
        // 1. Number of data points
        // 2. R² value (if available)
        // 3. Standard deviation (lower = more consistent = higher confidence)
        let confidenceLevel = 30 + Math.min(40, attempts.length * 4)
        if (rSquared !== undefined) {
            confidenceLevel += rSquared * 20 // Bonus for good fit
        }
        if (stdDev < 10) {
            confidenceLevel += 10 // Bonus for consistency
        } else if (stdDev > 25) {
            confidenceLevel -= 15 // Penalty for inconsistency
        }
        confidenceLevel = Math.round(Math.max(10, Math.min(95, confidenceLevel)))

        // Add consistency factor
        if (stdDev < 15) {
            factors.push({
                name: 'Régularité',
                impact: 10,
                description: `Écart-type de ${stdDev.toFixed(1)}% - résultats très cohérents`,
                recommendation: 'Votre régularité est un atout'
            })
        } else if (stdDev > 25) {
            factors.push({
                name: 'Variabilité',
                impact: -10,
                description: `Écart-type de ${stdDev.toFixed(1)}% - résultats variables`,
                recommendation: 'Travaillez sur la régularité de vos performances'
            })
        }

        // Add trend factor if slope is significant
        if (attempts.length >= 5) {
            const firstHalf = ss.mean(scores.slice(0, Math.floor(scores.length / 2)))
            const secondHalf = ss.mean(scores.slice(Math.floor(scores.length / 2)))
            const improvement = secondHalf - firstHalf

            if (improvement > 5) {
                factors.push({
                    name: 'Progression récente',
                    impact: Math.round(Math.min(15, improvement)),
                    description: `Amélioration de ${improvement.toFixed(1)}% entre vos premiers et derniers résultats`,
                    recommendation: 'Excellente progression, maintenez cet effort !'
                })
            } else if (improvement < -5) {
                factors.push({
                    name: 'Baisse récente',
                    impact: Math.round(Math.max(-15, improvement)),
                    description: `Baisse de ${Math.abs(improvement).toFixed(1)}% par rapport à vos premiers résultats`,
                    recommendation: 'Analysez les concepts qui vous posent problème'
                })
            }
        }

        // Self-evaluation factor if available
        const ConceptEvaluation = mongoose.models.ConceptEvaluation
        if (ConceptEvaluation) {
            const selfEvals = await ConceptEvaluation.find({
                student: new mongoose.Types.ObjectId(studentId),
                evaluatedAt: { $gte: cutoffDate }
            }).lean()

            if (selfEvals.length > 0) {
                const avgSelfEval = ss.mean(
                    selfEvals.map((e: any) => MASTERY_LEVEL_PERCENTAGES[e.level as MasteryLevel] || 50)
                )
                const selfEvalImpact = (avgSelfEval - 50) / 5

                // Check correlation between self-eval and performance
                const calibrationDiff = Math.abs(avgSelfEval - mean)

                factors.push({
                    name: 'Auto-évaluation',
                    impact: Math.round(selfEvalImpact),
                    description: `Confiance moyenne: ${avgSelfEval.toFixed(0)}% (${calibrationDiff < 10 ? 'bien calibrée' : 'à recalibrer'})`,
                    recommendation: calibrationDiff < 10
                        ? 'Votre auto-évaluation est précise'
                        : avgSelfEval > mean + 10
                            ? 'Votre confiance semble surestimée'
                            : 'Vous êtes peut-être trop modeste'
                })
            }
        }

        return {
            studentId,
            syllabusId,
            predictedPercentage,
            confidenceLevel,
            rSquared,
            trendDirection,
            factors,
            generatedAt: new Date()
        }
    }

    /**
     * Calculate probability of passing an upcoming exam
     */
    static async calculateSuccessProbability(
        studentId: string,
        passingScore: number = 50
    ): Promise<SuccessProbability> {
        const prediction = await this.predictStudentScore(studentId)

        // Calculate probability based on predicted score distance from passing
        const distanceFromPass = prediction.predictedPercentage - passingScore
        let probability: number

        if (distanceFromPass >= 20) probability = 95
        else if (distanceFromPass >= 10) probability = 85
        else if (distanceFromPass >= 0) probability = 70
        else if (distanceFromPass >= -10) probability = 50
        else if (distanceFromPass >= -20) probability = 30
        else probability = 15

        // Adjust by confidence
        probability = probability * (prediction.confidenceLevel / 100) +
            50 * (1 - prediction.confidenceLevel / 100)
        probability = Math.round(probability)

        // Determine risk level
        let riskLevel: SuccessProbability['riskLevel']
        if (probability >= 80) riskLevel = 'LOW'
        else if (probability >= 60) riskLevel = 'MEDIUM'
        else if (probability >= 40) riskLevel = 'HIGH'
        else riskLevel = 'CRITICAL'

        // Extract key factors
        const keyFactors = prediction.factors.map(f =>
            `${f.name}: ${f.impact > 0 ? '+' : ''}${f.impact}%`
        )

        // Generate recommendations
        const recommendedActions: string[] = []
        if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
            recommendedActions.push('Réviser intensivement les concepts fondamentaux')
            recommendedActions.push('Demander de l\'aide à votre enseignant')
            recommendedActions.push('Effectuer des exercices de remédiation')
        } else if (riskLevel === 'MEDIUM') {
            recommendedActions.push('Cibler les points faibles identifiés')
            recommendedActions.push('Pratiquer avec des examens blancs')
        } else {
            recommendedActions.push('Maintenir le rythme actuel')
            recommendedActions.push('Explorer des concepts plus avancés')
        }

        return {
            probability,
            riskLevel,
            keyFactors,
            recommendedActions
        }
    }

    /**
     * Get student ranking among peers in a class
     */
    static async getRankAmongPeers(
        studentId: string,
        classId: string,
        anonymize: boolean = true
    ): Promise<PeerRanking> {
        const Class = mongoose.models.Class
        const Attempt = mongoose.models.Attempt

        const classData = await Class.findById(classId).lean()
        if (!classData) {
            throw new Error('Class not found')
        }

        const studentIds = (classData as any).students || []
        const totalStudents = studentIds.length

        // Calculate average score for each student
        const studentScores = await Promise.all(
            studentIds.map(async (sid: any) => {
                const attempts = await Attempt.find({
                    userId: sid,
                    status: 'COMPLETED'
                }).sort({ submittedAt: -1 }).limit(10).lean()

                if (attempts.length === 0) return { id: sid.toString(), avg: 0 }

                const avg = attempts.reduce((sum, a) =>
                    sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
                ) / attempts.length

                return { id: sid.toString(), avg }
            })
        )

        // Sort by average score (descending)
        studentScores.sort((a, b) => b.avg - a.avg)

        // Find current student's rank
        const studentIndex = studentScores.findIndex(s => s.id === studentId)
        const rank = studentIndex + 1
        const percentile = Math.round(((totalStudents - rank + 1) / totalStudents) * 100)

        // Calculate trend (compare recent to older performance)
        const Attempt2 = mongoose.models.Attempt
        const recentAttempts = await Attempt2.find({
            userId: new mongoose.Types.ObjectId(studentId),
            status: 'COMPLETED'
        }).sort({ submittedAt: -1 }).limit(5).lean()

        const olderAttempts = await Attempt2.find({
            userId: new mongoose.Types.ObjectId(studentId),
            status: 'COMPLETED'
        }).sort({ submittedAt: -1 }).skip(5).limit(5).lean()

        let trend: PeerRanking['trend'] = 'STABLE'
        if (recentAttempts.length > 0 && olderAttempts.length > 0) {
            const recentAvg = recentAttempts.reduce((sum, a) =>
                sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
            ) / recentAttempts.length
            const olderAvg = olderAttempts.reduce((sum, a) =>
                sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
            ) / olderAttempts.length

            if (recentAvg > olderAvg + 5) trend = 'IMPROVING'
            else if (recentAvg < olderAvg - 5) trend = 'DECLINING'
        }

        return {
            studentId,
            classId,
            rank,
            totalStudents,
            percentile,
            trend,
            anonymized: anonymize
        }
    }

    /**
     * Predict class-level performance
     */
    static async getClassPerformancePrediction(classId: string): Promise<ClassPrediction> {
        const Class = mongoose.models.Class
        const classData = await Class.findById(classId).lean()

        if (!classData) {
            throw new Error('Class not found')
        }

        const studentIds = (classData as any).students || []
        const predictions = await Promise.all(
            studentIds.map((sid: any) => this.calculateSuccessProbability(sid.toString()))
        )

        const avgPredictedScore = predictions.reduce((sum, p) => sum + p.probability, 0) /
            Math.max(1, predictions.length)

        const expectedPassRate = predictions.filter(p => p.probability >= 50).length /
            Math.max(1, predictions.length) * 100

        const atRiskStudents = predictions.filter(p =>
            p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL'
        ).length

        const topPerformers = predictions.filter(p => p.probability >= 80).length

        // Distribution by estimated mastery
        const distributionByMastery: Record<MasteryLevel, number> = {
            [MasteryLevel.UNKNOWN]: 0,
            [MasteryLevel.TOTALLY_UNABLE]: 0,
            [MasteryLevel.UNABLE_WITH_HELP]: 0,
            [MasteryLevel.UNABLE_ALONE]: 0,
            [MasteryLevel.ABLE_WITH_HELP]: 0,
            [MasteryLevel.ABLE_ALONE]: 0,
            [MasteryLevel.PERFECTLY_ABLE]: 0
        }

        for (const pred of predictions) {
            let level: MasteryLevel
            if (pred.probability >= 90) level = MasteryLevel.PERFECTLY_ABLE
            else if (pred.probability >= 75) level = MasteryLevel.ABLE_ALONE
            else if (pred.probability >= 60) level = MasteryLevel.ABLE_WITH_HELP
            else if (pred.probability >= 40) level = MasteryLevel.UNABLE_ALONE
            else if (pred.probability >= 25) level = MasteryLevel.UNABLE_WITH_HELP
            else level = MasteryLevel.TOTALLY_UNABLE

            distributionByMastery[level]++
        }

        return {
            classId,
            averagePredictedScore: Math.round(avgPredictedScore),
            expectedPassRate: Math.round(expectedPassRate),
            atRiskStudents,
            topPerformers,
            distributionByMastery
        }
    }

    /**
     * Detect dropout risk for a student
     */
    static async detectDropoutRisk(studentId: string): Promise<RiskAssessment> {
        const Attempt = mongoose.models.Attempt
        const indicators: RiskIndicator[] = []
        let riskScore = 0

        // Check recent activity
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const recentAttempts = await Attempt.find({
            userId: new mongoose.Types.ObjectId(studentId),
            submittedAt: { $gte: thirtyDaysAgo }
        }).lean()

        // Engagement indicator
        if (recentAttempts.length === 0) {
            indicators.push({
                type: 'ENGAGEMENT',
                severity: 'HIGH',
                description: 'Aucune activité dans les 30 derniers jours'
            })
            riskScore += 30
        } else if (recentAttempts.length < 3) {
            indicators.push({
                type: 'ENGAGEMENT',
                severity: 'MEDIUM',
                description: 'Activité limitée récemment'
            })
            riskScore += 15
        }

        // Performance indicator
        if (recentAttempts.length > 0) {
            const avgScore = recentAttempts.reduce((sum, a) =>
                sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
            ) / recentAttempts.length

            if (avgScore < 30) {
                indicators.push({
                    type: 'PERFORMANCE',
                    severity: 'HIGH',
                    description: `Score moyen critique: ${Math.round(avgScore)}%`
                })
                riskScore += 25
            } else if (avgScore < 50) {
                indicators.push({
                    type: 'PERFORMANCE',
                    severity: 'MEDIUM',
                    description: `Score moyen sous le seuil: ${Math.round(avgScore)}%`
                })
                riskScore += 15
            }
        }

        // Progression indicator (compare periods)
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

        const olderAttempts = await Attempt.find({
            userId: new mongoose.Types.ObjectId(studentId),
            submittedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        }).lean()

        if (recentAttempts.length > 0 && olderAttempts.length > 0) {
            const recentAvg = recentAttempts.reduce((sum, a) =>
                sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
            ) / recentAttempts.length
            const olderAvg = olderAttempts.reduce((sum, a) =>
                sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
            ) / olderAttempts.length

            if (recentAvg < olderAvg - 15) {
                indicators.push({
                    type: 'PROGRESSION',
                    severity: 'HIGH',
                    description: 'Forte baisse des performances',
                    trend: 'DECLINING'
                })
                riskScore += 20
            } else if (recentAvg < olderAvg - 5) {
                indicators.push({
                    type: 'PROGRESSION',
                    severity: 'MEDIUM',
                    description: 'Légère baisse des performances',
                    trend: 'DECLINING'
                })
                riskScore += 10
            }
        }

        // Determine risk level
        let riskLevel: RiskAssessment['riskLevel']
        if (riskScore >= 60) riskLevel = 'CRITICAL'
        else if (riskScore >= 40) riskLevel = 'HIGH'
        else if (riskScore >= 20) riskLevel = 'MEDIUM'
        else riskLevel = 'LOW'

        // Generate intervention recommendations
        const interventionRecommendations: string[] = []
        if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
            interventionRecommendations.push('Contacter l\'étudiant pour un suivi personnalisé')
            interventionRecommendations.push('Proposer des sessions de remédiation')
            interventionRecommendations.push('Identifier les obstacles à l\'apprentissage')
        } else if (riskLevel === 'MEDIUM') {
            interventionRecommendations.push('Encourager une participation plus régulière')
            interventionRecommendations.push('Proposer des ressources complémentaires')
        }

        return {
            studentId,
            riskLevel,
            riskScore: Math.min(100, riskScore),
            indicators,
            interventionRecommendations
        }
    }


    /**
     * Get detailed list of at-risk students for a class
     */
    static async getAtRiskStudentsForClass(classId: string): Promise<RiskStudentDetailed[]> {
        const Class = mongoose.models.Class
        const User = mongoose.models.User

        const classData = await Class.findById(classId).populate('students', 'name').lean()
        if (!classData) return []

        const students = (classData as any).students || []
        const riskStudents: RiskStudentDetailed[] = []

        const assessments = await Promise.all(
            students.map((s: any) => this.detectDropoutRisk(s._id.toString()))
        )

        for (let i = 0; i < assessments.length; i++) {
            const assessment = assessments[i]
            const student = students[i]

            // Include MEDIUM, HIGH, and CRITICAL risk students
            if (assessment.riskLevel === 'MEDIUM' || assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL') {
                riskStudents.push({
                    studentId: student._id.toString(),
                    studentName: student.name,
                    className: (classData as any).name,
                    riskLevel: assessment.riskLevel,
                    riskScore: assessment.riskScore,
                    indicators: assessment.indicators,
                    lastActivity: new Date() // Ideally fetch true last activity
                })
            }
        }

        return riskStudents.sort((a, b) => b.riskScore - a.riskScore)
    }

    /**
     * Identify weak concepts for a student
     */
    static async identifyWeakConcepts(
        studentId: string,
        syllabusId?: string
    ): Promise<WeakPoint[]> {
        const ConceptEvaluation = mongoose.models.ConceptEvaluation
        const Concept = mongoose.models.Concept

        if (!ConceptEvaluation || !Concept) {
            return []
        }

        const query: any = { student: new mongoose.Types.ObjectId(studentId) }
        if (syllabusId) {
            query.syllabus = new mongoose.Types.ObjectId(syllabusId)
        }

        const evaluations = await ConceptEvaluation.find(query)
            .populate('concept', 'title')
            .sort({ evaluatedAt: -1 })
            .lean()

        // Group by concept and find latest + calculate trend
        const conceptMap = new Map<string, any[]>()
        for (const evaluation of evaluations as any[]) {
            const conceptId = evaluation.concept?._id?.toString()
            if (!conceptId) continue

            if (!conceptMap.has(conceptId)) {
                conceptMap.set(conceptId, [])
            }
            conceptMap.get(conceptId)!.push(evaluation)
        }

        const weakPoints: WeakPoint[] = []

        for (const [conceptId, evals] of conceptMap) {
            const latest = evals[0]
            const mastery = MASTERY_LEVEL_PERCENTAGES[latest.level as MasteryLevel] || 50

            // Calculate trend if we have multiple evaluations
            let trend: WeakPoint['trend'] = 'STABLE'
            if (evals.length >= 2) {
                const recentMastery = MASTERY_LEVEL_PERCENTAGES[evals[0].level as MasteryLevel] || 50
                const olderMastery = MASTERY_LEVEL_PERCENTAGES[evals[1].level as MasteryLevel] || 50

                if (recentMastery > olderMastery + 10) trend = 'IMPROVING'
                else if (recentMastery < olderMastery - 10) trend = 'DECLINING'
            }

            // Only include concepts with low mastery
            if (mastery < 60) {
                weakPoints.push({
                    conceptId,
                    conceptTitle: latest.concept?.title || 'Concept inconnu',
                    mastery,
                    attempts: evals.length,
                    lastAttempt: latest.evaluatedAt,
                    trend
                })
            }
        }

        // Sort by mastery (lowest first)
        return weakPoints.sort((a, b) => a.mastery - b.mastery)
    }

    /**
     * Get progression trend over time
     */
    static async getProgressionTrend(
        studentId: string,
        weeks: number = 8
    ): Promise<ProgressionTrend[]> {
        const Attempt = mongoose.models.Attempt
        const trends: ProgressionTrend[] = []

        for (let i = 0; i < weeks; i++) {
            const weekEnd = new Date()
            weekEnd.setDate(weekEnd.getDate() - (i * 7))
            const weekStart = new Date(weekEnd)
            weekStart.setDate(weekStart.getDate() - 7)

            const attempts = await Attempt.find({
                userId: new mongoose.Types.ObjectId(studentId),
                status: 'COMPLETED',
                submittedAt: { $gte: weekStart, $lt: weekEnd }
            }).lean()

            const averageScore = attempts.length > 0
                ? attempts.reduce((sum, a) =>
                    sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
                ) / attempts.length
                : 0

            trends.unshift({
                period: `Semaine ${weeks - i}`,
                averageScore: Math.round(averageScore),
                examsTaken: attempts.length,
                conceptsMastered: 0 // Could be enhanced with concept tracking
            })
        }

        return trends
    }

    /**
     * Get school-level benchmark
     */
    static async getBenchmark(schoolId: string): Promise<SchoolBenchmark> {
        const Class = mongoose.models.Class
        const Attempt = mongoose.models.Attempt

        // Get all classes for the school
        const classes = await Class.find({ school: new mongoose.Types.ObjectId(schoolId) }).lean()
        const allStudentIds = classes.flatMap((c: any) => c.students || [])

        // Get recent attempts for all students
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const attempts = await Attempt.find({
            userId: { $in: allStudentIds },
            status: 'COMPLETED',
            submittedAt: { $gte: thirtyDaysAgo }
        }).lean()

        const averageScore = attempts.length > 0
            ? attempts.reduce((sum, a) =>
                sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
            ) / attempts.length
            : 0

        const passRate = attempts.length > 0
            ? (attempts.filter(a => ((a.score || 0) / (a.maxScore || 100)) >= 0.5).length /
                attempts.length) * 100
            : 0

        // Calculate trend by comparing to previous period
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

        const olderAttempts = await Attempt.find({
            userId: { $in: allStudentIds },
            status: 'COMPLETED',
            submittedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        }).lean()

        const olderAvg = olderAttempts.length > 0
            ? olderAttempts.reduce((sum, a) =>
                sum + ((a.score || 0) / (a.maxScore || 100)) * 100, 0
            ) / olderAttempts.length
            : 0

        let trend: SchoolBenchmark['trend'] = 'STABLE'
        if (averageScore > olderAvg + 5) trend = 'IMPROVING'
        else if (averageScore < olderAvg - 5) trend = 'DECLINING'

        return {
            schoolId,
            averageScore: Math.round(averageScore),
            passRate: Math.round(passRate),
            studentCount: allStudentIds.length,
            trend
        }
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private static calculateVariance(values: number[]): number {
        if (values.length === 0) return 0
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
        return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
    }
}
