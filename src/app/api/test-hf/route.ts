import { NextResponse } from "next/server"
import { HuggingFaceService } from "@/lib/services/HuggingFaceService"

export async function GET() {
    try {
        const apiKey = process.env.HUGGINGFACE_API_KEY
        console.log("API Key loaded:", apiKey ? `Yes(${apiKey.substring(0, 5)}...)` : "No")

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                message: "HUGGINGFACE_API_KEY is not defined in process.env",
                env_loaded: false
            }, { status: 500 })
        }

        const text = "Quelle est la capitale de la France ?"

        console.log("Testing HuggingFaceService...")

        HuggingFaceService.clearCache()

        // Test connectivity
        const isAvailable = await HuggingFaceService.isAvailable()
        if (!isAvailable) {
            return NextResponse.json({
                success: false,
                message: "HuggingFace API is not available or key is invalid"
            }, { status: 502 })
        }

        // Test different intensities
        const light = await HuggingFaceService.reformulateText(text, { intensity: 'LIGHT', language: 'fr' }, 'test-seed-1')
        const moderate = await HuggingFaceService.reformulateText(text, { intensity: 'MODERATE', language: 'fr' }, 'test-seed-1')
        const strong = await HuggingFaceService.reformulateText(text, { intensity: 'STRONG', language: 'fr' }, 'test-seed-1')

        // Test caching (call again with same seed)
        const startParams = Date.now()
        const cached = await HuggingFaceService.reformulateText(text, { intensity: 'MODERATE', language: 'fr' }, 'test-seed-1')
        const duration = Date.now() - startParams

        return NextResponse.json({
            success: true,
            original: text,
            results: {
                light,
                moderate,
                strong,
                cached_check: {
                    match: moderate === cached,
                    duration_ms: duration, // Should be ~0ms
                    is_cached: duration < 100
                }
            },
            stats: HuggingFaceService.getCacheStats()
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
