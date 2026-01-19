import { AuthController } from "@/lib/controllers/AuthController";

export async function GET() {
    return AuthController.getProviders();
}
