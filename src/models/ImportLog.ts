import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IImportLog extends Document {
    classId: mongoose.Types.ObjectId
    importedBy: mongoose.Types.ObjectId
    fileName: string
    fileType: 'CSV' | 'XLSX'
    fileSize: number
    totalRows: number
    successCount: number
    errorCount: number
    enrolledCount: number // Already existing users enrolled
    invitedCount: number  // New users invited
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
    errorDetails: {
        row: number
        email: string
        message: string
    }[]
    details: {
        email: string
        name: string
        status: 'enrolled' | 'invited' | 'error'
        error?: string
    }[]
    startedAt: Date
    completedAt?: Date
    createdAt: Date
    updatedAt: Date
}

const ImportLogSchema = new Schema<IImportLog>(
    {
        classId: {
            type: Schema.Types.ObjectId,
            ref: 'Class',
            required: true
        },
        importedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        fileName: {
            type: String,
            required: true
        },
        fileType: {
            type: String,
            enum: ['CSV', 'XLSX'],
            required: true
        },
        fileSize: {
            type: Number,
            required: true
        },
        totalRows: {
            type: Number,
            default: 0
        },
        successCount: {
            type: Number,
            default: 0
        },
        errorCount: {
            type: Number,
            default: 0
        },
        enrolledCount: {
            type: Number,
            default: 0
        },
        invitedCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
            default: 'PROCESSING'
        },
        errorDetails: [{
            row: Number,
            email: String,
            message: String
        }],
        details: [{
            email: String,
            name: String,
            status: {
                type: String,
                enum: ['enrolled', 'invited', 'error']
            },
            error: String
        }],
        startedAt: {
            type: Date,
            default: Date.now
        },
        completedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
)

// Indexes
ImportLogSchema.index({ classId: 1, createdAt: -1 })
ImportLogSchema.index({ importedBy: 1 })

const ImportLog: Model<IImportLog> = mongoose.models.ImportLog || mongoose.model<IImportLog>('ImportLog', ImportLogSchema)

export default ImportLog
