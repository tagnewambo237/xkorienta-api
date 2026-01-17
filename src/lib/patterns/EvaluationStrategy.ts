import { IExam } from '@/models/Exam'
import { EvaluationType } from '@/models/enums'
import mongoose from 'mongoose'

/**
 * Strategy Pattern pour l'évaluation des examens et des concepts
 * 
 * Permet de définir différentes stratégies d'évaluation selon le type d'examen
 */

// ==========================================
// MASTERY LEVELS FOR CONCEPT SELF-EVALUATION
// ==========================================

export enum MasteryLevel {
    UNKNOWN = 'UNKNOWN',                    // Je ne sais pas
    TOTALLY_UNABLE = 'TOTALLY_UNABLE',      // Totalement incapable
    UNABLE_WITH_HELP = 'UNABLE_WITH_HELP',  // Incapable même avec aide
    UNABLE_ALONE = 'UNABLE_ALONE',          // Incapable sans aide
    ABLE_WITH_HELP = 'ABLE_WITH_HELP',      // Capable avec aide
    ABLE_ALONE = 'ABLE_ALONE',              // Capable sans aide
    PERFECTLY_ABLE = 'PERFECTLY_ABLE'       // Je suis parfaitement capable
}

export const MASTERY_LEVEL_PERCENTAGES: Record<MasteryLevel, number> = {
    [MasteryLevel.UNKNOWN]: 0,
    [MasteryLevel.TOTALLY_UNABLE]: 10,
    [MasteryLevel.UNABLE_WITH_HELP]: 25,
    [MasteryLevel.UNABLE_ALONE]: 40,
    [MasteryLevel.ABLE_WITH_HELP]: 60,
    [MasteryLevel.ABLE_ALONE]: 80,
    [MasteryLevel.PERFECTLY_ABLE]: 100
}

export const MASTERY_LEVEL_INFO: Record<MasteryLevel, { label: string; color: string; description: string }> = {
    [MasteryLevel.UNKNOWN]: { label: "Je ne sais pas", color: "#9ca3af", description: "Niveau non évalué" },
    [MasteryLevel.TOTALLY_UNABLE]: { label: "Totalement incapable", color: "#ef4444", description: "Aucune compréhension" },
    [MasteryLevel.UNABLE_WITH_HELP]: { label: "Incapable même avec aide", color: "#f97316", description: "Difficultés persistantes" },
    [MasteryLevel.UNABLE_ALONE]: { label: "Incapable sans aide", color: "#eab308", description: "Besoin d'accompagnement" },
    [MasteryLevel.ABLE_WITH_HELP]: { label: "Capable avec aide", color: "#3b82f6", description: "Maîtrise partielle" },
    [MasteryLevel.ABLE_ALONE]: { label: "Capable sans aide", color: "#6366f1", description: "Bonne maîtrise" },
    [MasteryLevel.PERFECTLY_ABLE]: { label: "Parfaitement capable", color: "#22c55e", description: "Maîtrise totale" }
}

// ==========================================
// INTERFACES
// ==========================================

export interface EvaluationResult {
    score: number
    maxScore: number
    percentage: number
    passed: boolean
    feedback?: string
    details?: Record<string, any>
}

export interface EvaluationStrategy {
    evaluate(
        exam: IExam,
        responses: any[],
        questions: any[]
    ): Promise<EvaluationResult>
}

// Additional interface for concept self-evaluation
export interface ConceptEvaluationInput {
    userId: string
    conceptId: string
    syllabusId: string
    level: MasteryLevel
    reflection?: string
}

export interface ConceptEvaluationResult {
    level: MasteryLevel
    percentage: number
    label: string
    color: string
    reflection?: string
    evaluatedAt: Date
}

// ==========================================
// EXAM EVALUATION STRATEGIES
// ==========================================

/**
 * Stratégie pour les QCM (Questions à Choix Multiples)
 */
export class QCMEvaluationStrategy implements EvaluationStrategy {
    async evaluate(
        exam: IExam,
        responses: any[],
        questions: any[]
    ): Promise<EvaluationResult> {
        let score = 0
        let maxScore = 0

        for (const question of questions) {
            maxScore += question.points || 1

            const response = responses.find(
                r => r.questionId.toString() === question._id.toString()
            )

            if (response && response.isCorrect) {
                score += question.points || 1
            }
        }

        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
        const passed = percentage >= exam.config.passingScore

        return {
            score,
            maxScore,
            percentage: Math.round(percentage * 100) / 100,
            passed,
            feedback: passed ? 'Félicitations ! Vous avez réussi.' : 'Continuez vos efforts.',
            details: {
                correctAnswers: responses.filter(r => r.isCorrect).length,
                totalQuestions: questions.length
            }
        }
    }
}

/**
 * Stratégie pour les questions Vrai/Faux
 */
export class TrueFalseEvaluationStrategy implements EvaluationStrategy {
    async evaluate(
        exam: IExam,
        responses: any[],
        questions: any[]
    ): Promise<EvaluationResult> {
        let score = 0
        let maxScore = questions.length

        for (const question of questions) {
            const response = responses.find(
                r => r.questionId.toString() === question._id.toString()
            )

            if (response && response.isCorrect) {
                score += 1
            }
        }

        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
        const passed = percentage >= exam.config.passingScore

        return {
            score,
            maxScore,
            percentage: Math.round(percentage * 100) / 100,
            passed,
            feedback: passed ? 'Excellent travail !' : 'Revoyez les concepts de base.',
            details: {
                correctAnswers: score,
                totalQuestions: maxScore
            }
        }
    }
}

/**
 * Stratégie pour les évaluations adaptatives
 */
export class AdaptiveEvaluationStrategy implements EvaluationStrategy {
    async evaluate(
        exam: IExam,
        responses: any[],
        questions: any[]
    ): Promise<EvaluationResult> {
        let score = 0
        let maxScore = 0
        let difficultyBonus = 0

        const orderedResponses = responses.sort((a, b) =>
            new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime()
        )

        for (let i = 0; i < orderedResponses.length; i++) {
            const response = orderedResponses[i]
            const question = questions.find(
                q => q._id.toString() === response.questionId.toString()
            )

            if (!question) continue

            const basePoints = question.points || 1
            maxScore += basePoints

            if (response.isCorrect) {
                const difficultyMultiplier = this.getDifficultyMultiplier(question.difficulty)
                const earnedPoints = basePoints * difficultyMultiplier
                score += earnedPoints
                difficultyBonus += earnedPoints - basePoints
            }
        }

        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
        const passed = percentage >= exam.config.passingScore

        return {
            score,
            maxScore,
            percentage: Math.round(percentage * 100) / 100,
            passed,
            feedback: passed
                ? `Excellent ! Bonus de difficulté: +${Math.round(difficultyBonus)} points`
                : 'Continuez à vous entraîner sur les questions difficiles.',
            details: {
                correctAnswers: responses.filter(r => r.isCorrect).length,
                totalQuestions: questions.length,
                difficultyBonus: Math.round(difficultyBonus)
            }
        }
    }

    private getDifficultyMultiplier(difficulty?: string): number {
        switch (difficulty) {
            case 'BEGINNER': return 1.0
            case 'INTERMEDIATE': return 1.2
            case 'ADVANCED': return 1.5
            case 'EXPERT': return 2.0
            default: return 1.0
        }
    }
}

/**
 * Stratégie pour les simulations d'examen
 */
export class ExamSimulationStrategy implements EvaluationStrategy {
    async evaluate(
        exam: IExam,
        responses: any[],
        questions: any[]
    ): Promise<EvaluationResult> {
        let score = 0
        let maxScore = 0
        let penalties = 0

        for (const question of questions) {
            maxScore += question.points || 1

            const response = responses.find(
                r => r.questionId.toString() === question._id.toString()
            )

            if (response) {
                if (response.isCorrect) {
                    score += question.points || 1
                } else {
                    const penalty = (question.points || 1) * 0.25
                    penalties += penalty
                    score = Math.max(0, score - penalty)
                }
            }
        }

        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
        const passed = percentage >= exam.config.passingScore

        return {
            score: Math.round(score * 100) / 100,
            maxScore,
            percentage: Math.round(percentage * 100) / 100,
            passed,
            feedback: passed
                ? 'Vous êtes prêt pour l\'examen officiel !'
                : `Pénalités: -${Math.round(penalties)} points. Révisez les erreurs.`,
            details: {
                correctAnswers: responses.filter(r => r.isCorrect).length,
                incorrectAnswers: responses.filter(r => !r.isCorrect).length,
                totalQuestions: questions.length,
                penalties: Math.round(penalties * 100) / 100
            }
        }
    }
}

/**
 * Stratégie pour les questions ouvertes (OPEN_QUESTION)
 * Supporte plusieurs modes de correction: keywords, semantic, hybrid, manual
 */
export class OpenQuestionEvaluationStrategy implements EvaluationStrategy {
    async evaluate(
        exam: IExam,
        responses: any[],
        questions: any[]
    ): Promise<EvaluationResult> {
        let score = 0
        let maxScore = 0
        const questionResults: any[] = []

        for (const question of questions) {
            const questionPoints = question.points || 1
            maxScore += questionPoints

            const response = responses.find(
                r => r.questionId.toString() === question._id.toString()
            )

            if (!response || !response.textAnswer) {
                questionResults.push({
                    questionId: question._id,
                    earned: 0,
                    maxPoints: questionPoints,
                    status: 'unanswered'
                })
                continue
            }

            const studentAnswer = response.textAnswer.toLowerCase().trim()
            const config = question.openQuestionConfig || { gradingMode: 'hybrid' }
            const modelAnswer = (question.modelAnswer || '').toLowerCase().trim()

            let earnedPoints = 0
            let gradingDetails: any = { mode: config.gradingMode }

            // Check minimum/maximum length constraints
            if (config.minLength && studentAnswer.length < config.minLength) {
                gradingDetails.lengthError = `Réponse trop courte (min: ${config.minLength} caractères)`
                earnedPoints = 0
            } else if (config.maxLength && studentAnswer.length > config.maxLength) {
                gradingDetails.lengthError = `Réponse trop longue (max: ${config.maxLength} caractères)`
                earnedPoints = questionPoints * 0.5 // Partial credit
            } else {
                // Grade based on mode
                switch (config.gradingMode) {
                    case 'keywords':
                        earnedPoints = this.gradeByKeywords(studentAnswer, config, questionPoints)
                        gradingDetails.keywordResults = this.getKeywordMatches(studentAnswer, config)
                        break

                    case 'semantic':
                        earnedPoints = this.gradeBySemantic(studentAnswer, modelAnswer, config, questionPoints)
                        gradingDetails.semanticScore = earnedPoints / questionPoints
                        break

                    case 'hybrid':
                        const keywordScore = this.gradeByKeywords(studentAnswer, config, questionPoints)
                        const semanticScore = this.gradeBySemantic(studentAnswer, modelAnswer, config, questionPoints)
                        // Hybrid: 60% semantic, 40% keywords (or 100% semantic if no keywords)
                        const hasKeywords = (config.keywords || []).length > 0
                        if (hasKeywords) {
                            earnedPoints = (semanticScore * 0.6) + (keywordScore * 0.4)
                        } else {
                            earnedPoints = semanticScore
                        }
                        gradingDetails.keywordScore = keywordScore
                        gradingDetails.semanticScore = semanticScore
                        gradingDetails.keywordResults = this.getKeywordMatches(studentAnswer, config)
                        break

                    case 'manual':
                        // For manual grading, mark as pending review
                        earnedPoints = 0
                        gradingDetails.pendingReview = true
                        gradingDetails.manualGradingRequired = true
                        break

                    default:
                        earnedPoints = this.gradeBySemantic(studentAnswer, modelAnswer, config, questionPoints)
                }
            }

            score += earnedPoints

            // Update response with grading info (useful for review)
            response.isCorrect = earnedPoints >= questionPoints * 0.5
            response.earnedPoints = earnedPoints
            response.gradingDetails = gradingDetails

            questionResults.push({
                questionId: question._id,
                earned: Math.round(earnedPoints * 100) / 100,
                maxPoints: questionPoints,
                status: config.gradingMode === 'manual' ? 'pending_review' : 'graded',
                details: gradingDetails
            })
        }

        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
        const passed = percentage >= exam.config.passingScore
        const pendingManual = questionResults.some(r => r.status === 'pending_review')

        return {
            score: Math.round(score * 100) / 100,
            maxScore,
            percentage: Math.round(percentage * 100) / 100,
            passed: pendingManual ? false : passed, // Can't pass if manual review pending
            feedback: pendingManual
                ? 'Certaines questions sont en attente de correction manuelle.'
                : (passed ? 'Excellent travail sur les questions ouvertes !' : 'Continuez à développer vos réponses.'),
            details: {
                questionResults,
                pendingManualReview: pendingManual,
                autoGradedCount: questionResults.filter(r => r.status === 'graded').length,
                pendingReviewCount: questionResults.filter(r => r.status === 'pending_review').length
            }
        }
    }

    /**
     * Grade answer by keyword matching
     */
    private gradeByKeywords(answer: string, config: any, maxPoints: number): number {
        const keywords = config.keywords || []
        if (keywords.length === 0) return 0

        let totalWeight = 0
        let earnedWeight = 0
        const caseSensitive = config.caseSensitive || false
        const processedAnswer = caseSensitive ? answer : answer.toLowerCase()

        for (const kw of keywords) {
            const word = caseSensitive ? kw.word : kw.word.toLowerCase()
            const synonyms = (kw.synonyms || []).map((s: string) => caseSensitive ? s : s.toLowerCase())
            const allForms = [word, ...synonyms]

            totalWeight += kw.weight || 10

            // Check if any form of the keyword is present
            const found = allForms.some(form => processedAnswer.includes(form))

            if (found) {
                earnedWeight += kw.weight || 10
            } else if (kw.required) {
                // Required keyword missing = 0 points for this question
                return 0
            }
        }

        // Calculate proportional score
        return totalWeight > 0 ? (earnedWeight / totalWeight) * maxPoints : 0
    }

    /**
     * Get detailed keyword match results
     */
    private getKeywordMatches(answer: string, config: any): any[] {
        const keywords = config.keywords || []
        const caseSensitive = config.caseSensitive || false
        const processedAnswer = caseSensitive ? answer : answer.toLowerCase()

        return keywords.map((kw: any) => {
            const word = caseSensitive ? kw.word : kw.word.toLowerCase()
            const synonyms = (kw.synonyms || []).map((s: string) => caseSensitive ? s : s.toLowerCase())
            const allForms = [word, ...synonyms]
            const found = allForms.some(form => processedAnswer.includes(form))

            return {
                keyword: kw.word,
                found,
                weight: kw.weight || 10,
                required: kw.required || false
            }
        })
    }

    /**
     * Grade answer by semantic similarity (simplified version using keyword overlap)
     * For production, integrate with HuggingFace embeddings
     */
    private gradeBySemantic(answer: string, modelAnswer: string, config: any, maxPoints: number): number {
        if (!modelAnswer) return 0

        // Simple semantic scoring using word overlap (Jaccard similarity)
        // In production, replace with actual embedding similarity from HuggingFace
        const answerWords = new Set(answer.split(/\s+/).filter(w => w.length > 2))
        const modelWords = new Set(modelAnswer.split(/\s+/).filter(w => w.length > 2))

        if (modelWords.size === 0) return maxPoints // No model answer = full credit

        // Calculate Jaccard similarity
        const intersection = [...answerWords].filter(w => modelWords.has(w)).length
        const union = new Set([...answerWords, ...modelWords]).size
        const similarity = union > 0 ? intersection / union : 0

        // Apply threshold
        const threshold = config.semanticThreshold || 0.7

        if (similarity >= threshold) {
            return maxPoints
        } else if (similarity >= threshold * 0.5) {
            // Partial credit for close answers
            return maxPoints * (similarity / threshold)
        }

        return 0
    }
}

// ==========================================
// CONCEPT SELF-EVALUATION STRATEGY
// ==========================================

/**
 * Stratégie pour l'auto-évaluation des concepts (7 niveaux de maîtrise)
 */
export class ConceptSelfEvaluationStrategy {
    /**
     * Evaluate a concept based on student self-assessment
     */
    evaluate(input: ConceptEvaluationInput): ConceptEvaluationResult {
        const levelInfo = MASTERY_LEVEL_INFO[input.level]
        const percentage = MASTERY_LEVEL_PERCENTAGES[input.level]

        return {
            level: input.level,
            percentage,
            label: levelInfo.label,
            color: levelInfo.color,
            reflection: input.reflection,
            evaluatedAt: new Date()
        }
    }

    /**
     * Save the evaluation to database
     */
    async save(input: ConceptEvaluationInput): Promise<any> {
        const ConceptEvaluation = mongoose.models.ConceptEvaluation

        return await ConceptEvaluation.create({
            student: input.userId,
            concept: input.conceptId,
            syllabus: input.syllabusId,
            level: input.level,
            reflection: input.reflection,
            evaluatedAt: new Date()
        })
    }

    /**
     * Get all evaluations for a student on a syllabus
     */
    async getStudentProgress(studentId: string, syllabusId: string): Promise<any[]> {
        const ConceptEvaluation = mongoose.models.ConceptEvaluation

        return await ConceptEvaluation.find({
            student: studentId,
            syllabus: syllabusId
        }).populate('concept', 'title').sort({ evaluatedAt: -1 })
    }

    /**
     * Calculate overall mastery percentage for a syllabus
     */
    calculateOverallMastery(evaluations: ConceptEvaluationResult[]): number {
        if (evaluations.length === 0) return 0

        const totalPercentage = evaluations.reduce((sum, e) => sum + e.percentage, 0)
        return Math.round(totalPercentage / evaluations.length)
    }
}

// ==========================================
// FACTORY
// ==========================================

export class EvaluationStrategyFactory {
    static getStrategy(evaluationType: EvaluationType): EvaluationStrategy {
        switch (evaluationType) {
            case EvaluationType.QCM:
                return new QCMEvaluationStrategy()

            case EvaluationType.TRUE_FALSE:
                return new TrueFalseEvaluationStrategy()

            case EvaluationType.OPEN_QUESTION:
                return new OpenQuestionEvaluationStrategy()

            case EvaluationType.ADAPTIVE:
                return new AdaptiveEvaluationStrategy()

            case EvaluationType.EXAM_SIMULATION:
                return new ExamSimulationStrategy()

            default:
                return new QCMEvaluationStrategy()
        }
    }

    /**
     * Get the Concept Self-Evaluation Strategy
     */
    static getConceptSelfEvaluationStrategy(): ConceptSelfEvaluationStrategy {
        return new ConceptSelfEvaluationStrategy()
    }

    /**
     * Évalue un examen avec la stratégie appropriée
     */
    static async evaluateExam(
        exam: IExam,
        responses: any[],
        questions: any[]
    ): Promise<EvaluationResult> {
        const strategy = this.getStrategy(exam.evaluationType)
        return strategy.evaluate(exam, responses, questions)
    }

    /**
     * Evaluate a concept self-assessment
     */
    static evaluateConcept(input: ConceptEvaluationInput): ConceptEvaluationResult {
        const strategy = this.getConceptSelfEvaluationStrategy()
        return strategy.evaluate(input)
    }
}

