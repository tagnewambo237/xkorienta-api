import { AuthRepository } from "@/lib/repositories/AuthRepository";
import { authStrategyManager } from "@/lib/auth/strategies/AuthStrategyManager";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

type GoogleUserPayload = {
    email?: string;
    name?: string;
    image?: string;
    id?: string;
};

export class AuthService {
    private authRepository: AuthRepository;
    private readonly MAX_LOGIN_ATTEMPTS = 5;
    private readonly LOCK_TIME_MINUTES = 15;

    constructor() {
        this.authRepository = new AuthRepository();
    }

    async verifyCredentials(email: string, password: string) {
        if (!email || !password) {
            throw new Error("Email and password are required");
        }

        const user = await this.authRepository.findByEmailWithPassword(email);

        if (!user) {
            // Return null instead of error to avoid checking for non-existent users
            return null;
        }

        // 1. Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            const remaining = Math.ceil((new Date(user.lockedUntil).getTime() - new Date().getTime()) / 60000);
            throw new Error(`Account is locked. Try again in ${remaining} minutes.`);
        }

        // 2. Verify password
        const isMatch = await bcrypt.compare(password, user.password || "");
        const isPlainMatch = user.password === password; // Legacy fallback

        if (!isMatch && !isPlainMatch) {
            // Increment attempts
            let lockUntil: Date | undefined;
            if ((user.loginAttempts || 0) + 1 >= this.MAX_LOGIN_ATTEMPTS) {
                lockUntil = new Date(Date.now() + this.LOCK_TIME_MINUTES * 60000);
            }

            await this.authRepository.incrementLoginAttempts(user._id.toString(), lockUntil);

            if (lockUntil) {
                throw new Error(`Account locked due to too many failed attempts. Try again in ${this.LOCK_TIME_MINUTES} minutes.`);
            }

            return null; // Invalid password
        }

        // 3. Success: Reset attempts
        await this.authRepository.resetLoginAttempts(user._id.toString());

        // Return safe user info
        return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image || user.metadata?.avatar,
            schools: user.schools,
            schoolId: user.schools && user.schools.length > 0 ? user.schools[0].toString() : undefined
        };
    }

    getAuthProviders() {
        return {
            providers: authStrategyManager.getUIStrategies(),
            status: authStrategyManager.getConfigStatus()
        };
    }

    async verifyGoogle(idToken?: string, userPayload?: GoogleUserPayload) {
        const profile = await this.getGoogleProfile(idToken, userPayload);

        await connectDB();

        const email = profile.email.toLowerCase();
        let user = await User.findOne({ email });

        if (user) {
            user.name = profile.name || user.name;
            user.image = profile.picture || user.image;
            user.googleId = profile.sub || user.googleId;
            if (typeof profile.email_verified === "boolean") {
                user.emailVerified = profile.email_verified;
            }
            user.lastLogin = new Date();
            await user.save();
        } else {
            user = await User.create({
                name: profile.name,
                email,
                image: profile.picture,
                googleId: profile.sub,
                emailVerified: profile.email_verified,
                lastLogin: new Date()
            });
        }

        return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image || user.metadata?.avatar,
            schools: user.schools,
            schoolId: user.schools && user.schools.length > 0 ? user.schools[0].toString() : undefined
        };
    }

    private async getGoogleProfile(idToken?: string, userPayload?: GoogleUserPayload) {
        if (!idToken) {
            if (process.env.NODE_ENV === "development" && userPayload?.email) {
                return {
                    email: userPayload.email,
                    name: userPayload.name,
                    picture: userPayload.image,
                    sub: userPayload.id
                };
            }
            const error: any = new Error("Google idToken is required");
            error.status = 400;
            throw error;
        }

        const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
        const response = await fetch(tokenInfoUrl);
        if (!response.ok) {
            const error: any = new Error("Invalid Google token");
            error.status = 401;
            throw error;
        }

        const data = await response.json();
        if (!data?.email) {
            const error: any = new Error("Invalid Google token payload");
            error.status = 401;
            throw error;
        }

        if (process.env.GOOGLE_CLIENT_ID && data.aud !== process.env.GOOGLE_CLIENT_ID) {
            const error: any = new Error("Google token audience mismatch");
            error.status = 401;
            throw error;
        }

        return {
            email: data.email,
            email_verified: data.email_verified === true || data.email_verified === "true",
            name: data.name,
            picture: data.picture,
            sub: data.sub
        };
    }
}
