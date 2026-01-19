import { AuthRepository } from "@/lib/repositories/AuthRepository";
import { authStrategyManager } from "@/lib/auth/strategies/AuthStrategyManager";
import bcrypt from "bcryptjs";

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
}
