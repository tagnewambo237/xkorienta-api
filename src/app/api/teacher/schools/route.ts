import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { SchoolController } from "@/lib/controllers/SchoolController";
import { UserRole } from "@/models/enums";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== UserRole.TEACHER) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    return SchoolController.getTeacherSchools(session.user.id);
}
