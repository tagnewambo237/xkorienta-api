/**
 * File Upload Security Module
 * Protects against formula injection, XSS, NoSQL injection, and file-based attacks
 */

// Security limits
export const SECURITY_LIMITS = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_ROWS: 500,
    MAX_COLUMNS: 20,
    MAX_CELL_LENGTH: 500,
    MAX_NAME_LENGTH: 100,
    MAX_EMAIL_LENGTH: 254,
    ALLOWED_EXTENSIONS: ['.csv', '.xlsx', '.xls'],
    ALLOWED_MIME_TYPES: [
        'text/csv',
        'text/plain', // Some systems report CSV as text/plain
        'application/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
}

// Dangerous formula prefixes that could execute code in Excel
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '|', '%']

// Dangerous patterns for XSS/script injection
const DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /data:/gi,
]

// NoSQL injection patterns
const NOSQL_PATTERNS = [
    /\$where/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$ne/gi,
    /\$regex/gi,
    /\$or/gi,
    /\$and/gi,
]

/**
 * Sanitize a single cell value to prevent formula injection
 * This is the MOST CRITICAL function for CSV security
 */
export function sanitizeCell(value: any): string {
    if (value === null || value === undefined) return ''

    let str = String(value).trim()

    // Limit length
    if (str.length > SECURITY_LIMITS.MAX_CELL_LENGTH) {
        str = str.substring(0, SECURITY_LIMITS.MAX_CELL_LENGTH)
    }

    // Check for formula injection
    if (str.length > 0) {
        const firstChar = str[0]
        if (FORMULA_PREFIXES.includes(firstChar)) {
            // Prefix with single quote to neutralize formula
            str = "'" + str
        }
    }

    // Remove null bytes
    str = str.replace(/\0/g, '')

    return str
}

/**
 * Sanitize a string for safe database storage
 * Prevents NoSQL injection and XSS
 */
export function sanitizeForDatabase(value: string): string {
    if (!value) return ''

    let sanitized = String(value).trim()

    // Escape MongoDB special characters
    sanitized = sanitized
        .replace(/\$/g, '＄') // Replace $ with full-width version
        .replace(/\./g, '．') // Replace . with full-width version

    // Remove dangerous script patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '')
    }

    // Check for NoSQL injection attempts
    for (const pattern of NOSQL_PATTERNS) {
        if (pattern.test(sanitized)) {
            sanitized = sanitized.replace(pattern, '')
        }
    }

    // HTML entity encode
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')

    return sanitized
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): { valid: boolean; value: string; error?: string } {
    if (!email) {
        return { valid: false, value: '', error: 'Email requis' }
    }

    let sanitized = String(email).trim().toLowerCase()

    // Length check
    if (sanitized.length > SECURITY_LIMITS.MAX_EMAIL_LENGTH) {
        return { valid: false, value: '', error: 'Email trop long' }
    }

    // Basic email regex (RFC 5322 simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

    if (!emailRegex.test(sanitized)) {
        return { valid: false, value: '', error: 'Format email invalide' }
    }

    // Check for formula injection in email
    if (FORMULA_PREFIXES.some(p => sanitized.startsWith(p))) {
        return { valid: false, value: '', error: 'Email contient des caractères invalides' }
    }

    return { valid: true, value: sanitized }
}

/**
 * Validate and sanitize name
 */
export function sanitizeName(name: string): { valid: boolean; value: string; error?: string } {
    if (!name) {
        return { valid: false, value: '', error: 'Nom requis' }
    }

    let sanitized = String(name).trim()

    // Length checks
    if (sanitized.length < 2) {
        return { valid: false, value: '', error: 'Nom trop court (min 2 caractères)' }
    }

    if (sanitized.length > SECURITY_LIMITS.MAX_NAME_LENGTH) {
        return { valid: false, value: '', error: 'Nom trop long' }
    }

    // Check for formula injection
    if (FORMULA_PREFIXES.some(p => sanitized.startsWith(p))) {
        sanitized = sanitized.substring(1).trim()
    }

    // Allow only letters, spaces, hyphens, apostrophes, and common accented characters
    const nameRegex = /^[\p{L}\s\-'\.]+$/u

    if (!nameRegex.test(sanitized)) {
        return { valid: false, value: '', error: 'Nom contient des caractères invalides' }
    }

    // Remove dangerous patterns
    sanitized = sanitized
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '')    // Remove angle brackets

    return { valid: true, value: sanitized }
}

/**
 * Validate file based on extension and size (client-side checks)
 */
export function validateFileBasic(file: File): { valid: boolean; error?: string } {
    // Check extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!SECURITY_LIMITS.ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: `Extension non autorisée. Formats acceptés: ${SECURITY_LIMITS.ALLOWED_EXTENSIONS.join(', ')}` }
    }

    // Check size
    if (file.size > SECURITY_LIMITS.MAX_FILE_SIZE) {
        return { valid: false, error: `Fichier trop volumineux. Max: ${SECURITY_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB` }
    }

    // Check MIME type
    if (!SECURITY_LIMITS.ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
        return { valid: false, error: 'Type de fichier non autorisé' }
    }

    return { valid: true }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/\.\./g, '')           // Remove directory traversal
        .replace(/[\/\\]/g, '')         // Remove slashes
        .replace(/[<>:"|?*]/g, '')      // Remove Windows reserved chars
        .replace(/[\x00-\x1f]/g, '')    // Remove control characters
        .trim()
}

/**
 * Validate row count
 */
export function validateRowCount(count: number): { valid: boolean; error?: string } {
    if (count === 0) {
        return { valid: false, error: 'Le fichier ne contient aucune donnée' }
    }
    if (count > SECURITY_LIMITS.MAX_ROWS) {
        return { valid: false, error: `Trop de lignes. Maximum: ${SECURITY_LIMITS.MAX_ROWS}` }
    }
    return { valid: true }
}

/**
 * Full sanitization of a student record
 */
export function sanitizeStudentRecord(record: { name?: string; email?: string }): {
    valid: boolean
    data?: { name: string; email: string }
    errors: string[]
} {
    const errors: string[] = []

    const nameResult = sanitizeName(record.name || '')
    if (!nameResult.valid) {
        errors.push(nameResult.error || 'Nom invalide')
    }

    const emailResult = sanitizeEmail(record.email || '')
    if (!emailResult.valid) {
        errors.push(emailResult.error || 'Email invalide')
    }

    if (errors.length > 0) {
        return { valid: false, errors }
    }

    return {
        valid: true,
        data: {
            name: sanitizeForDatabase(nameResult.value),
            email: emailResult.value // Email already sanitized
        },
        errors: []
    }
}

/**
 * Log security event (for monitoring)
 */
export function logSecurityEvent(event: {
    type: 'FORMULA_INJECTION' | 'INVALID_FILE' | 'OVERSIZED_FILE' | 'SUSPICIOUS_CONTENT' | 'RATE_LIMIT'
    details: string
    userId?: string
    ip?: string
}) {
    console.warn(`[SECURITY] ${event.type}: ${event.details}`, {
        userId: event.userId,
        ip: event.ip,
        timestamp: new Date().toISOString()
    })
}
