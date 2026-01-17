import Pusher from 'pusher'

// Server-side Pusher client (for API routes)
let pusherServer: Pusher | null = null

export const getPusherServer = () => {
    if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
        return null
    }

    if (!pusherServer) {
        pusherServer = new Pusher({
            appId: process.env.PUSHER_APP_ID,
            key: process.env.PUSHER_KEY,
            secret: process.env.PUSHER_SECRET,
            cluster: process.env.PUSHER_CLUSTER,
            useTLS: true
        })
    }

    return pusherServer
}

// Check if Pusher is configured
export const isPusherConfigured = () => {
    return !!(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER)
}

// Channel name helpers
export const getConversationChannel = (conversationId: string) =>
    `conversation-${conversationId}`

export const getUserChannel = (userId: string) =>
    `private-user-${userId}`

export const getForumChannel = (forumId: string) =>
    `forum-${forumId}`

export const getRequestsChannel = (userId: string) =>
    `requests-${userId}`

export const getClassChannel = (classId: string) =>
    `class-${classId}`

/**
 * Safely trigger a Pusher event with error handling.
 * This prevents unhandled promise rejections when Pusher has network issues.
 * Real-time features will gracefully degrade if Pusher is unavailable.
 */
export const safeTrigger = async (
    channel: string,
    event: string,
    data: any
): Promise<boolean> => {
    const pusher = getPusherServer()
    if (!pusher) {
        console.warn('[Pusher] Not configured, skipping event:', event)
        return false
    }

    try {
        await pusher.trigger(channel, event, data)
        return true
    } catch (error: any) {
        // Log the error but don't crash the app
        console.error('[Pusher] Failed to trigger event:', {
            channel,
            event,
            error: error.message || error
        })
        return false
    }
}
