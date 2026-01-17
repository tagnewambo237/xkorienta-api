import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ClassService } from "@/lib/services/ClassService";
import connectDB from "@/lib/mongodb";
import { UserRole } from "@/models/enums";

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string; studentId: string }> }
) {
    try {
        const { id, studentId } = await props.params;

        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.TEACHER) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const classData = await ClassService.getClassById(id);
        if (!classData) {
            return NextResponse.json({ error: "Class not found" }, { status: 404 });
        }

        if (classData.mainTeacher._id.toString() !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await ClassService.removeStudent(id, studentId);

        return NextResponse.json({ success: true, message: "Student removed from class" });

    } catch (error: any) {
        console.error("Error removing student:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
