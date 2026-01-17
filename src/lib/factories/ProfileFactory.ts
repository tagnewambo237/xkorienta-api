import User, { IUser } from '@/models/User'
import LearnerProfile, { ILearnerProfile } from '@/models/LearnerProfile'
import PedagogicalProfile, { IPedagogicalProfile } from '@/models/PedagogicalProfile'
import { UserRole, SubSystem } from '@/models/enums'
import mongoose from 'mongoose'

export interface CreateUserDTO {
    name: string
    email: string
    password?: string
    role: UserRole
    subSystem?: SubSystem
    institution?: string
    preferences?: {
        language: string
        timezone?: string
        notifications: {
            email: boolean
            push: boolean
        }
    }
    metadata?: {
        avatar?: string
        phone?: string
        address?: string
    }
}

export class ProfileFactory {
    /**
     * Creates a user and their associated profile (Learner or Pedagogical) based on the role.
     * Uses a transaction to ensure atomicity.
     */
    static async createUser(
        userData: CreateUserDTO,
        profileData: Partial<ILearnerProfile | IPedagogicalProfile> = {}
    ): Promise<{ user: IUser, profile: ILearnerProfile | IPedagogicalProfile | null }> {
        const session = await mongoose.startSession()
        session.startTransaction()

        try {
            // Create User
            const [user] = await User.create([userData], { session })

            let profile = null

            if (userData.role === UserRole.STUDENT) {
                // Create LearnerProfile
                const learnerProfiles = await LearnerProfile.create([{
                    user: user._id,
                    ...profileData
                } as any], { session })
                profile = learnerProfiles[0]
            } else if (this.isPedagogicalRole(userData.role)) {
                // Create PedagogicalProfile
                const pedagogicalProfiles = await PedagogicalProfile.create([{
                    user: user._id,
                    ...profileData
                } as any], { session })
                profile = pedagogicalProfiles[0]
            }

            await session.commitTransaction()
            return { user, profile }
        } catch (error) {
            await session.abortTransaction()
            throw error
        } finally {
            session.endSession()
        }
    }

    private static isPedagogicalRole(role: UserRole): boolean {
        return [
            UserRole.TEACHER,
            UserRole.INSPECTOR,
            UserRole.SURVEILLANT,
            UserRole.PREFET,
            UserRole.PRINCIPAL,
            UserRole.DG_ISIMMA,
            UserRole.RECTOR,
            UserRole.DG_M4M,
            UserRole.TECH_SUPPORT
        ].includes(role)
    }
}
