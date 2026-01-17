import { AccessHandlerChain, AccessRequest } from '@/lib/patterns/AccessHandler'
import PedagogicalProfile from '@/models/PedagogicalProfile'
import User from '@/models/User'
import Exam from '@/models/Exam'
import { ContributionType } from '@/models/enums'
import mongoose from 'mongoose'

/**
 * Service pour vérifier les permissions d'accès aux examens
 * Utilise le Chain of Responsibility Pattern
 */
export class ExamAccessService {
    /**
     * Vérifie si un utilisateur peut accéder à un examen
     */
    static async canAccessExam(
        userId: mongoose.Types.ObjectId,
        examId: mongoose.Types.ObjectId
    ): Promise<boolean> {
        // Récupérer le profil pédagogique
        const profile = await PedagogicalProfile.findOne({ user: userId })

        if (!profile) {
            return false // Pas de profil pédagogique = pas d'accès
        }

        // Récupérer l'examen
        const exam = await Exam.findById(examId).populate('createdById')

        if (!exam) {
            return false
        }

        // Si l'utilisateur est le créateur, accès automatique
        if (exam.createdById.toString() === userId.toString()) {
            return true
        }

        // Construire la requête d'accès
        const request: AccessRequest = {
            profile,
            resourceType: 'exam',
            resourceId: examId
        }

        // Utiliser la chaîne de responsabilité
        return AccessHandlerChain.checkAccess(request)
    }

    /**
     * Vérifie si un utilisateur peut créer un examen pour une matière
     */
    static async canCreateExamForSubject(
        userId: mongoose.Types.ObjectId,
        subjectId: mongoose.Types.ObjectId
    ): Promise<boolean> {
        const profile = await PedagogicalProfile.findOne({ user: userId })

        if (!profile) {
            return false
        }

        const request: AccessRequest = {
            profile,
            resourceType: 'subject',
            resourceId: subjectId
        }

        return AccessHandlerChain.checkAccess(request)
    }

    /**
     * Vérifie si un utilisateur peut valider un examen
     */
    static async canValidateExam(
        userId: mongoose.Types.ObjectId,
        examId: mongoose.Types.ObjectId
    ): Promise<boolean> {
        const profile = await PedagogicalProfile.findOne({ user: userId })

        if (!profile) {
            return false
        }

        // Vérifier que l'utilisateur a le rôle de validateur
        if (!profile.contributionTypes.includes(ContributionType.VALIDATOR)) {
            return false
        }

        const request: AccessRequest = {
            profile,
            resourceType: 'exam',
            resourceId: examId
        }

        return AccessHandlerChain.checkAccess(request)
    }

    /**
     * Récupère tous les examens accessibles pour un utilisateur
     */
    static async getAccessibleExams(
        userId: mongoose.Types.ObjectId
    ): Promise<mongoose.Types.ObjectId[]> {
        const profile = await PedagogicalProfile.findOne({ user: userId })

        if (!profile) {
            return []
        }

        // Récupérer tous les examens
        const allExams = await Exam.find().select('_id')

        // Filtrer selon les permissions
        const accessibleExams: mongoose.Types.ObjectId[] = []

        for (const exam of allExams) {
            const request: AccessRequest = {
                profile,
                resourceType: 'exam',
                resourceId: exam._id
            }

            const hasAccess = await AccessHandlerChain.checkAccess(request)
            if (hasAccess) {
                accessibleExams.push(exam._id)
            }
        }

        return accessibleExams
    }
}
