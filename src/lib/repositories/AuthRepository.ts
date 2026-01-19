import connectDB from "@/lib/mongodb";
import User, { IUser } from "@/models/User";

export class AuthRepository {
    async findByEmailWithPassword(email: string) {
        await connectDB();
        return await User.findOne({ email }).select("+password");
    }

    async incrementLoginAttempts(userId: string, lockUntil?: Date) {
        await connectDB();
        const update: any = { $inc: { loginAttempts: 1 } };
        if (lockUntil) {
            update.$set = { lockedUntil: lockUntil };
        }
        await User.findByIdAndUpdate(userId, update);
    }

    async resetLoginAttempts(userId: string) {
        await connectDB();
        await User.findByIdAndUpdate(userId, {
            $set: {
                loginAttempts: 0,
                lockedUntil: null,
                lastLogin: new Date()
            }
        });
    }
}
