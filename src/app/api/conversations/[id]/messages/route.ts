import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import mongoose from "mongoose"
import Message from "@/models/Message"
import Conversation from "@/models/Conversation"
import { getPusherServer, getConversationChannel } from "@/lib/pusher"

/**
 * GET /api/conversations/[id]/messages
 * Get messages for a conversation (paginated)
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Non autorisé" },
                { status: 401 }
            )
        }

        await connectDB()
        const { id: conversationId } = await params

        // Verify user is participant
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: session.user.id
        })

        if (!conversation) {
            return NextResponse.json(
                { success: false, message: "Conversation non trouvée" },
                { status: 404 }
            )
        }

        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const before = searchParams.get('before') // Cursor for pagination

        const query: any = { conversationId }
        if (before) {
            query.createdAt = { $lt: new Date(before) }
        }

        const messages = await Message.find(query)
            .populate('senderId', 'name image')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()

        // Mark messages as read
        await Message.updateMany(
            {
                conversationId,
                senderId: { $ne: session.user.id },
                readBy: { $ne: session.user.id }
            },
            { $addToSet: { readBy: session.user.id } }
        )

        return NextResponse.json({
            success: true,
            data: messages.reverse(), // Return in chronological order
            hasMore: messages.length === limit
        })

    } catch (error: any) {
        console.error("[Get Messages] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Erreur serveur" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/conversations/[id]/messages
 * Send a new message
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, message: "Non autorisé" },
                { status: 401 }
            )
        }

        await connectDB()
        const { id: conversationId } = await params

        // Verify user is participant
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: session.user.id
        })

        if (!conversation) {
            return NextResponse.json(
                { success: false, message: "Conversation non trouvée" },
                { status: 404 }
            )
        }

        const { content, type, attachments, replyTo } = await req.json()

        if (!content?.trim()) {
            return NextResponse.json(
                { success: false, message: "Message vide" },
                { status: 400 }
            )
        }

        // Create message
        const message = await Message.create({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: new mongoose.Types.ObjectId(session.user.id),
            content: content.trim(),
            type: type || 'TEXT',
            attachments,
            replyTo,
            readBy: [new mongoose.Types.ObjectId(session.user.id)]
        })

        // Update conversation's lastMessage
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: {
                content: content.length > 100 ? content.substring(0, 100) + '...' : content,
                senderId: session.user.id,
                sentAt: new Date()
            },
            updatedAt: new Date()
        })

        // Populate sender info
        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name image')
            .lean()

        // Publish to Pusher for real-time delivery
        try {
            const pusher = getPusherServer()
            if (pusher) {
                await pusher.trigger(
                    getConversationChannel(conversationId),
                    'new-message',
                    {
                        ...populatedMessage,
                        _id: message._id.toString()
                    }
                )
                console.log('[Pusher] Message published')
            }
        } catch (pusherError) {
            console.error("[Pusher Publish] Error:", pusherError)
            // Don't fail the request if Pusher fails
        }

        return NextResponse.json({
            success: true,
            data: populatedMessage,
            message: "Message envoyé"
        }, { status: 201 })

    } catch (error: any) {
        console.error("[Send Message] Error:", error)
        return NextResponse.json(
            { success: false, message: error.message || "Erreur serveur" },
            { status: 500 }
        )
    }
}
