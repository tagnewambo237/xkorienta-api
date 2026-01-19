import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Class from "@/models/Class";
import { ClassService } from "@/lib/services/ClassService";

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

        // 1. Get classes where student is enrolled
        const classes = await Class.find({ students: session.user.id })
            .populate('level')
            .populate('field')
            .populate('specialty');

        // 2. Get exams for each class
        let allExams: any[] = [];
        for (const cls of classes) {
            // getClassExams logic handles checking targetLevels, targetFields, etc.
            const classExams = await ClassService.getClassExams(cls._id.toString());
            allExams = [...allExams, ...classExams];
        }

        // 3. Deduplicate by ID
        const uniqueExams = Array.from(new Map(allExams.map(e => [e._id.toString(), e])).values());

        // Sort by startTime descending
        uniqueExams.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        return NextResponse.json({
            success: true,
            data: uniqueExams.map(e => ({
                ...e,
                id: e._id.toString()
            }))
        });

    } catch (error: any) {
        console.error("Get Student Exams Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
