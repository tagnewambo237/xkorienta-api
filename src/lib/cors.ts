import { NextRequest, NextResponse } from 'next/server';

// CORS Configuration
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3002',
];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With'];

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
    response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

    return response;
}

/**
 * Handle CORS preflight requests
 */
export function handlePreflight(request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
}

/**
 * CORS middleware wrapper for API routes
 */
export function withCors(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return handlePreflight(request);
        }

        // Call the actual handler
        const response = await handler(request);

        // Add CORS headers to the response
        const origin = request.headers.get('origin');
        return addCorsHeaders(response, origin);
    };
}
