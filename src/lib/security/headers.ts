import { NextResponse } from 'next/server'

/**
 * Security headers to protect against common attacks
 */
export const SECURITY_HEADERS = {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS filter in older browsers
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy - restrict dangerous features
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',

    // Content Security Policy
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js in dev
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.pusher.com wss://*.pusher.com", // Allow Pusher for real-time chat
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; '),

    // Strict Transport Security (HTTPS only)
    // Uncomment in production with HTTPS
    // 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    return response
}

/**
 * Create a response with security headers
 */
export function createSecureResponse(
    data: any,
    status: number = 200,
    additionalHeaders: Record<string, string> = {}
): NextResponse {
    const response = NextResponse.json(data, { status })

    // Apply security headers
    applySecurityHeaders(response)

    // Apply additional headers
    Object.entries(additionalHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    return response
}
