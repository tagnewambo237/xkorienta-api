import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Forum, { ForumStatus } from '@/models/Forum'
import ForumPost, { PostStatus } from '@/models/ForumPost'
import { UserRole } from '@/models/enums'
import { getPusherServer, getForumChannel } from '@/lib/pusher'

interface RouteParams {
    params: Promise<{ forumId: string }>
}

/**
 * GET /api/forums/[forumId]
 * Get forum details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { forumId } = await params

        const forum = await Forum.findById(forumId)
            .populate('createdBy', 'name image')
            .populate('relatedClass', 'name')
            .populate('relatedSubject', 'name')
            .populate('members', 'name image')
            .lean()

        if (!forum) {
            return NextResponse.json({ error: 'Forum non trouvé' }, { status: 404 })
        }

        // Check if user is a member
        const isMember = (forum as any).members.some(
            (m: any) => m._id.toString() === session.user.id
        ) || (forum as any).createdBy._id.toString() === session.user.id

        if (!isMember && (forum as any).isPrivate) {
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
        }

        return NextResponse.json({
            success: true,
            data: forum
        })

    } catch (error: any) {
        console.error('[Forum GET] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * PUT /api/forums/[forumId]
 * Update forum settings
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { forumId } = await params
        const body = await request.json()

        const forum = await Forum.findById(forumId)
        if (!forum) {
            return NextResponse.json({ error: 'Forum non trouvé' }, { status: 404 })
        }

        // Only creator can update
        if (forum.createdBy.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
        }

        const { name, description, isPrivate, allowStudentPosts, status } = body

        if (name) forum.name = name
        if (description !== undefined) forum.description = description
        if (isPrivate !== undefined) forum.isPrivate = isPrivate
        if (allowStudentPosts !== undefined) forum.allowStudentPosts = allowStudentPosts
        if (status) forum.status = status

        await forum.save()

        return NextResponse.json({
            success: true,
            data: forum
        })

    } catch (error: any) {
        console.error('[Forum PUT] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * DELETE /api/forums/[forumId]
 * Archive (soft delete) a forum
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { forumId } = await params

        const forum = await Forum.findById(forumId)
        if (!forum) {
            return NextResponse.json({ error: 'Forum non trouvé' }, { status: 404 })
        }

        // Only creator can delete
        if (forum.createdBy.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
        }

        forum.status = ForumStatus.ARCHIVED
        await forum.save()

        return NextResponse.json({
            success: true,
            message: 'Forum archivé'
        })

    } catch (error: any) {
        console.error('[Forum DELETE] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
