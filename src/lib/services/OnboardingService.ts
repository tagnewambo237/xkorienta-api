import User from "@/models/User"
import LearnerProfile from "@/models/LearnerProfile"
import EducationLevel from "@/models/EducationLevel"
import PedagogicalProfile from "@/models/PedagogicalProfile"
import { Cycle, SubSystem, SubscriptionStatus, UserRole } from "@/models/enums"

export class OnboardingService {
    /**
     * Complete user onboarding process
     */
    static async completeOnboarding(email: string, role: string, details: any) {
        const user = await User.findOne({ email })

        if (!user) {
            throw new Error("User not found")
        }

        // Prevent changing role if already set (security measure),
        // but do not block if the same role is already set and onboarding is incomplete.
        if (user.role && user.role !== role) {
            throw new Error("Role already assigned")
        }

        // Update User Role
        user.role = role as UserRole

        // Generate student code if role is STUDENT
        if (role === "STUDENT") {
            user.studentCode = Math.random().toString(36).substring(2, 10).toUpperCase()

            // Resolve (or create) an EducationLevel so LearnerProfile.currentLevel is never missing.
            const subSystem: SubSystem =
                details?.subSystem && Object.values(SubSystem).includes(details.subSystem)
                    ? details.subSystem
                    : SubSystem.FRANCOPHONE

            const cycle: Cycle =
                details?.cycle && Object.values(Cycle).includes(details.cycle)
                    ? details.cycle
                    : Cycle.COLLEGE

            const levelName: string =
                typeof details?.level === "string" && details.level.trim().length > 0
                    ? details.level.trim()
                    : "NIVEAU_INCONNU"

            let educationLevel =
                await EducationLevel.findOne({
                    subSystem,
                    cycle,
                    $or: [
                        { name: levelName },
                        { code: levelName },
                        { "metadata.displayName.fr": levelName }
                    ]
                })

            if (!educationLevel) {
                const last = await EducationLevel.findOne({ subSystem, cycle }).sort({ order: -1 }).lean()
                const order = (last?.order ?? 0) + 1
                const code = `ONB_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`

                educationLevel = await EducationLevel.create({
                    name: levelName,
                    code,
                    cycle,
                    subSystem,
                    order,
                    isActive: true,
                    metadata: {
                        displayName: { fr: levelName, en: levelName },
                        description: "Créé automatiquement lors de l'onboarding."
                    }
                })
            }

            // Create/update LearnerProfile
            await LearnerProfile.findOneAndUpdate(
                { user: user._id },
                {
                    $setOnInsert: {
                        subscriptionStatus: SubscriptionStatus.FREEMIUM,
                        stats: {
                            totalExamsTaken: 0,
                            averageScore: 0,
                            totalStudyTime: 0
                        },
                        gamification: {
                            level: 1,
                            xp: 0,
                            badges: [],
                            streak: 0
                        }
                    },
                    $set: {
                        currentLevel: educationLevel._id
                    }
                },
                { upsert: true, new: true }
            )
        } else if (role === "TEACHER") {
            // Create PedagogicalProfile if not exists
            const existingProfile = await PedagogicalProfile.findOne({ user: user._id })

            if (!existingProfile) {
                await PedagogicalProfile.create({
                    user: user._id,
                    contributionTypes: [],
                    accessScope: 'SUBJECT',
                    scopeDetails: {
                        specificSubjects: [],
                        specificLevels: [],
                        specificFields: []
                    },
                    stats: {
                        totalExamsCreated: 0,
                        totalExamsValidated: 0,
                        totalStudentsSupervised: 0,
                        averageStudentScore: 0
                    }
                })
            }
        }

        await user.save()
        return user
    }
}
