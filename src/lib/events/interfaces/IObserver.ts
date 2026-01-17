import { Event } from '../types'

/**
 * Interface Observer pour le pattern Observer
 * 
 * Tous les observateurs doivent implémenter cette interface
 */
export interface IObserver {
    /**
     * Méthode appelée lorsqu'un événement se produit
     */
    update(event: Event): Promise<void>

    /**
     * Nom de l'observateur (pour le debugging)
     */
    getName(): string

    /**
     * Types d'événements auxquels cet observateur est intéressé
     */
    getInterestedEvents(): string[]
}
