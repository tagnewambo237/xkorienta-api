import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/AuthService";

const authService = new AuthService();

export class AuthController {
    static async verify(req: Request) {
        try {
            const body = await req.json();
            const { email, password } = body;

            if (!email || !password) {
                return NextResponse.json(
                    { message: "Email and password are required" },
                    { status: 400 }
                );
            }

            const user = await authService.verifyCredentials(email, password);

            if (!user) {
                return NextResponse.json(
                    { message: "Invalid credentials" },
                    { status: 401 }
                );
            }

            return NextResponse.json(user);

        } catch (error: any) {
            console.error("Auth Verify Error:", error);
            // Handle expected errors differently if needed
            if (error.message === "Email and password are required") {
                return NextResponse.json(
                    { message: error.message },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { message: error.message || "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async getProviders() {
        try {
            const data = authService.getAuthProviders();
            return NextResponse.json(data);
        } catch (error: any) {
            console.error("[AuthController] Get Providers Error:", error);
            return NextResponse.json(
                { error: "Failed to fetch providers" },
                { status: 500 }
            );
        }
    }

    static async verifyGoogle(req: Request) {
        try {
            const body = await req.json();
            const { idToken, user } = body || {};

            const data = await authService.verifyGoogle(idToken, user);
            return NextResponse.json(data);
        } catch (error: any) {
            console.error("[AuthController] Google Verify Error:", error);
            const status = error.status || 500;
            return NextResponse.json(
                { message: error.message || "Internal server error" },
                { status }
            );
        }
    }
}
