import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InvitationService } from "@/lib/services/InvitationService";
import { SchoolService } from "@/lib/services/SchoolService";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Validate ID
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
    }

    try {
        // Return existing active link
        const link = await InvitationService.getOrCreateSchoolLink(id, session.user.id);
        // Retourner un chemin relatif - le client construira l'URL complète
        return NextResponse.json({ link: `/api/invitations/${link.token}/join` });
    } catch (err) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Validate ID
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { type, email, name, teachers } = body;

        if (type === 'INDIVIDUAL') {
            const result = await InvitationService.inviteTeacher(id, email, name, session.user.id);
            return NextResponse.json(result);
        }

        if (type === 'BATCH') {
            const result = await InvitationService.processTeacherBatch(id, teachers, session.user.id);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
