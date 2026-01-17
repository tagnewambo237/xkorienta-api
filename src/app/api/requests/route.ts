import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Request, { RequestStatus, RequestType, RequestPriority } from '@/models/Request'
import { UserRole } from '@/models/enums'
import { getPusherServer, getRequestsChannel } from '@/lib/pusher'
import { publishEvent } from '@/lib/events/EventPublisher'
import { EventType } from '@/lib/events/types'
import mongoose from 'mongoose'

/**
 * GET /api/requests
 * List requests for current user (student or teacher)
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
        const status = searchParams.get('status')
        const type = searchParams.get('type')

        let query: any = {}

        if (role === UserRole.STUDENT) {
            // Students see their own requests
            query.studentId = userId
        } else if (role === UserRole.TEACHER) {
            // Teachers see requests sent to them
            query.teacherId = userId
        } else {
            return NextResponse.json({ error: 'Rôle non autorisé' }, { status: 403 })
        }

        if (status) {
            query.status = status
        }
        if (type) {
            query.type = type
        }

        const requests = await Request.find(query)
            .populate('studentId', 'name image email studentCode')
            .populate('teacherId', 'name image')
            .populate('subject', 'name')
            .sort({ priority: -1, createdAt: -1 })
            .lean()

        return NextResponse.json({
            success: true,
            data: requests
        })

    } catch (error: any) {
        console.error('[Requests GET] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/requests
 * Create a new assistance request (student only)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        if (session.user.role !== UserRole.STUDENT) {
            return NextResponse.json({ error: 'Seuls les étudiants peuvent créer des demandes' }, { status: 403 })
        }

        await connectDB()
        const body = await request.json()
        const { teacherId, type, subjectId, title, message, priority, relatedExamId, relatedConceptIds } = body

        if (!teacherId || !type || !title || !message) {
            return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
        }

        if (!Object.values(RequestType).includes(type)) {
            return NextResponse.json({ error: 'Type de demande invalide' }, { status: 400 })
        }

        const newRequest = await Request.create({
            studentId: session.user.id,
            teacherId,
            type,
            subject: subjectId,
            title,
            message,
            priority: priority || RequestPriority.MEDIUM,
            relatedExam: relatedExamId,
            relatedConcepts: relatedConceptIds
        })

        // Populate for response
        await newRequest.populate('studentId', 'name image email studentCode')
        await newRequest.populate('teacherId', 'name image')

        // Trigger Pusher for real-time notification to teacher
        const pusher = getPusherServer()
        if (pusher) {
            pusher.trigger(getRequestsChannel(teacherId), 'request-created', {
                request: newRequest.toObject()
            })
        }

        // Emit event for observer pattern
        publishEvent({
            type: EventType.REQUEST_CREATED,
            timestamp: new Date(),
            userId: new mongoose.Types.ObjectId(teacherId),
            data: {
                requestId: newRequest._id,
                studentId: session.user.id,
                studentName: (newRequest.studentId as any).name,
                type: newRequest.type,
                title: newRequest.title
            }
        })

        return NextResponse.json({
            success: true,
            data: newRequest
        }, { status: 201 })

    } catch (error: any) {
        console.error('[Requests POST] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
