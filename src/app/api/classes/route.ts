import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { ClassController } from "@/lib/controllers/ClassController";
import { UserRole } from "@/models/enums";
// Import models to ensure they are registered
import "@/models/Class";
import "@/models/EducationLevel";
import "@/models/School";
import "@/models/Field";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    return ClassController.getClasses(req, session.user.id, session.user.role as UserRole);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== UserRole.TEACHER) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    return ClassController.createClass(req, session.user.id);
}
