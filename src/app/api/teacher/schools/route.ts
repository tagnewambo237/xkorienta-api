import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SchoolService } from "@/lib/services/SchoolService";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const schools = await SchoolService.getTeacherSchools(session.user.id);
        return NextResponse.json(schools);
    } catch (error) {
        console.error("Error fetching user schools:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
