import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import ForumPost from '@/models/ForumPost'
import { safeTrigger, getForumChannel } from '@/lib/pusher'
import mongoose from 'mongoose'

interface RouteParams {
    params: Promise<{ forumId: string; postId: string }>
}

/**
 * POST /api/forums/[forumId]/posts/[postId]/replies
 * Add a reply to a post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { forumId, postId } = await params
        const body = await request.json()
        const { content } = body

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 })
        }

        const post = await ForumPost.findById(postId)
        if (!post) {
            return NextResponse.json({ error: 'Post non trouvé' }, { status: 404 })
        }

        const newReply = {
            _id: new mongoose.Types.ObjectId(),
            authorId: new mongoose.Types.ObjectId(session.user.id),
            content,
            createdAt: new Date(),
            likes: []
        }

        post.replies.push(newReply as any)
        post.replyCount = post.replies.length // Manually update count since we removed the hook
        await post.save()

        // Trigger Pusher event (safely handles network errors)
        // Include full author info for UI
        const replyWithUser = {
            ...newReply,
            authorId: {
                _id: session.user.id,
                name: session.user.name,
                image: session.user.image,
                role: session.user.role
            }
        }

        safeTrigger(getForumChannel(forumId), 'new-reply', {
            postId,
            reply: replyWithUser
        })

        return NextResponse.json({
            success: true,
            data: newReply
        }, { status: 201 })

    } catch (error: any) {
        console.error('[Reply POST] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
