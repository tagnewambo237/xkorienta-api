import { IExam } from '@/models/Exam'
import { EvaluationResult } from './EvaluationStrategy'

/**
 * Decorator Pattern pour enrichir les examens
 * 
 * Permet d'ajouter dynamiquement des fonctionnalités aux examens
 * sans modifier leur structure de base
 */

export interface ExamDecorator {
    decorate(exam: IExam): IExam
    enhanceResult?(result: EvaluationResult, exam: IExam): EvaluationResult
}

/**
 * Décorateur de base abstrait
 */
export abstract class BaseExamDecorator implements ExamDecorator {
    constructor(protected decoratedExam?: IExam) { }

    abstract decorate(exam: IExam): IExam

    enhanceResult(result: EvaluationResult, exam: IExam): EvaluationResult {
        return result
    }
}

/**
 * Décorateur pour ajouter un système de bonus temporel
 * Récompense les étudiants qui terminent rapidement
 */
export class TimeBonusDecorator extends BaseExamDecorator {
    decorate(exam: IExam): IExam {
        return exam // Pas de modification structurelle
    }

    enhanceResult(result: EvaluationResult, exam: IExam, timeSpent?: number): EvaluationResult {
        if (!timeSpent || !exam.duration) {
            return result
        }

        const timePercentage = (timeSpent / exam.duration) * 100

        // Bonus si terminé en moins de 75% du temps
        if (timePercentage < 75) {
            const bonusPercentage = (75 - timePercentage) / 10 // Max 7.5% bonus
            const bonusPoints = (result.maxScore * bonusPercentage) / 100

            return {
                ...result,
                score: result.score + bonusPoints,
                percentage: ((result.score + bonusPoints) / result.maxScore) * 100,
                feedback: `${result.feedback} Bonus temps: +${Math.round(bonusPoints)} points !`,
                details: {
                    ...result.details,
                    timeBonus: Math.round(bonusPoints * 100) / 100,
                    timeSpent,
                    timeSaved: exam.duration - timeSpent
                }
            }
        }

        return result
    }
}

/**
 * Décorateur pour ajouter un système de streak (série de bonnes réponses)
 * Récompense les séries de réponses correctes consécutives
 */
export class StreakBonusDecorator extends BaseExamDecorator {
    decorate(exam: IExam): IExam {
        return exam
    }

    enhanceResult(result: EvaluationResult, exam: IExam, responses?: any[]): EvaluationResult {
        if (!responses || responses.length === 0) {
            return result
        }

        // Calculer les streaks
        let currentStreak = 0
        let maxStreak = 0
        let streakBonus = 0

        const sortedResponses = responses.sort((a, b) =>
            new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime()
        )

        for (const response of sortedResponses) {
            if (response.isCorrect) {
                currentStreak++
                maxStreak = Math.max(maxStreak, currentStreak)

                // Bonus pour streak de 3+
                if (currentStreak >= 3) {
                    streakBonus += 0.5 * (currentStreak - 2)
                }
            } else {
                currentStreak = 0
            }
        }

        if (streakBonus > 0) {
            return {
                ...result,
                score: result.score + streakBonus,
                percentage: ((result.score + streakBonus) / result.maxScore) * 100,
                feedback: `${result.feedback} Bonus série: +${Math.round(streakBonus)} points !`,
                details: {
                    ...result.details,
                    streakBonus: Math.round(streakBonus * 100) / 100,
                    maxStreak
                }
            }
        }

        return result
    }
}

/**
 * Décorateur pour ajouter un système de pénalité de temps
 * Pénalise les étudiants qui dépassent le temps imparti
 */
export class TimePenaltyDecorator extends BaseExamDecorator {
    decorate(exam: IExam): IExam {
        return exam
    }

    enhanceResult(result: EvaluationResult, exam: IExam, timeSpent?: number): EvaluationResult {
        if (!timeSpent || !exam.duration) {
            return result
        }

        const overtime = timeSpent - exam.duration

        if (overtime > 0) {
            // Pénalité de 1% par minute de dépassement
            const penaltyPercentage = Math.min(overtime / exam.duration * 100, 20) // Max 20%
            const penaltyPoints = (result.maxScore * penaltyPercentage) / 100

            return {
                ...result,
                score: Math.max(0, result.score - penaltyPoints),
                percentage: Math.max(0, ((result.score - penaltyPoints) / result.maxScore) * 100),
                feedback: `${result.feedback} Pénalité temps: -${Math.round(penaltyPoints)} points.`,
                details: {
                    ...result.details,
                    timePenalty: Math.round(penaltyPoints * 100) / 100,
                    overtime
                }
            }
        }

        return result
    }
}

/**
 * Décorateur pour ajouter des badges de performance
 */
export class BadgeDecorator extends BaseExamDecorator {
    decorate(exam: IExam): IExam {
        return exam
    }

    enhanceResult(result: EvaluationResult, exam: IExam): EvaluationResult {
        const badges: string[] = []

        // Badge de perfection
        if (result.percentage === 100) {
            badges.push('🏆 Perfection')
        }

        // Badge de rapidité
        if (result.details?.timeBonus) {
            badges.push('⚡ Éclair')
        }

        // Badge de série
        if (result.details?.maxStreak && result.details.maxStreak >= 5) {
            badges.push('🔥 En feu')
        }

        // Badge de réussite
        if (result.passed && result.percentage >= 90) {
            badges.push('⭐ Excellence')
        } else if (result.passed && result.percentage >= 75) {
            badges.push('✨ Très bien')
        }

        if (badges.length > 0) {
            return {
                ...result,
                feedback: `${result.feedback} Badges: ${badges.join(', ')}`,
                details: {
                    ...result.details,
                    badges
                }
            }
        }

        return result
    }
}

/**
 * Décorateur pour ajouter des statistiques détaillées
 */
export class DetailedStatsDecorator extends BaseExamDecorator {
    decorate(exam: IExam): IExam {
        return exam
    }

    enhanceResult(result: EvaluationResult, exam: IExam, responses?: any[], questions?: any[]): EvaluationResult {
        if (!responses || !questions) {
            return result
        }

        // Calculer des statistiques avancées
        const timePerQuestion = responses.map(r => ({
            questionId: r.questionId,
            timeSpent: r.timeSpent || 0
        }))

        const avgTimePerQuestion = timePerQuestion.reduce((sum, q) => sum + q.timeSpent, 0) / timePerQuestion.length

        // Identifier les points forts et faibles
        const byDifficulty = questions.reduce((acc: any, q: any) => {
            const response = responses.find(r => r.questionId.toString() === q._id.toString())
            const difficulty = q.difficulty || 'INTERMEDIATE'

            if (!acc[difficulty]) {
                acc[difficulty] = { correct: 0, total: 0 }
            }

            acc[difficulty].total++
            if (response?.isCorrect) {
                acc[difficulty].correct++
            }

            return acc
        }, {})

        return {
            ...result,
            details: {
                ...result.details,
                avgTimePerQuestion: Math.round(avgTimePerQuestion),
                performanceByDifficulty: byDifficulty,
                fastestQuestion: Math.min(...timePerQuestion.map(q => q.timeSpent)),
                slowestQuestion: Math.max(...timePerQuestion.map(q => q.timeSpent))
            }
        }
    }
}

/**
 * Factory pour composer plusieurs décorateurs
 */
export class ExamDecoratorFactory {
    /**
     * Applique une chaîne de décorateurs à un résultat d'évaluation
     */
    static applyDecorators(
        result: EvaluationResult,
        exam: IExam,
        options: {
            timeSpent?: number
            responses?: any[]
            questions?: any[]
            enableTimeBonus?: boolean
            enableStreakBonus?: boolean
            enableBadges?: boolean
            enableDetailedStats?: boolean
        }
    ): EvaluationResult {
        let enhancedResult = result

        // Appliquer les décorateurs selon les options
        if (options.enableTimeBonus && options.timeSpent) {
            const decorator = new TimeBonusDecorator()
            enhancedResult = decorator.enhanceResult(enhancedResult, exam, options.timeSpent)
        }

        if (options.enableStreakBonus && options.responses) {
            const decorator = new StreakBonusDecorator()
            enhancedResult = decorator.enhanceResult(enhancedResult, exam, options.responses)
        }

        if (options.enableBadges) {
            const decorator = new BadgeDecorator()
            enhancedResult = decorator.enhanceResult(enhancedResult, exam)
        }

        if (options.enableDetailedStats && options.responses && options.questions) {
            const decorator = new DetailedStatsDecorator()
            enhancedResult = decorator.enhanceResult(enhancedResult, exam, options.responses, options.questions)
        }

        return enhancedResult
    }
}
