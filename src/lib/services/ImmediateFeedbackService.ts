/**
 * ImmediateFeedbackService
 * 
 * Service pour générer du feedback immédiat après chaque réponse
 * dans les évaluations formatives et auto-évaluations.
 */

import { MasteryLevel, MASTERY_LEVEL_INFO, MASTERY_LEVEL_PERCENTAGES } from '@/lib/patterns/EvaluationStrategy'

// ==========================================
// TYPES
// ==========================================

export interface QuestionFeedback {
    questionId: string
    isCorrect: boolean
    earnedPoints: number
    maxPoints: number
    correctAnswerIds: string[]
    selectedAnswerIds: string[]
    feedback: string
    detailedFeedback?: string[]  // Feedback for each option
    encouragement: string
    conceptHint?: string
}

export interface ExamFeedback {
    examId: string
    totalScore: number
    maxScore: number
    percentage: number
    passed: boolean
    overallFeedback: string
    strengthAreas: string[]
    improvementAreas: string[]
    recommendations: string[]
    masteryLevel: MasteryLevel
    nextSteps: string[]
}

export interface ConceptRecommendation {
    conceptId: string
    conceptTitle: string
    currentMastery: number
    recommendedAction: 'REVIEW' | 'PRACTICE' | 'ADVANCE' | 'MASTER'
    resources?: { title: string; url: string; type: string }[]
}

// ==========================================
// FEEDBACK MESSAGES
// ==========================================

const ENCOURAGEMENT_MESSAGES = {
    correct: [
        "Excellent travail ! 🎉",
        "Parfait ! Vous maîtrisez ce concept. ✨",
        "Bravo ! Continuez sur cette lancée ! 💪",
        "Super ! C'est exactement ça ! 🌟",
        "Bien joué ! Votre compréhension est solide. 👏"
    ],
    incorrect: [
        "Pas tout à fait, mais ne vous découragez pas ! 💡",
        "Ce n'est pas la bonne réponse, mais chaque erreur est une opportunité d'apprendre. 📚",
        "Presque ! Revoyez ce concept pour mieux le comprendre. 🔍",
        "Continuez vos efforts, la persévérance paie ! 🎯",
        "Ce concept mérite une révision. Vous y arriverez ! 🚀"
    ],
    partial: [
        "Vous êtes sur la bonne voie ! 🌱",
        "Partiellement correct. Approfondissez ce sujet. 📖",
        "Bon début ! Continuez à explorer ce concept. 🔎"
    ]
}

const OVERALL_FEEDBACK = {
    excellent: (percentage: number) =>
        `Félicitations ! Avec ${percentage}% de réussite, vous démontrez une excellente maîtrise du sujet. Continuez à approfondir vos connaissances !`,
    good: (percentage: number) =>
        `Très bien ! Vous avez obtenu ${percentage}%. Votre compréhension est solide, mais quelques points méritent encore votre attention.`,
    average: (percentage: number) =>
        `Vous avez obtenu ${percentage}%. C'est un bon point de départ ! Concentrez-vous sur les domaines où vous avez rencontré des difficultés.`,
    needsWork: (percentage: number) =>
        `Avec ${percentage}%, il y a des opportunités d'amélioration. Ne vous découragez pas - révisez les concepts clés et réessayez !`,
    struggling: (percentage: number) =>
        `Score de ${percentage}%. Ce sujet nécessite plus d'attention. Prenez le temps de revoir les fondamentaux avant de continuer.`
}

// ==========================================
// SERVICE
// ==========================================

export class ImmediateFeedbackService {

    /**
     * Generate feedback for a single question response
     */
    static generateQuestionFeedback(
        question: {
            id: string
            text: string
            points: number
            options?: { id: string; text: string; isCorrect: boolean; feedback?: string }[]
            correctAnswer?: boolean
            modelAnswer?: string
            conceptId?: string
        },
        response: {
            selectedOptionIds?: string[]
            selectedAnswer?: boolean
            textAnswer?: string
        },
        isCorrect: boolean
    ): QuestionFeedback {
        const maxPoints = question.points || 1
        const earnedPoints = isCorrect ? maxPoints : 0

        // Determine correct answers
        const correctAnswerIds = question.options
            ?.filter(o => o.isCorrect)
            .map(o => o.id) || []

        // Get random encouragement message
        const encouragementPool = isCorrect
            ? ENCOURAGEMENT_MESSAGES.correct
            : ENCOURAGEMENT_MESSAGES.incorrect
        const encouragement = encouragementPool[Math.floor(Math.random() * encouragementPool.length)]

        // Collect detailed feedback from options
        const detailedFeedback: string[] = []
        if (question.options) {
            for (const option of question.options) {
                if (option.feedback) {
                    const isSelected = response.selectedOptionIds?.includes(option.id)
                    if (isSelected || option.isCorrect) {
                        detailedFeedback.push(
                            `${option.isCorrect ? '✓' : '✗'} ${option.text}: ${option.feedback}`
                        )
                    }
                }
            }
        }

        // Build main feedback
        let feedback = isCorrect
            ? "Bonne réponse !"
            : "Ce n'est pas la bonne réponse."

        if (!isCorrect && correctAnswerIds.length > 0 && question.options) {
            const correctTexts = question.options
                .filter(o => o.isCorrect)
                .map(o => o.text)
            feedback += ` La bonne réponse était : ${correctTexts.join(', ')}.`
        }

        return {
            questionId: question.id,
            isCorrect,
            earnedPoints,
            maxPoints,
            correctAnswerIds,
            selectedAnswerIds: response.selectedOptionIds || [],
            feedback,
            detailedFeedback: detailedFeedback.length > 0 ? detailedFeedback : undefined,
            encouragement,
            conceptHint: question.conceptId
                ? `Ce concept fait partie de vos objectifs d'apprentissage.`
                : undefined
        }
    }

    /**
     * Generate comprehensive feedback for an entire exam
     */
    static generateExamFeedback(
        exam: {
            id: string
            title: string
            passingScore?: number
            pedagogicalObjective?: string
        },
        attempt: {
            score: number
            maxScore: number
            responses: { questionId: string; isCorrect: boolean }[]
        },
        questions: { id: string; conceptId?: string; difficulty?: string }[]
    ): ExamFeedback {
        const percentage = attempt.maxScore > 0
            ? Math.round((attempt.score / attempt.maxScore) * 100)
            : 0
        const passingScore = exam.passingScore || 50
        const passed = percentage >= passingScore

        // Determine mastery level based on percentage
        let masteryLevel: MasteryLevel
        if (percentage >= 90) masteryLevel = MasteryLevel.PERFECTLY_ABLE
        else if (percentage >= 75) masteryLevel = MasteryLevel.ABLE_ALONE
        else if (percentage >= 60) masteryLevel = MasteryLevel.ABLE_WITH_HELP
        else if (percentage >= 40) masteryLevel = MasteryLevel.UNABLE_ALONE
        else if (percentage >= 25) masteryLevel = MasteryLevel.UNABLE_WITH_HELP
        else if (percentage > 0) masteryLevel = MasteryLevel.TOTALLY_UNABLE
        else masteryLevel = MasteryLevel.UNKNOWN

        // Generate overall feedback
        let overallFeedback: string
        if (percentage >= 90) overallFeedback = OVERALL_FEEDBACK.excellent(percentage)
        else if (percentage >= 75) overallFeedback = OVERALL_FEEDBACK.good(percentage)
        else if (percentage >= 50) overallFeedback = OVERALL_FEEDBACK.average(percentage)
        else if (percentage >= 25) overallFeedback = OVERALL_FEEDBACK.needsWork(percentage)
        else overallFeedback = OVERALL_FEEDBACK.struggling(percentage)

        // Identify strength and improvement areas (by concept if available)
        const strengthAreas: string[] = []
        const improvementAreas: string[] = []

        // Group by concept if available
        const conceptPerformance = new Map<string, { correct: number; total: number }>()
        for (const response of attempt.responses) {
            const question = questions.find(q => q.id === response.questionId)
            const conceptId = question?.conceptId || 'general'

            if (!conceptPerformance.has(conceptId)) {
                conceptPerformance.set(conceptId, { correct: 0, total: 0 })
            }

            const perf = conceptPerformance.get(conceptId)!
            perf.total++
            if (response.isCorrect) perf.correct++
        }

        for (const [conceptId, perf] of conceptPerformance) {
            const conceptPercent = (perf.correct / perf.total) * 100
            if (conceptPercent >= 80) {
                strengthAreas.push(`Concept ${conceptId}: ${Math.round(conceptPercent)}% de réussite`)
            } else if (conceptPercent < 50) {
                improvementAreas.push(`Concept ${conceptId}: nécessite une révision`)
            }
        }

        // Generate recommendations
        const recommendations: string[] = []
        if (percentage < 50) {
            recommendations.push("Revoyez les concepts fondamentaux avant de continuer")
            recommendations.push("Consultez les ressources pédagogiques associées")
        } else if (percentage < 75) {
            recommendations.push("Concentrez-vous sur les domaines d'amélioration identifiés")
            recommendations.push("Pratiquez davantage avec des exercices similaires")
        } else {
            recommendations.push("Passez au niveau supérieur de difficulté")
            recommendations.push("Explorez des sujets connexes pour approfondir vos connaissances")
        }

        // Next steps based on pedagogical objective
        const nextSteps: string[] = []
        if (exam.pedagogicalObjective === 'FORMATIVE_EVAL') {
            nextSteps.push("Revisez les questions incorrectes et leurs explications")
            nextSteps.push("Effectuez une auto-évaluation de vos compétences")
        } else if (exam.pedagogicalObjective === 'DIAGNOSTIC_EVAL') {
            nextSteps.push("Identifiez les lacunes révélées par cette évaluation")
            nextSteps.push("Établissez un plan de remédiation personnalisé")
        } else {
            nextSteps.push("Consultez vos résultats détaillés")
            nextSteps.push("Préparez-vous pour la prochaine évaluation")
        }

        return {
            examId: exam.id,
            totalScore: attempt.score,
            maxScore: attempt.maxScore,
            percentage,
            passed,
            overallFeedback,
            strengthAreas,
            improvementAreas,
            recommendations,
            masteryLevel,
            nextSteps
        }
    }

    /**
     * Get concept recommendations based on performance
     */
    static getConceptRecommendations(
        weakPoints: { conceptId: string; conceptTitle: string; performance: number }[]
    ): ConceptRecommendation[] {
        return weakPoints.map(point => {
            let recommendedAction: ConceptRecommendation['recommendedAction']

            if (point.performance < 25) {
                recommendedAction = 'REVIEW'
            } else if (point.performance < 50) {
                recommendedAction = 'PRACTICE'
            } else if (point.performance < 75) {
                recommendedAction = 'ADVANCE'
            } else {
                recommendedAction = 'MASTER'
            }

            return {
                conceptId: point.conceptId,
                conceptTitle: point.conceptTitle,
                currentMastery: point.performance,
                recommendedAction
            }
        }).sort((a, b) => a.currentMastery - b.currentMastery) // Weakest first
    }

    /**
     * Convert mastery level to user-friendly feedback
     */
    static getMasteryFeedback(level: MasteryLevel): {
        label: string
        color: string
        description: string
        percentage: number
    } {
        return {
            ...MASTERY_LEVEL_INFO[level],
            percentage: MASTERY_LEVEL_PERCENTAGES[level]
        }
    }
}
