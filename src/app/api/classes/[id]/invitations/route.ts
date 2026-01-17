import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InvitationService } from "@/lib/services/InvitationService";
import connectDB from "@/lib/mongodb";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const invitation = await InvitationService.getOrCreateLink(id, session.user.id);

        // Construct full URL
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invitations/${invitation.token}/join`;

        return NextResponse.json({
            invitation,
            url: inviteUrl
        });

    } catch (error) {
        console.error("Error fetching invitation:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        const body = await req.json();
        const { type } = body;

        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        if (type === 'LINK') {
            const { options } = body;
            const invitation = await InvitationService.getOrCreateLink(id, session.user.id, options);
            const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${invitation.token}`;
            return NextResponse.json({ invitation, url: inviteUrl });
        }

        if (type === 'INDIVIDUAL') {
            const { email, name } = body;
            if (!email || !name) {
                return NextResponse.json({ error: "Email et nom requis" }, { status: 400 });
            }
            const result = await InvitationService.inviteStudent(id, email, name, session.user.id);
            return NextResponse.json(result);
        }

        if (type === 'BATCH') {
            const { students, fileInfo } = body; // Array of { name, email }
            if (!students || !Array.isArray(students)) {
                return NextResponse.json({ error: "Liste d'étudiants requise" }, { status: 400 });
            }

            // Security: Limit batch size
            const MAX_BATCH_SIZE = 500;
            if (students.length > MAX_BATCH_SIZE) {
                return NextResponse.json({
                    error: `Trop d'étudiants. Maximum: ${MAX_BATCH_SIZE}`
                }, { status: 400 });
            }

            // Security: Basic server-side validation of each student
            const sanitizedStudents = students
                .filter((s: any) => s && typeof s.name === 'string' && typeof s.email === 'string')
                .map((s: any) => ({
                    name: String(s.name).trim().substring(0, 100),
                    email: String(s.email).trim().toLowerCase().substring(0, 254)
                }))
                .filter((s: any) => s.name.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email));

            const result = await InvitationService.processBatch(id, sanitizedStudents, session.user.id, fileInfo);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Type d'invitation invalide" }, { status: 400 });

    } catch (error) {
        console.error("Error processing invitation:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
