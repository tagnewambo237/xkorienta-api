import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"

/**
 * API pour récupérer les notifications de l'utilisateur
 * Récupère les notifications depuis la base de données
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        // Récupérer les notifications de l'utilisateur (50 dernières)
        const notifications = await Notification.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()

        // Compter les non lues
        const unreadCount = await Notification.countDocuments({
            userId: session.user.id,
            read: false
        })

        // Formater les notifications pour le frontend
        const formattedNotifications = notifications.map(notif => ({
            id: notif._id.toString(),
            type: notif.type,
            title: notif.title,
            message: notif.message,
            timestamp: notif.createdAt,
            read: notif.read,
            data: notif.data
        }))

        return NextResponse.json({
            success: true,
            data: formattedNotifications,
            unreadCount
        })

    } catch (error: any) {
        console.error("Notifications Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * Marquer une ou plusieurs notifications comme lues
 */
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const body = await req.json()
        const { notificationId, markAllAsRead } = body

        if (markAllAsRead) {
            // Marquer toutes les notifications comme lues
            await Notification.updateMany(
                { userId: session.user.id, read: false },
                { $set: { read: true } }
            )

            return NextResponse.json({
                success: true,
                message: "All notifications marked as read"
            })
        } else if (notificationId) {
            // Marquer une notification spécifique comme lue
            await Notification.findOneAndUpdate(
                { _id: notificationId, userId: session.user.id },
                { $set: { read: true } }
            )

            return NextResponse.json({
                success: true,
                message: "Notification marked as read"
            })
        } else {
            return NextResponse.json(
                { success: false, message: "Missing notificationId or markAllAsRead parameter" },
                { status: 400 }
            )
        }

    } catch (error: any) {
        console.error("Mark Read Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * Supprimer une notification
 */
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        }

        await connectDB()

        const { searchParams } = new URL(req.url)
        const notificationId = searchParams.get('id')

        if (!notificationId) {
            return NextResponse.json(
                { success: false, message: "Missing notification ID" },
                { status: 400 }
            )
        }

        await Notification.findOneAndDelete({
            _id: notificationId,
            userId: session.user.id
        })

        return NextResponse.json({
            success: true,
            message: "Notification deleted"
        })

    } catch (error: any) {
        console.error("Delete Notification Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Internal server error" },
            { status: 500 }
        )
    }
}
