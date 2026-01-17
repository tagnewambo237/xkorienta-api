import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Verifier le path
import ConceptEvaluation from "@/models/ConceptEvaluation";
import connectDB from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectDB();
        const { conceptId, syllabusId, level, reflection } = await req.json();

        if (!conceptId || !syllabusId || !level) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const evaluation = await ConceptEvaluation.create({
            student: session.user.id,
            concept: conceptId,
            syllabus: syllabusId,
            level,
            reflection,
            evaluatedAt: new Date()
        });

        return NextResponse.json({ success: true, data: evaluation });

    } catch (error) {
        console.error("Error submitting concept evaluation:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
