import { NextRequest } from "next/server";
import { SchoolController } from "@/lib/controllers/SchoolController";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Correct type for Next.js 15+ dynamic routes
) {
    const { id } = await context.params;
    return SchoolController.getSchoolClasses(req, id);
}
