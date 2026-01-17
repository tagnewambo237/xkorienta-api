import { EventPublisher } from './EventPublisher'
import { EmailNotificationObserver } from './observers/EmailNotificationObserver'
import { StatsUpdateObserver } from './observers/StatsUpdateObserver'
import { BadgeAwardObserver } from './observers/BadgeAwardObserver'
import { XPUpdateObserver } from './observers/XPUpdateObserver'
import { NotificationObserver } from './observers/NotificationObserver'

export * from './types'
export * from './interfaces/IObserver'
export * from './EventPublisher'

/**
 * Initialise le système d'événements en enregistrant tous les observateurs
 */
export const initEventSystem = (): void => {
    const publisher = EventPublisher.getInstance()

    // Vérifier si déjà initialisé pour éviter les doublons (si appelé plusieurs fois)
    // Note: EventPublisher gère déjà les doublons d'abonnement, mais c'est bien d'être explicite

    console.log('[EventSystem] Initializing observers...')

    // Enregistrer les observateurs
    publisher.subscribe(new NotificationObserver())
    publisher.subscribe(new EmailNotificationObserver())
    publisher.subscribe(new StatsUpdateObserver())
    publisher.subscribe(new BadgeAwardObserver())
    publisher.subscribe(new XPUpdateObserver())

    console.log('[EventSystem] Initialization complete.')

    // Afficher l'état
    const observers = publisher.listObservers()
    for (const [event, obsList] of observers.entries()) {
        console.log(`[EventSystem] ${event}: ${obsList.length} observers (${obsList.join(', ')})`)
    }
}
