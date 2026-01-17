import crypto from 'crypto'

/**
 * Remove sensitive data from exam questions (correct answers)
 * This ensures students cannot see the correct answers in the API response
 */
export function sanitizeExamForStudent(exam: any): any {
    if (!exam) return null

    const sanitized = { ...exam }

    // Remove correct answer indicators from questions
    if (sanitized.questions && Array.isArray(sanitized.questions)) {
        sanitized.questions = sanitized.questions.map((question: any) => {
            const sanitizedQuestion = { ...question }

            // Remove correct answer flags from options
            if (sanitizedQuestion.options && Array.isArray(sanitizedQuestion.options)) {
                sanitizedQuestion.options = sanitizedQuestion.options.map((option: any) => {
                    const { isCorrect, ...sanitizedOption } = option
                    return sanitizedOption
                })
            }

            return sanitizedQuestion
        })
    }

    return sanitized
}

/**
 * Generate a secure resume token for exam continuation
 */
export function generateResumeToken(attemptId: string, userId: string): string {
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
    const timestamp = Date.now()

    // Create HMAC signature
    const data = `${attemptId}:${userId}:${timestamp}`
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex')

    // Encode as base64
    const token = Buffer.from(`${data}:${signature}`).toString('base64url')

    return token
}

/**
 * Verify and decode a resume token
 */
export function verifyResumeToken(token: string): { attemptId: string; userId: string } | null {
    try {
        const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'

        // Decode from base64
        const decoded = Buffer.from(token, 'base64url').toString('utf-8')
        const parts = decoded.split(':')

        if (parts.length !== 4) {
            return null
        }

        const [attemptId, userId, timestamp, signature] = parts

        // Verify signature
        const data = `${attemptId}:${userId}:${timestamp}`
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex')

        if (signature !== expectedSignature) {
            return null
        }

        // Check token age (24 hours max)
        const tokenAge = Date.now() - parseInt(timestamp)
        if (tokenAge > 24 * 60 * 60 * 1000) {
            return null
        }

        return { attemptId, userId }
    } catch {
        return null
    }
}

/**
 * Validate exam submission to prevent cheating
 */
export function validateExamSubmission(
    attempt: any,
    responses: any[],
    questions: any[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check if attempt is still active
    if (attempt.status === 'COMPLETED') {
        errors.push('Exam has already been submitted')
    }

    // Check if exam time has expired
    if (new Date(attempt.expiresAt) < new Date()) {
        errors.push('Exam time has expired')
    }

    // Validate response count doesn't exceed question count
    if (responses.length > questions.length) {
        errors.push('Too many responses submitted')
    }

    // Validate all response question IDs exist in the exam
    const validQuestionIds = new Set(questions.map(q => q._id.toString()))
    const invalidResponses = responses.filter(
        r => !validQuestionIds.has(r.questionId.toString())
    )

    if (invalidResponses.length > 0) {
        errors.push('Invalid question IDs in responses')
    }

    // Check for duplicate responses to the same question
    const questionIdCounts = new Map<string, number>()
    responses.forEach(r => {
        const qId = r.questionId.toString()
        questionIdCounts.set(qId, (questionIdCounts.get(qId) || 0) + 1)
    })

    const duplicates = Array.from(questionIdCounts.entries()).filter(([_, count]) => count > 1)
    if (duplicates.length > 0) {
        errors.push('Duplicate responses to the same question')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Calculate score securely on server side
 */
export function calculateScore(responses: any[], questions: any[]): number {
    let totalScore = 0

    responses.forEach(response => {
        const question = questions.find(q => q._id.toString() === response.questionId.toString())

        if (!question) return

        const selectedOption = question.options?.find(
            (o: any) => o._id.toString() === response.selectedOptionId.toString()
        )

        if (selectedOption && selectedOption.isCorrect) {
            totalScore += question.points || 1
        }
    })

    return totalScore
}

/**
 * Detect potential cheating patterns
 */
export function detectCheatingPatterns(
    attempt: any,
    responses: any[]
): { suspicious: boolean; reasons: string[] } {
    const reasons: string[] = []

    // Check for impossibly fast completion
    if (attempt.submittedAt && attempt.startedAt) {
        const duration = new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()
        const minExpectedDuration = responses.length * 5000 // 5 seconds per question minimum

        if (duration < minExpectedDuration) {
            reasons.push('Exam completed too quickly')
        }
    }

    // Check for perfect score with very fast completion
    if (attempt.score === 100 && attempt.submittedAt && attempt.startedAt) {
        const duration = new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()
        const avgTimePerQuestion = duration / responses.length

        if (avgTimePerQuestion < 10000) { // Less than 10 seconds per question
            reasons.push('Perfect score with suspiciously fast completion')
        }
    }

    return {
        suspicious: reasons.length > 0,
        reasons
    }
}

/**
 * Hash answer for client-side validation without exposing correct answer
 */
export function hashAnswer(answerId: string): string {
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
    return crypto
        .createHmac('sha256', secret)
        .update(answerId)
        .digest('hex')
        .substring(0, 16) // Use first 16 chars
}
