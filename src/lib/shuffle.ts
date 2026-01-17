/**
 * Shuffle an array using a seeded random number generator
 * This ensures the same seed always produces the same shuffle order
 */
export function shuffleWithSeed<T>(array: T[], seed: string): T[] {
    // Create a copy to avoid mutating the original
    const shuffled = [...array]

    // Simple hash function to convert seed string to number
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
    }

    // Seeded random number generator (Linear Congruential Generator)
    let currentSeed = Math.abs(hash)
    const random = () => {
        currentSeed = (currentSeed * 9301 + 49297) % 233280
        return currentSeed / 233280
    }

    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
}

/**
 * Shuffle questions for a specific user
 * Each user gets a unique but consistent order
 */
export function shuffleQuestionsForUser(questions: any[], userId: string, examId: string) {
    // Create a unique seed for this user + exam combination
    const seed = `${userId}-${examId}`
    return shuffleWithSeed(questions, seed)
}
