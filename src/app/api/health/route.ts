import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Health check endpoint for Docker/Kubernetes health probes
 */
export async function GET() {
    return NextResponse.json(
        {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'xkorienta-api',
            version: process.env.npm_package_version || '0.1.0',
        },
        { status: 200 }
    );
}
