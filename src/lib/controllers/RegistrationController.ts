import { NextResponse } from "next/server";
import { RegistrationService } from "@/lib/services/RegistrationService";

const registrationService = new RegistrationService();

export class RegistrationController {
    static async register(req: Request) {
        try {
            const data = await req.json();
            await registrationService.registerUser(data);
            return NextResponse.json({ success: true, message: "Registration successful" });

        } catch (error: any) {
            console.error("Registration Error:", error);

            // Handle specific errors with appropriate status codes
            if (error.message === "User already exists" ||
                error.message === "Invalid role" ||
                error.message === "School selection is required" ||
                error.message === "Selected school does not exist" ||
                error.message.includes("validated partner schools")) {
                return NextResponse.json(
                    { success: false, message: error.message },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { success: false, message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }
}
