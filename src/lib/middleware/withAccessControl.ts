import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AccessHandlerChain, AccessRequest } from "@/lib/patterns/AccessHandler"
import PedagogicalProfile from "@/models/PedagogicalProfile"
import { UserRole } from "@/models/enums"

type HandlerFunction = (
    req: Request,
    context: { params: any; session: any }
) => Promise<NextResponse>

interface AccessControlOptions {
    resourceType: 'exam' | 'subject' | 'level' | 'field' | 'institution'
    // Fonction pour extraire l'ID de la ressource depuis la requête ou les params
    getResourceId?: (req: Request, params: any) => string | Promise<string>
    // Si true, les admins (INSPECTOR, PRINCIPAL, etc.) ont accès direct
    bypassForAdmins?: boolean
}

/**
 * Middleware HOF pour le contrôle d'accès granulaire via Chain of Responsibility
 * 
 * @example
 * export const POST = withAccessControl(
 *   async (req, { session }) => { ... },
 *   { 
 *     resourceType: 'exam',
 *     getResourceId: (req, params) => params.id 
 *   }
 * )
 */
export function withAccessControl(
    handler: HandlerFunction,
    options: AccessControlOptions
) {
    return async (req: Request, { params }: { params: any }) => {
        try {
            const session = await getServerSession(authOptions)

            if (!session || !session.user) {
                return NextResponse.json(
                    { success: false, message: "Unauthorized" },
                    { status: 401 }
                )
            }

            // 1. Bypass pour les admins si configuré
            if (options.bypassForAdmins !== false) {
                const adminRoles = [
                    UserRole.INSPECTOR,
                    UserRole.PRINCIPAL,
                    UserRole.DG_ISIMMA,
                    UserRole.RECTOR
                ]
                if (adminRoles.includes(session.user.role as UserRole)) {
                    return handler(req, { params, session })
                }
            }

            // 2. Récupérer le profil pédagogique
            const profile = await PedagogicalProfile.findOne({ user: session.user.id })

            if (!profile) {
                // Si pas de profil pédagogique et pas admin, accès refusé pour les ressources pédagogiques
                return NextResponse.json(
                    { success: false, message: "Forbidden: No pedagogical profile found" },
                    { status: 403 }
                )
            }

            // 3. Déterminer l'ID de la ressource
            let resourceId: string | undefined
            if (options.getResourceId) {
                try {
                    resourceId = await options.getResourceId(req, params)
                } catch (e) {
                    console.error("Error extracting resource ID:", e)
                    return NextResponse.json(
                        { success: false, message: "Invalid resource identifier" },
                        { status: 400 }
                    )
                }
            }

            // 4. Construire la requête d'accès
            const accessRequest: AccessRequest = {
                profile,
                resourceType: options.resourceType,
                resourceId: resourceId as any, // Cast vers any car AccessRequest attend ObjectId parfois
                institution: (session.user as any).institutionId // Supposons que l'institution est dans la session ou le user
            }

            // 5. Vérifier l'accès via la chaîne
            const hasAccess = await AccessHandlerChain.checkAccess(accessRequest)

            if (!hasAccess) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Forbidden: You do not have access to this resource based on your scope"
                    },
                    { status: 403 }
                )
            }

            // Accès autorisé
            return handler(req, { params, session })

        } catch (error) {
            console.error("[withAccessControl] Error:", error)
            return NextResponse.json(
                { success: false, message: "Internal Server Error" },
                { status: 500 }
            )
        }
    }
}
