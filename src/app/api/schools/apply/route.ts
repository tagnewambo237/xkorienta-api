import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import School from "@/models/School";
import connectDB from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { schoolId } = await req.json();

        if (!schoolId) {
            return NextResponse.json({ error: "School ID is required" }, { status: 400 });
        }

        await connectDB();

        const school = await School.findById(schoolId);
        if (!school) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        // Check if already a teacher or admin
        const userId = session.user.id;
        const isTeacher = school.teachers.some(id => id.toString() === userId);
        const isAdmin = school.admins.some(id => id.toString() === userId);
        const isOwner = school.owner.toString() === userId;

        if (isTeacher || isAdmin || isOwner) {
            return NextResponse.json({ error: "You are already a member of this school" }, { status: 400 });
        }

        // Check if already applied
        if (school.applicants && school.applicants.some(id => id.toString() === userId)) {
            return NextResponse.json({ error: "You have already applied to this school" }, { status: 400 });
        }

        // Add to applicants
        school.applicants = school.applicants || [];
        school.applicants.push(new mongoose.Types.ObjectId(userId));
        await school.save();

        return NextResponse.json({ success: true, message: "Application submitted successfully" });

        return NextResponse.json({ success: true, message: "Application submitted successfully" });

    } catch (error) {
        console.error("Error applying to school:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
