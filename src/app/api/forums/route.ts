import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Forum, { ForumType, ForumStatus } from '@/models/Forum'
import Class from '@/models/Class'
import { UserRole } from '@/models/enums'
import { safeTrigger } from '@/lib/pusher'
import mongoose from 'mongoose'

/**
 * GET /api/forums
 * List forums for the current user
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const userId = session.user.id
        const role = session.user.role

        const searchParams = request.nextUrl.searchParams
        const classId = searchParams.get('classId')
        const type = searchParams.get('type')

        // Build query based on role
        let query: any = { status: ForumStatus.ACTIVE }

        if (role === UserRole.TEACHER) {
            // Teachers see forums they created or are members of
            query.$or = [
                { createdBy: userId },
                { members: userId }
            ]
        } else if (role === UserRole.STUDENT) {
            // Students see forums they are members of
            query.members = userId
        }

        if (classId) {
            query.relatedClass = classId
        }
        if (type) {
            query.type = type
        }

        const forums = await Forum.find(query)
            .populate('createdBy', 'name image')
            .populate('relatedClass', 'name')
            .populate('relatedSubject', 'name')
            .populate('lastPostBy', 'name')
            .sort({ lastPostAt: -1, createdAt: -1 })
            .lean()

        return NextResponse.json({
            success: true,
            data: forums
        })

    } catch (error: any) {
        console.error('[Forums GET] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/forums
 * Create a new forum
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        const role = session.user.role
        if (role !== UserRole.TEACHER && role !== UserRole.SCHOOL_ADMIN && role !== UserRole.PRINCIPAL) {
            return NextResponse.json({ error: 'Seuls les enseignants peuvent créer des forums' }, { status: 403 })
        }

        await connectDB()
        const body = await request.json()
        const { name, description, type, classId, subjectId, isPrivate, allowStudentPosts } = body

        if (!name) {
            return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
        }

        // Build members list
        let memberIds: mongoose.Types.ObjectId[] = [new mongoose.Types.ObjectId(session.user.id)]

        // If linked to a class, add all students
        if (classId) {
            const classData = await Class.findById(classId).lean()
            if (classData && (classData as any).students) {
                const studentIds = (classData as any).students.map((s: any) =>
                    new mongoose.Types.ObjectId(s.toString())
                )
                memberIds = [...memberIds, ...studentIds]
            }
        }

        // Deduplicate members
        const uniqueMembers = [...new Set(memberIds.map(id => id.toString()))].map(
            id => new mongoose.Types.ObjectId(id)
        )

        const forum = new Forum({
            name,
            description,
            type: type || ForumType.CLASS,
            relatedClass: classId ? new mongoose.Types.ObjectId(classId) : undefined,
            relatedSubject: subjectId ? new mongoose.Types.ObjectId(subjectId) : undefined,
            createdBy: new mongoose.Types.ObjectId(session.user.id),
            members: uniqueMembers,
            isPrivate: isPrivate || false,
            allowStudentPosts: allowStudentPosts !== false
        })

        await forum.save()

        // Populate for response
        await forum.populate('createdBy', 'name image')
        await forum.populate('relatedClass', 'name')

        // Trigger Pusher event for real-time updates (safely handles network errors)
        if (classId) {
            safeTrigger(`class-${classId}`, 'forum-created', {
                forum: forum.toObject()
            })
        }

        return NextResponse.json({
            success: true,
            data: forum
        }, { status: 201 })

    } catch (error: any) {
        console.error('[Forums POST] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
