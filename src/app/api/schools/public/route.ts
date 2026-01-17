import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import School from "@/models/School";
import { SchoolStatus } from "@/models/enums";

/**
 * GET /api/schools/public
 * Returns validated (partner) schools, with optional search
 * Used by School Admin registration to find partner schools
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";

        // Build query: only VALIDATED schools
        const query: any = {
            status: SchoolStatus.VALIDATED,
            isActive: true
        };

        // Add search filter if provided
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        const schools = await School.find(query)
            .select("name type address logoUrl status contactInfo")
            .sort({ name: 1 })
            .limit(20);

        return NextResponse.json({
            success: true,
            data: schools
        });
    } catch (error) {
        console.error("Error fetching public schools:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
