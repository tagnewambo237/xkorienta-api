import { IObserver } from '../interfaces/IObserver'
import { Event, EventType, ExamCompletedEvent, AttemptGradedEvent } from '../types'

/**
 * Observateur pour envoyer des notifications par email
 */
export class EmailNotificationObserver implements IObserver {
    getName(): string {
        return 'EmailNotificationObserver'
    }

    getInterestedEvents(): string[] {
        return [
            EventType.EXAM_COMPLETED,
            EventType.EXAM_VALIDATED,
            EventType.ATTEMPT_GRADED,
            EventType.BADGE_EARNED,
            EventType.LEVEL_UP,
            EventType.LATE_CODE_GENERATED
        ]
    }

    async update(event: Event): Promise<void> {
        switch (event.type) {
            case EventType.EXAM_COMPLETED:
                await this.sendExamCompletedEmail(event as ExamCompletedEvent)
                break

            case EventType.ATTEMPT_GRADED:
                await this.sendAttemptGradedEmail(event as AttemptGradedEvent)
                break

            case EventType.BADGE_EARNED:
                await this.sendBadgeEarnedEmail(event)
                break

            case EventType.LEVEL_UP:
                await this.sendLevelUpEmail(event)
                break

            case EventType.LATE_CODE_GENERATED:
                await this.sendLateCodeEmail(event)
                break

            case EventType.EXAM_VALIDATED:
                await this.sendExamValidatedEmail(event)
                break
        }
    }

    private async sendExamCompletedEmail(event: ExamCompletedEvent): Promise<void> {
        console.log(`[Email] Sending exam completion email to user ${event.userId}`)

        // TODO: Intégrer avec un service d'email (SendGrid, Resend, etc.)
        const emailData = {
            to: event.userId,
            subject: 'Examen terminé',
            template: 'exam-completed',
            data: {
                score: event.data.score,
                maxScore: event.data.maxScore,
                percentage: event.data.percentage,
                passed: event.data.passed,
                timeSpent: event.data.timeSpent
            }
        }

        // Simuler l'envoi
        console.log('[Email] Email data:', emailData)
    }

    private async sendAttemptGradedEmail(event: AttemptGradedEvent): Promise<void> {
        console.log(`[Email] Sending grading notification to user ${event.userId}`)

        const emailData = {
            to: event.userId,
            subject: 'Votre examen a été corrigé',
            template: 'attempt-graded',
            data: {
                score: event.data.score,
                percentage: event.data.percentage,
                passed: event.data.passed
            }
        }

        console.log('[Email] Email data:', emailData)
    }

    private async sendBadgeEarnedEmail(event: Event): Promise<void> {
        console.log(`[Email] Sending badge earned email to user ${event.userId}`)

        const emailData = {
            to: event.userId,
            subject: `Nouveau badge débloqué: ${event.data.badgeName}`,
            template: 'badge-earned',
            data: event.data
        }

        console.log('[Email] Email data:', emailData)
    }

    private async sendLevelUpEmail(event: Event): Promise<void> {
        console.log(`[Email] Sending level up email to user ${event.userId}`)

        const emailData = {
            to: event.userId,
            subject: `Félicitations ! Niveau ${event.data.newLevel} atteint`,
            template: 'level-up',
            data: event.data
        }

        console.log('[Email] Email data:', emailData)
    }

    private async sendLateCodeEmail(event: Event): Promise<void> {
        console.log(`[Email] Sending late code email to user ${event.userId}`)

        const emailData = {
            to: event.userId,
            subject: 'Code de retard généré',
            template: 'late-code-generated',
            data: event.data
        }

        console.log('[Email] Email data:', emailData)
    }

    private async sendExamValidatedEmail(event: Event): Promise<void> {
        console.log(`[Email] Sending exam validated email to user ${event.userId}`)

        const emailData = {
            to: event.userId,
            subject: 'Votre examen a été validé',
            template: 'exam-validated',
            data: event.data
        }

        console.log('[Email] Email data:', emailData)
    }
}
