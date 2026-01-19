import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { EducationStructureController } from "@/lib/controllers/EducationStructureController";

export async function GET(req: Request) {
    await connectDB();
    return EducationStructureController.getEducationLevels(req);
}

export async function POST(req: Request) {
    // TODO: Implémenter la création (Admin only)
    return NextResponse.json(
        { success: true, message: "Not implemented yet" },
        { status: 501 }
    );
}
