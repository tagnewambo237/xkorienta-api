import { IObserver } from '../interfaces/IObserver'
import { Event, EventType, ExamCompletedEvent } from '../types'
import { publishEvent } from '../EventPublisher'
import LearnerProfile from '@/models/LearnerProfile'

/**
 * Observateur pour l'attribution automatique des badges
 */
export class BadgeAwardObserver implements IObserver {
    getName(): string {
        return 'BadgeAwardObserver'
    }

    getInterestedEvents(): string[] {
        return [
            EventType.EXAM_COMPLETED,
            EventType.STREAK_ACHIEVED,
            EventType.LEVEL_UP
        ]
    }

    async update(event: Event): Promise<void> {
        switch (event.type) {
            case EventType.EXAM_COMPLETED:
                await this.checkExamBadges(event as ExamCompletedEvent)
                break

            case EventType.STREAK_ACHIEVED:
                // Logique pour les badges de streak
                break

            case EventType.LEVEL_UP:
                // Logique pour les badges de niveau
                break
        }
    }

    private async checkExamBadges(event: ExamCompletedEvent): Promise<void> {
        console.log(`[Badges] Checking badges for user ${event.userId}`)

        try {
            const profile = await LearnerProfile.findOne({ user: event.userId })
            if (!profile) return

            const newBadges: string[] = []

            // Badge: Premier examen réussi
            if (event.data.passed && profile.stats.totalExamsTaken === 1) {
                await this.awardBadge(profile, 'FIRST_WIN', 'Première victoire', 'Avoir réussi son premier examen')
            }

            // Badge: Perfection (100%)
            if (event.data.percentage === 100) {
                await this.awardBadge(profile, 'PERFECTIONIST', 'Perfectionniste', 'Avoir obtenu 100% à un examen')
            }

            // Badge: Rapidité (Terminé en moins de 50% du temps)
            // Supposons qu'on ait accès à la durée totale de l'examen via une requête ou event data enrichi
            // if (event.data.timeSpent < examDuration * 0.5) ...

            // Badge: Persévérance (Réussi après échec)
            // Nécessite de vérifier l'historique des tentatives...

        } catch (error) {
            console.error('[Badges] Error checking badges:', error)
        }
    }

    private async awardBadge(profile: any, badgeId: string, badgeName: string, reason: string): Promise<void> {
        // Vérifier si le badge est déjà acquis
        const hasBadge = profile.gamification.badges.some((b: any) => b.id === badgeId)

        if (!hasBadge) {
            console.log(`[Badges] Awarding badge ${badgeId} to user ${profile.user}`)

            // Ajouter le badge au profil
            profile.gamification.badges.push({
                id: badgeId,
                name: badgeName,
                earnedAt: new Date(),
                icon: '🏆' // À remplacer par une vraie icône ou URL
            })

            await profile.save()

            // Publier l'événement BADGE_EARNED
            await publishEvent({
                type: EventType.BADGE_EARNED,
                timestamp: new Date(),
                userId: profile.user,
                data: {
                    badgeId,
                    badgeName,
                    reason
                }
            })
        }
    }
}
