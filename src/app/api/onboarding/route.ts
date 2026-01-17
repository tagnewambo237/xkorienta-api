import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import LearnerProfile from "@/models/LearnerProfile"
import EducationLevel from "@/models/EducationLevel"
import PedagogicalProfile from "@/models/PedagogicalProfile"
import { Cycle, SubSystem, SubscriptionStatus } from "@/models/enums"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            )
        }

        const { role, details } = await req.json()

        if (!role || !["STUDENT", "TEACHER"].includes(role)) {
            return NextResponse.json(
                { message: "Invalid role selected" },
                { status: 400 }
            )
        }

        await connectDB()

        const user = await User.findOne({ email: session.user.email })

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            )
        }

        // Prevent changing role if already set (security measure),
        // but do not block if the same role is already set and onboarding is incomplete.
        if (user.role && user.role !== role) {
            return NextResponse.json(
                { message: "Role already assigned" },
                { status: 400 }
            )
        }

        // Update User Role
        user.role = role

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

            // Create/update LearnerProfile (avoid blocking if a partial profile already exists)
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
                // IMPORTANT:
                // L'onboarding ne doit jamais être bloquant. En dev, le modèle Mongoose
                // peut rester "caché" avec d'anciennes contraintes (ex: currentLevel required),
                // ce qui déclenche un ValidatorError et bloque la connexion.
                // On évite donc l'exécution des validateurs sur cet upsert.
                { upsert: true, new: true }
            )
        } else if (role === "TEACHER") {
            // Create PedagogicalProfile
            await PedagogicalProfile.create({
                user: user._id,
                // Store subjects and levels in metadata or specific fields
                // Assuming the schema supports storing these as strings or we need to map them
                // For now, we create the base profile
                contributionTypes: [],
                accessScope: 'SUBJECT', // Default for teachers
                scopeDetails: {
                    specificSubjects: [], // Would need to map names to IDs
                    specificLevels: [],   // Would need to map names to IDs
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

        await user.save()

        return NextResponse.json(
            { message: "Onboarding completed successfully", user },
            { status: 200 }
        )

    } catch (error) {
        console.error("[Onboarding API] Error:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}
