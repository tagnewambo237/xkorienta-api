import GoogleProvider from "next-auth/providers/google"
import { Provider } from "next-auth/providers/index"
import { BaseAuthStrategy } from "./AuthStrategy"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

/**
 * Google OAuth Authentication Strategy
 *
 * Allows users to sign in with their Google account
 */
export class GoogleAuthStrategy extends BaseAuthStrategy {
    readonly id = "google"
    readonly name = "Google"
    readonly icon = "google"

    getProvider(): Provider {
        return GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            },
            httpOptions: {
                timeout: 10000,
            }
        })
    }

    /**
     * Handle Google sign-in
     * Create or update user in database
     */
    async handleSignIn(profile: any, account: any): Promise<boolean> {
        try {
            await connectDB()

            // Check if user exists
            let user = await User.findOne({ email: profile.email })

            if (user) {
                // Update existing user with Google info
                user.name = profile.name || user.name
                user.image = profile.picture || user.image
                user.googleId = profile.sub

                // If user doesn't have a role yet, they will be redirected to onboarding
                // if (!user.role) {
                //     user.role = "STUDENT" 
                // }

                await user.save()
            } else {
                // Create new user from Google profile
                user = await User.create({
                    name: profile.name,
                    email: profile.email.toLowerCase(),
                    image: profile.picture,
                    googleId: profile.sub,
                    // role: "STUDENT", // Removed default role assignment
                    emailVerified: profile.email_verified,
                    // No password for OAuth users
                    // Student code will be generated during onboarding if STUDENT role is selected
                })
            }

            return true
        } catch (error) {
            console.error("[GoogleStrategy] Error during sign-in:", error)
            return false
        }
    }

    isEnabled(): boolean {
        return this.checkEnvVars("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
    }
}
