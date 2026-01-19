import { RegistrationController } from "@/lib/controllers/RegistrationController";

export async function POST(req: Request) {
    return RegistrationController.register(req);
}
