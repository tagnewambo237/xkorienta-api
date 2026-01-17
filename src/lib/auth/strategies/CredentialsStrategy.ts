import CredentialsProvider from "next-auth/providers/credentials"
import { Provider } from "next-auth/providers/index"
import { BaseAuthStrategy } from "./AuthStrategy"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import bcrypt from "bcryptjs"

/**
 * Credentials (Email/Password) Authentication Strategy
 *
 * Traditional email and password login
 */
export class CredentialsAuthStrategy extends BaseAuthStrategy {
    readonly id = "credentials"
    readonly name = "Email & Password"
    readonly icon = "mail"

    getProvider(): Provider {
        return CredentialsProvider({
            id: this.id,
            name: this.name,
            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                    placeholder: "votremail@example.com"
                },
                password: {
                    label: "Mot de passe",
                    type: "password"
                },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email et mot de passe requis")
                }

                await connectDB()

                const user = await User.findOne({
                    email: credentials.email.toLowerCase(),
                })

                if (!user) {
                    throw new Error("Aucun utilisateur trouvé avec cet email")
                }

                // Check if user has a password (OAuth users don't)
                if (!user.password) {
                    throw new Error("Ce compte utilise une autre méthode de connexion")
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                )

                if (!isPasswordValid) {
                    throw new Error("Mot de passe incorrect")
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    image: user.image || null,
                }
            },
        })
    }

    isEnabled(): boolean {
        // Credentials auth is always enabled
        return true
    }
}
