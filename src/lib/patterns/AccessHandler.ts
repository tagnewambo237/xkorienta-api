import mongoose from 'mongoose'
import { AccessScope } from '@/models/enums'
import { IPedagogicalProfile } from '@/models/PedagogicalProfile'

/**
 * Chain of Responsibility Pattern pour la gestion des accès pédagogiques
 * 
 * Ce pattern permet de vérifier les permissions d'accès de manière modulaire
 * en passant la requête à travers une chaîne de handlers.
 */

export interface AccessRequest {
    profile: IPedagogicalProfile
    resourceType: 'exam' | 'subject' | 'level' | 'field' | 'institution'
    resourceId?: mongoose.Types.ObjectId
    institution?: string
}

export abstract class AccessHandler {
    protected nextHandler?: AccessHandler

    /**
     * Définit le prochain handler dans la chaîne
     */
    setNext(handler: AccessHandler): AccessHandler {
        this.nextHandler = handler
        return handler
    }

    /**
     * Traite la requête d'accès
     */
    async handle(request: AccessRequest): Promise<boolean> {
        const canHandle = await this.canHandle(request)

        if (canHandle) {
            return this.checkAccess(request)
        }

        if (this.nextHandler) {
            return this.nextHandler.handle(request)
        }

        return false
    }

    /**
     * Détermine si ce handler peut traiter la requête
     */
    protected abstract canHandle(request: AccessRequest): Promise<boolean>

    /**
     * Vérifie l'accès pour ce handler spécifique
     */
    protected abstract checkAccess(request: AccessRequest): Promise<boolean>
}

/**
 * Handler pour l'accès GLOBAL
 * Les utilisateurs avec accès global peuvent tout voir
 */
export class GlobalAccessHandler extends AccessHandler {
    protected async canHandle(request: AccessRequest): Promise<boolean> {
        return request.profile.accessScope === AccessScope.GLOBAL
    }

    protected async checkAccess(request: AccessRequest): Promise<boolean> {
        return true // Accès total
    }
}

/**
 * Handler pour l'accès LOCAL (institution)
 * Vérifie que la ressource appartient à l'institution de l'utilisateur
 */
export class LocalAccessHandler extends AccessHandler {
    protected async canHandle(request: AccessRequest): Promise<boolean> {
        return request.profile.accessScope === AccessScope.LOCAL
    }

    protected async checkAccess(request: AccessRequest): Promise<boolean> {
        if (!request.institution) {
            return false
        }

        // Vérifier que l'institution correspond
        return request.profile.scopeDetails.specificInstitution === request.institution
    }
}

/**
 * Handler pour l'accès par SUBJECT
 * Vérifie que l'utilisateur a accès à cette matière spécifique
 */
export class SubjectAccessHandler extends AccessHandler {
    protected async canHandle(request: AccessRequest): Promise<boolean> {
        return request.profile.accessScope === AccessScope.SUBJECT
    }

    protected async checkAccess(request: AccessRequest): Promise<boolean> {
        if (!request.resourceId) {
            return false
        }

        // Vérifier si la matière est dans la liste autorisée
        return request.profile.scopeDetails.specificSubjects.some(
            subjectId => subjectId.toString() === request.resourceId!.toString()
        )
    }
}

/**
 * Handler pour l'accès par LEVEL
 * Vérifie que l'utilisateur a accès à ce niveau d'éducation
 */
export class LevelAccessHandler extends AccessHandler {
    protected async canHandle(request: AccessRequest): Promise<boolean> {
        return request.profile.accessScope === AccessScope.LEVEL
    }

    protected async checkAccess(request: AccessRequest): Promise<boolean> {
        if (!request.resourceId) {
            return false
        }

        // Vérifier si le niveau est dans la liste autorisée
        return request.profile.scopeDetails.specificLevels.some(
            levelId => levelId.toString() === request.resourceId!.toString()
        )
    }
}

/**
 * Handler pour l'accès par FIELD
 * Vérifie que l'utilisateur a accès à cette filière
 */
export class FieldAccessHandler extends AccessHandler {
    protected async canHandle(request: AccessRequest): Promise<boolean> {
        return request.profile.accessScope === AccessScope.FIELD
    }

    protected async checkAccess(request: AccessRequest): Promise<boolean> {
        if (!request.resourceId) {
            return false
        }

        // Vérifier si la filière est dans la liste autorisée
        return request.profile.scopeDetails.specificFields.some(
            fieldId => fieldId.toString() === request.resourceId!.toString()
        )
    }
}

/**
 * Factory pour créer la chaîne de responsabilité
 */
export class AccessHandlerChain {
    private static instance: AccessHandler

    /**
     * Crée et configure la chaîne de handlers
     */
    static getChain(): AccessHandler {
        if (!this.instance) {
            const globalHandler = new GlobalAccessHandler()
            const localHandler = new LocalAccessHandler()
            const subjectHandler = new SubjectAccessHandler()
            const levelHandler = new LevelAccessHandler()
            const fieldHandler = new FieldAccessHandler()

            // Configurer la chaîne
            globalHandler
                .setNext(localHandler)
                .setNext(subjectHandler)
                .setNext(levelHandler)
                .setNext(fieldHandler)

            this.instance = globalHandler
        }

        return this.instance
    }

    /**
     * Vérifie l'accès pour une requête donnée
     */
    static async checkAccess(request: AccessRequest): Promise<boolean> {
        const chain = this.getChain()
        return chain.handle(request)
    }
}
