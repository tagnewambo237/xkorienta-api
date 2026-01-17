/**
 * HuggingFaceService
 * 
 * Service pour la reformulation IA des questions et réponses
 * utilisant l'API Hugging Face Inference via router.huggingface.co
 * 
 * Fonctionnalités :
 * - Reformulation de texte avec différentes intensités
 * - Cache pour éviter les appels répétés
 * - Gestion des erreurs et fallback
 */

import crypto from 'crypto'

// Cache pour stocker les reformulations
const reformulationCache = new Map<string, string>()

export type ReformulationIntensity = 'LIGHT' | 'MODERATE' | 'STRONG'

interface ReformulationOptions {
    intensity: ReformulationIntensity
    preserveKeywords?: string[]
    language?: 'fr' | 'en'
}

// Prompts adaptés selon l'intensité - TRÈS EXPLICITE pour garder le format question
const INTENSITY_PROMPTS = {
    LIGHT: {
        fr: "Tu es un assistant qui reformule des textes. IMPORTANT: Si le texte est une question, ta reformulation DOIT AUSSI être une question. Ne réponds JAMAIS à la question. Change uniquement la structure grammaticale en gardant les mots-clés. Exemple: 'Quelle est la capitale de la France ?' → 'La capitale de la France, c'est quoi ?'. Réponds UNIQUEMENT avec le texte reformulé.",
        en: "You are a text rephrasing assistant. IMPORTANT: If the text is a question, your rephrasing MUST ALSO be a question. NEVER answer the question. Only change the grammatical structure while keeping keywords. Example: 'What is the capital of France?' → 'Which city serves as France's capital?'. Reply ONLY with the rephrased text."
    },
    MODERATE: {
        fr: "Tu es un assistant qui reformule des textes avec des synonymes. IMPORTANT: Si le texte est une question, ta reformulation DOIT AUSSI être une question. Ne réponds JAMAIS à la question. Utilise des synonymes tout en gardant le sens exact. Exemple: 'Quelle est la capitale de la France ?' → 'Quel est le chef-lieu de la nation française ?'. Réponds UNIQUEMENT avec le texte reformulé.",
        en: "You are a text rephrasing assistant using synonyms. IMPORTANT: If the text is a question, your rephrasing MUST ALSO be a question. NEVER answer the question. Use synonyms while keeping the exact meaning. Example: 'What is the capital of France?' → 'Which city is the seat of government in France?'. Reply ONLY with the rephrased text."
    },
    STRONG: {
        fr: "Tu es un assistant qui réécrit complètement des textes. IMPORTANT: Si le texte est une question, ta réécriture DOIT AUSSI être une question. Ne réponds JAMAIS à la question. Réécris avec un style complètement différent mais garde le même sens. Exemple: 'Quelle est la capitale de la France ?' → 'Pouvez-vous nommer la métropole qui sert de centre administratif à l'Hexagone ?'. Réponds UNIQUEMENT avec le texte réécrit.",
        en: "You are a text rewriting assistant. IMPORTANT: If the text is a question, your rewrite MUST ALSO be a question. NEVER answer the question. Completely rewrite with a different style but keep the same meaning. Example: 'What is the capital of France?' → 'Could you identify the metropolis serving as the administrative center of the French Republic?'. Reply ONLY with the rewritten text."
    }
}

// Modèles à utiliser avec l'API chat/completions de HuggingFace
const MODELS = [
    'mistralai/Mistral-7B-Instruct-v0.3',
    'meta-llama/Llama-3.2-3B-Instruct',
    'microsoft/Phi-3-mini-4k-instruct'
]

export class HuggingFaceService {
    // Nouvelle URL de l'API HuggingFace
    private static baseUrl = 'https://router.huggingface.co/v1/chat/completions'

    private static getApiKey(): string | undefined {
        return process.env.HUGGINGFACE_API_KEY
    }

    /**
     * Generate a cache key for a reformulation request
     */
    private static getCacheKey(text: string, intensity: ReformulationIntensity, seed?: string): string {
        const data = `${text}-${intensity}-${seed || ''}`
        return crypto.createHash('md5').update(data).digest('hex')
    }

    /**
     * Call the Hugging Face Inference API (OpenAI-compatible format)
     */
    private static async callAPI(model: string, systemPrompt: string, userMessage: string): Promise<string | null> {
        const apiKey = this.getApiKey()
        if (!apiKey) {
            console.warn('[HuggingFace] No API key configured')
            return null
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    max_tokens: 256,
                    temperature: 0.7
                })
            })

            if (!response.ok) {
                const error = await response.text()
                console.error(`[HuggingFace] API error (${model}): ${response.status} - ${error}`)

                // If model is loading, wait and retry
                if (response.status === 503) {
                    console.log('[HuggingFace] Model loading, waiting...')
                    await new Promise(resolve => setTimeout(resolve, 10000))
                    return this.callAPI(model, systemPrompt, userMessage) // Retry once
                }
                return null
            }

            const data = await response.json()

            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content.trim()
            }

            return null
        } catch (error) {
            console.error('[HuggingFace] Request failed:', error)
            return null
        }
    }

    /**
     * Reformulate a single piece of text
     */
    static async reformulateText(
        text: string,
        options: ReformulationOptions = { intensity: 'MODERATE', language: 'fr' },
        seed?: string
    ): Promise<string> {
        // Check cache first
        const cacheKey = this.getCacheKey(text, options.intensity, seed)
        if (reformulationCache.has(cacheKey)) {
            return reformulationCache.get(cacheKey)!
        }

        // Skip very short texts
        if (text.length < 10) {
            return text
        }

        const lang = options.language || 'fr'
        const systemPrompt = INTENSITY_PROMPTS[options.intensity][lang]

        // Try each model until one works
        let result: string | null = null
        for (const model of MODELS) {
            result = await this.callAPI(model, systemPrompt, text)
            if (result) break
        }

        // Clean up the result
        if (result) {
            // Remove quotes if present
            result = result.replace(/^[\"']|[\"']$/g, '').trim()

            // If result is too different (possibly garbage), use original
            if (result.length < text.length * 0.3 || result.length > text.length * 3) {
                result = text
            }
        }

        // Fallback to original if API failed
        const finalResult = result || text

        // Cache the result
        reformulationCache.set(cacheKey, finalResult)

        return finalResult
    }

    /**
     * Reformulate a question (text + options)
     */
    static async reformulateQuestion(
        questionText: string,
        options: string[],
        intensity: ReformulationIntensity = 'MODERATE',
        studentSeed?: string
    ): Promise<{ question: string; options: string[] }> {
        const reformulationOptions: ReformulationOptions = {
            intensity,
            language: 'fr'
        }

        // Reformulate question text
        const reformulatedQuestion = await this.reformulateText(
            questionText,
            reformulationOptions,
            studentSeed
        )

        // Reformulate each option
        const reformulatedOptions = await Promise.all(
            options.map((option, index) =>
                this.reformulateText(
                    option,
                    reformulationOptions,
                    `${studentSeed}-opt${index}`
                )
            )
        )

        return {
            question: reformulatedQuestion,
            options: reformulatedOptions
        }
    }

    /**
     * Reformulate all questions in an exam for a specific student
     */
    static async reformulateExamQuestions(
        questions: Array<{
            _id: string
            question: string
            options?: Array<{ text: string; isCorrect: boolean; feedback?: string }>
        }>,
        intensity: ReformulationIntensity = 'MODERATE',
        studentId: string,
        examId: string
    ): Promise<typeof questions> {
        // Create a unique seed for this student-exam combination
        const baseSeed = `${studentId}-${examId}`

        // Process questions in parallel (with limit to avoid rate limiting)
        const batchSize = 3
        const reformulatedQuestions: typeof questions = []

        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize)

            const batchResults = await Promise.all(
                batch.map(async (q, batchIndex) => {
                    const questionIndex = i + batchIndex
                    const seed = `${baseSeed}-q${questionIndex}`

                    const reformulatedQuestion = await this.reformulateText(
                        q.question,
                        { intensity, language: 'fr' },
                        seed
                    )

                    let reformulatedOptions = q.options
                    if (q.options && q.options.length > 0) {
                        reformulatedOptions = await Promise.all(
                            q.options.map(async (opt, optIndex) => ({
                                ...opt,
                                text: await this.reformulateText(
                                    opt.text,
                                    { intensity, language: 'fr' },
                                    `${seed}-opt${optIndex}`
                                )
                            }))
                        )
                    }

                    return {
                        ...q,
                        question: reformulatedQuestion,
                        options: reformulatedOptions
                    }
                })
            )

            reformulatedQuestions.push(...batchResults)
        }

        return reformulatedQuestions
    }

    /**
     * Clear the reformulation cache
     */
    static clearCache(): void {
        reformulationCache.clear()
    }

    /**
     * Check if the API is configured and working
     */
    static async isAvailable(): Promise<boolean> {
        if (!this.getApiKey()) return false

        try {
            const result = await this.reformulateText(
                "Test de connexion",
                { intensity: 'LIGHT', language: 'fr' }
            )
            return result !== "Test de connexion"
        } catch {
            return false
        }
    }

    /**
     * Get cache statistics
     */
    static getCacheStats(): { size: number; entries: number } {
        return {
            size: Array.from(reformulationCache.values()).reduce((acc, v) => acc + v.length, 0),
            entries: reformulationCache.size
        }
    }
}
