import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import LearnerProfile from "@/models/LearnerProfile";

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

        const profile = await LearnerProfile.findOne({ user: session.user.id })
            .populate('currentLevel')
            .populate('currentField')
            .lean();

        if (!profile) {
            return NextResponse.json(
                { success: false, message: "Profile not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: profile });

    } catch (error: any) {
        console.error("Get Student Profile Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
