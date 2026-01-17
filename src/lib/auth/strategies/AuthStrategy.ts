/**
 * Strategy Pattern for Authentication Providers
 *
 * This interface defines the contract that all authentication strategies must implement.
 * This allows easy addition of new authentication methods (Google, GitHub, Facebook, etc.)
 */

import { Provider } from "next-auth/providers/index"
import { Session } from "next-auth"

export interface IAuthStrategy {
    /**
     * Unique identifier for the strategy
     */
    readonly id: string

    /**
     * Display name for the strategy
     */
    readonly name: string

    /**
     * Icon or logo for the UI
     */
    readonly icon?: string

    /**
     * Get the NextAuth provider configuration
     */
    getProvider(): Provider

    /**
     * Handle post-signin logic (e.g., create/update user in database)
     * @param profile - The profile data from the OAuth provider
     * @param account - The account data from NextAuth
     */
    handleSignIn?(profile: any, account: any): Promise<boolean>

    /**
     * Transform the session data if needed
     * @param session - The current session
     * @param token - The JWT token
     */
    transformSession?(session: Session, token: any): Promise<Session>

    /**
     * Validate if this strategy should be enabled
     * (e.g., check if required environment variables are set)
     */
    isEnabled(): boolean
}

/**
 * Abstract base class for authentication strategies
 */
export abstract class BaseAuthStrategy implements IAuthStrategy {
    abstract readonly id: string
    abstract readonly name: string
    readonly icon?: string

    abstract getProvider(): Provider

    async handleSignIn(profile: any, account: any): Promise<boolean> {
        // Default implementation - can be overridden
        return true
    }

    async transformSession(session: Session, token: any): Promise<Session> {
        // Default implementation - can be overridden
        return session
    }

    abstract isEnabled(): boolean

    /**
     * Helper to check if required env variables are set
     */
    protected checkEnvVars(...vars: string[]): boolean {
        return vars.every(v => !!process.env[v])
    }
}
