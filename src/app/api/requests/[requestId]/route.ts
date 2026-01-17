import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Request, { RequestStatus } from '@/models/Request'
import { UserRole } from '@/models/enums'
import { getPusherServer, getRequestsChannel } from '@/lib/pusher'
import { publishEvent } from '@/lib/events/EventPublisher'
import { EventType } from '@/lib/events/types'
import mongoose from 'mongoose'

interface RouteParams {
    params: Promise<{ requestId: string }>
}

/**
 * GET /api/requests/[requestId]
 * Get request details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { requestId } = await params

        const req = await Request.findById(requestId)
            .populate('studentId', 'name image email studentCode')
            .populate('teacherId', 'name image')
            .populate('subject', 'name')
            .populate('relatedExam', 'title')
            .lean()

        if (!req) {
            return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 })
        }

        // Check access
        const isStudent = (req as any).studentId._id.toString() === session.user.id
        const isTeacher = (req as any).teacherId._id.toString() === session.user.id

        if (!isStudent && !isTeacher) {
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
        }

        return NextResponse.json({
            success: true,
            data: req
        })

    } catch (error: any) {
        console.error('[Request GET] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * PUT /api/requests/[requestId]
 * Update request (accept/reject/complete)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { requestId } = await params
        const body = await request.json()
        const { status, responseMessage, scheduledAt, scheduledDuration, meetingLink, feedback } = body

        const req = await Request.findById(requestId)
            .populate('studentId', 'name')
            .populate('teacherId', 'name')

        if (!req) {
            return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 })
        }

        const isStudent = req.studentId._id.toString() === session.user.id
        const isTeacher = req.teacherId._id.toString() === session.user.id

        // Teachers can accept/reject, students can cancel or provide feedback
        if (!isStudent && !isTeacher) {
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
        }

        // Update based on action
        if (status === RequestStatus.ACCEPTED && isTeacher) {
            req.status = RequestStatus.ACCEPTED
            req.responseMessage = responseMessage
            req.respondedAt = new Date()
            if (scheduledAt) req.scheduledAt = new Date(scheduledAt)
            if (scheduledDuration) req.scheduledDuration = scheduledDuration
            if (meetingLink) req.meetingLink = meetingLink

            // Notify student
            publishEvent({
                type: EventType.REQUEST_ACCEPTED,
                timestamp: new Date(),
                userId: req.studentId._id,
                data: {
                    requestId: req._id,
                    teacherName: (req.teacherId as any).name,
                    type: req.type,
                    title: req.title,
                    scheduledAt: req.scheduledAt
                }
            })
        } else if (status === RequestStatus.REJECTED && isTeacher) {
            req.status = RequestStatus.REJECTED
            req.responseMessage = responseMessage
            req.respondedAt = new Date()

            // Notify student
            publishEvent({
                type: EventType.REQUEST_REJECTED,
                timestamp: new Date(),
                userId: req.studentId._id,
                data: {
                    requestId: req._id,
                    teacherName: (req.teacherId as any).name,
                    type: req.type,
                    title: req.title,
                    reason: responseMessage
                }
            })
        } else if (status === RequestStatus.COMPLETED) {
            req.status = RequestStatus.COMPLETED
            req.completedAt = new Date()
            if (feedback && isStudent) {
                req.feedback = feedback
            }

            publishEvent({
                type: EventType.REQUEST_COMPLETED,
                timestamp: new Date(),
                userId: isStudent ? req.teacherId._id : req.studentId._id,
                data: {
                    requestId: req._id,
                    type: req.type,
                    title: req.title
                }
            })
        } else if (status === RequestStatus.CANCELLED && isStudent) {
            req.status = RequestStatus.CANCELLED
        }

        await req.save()

        // Trigger Pusher for real-time update
        const pusher = getPusherServer()
        if (pusher) {
            const targetUserId = isTeacher ? req.studentId._id.toString() : req.teacherId._id.toString()
            pusher.trigger(getRequestsChannel(targetUserId), 'request-updated', {
                request: req.toObject()
            })
        }

        return NextResponse.json({
            success: true,
            data: req
        })

    } catch (error: any) {
        console.error('[Request PUT] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * DELETE /api/requests/[requestId]
 * Cancel a request (student only, if pending)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { requestId } = await params

        const req = await Request.findById(requestId)
        if (!req) {
            return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 })
        }

        // Only student can cancel, and only if pending
        if (req.studentId.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
        }

        if (req.status !== RequestStatus.PENDING) {
            return NextResponse.json({ error: 'Seules les demandes en attente peuvent être annulées' }, { status: 400 })
        }

        req.status = RequestStatus.CANCELLED
        await req.save()

        return NextResponse.json({
            success: true,
            message: 'Demande annulée'
        })

    } catch (error: any) {
        console.error('[Request DELETE] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
