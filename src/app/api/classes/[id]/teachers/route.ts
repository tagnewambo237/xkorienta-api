import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { ClassTeacherService } from '@/lib/services/ClassTeacherService'
import { ClassTeacherRole, ClassTeacherPermission } from '@/models/enums'
import Class from '@/models/Class'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/classes/[id]/teachers
 * Get all teachers for a class
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { id: classId } = await params

        // Verify user has access to this class
        const isTeacher = await ClassTeacherService.isTeacherInClass(classId, session.user.id)
        if (!isTeacher) {
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
        }

        const teachers = await ClassTeacherService.getClassTeachers(classId)

        return NextResponse.json({
            success: true,
            data: teachers
        })

    } catch (error: any) {
        console.error('[Class Teachers GET] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/classes/[id]/teachers
 * Add a teacher to a class for a specific subject
 * 
 * Request body:
 * {
 *   teacherId: string,        // User ID of the teacher to add
 *   subjectId: string,        // Subject they will teach
 *   role?: ClassTeacherRole,  // Default: COLLABORATOR
 *   permissions?: ClassTeacherPermission[] // Optional custom permissions
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { id: classId } = await params
        const body = await request.json()
        const { teacherId, subjectId, role, permissions } = body

        if (!teacherId || !subjectId) {
            return NextResponse.json({
                error: 'teacherId et subjectId sont requis'
            }, { status: 400 })
        }

        // Check if user has permission to invite teachers
        const hasInvitePermission = await ClassTeacherService.hasPermission(
            classId,
            session.user.id,
            ClassTeacherPermission.INVITE_TEACHERS
        )

        // Also check if user is the main teacher (owner)
        const classDoc = await Class.findById(classId).lean()
        const isOwner = classDoc?.mainTeacher?.toString() === session.user.id

        if (!hasInvitePermission && !isOwner) {
            return NextResponse.json({
                error: 'Vous n\'avez pas la permission d\'inviter des enseignants'
            }, { status: 403 })
        }

        // Add the teacher
        const result = await ClassTeacherService.addTeacher(
            classId,
            teacherId,
            subjectId,
            role || ClassTeacherRole.COLLABORATOR,
            permissions,
            session.user.id
        )

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: result.message,
            data: result.data
        }, { status: 201 })

    } catch (error: any) {
        console.error('[Class Teachers POST] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * PUT /api/classes/[id]/teachers
 * Update teacher permissions
 * 
 * Request body:
 * {
 *   teacherId: string,
 *   subjectId: string,
 *   permissions: ClassTeacherPermission[],
 *   role?: ClassTeacherRole
 * }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { id: classId } = await params
        const body = await request.json()
        const { teacherId, subjectId, permissions, role } = body

        if (!teacherId || !subjectId || !permissions) {
            return NextResponse.json({
                error: 'teacherId, subjectId et permissions sont requis'
            }, { status: 400 })
        }

        // Only owner or someone with INVITE_TEACHERS permission can update
        const classDoc = await Class.findById(classId).lean()
        const isOwner = classDoc?.mainTeacher?.toString() === session.user.id
        const hasPermission = await ClassTeacherService.hasPermission(
            classId,
            session.user.id,
            ClassTeacherPermission.INVITE_TEACHERS
        )

        if (!isOwner && !hasPermission) {
            return NextResponse.json({
                error: 'Vous n\'avez pas la permission de modifier les droits'
            }, { status: 403 })
        }

        const result = await ClassTeacherService.updateTeacherPermissions(
            classId,
            teacherId,
            subjectId,
            permissions,
            role
        )

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: result.message,
            data: result.data
        })

    } catch (error: any) {
        console.error('[Class Teachers PUT] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * DELETE /api/classes/[id]/teachers
 * Remove a teacher from a class
 * 
 * Query params:
 * ?teacherId=xxx&subjectId=xxx
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }

        await connectDB()
        const { id: classId } = await params
        const searchParams = request.nextUrl.searchParams
        const teacherId = searchParams.get('teacherId')
        const subjectId = searchParams.get('subjectId')

        if (!teacherId || !subjectId) {
            return NextResponse.json({
                error: 'teacherId et subjectId sont requis'
            }, { status: 400 })
        }

        // Only owner can remove teachers
        const classDoc = await Class.findById(classId).lean()
        const isOwner = classDoc?.mainTeacher?.toString() === session.user.id

        // Or the teacher can remove themselves
        const isSelf = teacherId === session.user.id

        if (!isOwner && !isSelf) {
            return NextResponse.json({
                error: 'Vous n\'avez pas la permission de retirer des enseignants'
            }, { status: 403 })
        }

        const result = await ClassTeacherService.removeTeacher(
            classId,
            teacherId,
            subjectId,
            session.user.id
        )

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: result.message
        })

    } catch (error: any) {
        console.error('[Class Teachers DELETE] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
