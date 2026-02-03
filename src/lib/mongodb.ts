import mongoose from 'mongoose'
import { initEventSystem } from './events'

const MONGODB_URI = process.env.DATABASE_URL

// Only throw error at runtime, not during build
if (!MONGODB_URI && typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    // During build, we allow missing DATABASE_URL by providing a dummy value
    // The real connection will happen at runtime
    console.warn('[MongoDB] DATABASE_URL not set - using placeholder for build')
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null }
}

async function connectDB() {
    // Check DATABASE_URL at runtime
    if (!MONGODB_URI) {
        throw new Error('DATABASE_URL environment variable is not defined')
    }

    // If mongoose is already connected (e.g., in tests), return immediately
    if (mongoose.connection.readyState === 1) {
        return mongoose
    }

    if (cached.conn) {
        return cached.conn
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        }

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose
        })
    }

    try {
        cached.conn = await cached.promise

        // Initialize event system after database connection
        try {
            initEventSystem()
        } catch (eventError) {
            console.error('[MongoDB] Event system initialization failed:', eventError)
            // Don't throw - allow DB connection to continue
        }
    } catch (e) {
        cached.promise = null
        throw e
    }

    return cached.conn
}

export default connectDB
