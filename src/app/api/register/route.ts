import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { registrationLimiter, getClientIdentifier, createRateLimitResponse } from "@/lib/security/rateLimiter"
import { sanitizeString, sanitizeEmail, validatePassword } from "@/lib/security/sanitize"


export async function POST(req: Request) {
    try {
        // Apply rate limiting
        const identifier = getClientIdentifier(req)
        const rateLimitResult = registrationLimiter(identifier)

        if (!rateLimitResult.success) {
            return createRateLimitResponse(rateLimitResult.resetTime)
        }

        await connectDB()

        const body = await req.json()

        // Sanitize inputs before validation
        const sanitizedBody = {
            name: sanitizeString(body.name),
            email: sanitizeEmail(body.email),
            password: body.password, // Don't sanitize password, just validate
        }

        // Updated schema - no role required during registration
        const registerSchema = z.object({
            name: z.string().min(2).max(100),
            email: z.string().email(),
            password: z.string().min(8).max(128),
        })

        const { name, email, password } = registerSchema.parse(sanitizedBody)

        // Additional password validation
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.valid) {
            return NextResponse.json(
                { message: passwordValidation.message },
                { status: 400 }
            )
        }

        const existingUser = await User.findOne({ email })

        if (existingUser) {
            return NextResponse.json(
                { message: "User already exists" },
                { status: 400 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        // Create user without role - will be set during onboarding
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            // role will be undefined, set during onboarding
        })

        return NextResponse.json(
            {
                message: "User created successfully. Please complete onboarding.",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                }
            },
            { status: 201 }
        )
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json(
                { message: "Invalid input data" },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { message: error.message || "Something went wrong" },
            { status: 500 }
        )
    }
}
