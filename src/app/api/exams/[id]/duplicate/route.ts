import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Exam from "@/models/Exam"
import Question from "@/models/Question"
import Option from "@/models/Option"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ExamStatus } from "@/models/enums"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== "TEACHER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { id } = await params

        // Fetch the original exam
        const originalExam = await Exam.findById(id).lean()

        if (!originalExam) {
            return NextResponse.json({ message: "Exam not found" }, { status: 404 })
        }

        // Verify ownership
        if (originalExam.createdById.toString() !== session.user.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
        }

        // Fetch questions 
        const questions = await Question.find({ examId: id }).lean()

        // Create the duplicate exam with all fields
        const duplicatedExam = await Exam.create({
            // Basic info
            title: `${originalExam.title} (Copie)`,
            description: originalExam.description,
            imageUrl: originalExam.imageUrl,

            // Educational classification
            subSystem: originalExam.subSystem,
            targetLevels: originalExam.targetLevels,
            subject: originalExam.subject,
            syllabus: originalExam.syllabus,
            learningUnit: originalExam.learningUnit,
            targetFields: originalExam.targetFields,
            targetedCompetencies: originalExam.targetedCompetencies,
            linkedConcepts: originalExam.linkedConcepts,

            // Pedagogical objectives
            pedagogicalObjective: originalExam.pedagogicalObjective,
            evaluationType: originalExam.evaluationType,
            learningMode: originalExam.learningMode,
            difficultyLevel: originalExam.difficultyLevel,

            // Time configuration - set to future dates
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
            duration: originalExam.duration,
            closeMode: originalExam.closeMode,

            // Status - always start as DRAFT
            status: ExamStatus.DRAFT,
            isPublished: false,
            isActive: true,

            // Configuration (copy all settings)
            config: {
                shuffleQuestions: originalExam.config?.shuffleQuestions ?? false,
                shuffleOptions: originalExam.config?.shuffleOptions ?? false,
                showResultsImmediately: originalExam.config?.showResultsImmediately ?? true,
                allowReview: originalExam.config?.allowReview ?? true,
                passingScore: originalExam.config?.passingScore ?? 50,
                maxAttempts: originalExam.config?.maxAttempts ?? 1,
                timeBetweenAttempts: originalExam.config?.timeBetweenAttempts ?? 0,
                enableImmediateFeedback: originalExam.config?.enableImmediateFeedback ?? false,
                antiCheat: {
                    fullscreenRequired: originalExam.config?.antiCheat?.fullscreenRequired ?? true,
                    disableCopyPaste: originalExam.config?.antiCheat?.disableCopyPaste ?? true,
                    trackTabSwitches: originalExam.config?.antiCheat?.trackTabSwitches ?? true,
                    webcamRequired: originalExam.config?.antiCheat?.webcamRequired ?? false,
                    maxTabSwitches: originalExam.config?.antiCheat?.maxTabSwitches ?? 3,
                    preventScreenshot: originalExam.config?.antiCheat?.preventScreenshot ?? false,
                    blockRightClick: originalExam.config?.antiCheat?.blockRightClick ?? true,
                    aiReformulation: originalExam.config?.antiCheat?.aiReformulation,
                    reformulationIntensity: originalExam.config?.antiCheat?.reformulationIntensity,
                },
                lateDuration: originalExam.config?.lateDuration ?? 0,
                delayResultsUntilLateEnd: originalExam.config?.delayResultsUntilLateEnd ?? true,
            },

            // Reset stats for the new exam
            stats: {
                totalAttempts: 0,
                totalCompletions: 0,
                averageScore: 0,
                averageTime: 0,
                passRate: 0,
            },

            // Metadata
            createdById: session.user.id,
            tags: originalExam.tags || [],
            version: 1,
        })

        // Duplicate questions with all their data
        for (const question of questions) {
            // Fetch options for QCM questions
            const options = await Option.find({ questionId: question._id }).lean()

            const newQuestion = await Question.create({
                examId: duplicatedExam._id,
                text: question.text,
                imageUrl: question.imageUrl,
                audioUrl: question.audioUrl,
                type: question.type,
                points: question.points,
                difficulty: question.difficulty,
                timeLimit: question.timeLimit,
                correctAnswer: question.correctAnswer,
                modelAnswer: question.modelAnswer,
                openQuestionConfig: question.openQuestionConfig,
                explanation: question.explanation,
                hints: question.hints,
                tags: question.tags,
                order: question.order,
                // Reset stats for the new question
                stats: {
                    timesAsked: 0,
                    timesCorrect: 0,
                    timesIncorrect: 0,
                    successRate: 0,
                },
            })

            // Duplicate options if any
            if (options.length > 0) {
                await Option.insertMany(
                    options.map((option) => ({
                        questionId: newQuestion._id,
                        text: option.text,
                        isCorrect: option.isCorrect,
                        imageUrl: option.imageUrl,
                        order: option.order,
                    }))
                )
            }
        }

        return NextResponse.json({
            success: true,
            message: "Examen dupliqué avec succès",
            data: {
                _id: duplicatedExam._id.toString(),
                title: duplicatedExam.title,
            }
        }, { status: 201 })
    } catch (error: any) {
        console.error("Error duplicating exam:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Échec de la duplication de l'examen" },
            { status: 500 }
        )
    }
}
