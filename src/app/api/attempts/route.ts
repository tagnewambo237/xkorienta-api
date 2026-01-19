import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Exam from "@/models/Exam";
import { UserRole } from "@/models/enums";

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

        let query: any = {};

        // Security check based on roles
        if (session.user.role === UserRole.TEACHER) {
            // Teachers see attempts for exams they created
            const teacherExams = await Exam.find({ createdById: session.user.id }).select('_id');
            query = { examId: { $in: teacherExams.map(e => e._id) } };
        } else if (session.user.role === UserRole.STUDENT) {
            // Students only see their own attempts
            query = { userId: session.user.id };
        } else if (
            [
                UserRole.SCHOOL_ADMIN,
                UserRole.INSPECTOR,
                UserRole.DG_ISIMMA,
                UserRole.RECTOR,
                UserRole.DG_M4M,
                UserRole.TECH_SUPPORT
            ].includes(session.user.role as UserRole)
        ) {
            // Admins see all (or filtered by school if applicable, but general for now)
            // Can add school filter later
        } else {
            // Fallback for unknown roles (e.g. strict helpers)
            return NextResponse.json({ success: true, data: [] });
        }

        const attempts = await Attempt.find(query)
            .sort({ submittedAt: -1 })
            .limit(100)
            .populate('examId', 'title')
            .lean();

        return NextResponse.json({ success: true, data: attempts });

    } catch (error: any) {
        console.error("Get All Attempts Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
