import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { AttemptService } from "@/lib/services/AttemptService"

/**
 * POST /api/attempts/[id]/anti-cheat-event
 * Enregistre un événement anti-triche
 * Body: { 
 *   type: 'tab_switch' | 'copy_paste' | 'right_click' | 'screenshot' | 'fullscreen_exit'
 *   data?: any
 * }
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        await connectDB()
        const { id } = await params

        const { type, data } = await req.json()

        if (!type) {
            return NextResponse.json(
                { success: false, message: "event type is required" },
                { status: 400 }
            )
        }

        const validTypes = [
            'tab_switch',
            'copy_paste',
            'right_click',
            'screenshot',
            'fullscreen_exit',
            'window_blur',
            'context_menu'
        ]

        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { success: false, message: `Invalid event type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            )
        }

        const result = await AttemptService.recordAntiCheatEvent(
            id,
            session.user.id,
            type,
            data
        )

        return NextResponse.json({
            success: true,
            data: result,
            message: "Anti-cheat event recorded"
        })
    } catch (error: any) {
        console.error("[AntiCheatEvent API] Error:", error)

        if (error.message.includes("not found")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 404 }
            )
        }

        if (error.message.includes("Unauthorized") ||
            error.message.includes("not in progress") ||
            error.message.includes("Maximum tab switches")) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
