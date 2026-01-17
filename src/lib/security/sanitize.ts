import validator from 'validator'

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
    if (!input) return ''

    // Remove any HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '')

    // Escape special characters
    sanitized = validator.escape(sanitized)

    // Trim whitespace
    sanitized = sanitized.trim()

    return sanitized
}

/**
 * Sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
    if (!email) return ''

    // Normalize and validate email
    const normalized = validator.normalizeEmail(email) || ''

    return normalized.toLowerCase().trim()
}

/**
 * Validate and sanitize MongoDB ObjectId
 */
export function sanitizeObjectId(id: string): string | null {
    if (!id || typeof id !== 'string') return null

    // Check if valid hex string of 24 characters
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return null
    }

    return id
}

/**
 * Prevent NoSQL injection by sanitizing query parameters
 */
export function sanitizeQueryParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(params)) {
        // Skip if key contains operators
        if (key.startsWith('$')) {
            continue
        }

        // Handle different types
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value)
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            sanitized[key] = value
        } else if (typeof value === 'object' && value !== null) {
            // Reject objects with MongoDB operators
            const hasOperator = Object.keys(value).some(k => k.startsWith('$'))
            if (!hasOperator) {
                sanitized[key] = sanitizeQueryParams(value)
            }
        }
    }

    return sanitized
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password) {
        return { valid: false, message: 'Password is required' }
    }

    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' }
    }

    if (password.length > 128) {
        return { valid: false, message: 'Password is too long' }
    }

    // Check for at least one letter and one number
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain both letters and numbers' }
    }

    return { valid: true }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    return validator.isEmail(email)
}

/**
 * Sanitize URL to prevent open redirect
 */
export function sanitizeRedirectUrl(url: string, allowedDomains: string[]): string | null {
    if (!url) return null

    // Only allow relative URLs or URLs from allowed domains
    if (url.startsWith('/')) {
        // Relative URL - ensure it doesn't contain //
        if (url.startsWith('//')) return null
        return url
    }

    try {
        const parsed = new URL(url)
        if (allowedDomains.includes(parsed.hostname)) {
            return url
        }
    } catch {
        // Invalid URL
    }

    return null
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
    if (!filename) return ''

    // Remove path separators and null bytes
    let sanitized = filename.replace(/[/\\.\0]/g, '')

    // Remove leading/trailing spaces and dots
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '')

    // Limit length
    if (sanitized.length > 255) {
        sanitized = sanitized.substring(0, 255)
    }

    return sanitized
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''

    // Use crypto for secure random generation
    if (typeof window !== 'undefined' && window.crypto) {
        const array = new Uint8Array(length)
        window.crypto.getRandomValues(array)
        for (let i = 0; i < length; i++) {
            token += chars[array[i] % chars.length]
        }
    } else if (typeof require !== 'undefined') {
        const crypto = require('crypto')
        const bytes = crypto.randomBytes(length)
        for (let i = 0; i < length; i++) {
            token += chars[bytes[i] % chars.length]
        }
    } else {
        // Fallback (not cryptographically secure)
        for (let i = 0; i < length; i++) {
            token += chars[Math.floor(Math.random() * chars.length)]
        }
    }

    return token
}
