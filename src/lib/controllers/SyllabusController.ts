import { NextResponse } from "next/server";
import { SyllabusService } from "@/lib/services/SyllabusService";

export class SyllabusController {
    static async getById(req: Request, id: string, userId: string) {
        try {
            // userId passed for potential future ACL checks, though service handles logic.
            const syllabus = await SyllabusService.getSyllabusById(id);
            return NextResponse.json({ success: true, data: syllabus });
        } catch (error: any) {
            console.error("[Syllabus Controller] Get Error:", error);

            if (error.message === "Syllabus not found") {
                return NextResponse.json({ success: false, message: error.message }, { status: 404 });
            }
            if (error.message === "Invalid syllabus ID") {
                return NextResponse.json({ success: false, message: error.message }, { status: 400 });
            }

            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async update(req: Request, id: string, userId: string) {
        try {
            const body = await req.json();
            const updatedSyllabus = await SyllabusService.updateSyllabus(id, userId, body);

            return NextResponse.json({ success: true, data: updatedSyllabus });
        } catch (error: any) {
            console.error("[Syllabus Controller] Update Error:", error);

            if (error.message === "Syllabus not found") {
                return NextResponse.json({ success: false, message: error.message }, { status: 404 });
            }
            if (error.message === "Forbidden") {
                return NextResponse.json({ success: false, message: error.message }, { status: 403 });
            }
            if (error.message === "Invalid syllabus ID") {
                return NextResponse.json({ success: false, message: error.message }, { status: 400 });
            }

            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async delete(req: Request, id: string, userId: string) {
        try {
            await SyllabusService.deleteSyllabus(id, userId);

            return NextResponse.json({ success: true, message: "Syllabus archived" });
        } catch (error: any) {
            console.error("[Syllabus Controller] Delete Error:", error);

            if (error.message === "Syllabus not found") {
                return NextResponse.json({ success: false, message: error.message }, { status: 404 });
            }
            if (error.message === "Forbidden") {
                return NextResponse.json({ success: false, message: error.message }, { status: 403 });
            }
            if (error.message === "Invalid syllabus ID") {
                return NextResponse.json({ success: false, message: error.message }, { status: 400 });
            }

            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }
}
