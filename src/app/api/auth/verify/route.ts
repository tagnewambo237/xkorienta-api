import { AuthController } from "@/lib/controllers/AuthController";

export async function POST(req: Request) {
    return AuthController.verify(req);
}
