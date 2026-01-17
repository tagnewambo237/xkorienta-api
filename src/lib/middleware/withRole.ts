import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@/models/enums"

type HandlerFunction = (
    req: Request,
    context: { params: any; session: any }
) => Promise<NextResponse>

/**
 * Middleware HOF pour restreindre l'accès à certains rôles
 * 
 * @example
 * export const POST = withRole(
 *   async (req, { session }) => { ... },
 *   [UserRole.TEACHER, UserRole.ADMIN]
 * )
 */
export function withRole(
    handler: HandlerFunction,
    allowedRoles: UserRole[]
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

            const userRole = session.user.role as UserRole

            if (!allowedRoles.includes(userRole)) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Forbidden: Insufficient permissions"
                    },
                    { status: 403 }
                )
            }

            // Passer la session au handler pour éviter de la re-fetcher
            return handler(req, { params, session })

        } catch (error) {
            console.error("[withRole] Error:", error)
            return NextResponse.json(
                { success: false, message: "Internal Server Error" },
                { status: 500 }
            )
        }
    }
}
