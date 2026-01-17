import { NextResponse } from "next/server"
import { authStrategyManager } from "@/lib/auth/strategies"

/**
 * API Route to get available OAuth providers
 *
 * This endpoint returns the list of enabled OAuth providers
 * for display in the login/register UI
 */
export async function GET() {
    try {
        const providers = authStrategyManager.getUIStrategies()

        return NextResponse.json({
            providers,
            status: authStrategyManager.getConfigStatus()
        })
    } catch (error) {
        console.error("[ProvidersInfo] Error:", error)
        return NextResponse.json(
            { error: "Failed to fetch providers" },
            { status: 500 }
        )
    }
}
