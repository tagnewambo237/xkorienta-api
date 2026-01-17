import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InvitationService } from "@/lib/services/InvitationService";
import connectDB from "@/lib/mongodb";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await props.params;
        await connectDB();
        const session = await getServerSession(authOptions);

        // If not logged in, redirect to login with callback
        // The callback will be THIS url, so after login, user comes back here
        if (!session?.user) {
            const callbackUrl = encodeURIComponent(req.url);
            const loginUrl = `/login?callbackUrl=${callbackUrl}`;
            return NextResponse.redirect(new URL(loginUrl, req.url));
        }

        // If logged in, accept invitation
        const result = await InvitationService.acceptInvitation(token, session.user.id);

        // Redirect to class page
        const classUrl = `/student/classes/${result.classId}`;
        return NextResponse.redirect(new URL(classUrl, req.url));

    } catch (error: any) {
        console.error("Error joining class:", error);
        // Redirect to dashboard with error? or show error page
        const errorUrl = `/dashboard?error=${encodeURIComponent(error.message)}`;
        return NextResponse.redirect(new URL(errorUrl, req.url));
    }
}
