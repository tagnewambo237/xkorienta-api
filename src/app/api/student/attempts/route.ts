import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Exam from "@/models/Exam";
import { addMinutes, isAfter, isPast } from "date-fns";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();

        // Fetch completed attempts for the user
        const attemptsDoc = await Attempt.find({
            userId: session.user.id,
            status: "COMPLETED"
        }).sort({ submittedAt: -1 }).lean();

        // Populate exams
        const examIds = [...new Set(attemptsDoc.map(a => a.examId.toString()))];
        const exams = await Exam.find({ _id: { $in: examIds } }).lean();
        const examsMap = new Map(exams.map(e => [e._id.toString(), e]));

        const now = new Date();

        const data = attemptsDoc.map(a => {
            const exam = examsMap.get(a.examId.toString()) as any;

            if (!exam) return null;

            // Calculate if results are delayed due to late exam period
            const lateDuration = exam?.config?.lateDuration || 0;
            const delayResultsUntilLateEnd = exam?.config?.delayResultsUntilLateEnd ?? false;
            const examEndTime = exam?.endTime ? new Date(exam.endTime) : null;
            const lateEndTime = examEndTime ? addMinutes(examEndTime, lateDuration) : null;

            // Results are locked if:
            // 1. Exam hasn't ended yet, OR
            // 2. We're in late period AND delayResultsUntilLateEnd is enabled
            const examEnded = examEndTime ? isPast(examEndTime) : false;
            const inLatePeriod = lateEndTime ? isAfter(lateEndTime, now) && examEnded : false;
            const resultsLocked = !examEnded || (delayResultsUntilLateEnd && inLatePeriod && lateDuration > 0);

            // Time until results if locked due to late period
            const timeUntilResults = inLatePeriod && lateEndTime
                ? Math.ceil((lateEndTime.getTime() - now.getTime()) / 1000 / 60)
                : 0;

            return {
                ...a,
                id: a._id.toString(),
                exam: {
                    ...exam,
                    id: exam._id.toString()
                },
                resultsLocked,
                inLatePeriod,
                timeUntilResults
            };
        }).filter(Boolean); // Filter out nulls

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("Get Student Attempts Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
