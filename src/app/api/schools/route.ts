import { SchoolController } from "@/lib/controllers/SchoolController";

export async function GET(req: Request) {
    return SchoolController.getSchools(req);
}
