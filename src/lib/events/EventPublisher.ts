import { IObserver } from './interfaces/IObserver'
import { Event, EventType } from './types'

/**
 * EventPublisher - Implémentation du pattern Observer
 * 
 * Gère l'enregistrement des observateurs et la notification des événements
 */
export class EventPublisher {
    private static instance: EventPublisher
    private observers: Map<string, IObserver[]> = new Map()
    private eventHistory: Event[] = []
    private maxHistorySize = 1000

    private constructor() { }

    /**
     * Singleton instance
     */
    static getInstance(): EventPublisher {
        if (!this.instance) {
            this.instance = new EventPublisher()
        }
        return this.instance
    }

    /**
     * Enregistre un observateur pour tous les événements
     */
    subscribe(observer: IObserver): void {
        const interestedEvents = observer.getInterestedEvents()

        for (const eventType of interestedEvents) {
            if (!this.observers.has(eventType)) {
                this.observers.set(eventType, [])
            }

            const observers = this.observers.get(eventType)!
            if (!observers.includes(observer)) {
                observers.push(observer)
                console.log(`[EventPublisher] ${observer.getName()} subscribed to ${eventType}`)
            }
        }
    }

    /**
     * Désenregistre un observateur
     */
    unsubscribe(observer: IObserver): void {
        for (const [eventType, observers] of this.observers.entries()) {
            const index = observers.indexOf(observer)
            if (index > -1) {
                observers.splice(index, 1)
                console.log(`[EventPublisher] ${observer.getName()} unsubscribed from ${eventType}`)
            }
        }
    }

    /**
     * Publie un événement à tous les observateurs intéressés
     */
    async publish(event: Event): Promise<void> {
        // Ajouter à l'historique
        this.addToHistory(event)

        // Récupérer les observateurs pour ce type d'événement
        const observers = this.observers.get(event.type) || []

        console.log(`[EventPublisher] Publishing ${event.type} to ${observers.length} observers`)

        // Notifier tous les observateurs en parallèle
        const notifications = observers.map(observer =>
            this.notifyObserver(observer, event)
        )

        await Promise.allSettled(notifications)
    }

    /**
     * Notifie un observateur spécifique
     */
    private async notifyObserver(observer: IObserver, event: Event): Promise<void> {
        try {
            await observer.update(event)
            console.log(`[EventPublisher] ${observer.getName()} notified successfully`)
        } catch (error) {
            console.error(
                `[EventPublisher] Error notifying ${observer.getName()}:`,
                error
            )
            // Ne pas propager l'erreur pour ne pas bloquer les autres observateurs
        }
    }

    /**
     * Ajoute un événement à l'historique
     */
    private addToHistory(event: Event): void {
        this.eventHistory.push(event)

        // Limiter la taille de l'historique
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift()
        }
    }

    /**
     * Récupère l'historique des événements
     */
    getHistory(limit?: number): Event[] {
        if (limit) {
            return this.eventHistory.slice(-limit)
        }
        return [...this.eventHistory]
    }

    /**
     * Récupère les événements d'un type spécifique
     */
    getEventsByType(type: EventType, limit?: number): Event[] {
        const events = this.eventHistory.filter(e => e.type === type)
        if (limit) {
            return events.slice(-limit)
        }
        return events
    }

    /**
     * Récupère les événements d'un utilisateur
     */
    getEventsByUser(userId: string, limit?: number): Event[] {
        const events = this.eventHistory.filter(
            e => e.userId?.toString() === userId
        )
        if (limit) {
            return events.slice(-limit)
        }
        return events
    }

    /**
     * Efface l'historique
     */
    clearHistory(): void {
        this.eventHistory = []
    }

    /**
     * Obtient le nombre d'observateurs pour un type d'événement
     */
    getObserverCount(eventType: EventType): number {
        return this.observers.get(eventType)?.length || 0
    }

    /**
     * Liste tous les observateurs enregistrés
     */
    listObservers(): Map<string, string[]> {
        const result = new Map<string, string[]>()

        for (const [eventType, observers] of this.observers.entries()) {
            result.set(
                eventType,
                observers.map(o => o.getName())
            )
        }

        return result
    }
}

/**
 * Helper pour publier facilement des événements
 */
export const publishEvent = async (event: Event): Promise<void> => {
    const publisher = EventPublisher.getInstance()
    await publisher.publish(event)
}
