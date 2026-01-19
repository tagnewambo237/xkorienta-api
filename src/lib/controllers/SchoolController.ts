import { NextResponse } from "next/server";
import { SchoolService } from "@/lib/services/SchoolService";

export class SchoolController {
    static async getSchools(req: Request) {
        try {
            const { searchParams } = new URL(req.url);
            const search = searchParams.get('search') || undefined;
            const type = searchParams.get('type') || undefined;

            const schools = await SchoolService.searchSchools(search, type);
            return NextResponse.json({ success: true, data: schools });
        } catch (error: any) {
            console.error("[Schools Controller] Error:", error);
            return NextResponse.json(
                { success: false, message: "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async getSchoolClasses(req: Request, schoolId: string) {
        try {
            // Basic validation
            if (!schoolId || schoolId === 'undefined') {
                return NextResponse.json({ success: false, message: "Invalid school ID" }, { status: 400 });
            }

            const classes = await SchoolService.getSchoolClasses(schoolId);
            return NextResponse.json({ success: true, data: classes }); // Wrap in success format for consistency
        } catch (error: any) {
            console.error("[Schools Controller] Get Classes Error:", error);
            return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
        }
    }
}
