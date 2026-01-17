import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InvitationService } from "@/lib/services/InvitationService";
import connectDB from "@/lib/mongodb";

/**
 * GET /api/classes/[id]/invitations/links
 * Get all invitation links for a class
 */
export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params;
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
        }

        const links = await InvitationService.getClassInvitations(id);

        return NextResponse.json({
            success: true,
            data: links
        });

    } catch (error) {
        console.error("Error fetching invitation links:", error);
        return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
    }
}
