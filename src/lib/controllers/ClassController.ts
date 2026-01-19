import { NextResponse } from "next/server";
import { ClassService } from "@/lib/services/ClassService";
import { UserRole } from "@/models/enums";

export class ClassController {
    static async getClasses(req: Request, userId: string, userRole: UserRole) {
        try {
            // If teacher, get their classes
            if (userRole === UserRole.TEACHER) {
                const classes = await ClassService.getTeacherClasses(userId);
                return NextResponse.json({ success: true, data: classes });
            }

            // If admin/inspector, might want to see all classes or filter by school
            // For now, let's restrict to teacher's classes or return empty for others
            return NextResponse.json({ success: true, data: [] });

        } catch (error: any) {
            console.error("[Class Controller] Get Classes Error:", error);
            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async createClass(req: Request, userId: string) {
        try {
            const body = await req.json();
            const { name, school, level, academicYear, field, specialty } = body;

            if (!name || !school || !level || !academicYear) {
                return NextResponse.json(
                    { success: false, message: "Missing required fields" },
                    { status: 400 }
                );
            }

            const newClass = await ClassService.createClass(
                { name, school, level, academicYear, field, specialty },
                userId
            );

            return NextResponse.json({ success: true, data: newClass }, { status: 201 });

        } catch (error: any) {
            console.error("[Class Controller] Create Class Error:", error);
            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async deleteClass(req: Request, classId: string) {
        try {
            await ClassService.deleteClass(classId);
            return NextResponse.json({ success: true, message: "Class deleted successfully" });

        } catch (error: any) {
            console.error("[Class Controller] Delete Class Error:", error);
            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async getClassById(req: Request, classId: string, userId: string, userRole: UserRole) {
        try {
            const classData = await ClassService.getClassById(classId);

            if (!classData) {
                return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
            }

            // Access control: only teacher or admin/inspector
            if (userRole === UserRole.TEACHER && classData.mainTeacher._id.toString() !== userId) {
                return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
            }

            return NextResponse.json({ success: true, data: classData });

        } catch (error: any) {
            console.error("[Class Controller] Get Class By ID Error:", error);
            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async updateClass(req: Request, classId: string, userId: string) {
        try {
            const body = await req.json();

            // Check ownership
            const existingClass = await ClassService.getClassById(classId);
            if (!existingClass) {
                return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
            }

            if (existingClass.mainTeacher._id.toString() !== userId) {
                return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
            }

            const updatedClass = await ClassService.updateClass(classId, body);
            return NextResponse.json({ success: true, data: updatedClass });

        } catch (error: any) {
            console.error("[Class Controller] Update Class Error:", error);
            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }
}
