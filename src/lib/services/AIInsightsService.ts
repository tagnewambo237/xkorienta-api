/**
 * AIInsightsService
 *
 * Service d'intelligence artificielle pour générer des insights
 * personnalisés et des recommandations intelligentes.
 *
 * Fonctionnalités :
 * - Génération de recommandations personnalisées
 * - Analyse prédictive avec ML léger
 * - Détection d'anomalies et patterns
 * - Coaching virtuel intelligent
 */

import * as ss from 'simple-statistics'
import { MasteryLevel, MASTERY_LEVEL_PERCENTAGES } from '@/lib/patterns/EvaluationStrategy'
import { PredictionEngine, PredictedScore, RiskAssessment } from './PredictionEngine'
import { AnalyticsEngine, StudentStrengthWeakness } from './AnalyticsEngine'

// ==========================================
// TYPES
// ==========================================

export interface PersonalizedInsight {
    category: 'PERFORMANCE' | 'BEHAVIOR' | 'OPPORTUNITY' | 'RISK' | 'MOTIVATION'
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    title: string
    description: string
    actionItems: string[]
    metrics?: Record<string, number | string>
}

export interface LearningRecommendation {
    type: 'CONCEPT' | 'PRACTICE' | 'STRATEGY' | 'RESOURCE'
    priority: number // 1-10
    title: string
    description: string
    estimatedImpact: 'HIGH' | 'MEDIUM' | 'LOW'
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    timeRequired?: string
    relatedConcepts?: string[]
}

export interface CoachingMessage {
    type: 'ENCOURAGEMENT' | 'WARNING' | 'TIP' | 'CELEBRATION' | 'CHALLENGE'
    message: string
    context?: string
    nextSteps?: string[]
}

export interface LearningProfile {
    studentId: string
    learningStyle: 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING' | 'MIXED'
    strengths: string[]
    challenges: string[]
    preferredDifficulty: 'EASY' | 'MODERATE' | 'CHALLENGING'
    optimalSessionDuration: number // minutes
    bestPerformanceTime?: 'MORNING' | 'AFTERNOON' | 'EVENING'
    consistencyScore: number
    motivationDrivers: string[]
}

export interface AnomalyDetection {
    type: 'SUDDEN_DROP' | 'SUDDEN_IMPROVEMENT' | 'INACTIVITY' | 'UNUSUAL_PATTERN' | 'CHEATING_SUSPICION'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
    detectedAt: Date
    evidence: string[]
    recommendedAction: string
}

export interface PerformanceForecast {
    shortTerm: { // Next 2 weeks
        predictedScore: number
        confidence: number
        trend: 'UP' | 'DOWN' | 'STABLE'
    }
    mediumTerm: { // Next month
        predictedScore: number
        confidence: number
        riskOfDecline: number
    }
    longTerm: { // End of term/year
        predictedFinalGrade: string
        passLikelihood: number
        rankPrediction?: { min: number; max: number }
    }
    keyFactors: string[]
}

// ==========================================
// AI INSIGHTS SERVICE
// ==========================================

export class AIInsightsService {

    /**
     * Generate personalized insights for a student
     */
    static async generatePersonalizedInsights(
        studentId: string
    ): Promise<PersonalizedInsight[]> {
        const insights: PersonalizedInsight[] = []

        // Get prediction data
        const prediction = await PredictionEngine.predictStudentScore(studentId)
        const riskAssessment = await PredictionEngine.detectDropoutRisk(studentId)
        const weakConcepts = await PredictionEngine.identifyWeakConcepts(studentId)

        // Get strengths and weaknesses
        let strengthWeakness: StudentStrengthWeakness | null = null
        try {
            strengthWeakness = await AnalyticsEngine.identifyStrengthsAndWeaknesses(studentId)
        } catch (e) {
            // Handle if analytics fails
        }

        // Performance insight
        if (prediction.trendDirection === 'UP') {
            insights.push({
                category: 'PERFORMANCE',
                priority: 'HIGH',
                title: 'Progression excellente !',
                description: `Vos résultats s'améliorent de façon constante. Votre score prévu est de ${prediction.predictedPercentage}%.`,
                actionItems: [
                    'Maintenez votre rythme d\'étude actuel',
                    'Explorez des exercices plus avancés',
                    'Aidez vos camarades en difficulté'
                ],
                metrics: {
                    predictedScore: `${prediction.predictedPercentage}%`,
                    confidence: `${prediction.confidenceLevel}%`,
                    trend: prediction.trendDirection
                }
            })
        } else if (prediction.trendDirection === 'DOWN') {
            insights.push({
                category: 'RISK',
                priority: 'HIGH',
                title: 'Attention : baisse détectée',
                description: `Vos résultats montrent une tendance à la baisse. Il est temps d'agir.`,
                actionItems: [
                    'Identifiez les sujets difficiles',
                    'Planifiez des sessions de révision',
                    'Demandez de l\'aide si nécessaire'
                ],
                metrics: {
                    predictedScore: `${prediction.predictedPercentage}%`,
                    riskLevel: riskAssessment.riskLevel
                }
            })
        }

        // Weak concepts insight
        if (weakConcepts.length > 0) {
            const topWeakConcepts = weakConcepts.slice(0, 3)
            insights.push({
                category: 'OPPORTUNITY',
                priority: 'MEDIUM',
                title: 'Concepts à améliorer',
                description: `${weakConcepts.length} concept(s) nécessitent votre attention.`,
                actionItems: topWeakConcepts.map(c =>
                    `Révisez : ${c.conceptTitle} (maîtrise: ${c.mastery}%)`
                ),
                metrics: {
                    weakConceptsCount: weakConcepts.length,
                    lowestMastery: `${topWeakConcepts[0]?.mastery || 0}%`
                }
            })
        }

        // Risk insight
        if (riskAssessment.riskLevel === 'HIGH' || riskAssessment.riskLevel === 'CRITICAL') {
            insights.push({
                category: 'RISK',
                priority: 'HIGH',
                title: 'Risque de décrochage détecté',
                description: 'Plusieurs indicateurs suggèrent un risque. Prenez des mesures rapidement.',
                actionItems: riskAssessment.interventionRecommendations,
                metrics: {
                    riskScore: riskAssessment.riskScore,
                    indicatorCount: riskAssessment.indicators.length
                }
            })
        }

        // Motivation insight based on recent activity
        if (prediction.factors.some(f => f.name.includes('Régularité') && f.impact > 5)) {
            insights.push({
                category: 'MOTIVATION',
                priority: 'LOW',
                title: 'Votre régularité paie !',
                description: 'Votre constance dans le travail se reflète dans vos résultats.',
                actionItems: [
                    'Continuez à étudier régulièrement',
                    'Fixez-vous des objectifs hebdomadaires'
                ]
            })
        }

        // Sort by priority
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

        return insights
    }

    /**
     * Generate learning recommendations
     */
    static async generateLearningRecommendations(
        studentId: string,
        limit: number = 5
    ): Promise<LearningRecommendation[]> {
        const recommendations: LearningRecommendation[] = []

        const prediction = await PredictionEngine.predictStudentScore(studentId)
        const weakConcepts = await PredictionEngine.identifyWeakConcepts(studentId)
        const trend = await PredictionEngine.getProgressionTrend(studentId, 4)

        // Recommendation based on weak concepts
        for (const concept of weakConcepts.slice(0, 3)) {
            const priority = concept.mastery < 30 ? 10 : concept.mastery < 50 ? 7 : 5
            const difficulty = concept.mastery < 30 ? 'HARD' : concept.mastery < 50 ? 'MEDIUM' : 'EASY'

            recommendations.push({
                type: 'CONCEPT',
                priority,
                title: `Renforcer : ${concept.conceptTitle}`,
                description: `Votre maîtrise est à ${concept.mastery}%. ${concept.trend === 'DECLINING' ? 'En baisse récemment.' : ''
                    }`,
                estimatedImpact: 'HIGH',
                difficulty,
                timeRequired: difficulty === 'HARD' ? '2-3 heures' : '1 heure',
                relatedConcepts: []
            })
        }

        // Practice recommendation
        const recentExams = trend.filter(t => t.examsTaken > 0).length
        if (recentExams < 2) {
            recommendations.push({
                type: 'PRACTICE',
                priority: 8,
                title: 'Pratiquez davantage',
                description: 'Vous avez peu d\'évaluations récentes. La pratique régulière améliore les résultats.',
                estimatedImpact: 'HIGH',
                difficulty: 'EASY',
                timeRequired: '30 min/jour'
            })
        }

        // Strategy recommendation based on prediction factors
        const variabilityFactor = prediction.factors.find(f => f.name === 'Variabilité')
        if (variabilityFactor && variabilityFactor.impact < -5) {
            recommendations.push({
                type: 'STRATEGY',
                priority: 6,
                title: 'Améliorez votre régularité',
                description: 'Vos résultats sont très variables. Une préparation plus constante vous aidera.',
                estimatedImpact: 'MEDIUM',
                difficulty: 'MEDIUM',
                timeRequired: 'Planification quotidienne'
            })
        }

        // If doing well, challenge recommendation
        if (prediction.predictedPercentage >= 80) {
            recommendations.push({
                type: 'STRATEGY',
                priority: 4,
                title: 'Visez l\'excellence',
                description: 'Vos résultats sont excellents. Préparez-vous aux exercices avancés.',
                estimatedImpact: 'MEDIUM',
                difficulty: 'HARD',
                timeRequired: 'Variable'
            })
        }

        // Sort by priority (higher first) and limit
        return recommendations
            .sort((a, b) => b.priority - a.priority)
            .slice(0, limit)
    }

    /**
     * Generate coaching message
     */
    static async generateCoachingMessage(
        studentId: string
    ): Promise<CoachingMessage> {
        const prediction = await PredictionEngine.predictStudentScore(studentId)
        const probability = await PredictionEngine.calculateSuccessProbability(studentId)

        // Celebration for high performers
        if (prediction.predictedPercentage >= 85 && prediction.trendDirection === 'UP') {
            return {
                type: 'CELEBRATION',
                message: `Bravo ! Vous êtes sur une excellente lancée avec ${prediction.predictedPercentage}% prévu.`,
                context: 'Vos efforts portent leurs fruits.',
                nextSteps: [
                    'Maintenez votre rythme',
                    'Aidez vos camarades',
                    'Préparez les examens avancés'
                ]
            }
        }

        // Warning for declining students
        if (prediction.trendDirection === 'DOWN' || probability.riskLevel === 'HIGH') {
            return {
                type: 'WARNING',
                message: 'Vos résultats montrent des signes de faiblesse. Ne vous découragez pas !',
                context: `Probabilité de réussite actuelle : ${probability.probability}%`,
                nextSteps: probability.recommendedActions
            }
        }

        // Challenge for stable performers
        if (prediction.predictedPercentage >= 60 && prediction.trendDirection === 'STABLE') {
            return {
                type: 'CHALLENGE',
                message: 'Vous êtes stable, mais vous pouvez faire mieux ! Relevez le défi.',
                context: `Score prévu : ${prediction.predictedPercentage}%`,
                nextSteps: [
                    'Fixez un objectif de progression de 5%',
                    'Identifiez un concept à approfondir',
                    'Pratiquez 30 minutes supplémentaires par jour'
                ]
            }
        }

        // Tip for those who need guidance
        if (prediction.predictedPercentage < 60) {
            return {
                type: 'TIP',
                message: 'Conseil : Concentrez-vous sur les fondamentaux avant d\'avancer.',
                context: 'Les bases solides sont la clé du succès.',
                nextSteps: [
                    'Révisez les concepts de base',
                    'Faites des exercices progressifs',
                    'Demandez de l\'aide à votre enseignant'
                ]
            }
        }

        // Default encouragement
        return {
            type: 'ENCOURAGEMENT',
            message: 'Continuez vos efforts ! Chaque jour de travail vous rapproche de votre objectif.',
            context: `Score prévu : ${prediction.predictedPercentage}%`,
            nextSteps: ['Restez régulier', 'Croyez en vos capacités']
        }
    }

    /**
     * Build learning profile for a student
     */
    static async buildLearningProfile(
        studentId: string
    ): Promise<LearningProfile> {
        const prediction = await PredictionEngine.predictStudentScore(studentId)
        const trends = await PredictionEngine.getProgressionTrend(studentId, 8)

        let strengthWeakness: StudentStrengthWeakness | null = null
        try {
            strengthWeakness = await AnalyticsEngine.identifyStrengthsAndWeaknesses(studentId)
        } catch (e) {
            // Handle if analytics fails
        }

        // Calculate consistency from trends
        const weeklyScores = trends.filter(t => t.averageScore > 0).map(t => t.averageScore)
        const consistencyScore = weeklyScores.length > 1
            ? Math.max(0, 100 - ss.standardDeviation(weeklyScores) * 3)
            : 50

        // Determine preferred difficulty based on performance
        let preferredDifficulty: 'EASY' | 'MODERATE' | 'CHALLENGING' = 'MODERATE'
        if (prediction.predictedPercentage >= 80) preferredDifficulty = 'CHALLENGING'
        else if (prediction.predictedPercentage < 50) preferredDifficulty = 'EASY'

        // Determine strengths and challenges
        const strengths: string[] = []
        const challenges: string[] = []

        if (prediction.trendDirection === 'UP') strengths.push('Progression constante')
        if (consistencyScore > 70) strengths.push('Régularité dans le travail')
        if (prediction.predictedPercentage >= 75) strengths.push('Bon niveau général')

        if (prediction.trendDirection === 'DOWN') challenges.push('Tendance à la baisse')
        if (consistencyScore < 50) challenges.push('Résultats variables')
        if (strengthWeakness?.weaknesses && strengthWeakness.weaknesses.length > 0) {
            challenges.push(`Difficultés en ${strengthWeakness.weaknesses[0]?.subjectName || 'certaines matières'}`)
        }

        // Motivation drivers
        const motivationDrivers: string[] = []
        if (prediction.predictedPercentage >= 70) motivationDrivers.push('Réussite académique')
        if (consistencyScore > 60) motivationDrivers.push('Progression personnelle')
        motivationDrivers.push('Atteinte des objectifs')

        return {
            studentId,
            learningStyle: 'MIXED', // Would need more data to determine
            strengths,
            challenges,
            preferredDifficulty,
            optimalSessionDuration: preferredDifficulty === 'EASY' ? 30 : preferredDifficulty === 'MODERATE' ? 45 : 60,
            consistencyScore: Math.round(consistencyScore),
            motivationDrivers
        }
    }

    /**
     * Detect anomalies in student behavior
     */
    static async detectAnomalies(
        studentId: string
    ): Promise<AnomalyDetection[]> {
        const anomalies: AnomalyDetection[] = []

        const trends = await PredictionEngine.getProgressionTrend(studentId, 8)
        const prediction = await PredictionEngine.predictStudentScore(studentId)

        const weeklyScores = trends.map(t => t.averageScore).filter(s => s > 0)

        if (weeklyScores.length < 2) return anomalies

        // Detect sudden drops
        for (let i = 1; i < weeklyScores.length; i++) {
            const drop = weeklyScores[i - 1] - weeklyScores[i]
            if (drop > 20) {
                anomalies.push({
                    type: 'SUDDEN_DROP',
                    severity: drop > 30 ? 'HIGH' : 'MEDIUM',
                    description: `Chute de ${Math.round(drop)}% entre la semaine ${i} et ${i + 1}`,
                    detectedAt: new Date(),
                    evidence: [`Score semaine ${i}: ${Math.round(weeklyScores[i - 1])}%`, `Score semaine ${i + 1}: ${Math.round(weeklyScores[i])}%`],
                    recommendedAction: 'Investiguer les causes de cette baisse soudaine'
                })
            }
        }

        // Detect sudden improvements (potential cheating indicator)
        for (let i = 1; i < weeklyScores.length; i++) {
            const improvement = weeklyScores[i] - weeklyScores[i - 1]
            if (improvement > 30 && weeklyScores[i - 1] < 50) {
                anomalies.push({
                    type: 'SUDDEN_IMPROVEMENT',
                    severity: 'LOW',
                    description: `Amélioration significative de ${Math.round(improvement)}%`,
                    detectedAt: new Date(),
                    evidence: [`Score avant: ${Math.round(weeklyScores[i - 1])}%`, `Score après: ${Math.round(weeklyScores[i])}%`],
                    recommendedAction: 'Féliciter l\'Apprenant ou vérifier les conditions d\'examen'
                })
            }
        }

        // Detect inactivity
        const recentWeeks = trends.slice(-3)
        const inactiveWeeks = recentWeeks.filter(w => w.examsTaken === 0).length
        if (inactiveWeeks >= 2) {
            anomalies.push({
                type: 'INACTIVITY',
                severity: inactiveWeeks === 3 ? 'HIGH' : 'MEDIUM',
                description: `${inactiveWeeks} semaines sans activité récemment`,
                detectedAt: new Date(),
                evidence: [`Aucune évaluation depuis ${inactiveWeeks} semaines`],
                recommendedAction: 'Contacter l\'étudiant pour comprendre la situation'
            })
        }

        return anomalies
    }

    /**
     * Generate performance forecast
     */
    static async generatePerformanceForecast(
        studentId: string
    ): Promise<PerformanceForecast> {
        const prediction = await PredictionEngine.predictStudentScore(studentId)
        const probability = await PredictionEngine.calculateSuccessProbability(studentId)
        const trends = await PredictionEngine.getProgressionTrend(studentId, 8)

        // Short term prediction (next 2 weeks)
        const shortTermPrediction = prediction.predictedPercentage
        let shortTermTrend = prediction.trendDirection

        // Medium term (adjust for momentum)
        let mediumTermPrediction = shortTermPrediction
        if (prediction.trendDirection === 'UP') {
            mediumTermPrediction = Math.min(100, shortTermPrediction + 5)
        } else if (prediction.trendDirection === 'DOWN') {
            mediumTermPrediction = Math.max(0, shortTermPrediction - 5)
        }

        // Risk of decline
        const recentScores = trends.slice(-4).map(t => t.averageScore).filter(s => s > 0)
        let riskOfDecline = 20 // Base risk
        if (prediction.trendDirection === 'DOWN') riskOfDecline += 30
        if (recentScores.length > 1 && ss.standardDeviation(recentScores) > 15) riskOfDecline += 20
        riskOfDecline = Math.min(100, riskOfDecline)

        // Long term (end of term prediction)
        const longTermPrediction = mediumTermPrediction
        let predictedGrade: string
        if (longTermPrediction >= 90) predictedGrade = 'A'
        else if (longTermPrediction >= 80) predictedGrade = 'B'
        else if (longTermPrediction >= 70) predictedGrade = 'C'
        else if (longTermPrediction >= 60) predictedGrade = 'D'
        else if (longTermPrediction >= 50) predictedGrade = 'E'
        else predictedGrade = 'F'

        // Key factors affecting forecast
        const keyFactors = prediction.factors
            .filter(f => Math.abs(f.impact) >= 5)
            .map(f => f.description)

        return {
            shortTerm: {
                predictedScore: shortTermPrediction,
                confidence: prediction.confidenceLevel,
                trend: shortTermTrend
            },
            mediumTerm: {
                predictedScore: Math.round(mediumTermPrediction),
                confidence: Math.max(30, prediction.confidenceLevel - 15),
                riskOfDecline: Math.round(riskOfDecline)
            },
            longTerm: {
                predictedFinalGrade: predictedGrade,
                passLikelihood: probability.probability
            },
            keyFactors
        }
    }

    /**
     * Generate daily study plan
     */
    static async generateDailyStudyPlan(
        studentId: string,
        availableMinutes: number = 60
    ): Promise<Array<{
        activity: string
        duration: number
        priority: 'HIGH' | 'MEDIUM' | 'LOW'
        concept?: string
    }>> {
        const plan: Array<{
            activity: string
            duration: number
            priority: 'HIGH' | 'MEDIUM' | 'LOW'
            concept?: string
        }> = []

        const weakConcepts = await PredictionEngine.identifyWeakConcepts(studentId)

        let remainingTime = availableMinutes

        // Priority 1: Weak concepts (40% of time)
        const weakConceptTime = Math.floor(availableMinutes * 0.4)
        if (weakConcepts.length > 0 && remainingTime > 0) {
            const topWeak = weakConcepts[0]
            const duration = Math.min(weakConceptTime, remainingTime)
            plan.push({
                activity: `Révision : ${topWeak.conceptTitle}`,
                duration,
                priority: 'HIGH',
                concept: topWeak.conceptId
            })
            remainingTime -= duration
        }

        // Priority 2: Practice exercises (30% of time)
        if (remainingTime > 0) {
            const practiceTime = Math.min(Math.floor(availableMinutes * 0.3), remainingTime)
            plan.push({
                activity: 'Exercices pratiques',
                duration: practiceTime,
                priority: 'MEDIUM'
            })
            remainingTime -= practiceTime
        }

        // Priority 3: Review previous material (20% of time)
        if (remainingTime > 0) {
            const reviewTime = Math.min(Math.floor(availableMinutes * 0.2), remainingTime)
            plan.push({
                activity: 'Révision des cours récents',
                duration: reviewTime,
                priority: 'LOW'
            })
            remainingTime -= reviewTime
        }

        // Priority 4: Self-evaluation (remaining time)
        if (remainingTime > 0) {
            plan.push({
                activity: 'Auto-évaluation des progrès',
                duration: remainingTime,
                priority: 'LOW'
            })
        }

        return plan
    }
}
