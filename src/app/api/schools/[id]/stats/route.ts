import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SchoolService } from "@/lib/services/SchoolService";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate ID
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
    }

    try {
        await connectDB();

        const stats = await SchoolService.getSchoolStats(id);
        if (!stats) return NextResponse.json({ error: "School not found" }, { status: 404 });

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching school stats:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
