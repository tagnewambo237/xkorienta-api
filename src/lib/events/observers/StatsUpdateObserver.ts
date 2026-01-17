import { IObserver } from '../interfaces/IObserver'
import { Event, EventType, ExamCompletedEvent, AttemptGradedEvent } from '../types'
import Exam from '@/models/Exam'
import LearnerProfile from '@/models/LearnerProfile'

/**
 * Observateur pour mettre à jour les statistiques
 */
export class StatsUpdateObserver implements IObserver {
    getName(): string {
        return 'StatsUpdateObserver'
    }

    getInterestedEvents(): string[] {
        return [
            EventType.EXAM_COMPLETED,
            EventType.ATTEMPT_GRADED,
            EventType.ATTEMPT_STARTED
        ]
    }

    async update(event: Event): Promise<void> {
        switch (event.type) {
            case EventType.EXAM_COMPLETED:
                await this.updateExamStats(event as ExamCompletedEvent)
                await this.updateLearnerStats(event as ExamCompletedEvent)
                break

            case EventType.ATTEMPT_GRADED:
                await this.updateGradingStats(event as AttemptGradedEvent)
                break

            case EventType.ATTEMPT_STARTED:
                await this.updateAttemptStats(event)
                break
        }
    }

    private async updateExamStats(event: ExamCompletedEvent): Promise<void> {
        console.log(`[Stats] Updating exam stats for exam ${event.data.examId}`)

        try {
            const exam = await Exam.findById(event.data.examId)
            if (!exam) {
                console.error('[Stats] Exam not found')
                return
            }

            // Mettre à jour les statistiques de l'examen
            const stats = exam.stats

            // Incrémenter le nombre de complétions
            stats.totalCompletions += 1

            // Mettre à jour la moyenne des scores
            const totalScore = stats.averageScore * (stats.totalCompletions - 1) + event.data.percentage
            stats.averageScore = totalScore / stats.totalCompletions

            // Mettre à jour le taux de réussite
            const previousPasses = stats.passRate * (stats.totalCompletions - 1) / 100
            const newPasses = previousPasses + (event.data.passed ? 1 : 0)
            stats.passRate = (newPasses / stats.totalCompletions) * 100

            // Mettre à jour le temps moyen
            const totalTime = stats.averageTime * (stats.totalCompletions - 1) + event.data.timeSpent
            stats.averageTime = totalTime / stats.totalCompletions

            // Mettre à jour la date de dernière tentative
            stats.lastAttemptDate = new Date()

            await exam.save()
            console.log('[Stats] Exam stats updated successfully')
        } catch (error) {
            console.error('[Stats] Error updating exam stats:', error)
        }
    }

    private async updateLearnerStats(event: ExamCompletedEvent): Promise<void> {
        console.log(`[Stats] Updating learner stats for user ${event.userId}`)

        try {
            const profile = await LearnerProfile.findOne({ user: event.userId })
            if (!profile) {
                console.error('[Stats] Learner profile not found')
                return
            }

            // Mettre à jour les statistiques de l'apprenant
            const stats = profile.stats

            // Incrémenter le nombre d'examens passés
            stats.totalExamsTaken += 1

            // Mettre à jour la moyenne des scores
            const totalScore = stats.averageScore * (stats.totalExamsTaken - 1) + event.data.percentage
            stats.averageScore = totalScore / stats.totalExamsTaken

            // Mettre à jour le temps d'étude total (en minutes)
            stats.totalStudyTime += event.data.timeSpent

            // Mettre à jour la date de dernière activité
            stats.lastActivityDate = new Date()

            await profile.save()
            console.log('[Stats] Learner stats updated successfully')
        } catch (error) {
            console.error('[Stats] Error updating learner stats:', error)
        }
    }

    private async updateGradingStats(event: AttemptGradedEvent): Promise<void> {
        console.log(`[Stats] Updating grading stats for attempt ${event.data.attemptId}`)

        // Logique supplémentaire pour les stats de correction
        // Par exemple, suivre le temps de correction, etc.
    }

    private async updateAttemptStats(event: Event): Promise<void> {
        console.log(`[Stats] Updating attempt stats`)

        try {
            const exam = await Exam.findById(event.data.examId)
            if (!exam) {
                return
            }

            // Incrémenter le nombre total de tentatives
            exam.stats.totalAttempts += 1
            await exam.save()
        } catch (error) {
            console.error('[Stats] Error updating attempt stats:', error)
        }
    }
}
