import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Forum from '@/models/Forum'
import ForumPost, { PostStatus } from '@/models/ForumPost'
import { UserRole } from '@/models/enums'
import { safeTrigger, getForumChannel } from '@/lib/pusher'

interface RouteParams {
    params: Promise<{ forumId: string }>
}

/**
 * GET /api/forums/[forumId]/posts
 * Get posts for a forum
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { forumId } = await params
        const searchParams = request.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const skip = (page - 1) * limit

        // Verify forum exists and user is member
        const forum = await Forum.findById(forumId).lean()
        if (!forum) {
            return NextResponse.json({ error: 'Forum non trouvé' }, { status: 404 })
        }

        const posts = await ForumPost.find({
            forumId,
            status: PostStatus.PUBLISHED
        })
            .populate('authorId', 'name image role')
            .populate('replies.authorId', 'name image role')
            .sort({ isPinned: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const total = await ForumPost.countDocuments({
            forumId,
            status: PostStatus.PUBLISHED
        })

        return NextResponse.json({
            success: true,
            data: posts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })

    } catch (error: any) {
        console.error('[Forum Posts GET] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/forums/[forumId]/posts
 * Create a new post in forum
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { forumId } = await params
        const body = await request.json()
        const { title, content, isAnnouncement } = body

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 })
        }

        // Verify forum exists and user can post
        const forum = await Forum.findById(forumId)
        if (!forum) {
            return NextResponse.json({ error: 'Forum non trouvé' }, { status: 404 })
        }

        // Check posting permissions
        const isCreator = forum.createdBy.toString() === session.user.id
        const isMember = forum.members.some(m => m.toString() === session.user.id)
        const isStudent = session.user.role === UserRole.STUDENT

        if (!isCreator && !isMember) {
            return NextResponse.json({ error: 'Vous n\'êtes pas membre de ce forum' }, { status: 403 })
        }

        if (isStudent && !forum.allowStudentPosts) {
            return NextResponse.json({ error: 'Les étudiants ne peuvent pas publier dans ce forum' }, { status: 403 })
        }

        // Create post
        const post = await ForumPost.create({
            forumId,
            authorId: session.user.id,
            title,
            content,
            isAnnouncement: isAnnouncement && !isStudent, // Only teachers can make announcements
            status: forum.requireApproval && isStudent ? PostStatus.PENDING : PostStatus.PUBLISHED
        })

        // Update forum stats
        forum.postCount += 1
        forum.lastPostAt = new Date()
        forum.lastPostBy = session.user.id as any
        await forum.save()

        // Populate for response
        await post.populate('authorId', 'name image role')

        // Trigger Pusher for real-time
        safeTrigger(getForumChannel(forumId), 'new-post', {
            post: post.toObject()
        })

        return NextResponse.json({
            success: true,
            data: post
        }, { status: 201 })

    } catch (error: any) {
        console.error('[Forum Posts POST] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
