import { NextResponse } from "next/server";
import { InvitationService } from "@/lib/services/InvitationService";

const MAX_BATCH_SIZE = 500;

export class InvitationController {
    static async getOrCreateLink(classId: string, userId: string) {
        try {
            const invitation = await InvitationService.getOrCreateLink(classId, userId);

            const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${invitation.token}`;

            return NextResponse.json({
                invitation,
                url: inviteUrl
            });
        } catch (error: any) {
            console.error("[Invitation Controller] Get/Create Link Error:", error);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }
    }

    static async createLink(classId: string, userId: string, options?: any) {
        try {
            const invitation = await InvitationService.getOrCreateLink(classId, userId, options);
            const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${invitation.token}`;

            return NextResponse.json({ invitation, url: inviteUrl });
        } catch (error: any) {
            console.error("[Invitation Controller] Create Link Error:", error);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }
    }

    static async inviteIndividual(classId: string, email: string, name: string, userId: string) {
        try {
            if (!email || !name) {
                return NextResponse.json({ error: "Email et nom requis" }, { status: 400 });
            }

            const result = await InvitationService.inviteStudent(classId, email, name, userId);
            return NextResponse.json(result);
        } catch (error: any) {
            console.error("[Invitation Controller] Invite Individual Error:", error);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }
    }

    static async inviteBatch(classId: string, students: any[], userId: string, fileInfo?: any) {
        try {
            if (!students || !Array.isArray(students)) {
                return NextResponse.json({ error: "Liste d'étudiants requise" }, { status: 400 });
            }

            // Security: Limit batch size
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

            const result = await InvitationService.processBatch(classId, sanitizedStudents, userId, fileInfo);
            return NextResponse.json(result);
        } catch (error: any) {
            console.error("[Invitation Controller] Batch Invite Error:", error);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }
    }
}
