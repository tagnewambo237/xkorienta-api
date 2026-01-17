import User, { IUser } from '@/models/User'
import LearnerProfile, { ILearnerProfile } from '@/models/LearnerProfile'
import PedagogicalProfile, { IPedagogicalProfile } from '@/models/PedagogicalProfile'
import { UserRole } from '@/models/enums'

/**
 * Factory Pattern for User Profiles
 * Handles the creation of the appropriate profile based on the user's role.
 */
export class ProfileFactory {
    /**
     * Creates or retrieves the profile for a given user
     * @param user The user document
     * @returns The profile document (LearnerProfile or PedagogicalProfile)
     */
    static async createProfile(user: IUser): Promise<ILearnerProfile | IPedagogicalProfile> {
        if (!user.role) {
            throw new Error('User has no role assigned')
        }

        if (user.role === UserRole.STUDENT) {
            return await this.createLearnerProfile(user)
        } else {
            return await this.createPedagogicalProfile(user)
        }
    }

    private static async createLearnerProfile(user: IUser): Promise<ILearnerProfile> {
        let profile = await LearnerProfile.findOne({ user: user._id })

        if (!profile) {
            profile = await LearnerProfile.create({
                user: user._id,
                // Default initialization
                stats: {
                    totalExamsTaken: 0,
                    averageScore: 0,
                    totalStudyTime: 0,
                    strongSubjects: [],
                    weakSubjects: []
                },
                gamification: {
                    level: 1,
                    xp: 0,
                    badges: [],
                    streak: 0
                }
            })
        }

        return profile
    }

    private static async createPedagogicalProfile(user: IUser): Promise<IPedagogicalProfile> {
        let profile = await PedagogicalProfile.findOne({ user: user._id })

        if (!profile) {
            profile = await PedagogicalProfile.create({
                user: user._id,
                // Default initialization
                stats: {
                    totalExamsCreated: 0,
                    totalExamsValidated: 0,
                    totalStudentsSupervised: 0,
                    averageStudentScore: 0
                }
            })
        }

        return profile
    }
}
