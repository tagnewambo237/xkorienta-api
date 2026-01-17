import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Concept from "@/models/Concept";
import mongoose from "mongoose";

/**
 * POST: Bulk create/update concepts for a syllabus
 * This endpoint is used when saving a syllabus to persist all concepts at once
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectDB();

        const body = await req.json();
        const { syllabusId, concepts } = body;

        if (!syllabusId || !mongoose.Types.ObjectId.isValid(syllabusId)) {
            return NextResponse.json({ error: "Invalid syllabus ID" }, { status: 400 });
        }

        if (!Array.isArray(concepts)) {
            return NextResponse.json({ error: "Concepts must be an array" }, { status: 400 });
        }

        // Delete existing concepts for this syllabus that are not in the new list
        const existingIds = concepts
            .filter(c => c._id && mongoose.Types.ObjectId.isValid(c._id))
            .map(c => c._id);

        await Concept.deleteMany({
            syllabus: syllabusId,
            _id: { $nin: existingIds }
        });

        // Upsert each concept
        const operations = concepts.map((concept, index) => ({
            updateOne: {
                filter: concept._id
                    ? { _id: concept._id }
                    : { _id: new mongoose.Types.ObjectId() },
                update: {
                    $set: {
                        title: concept.title,
                        description: concept.description || "",
                        syllabus: syllabusId,
                        parent: concept.parentId || null,
                        order: concept.order || index,
                        learningUnit: concept.learningUnitId || null
                    }
                },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            await Concept.bulkWrite(operations);
        }

        // Fetch and return updated concepts
        const updatedConcepts = await Concept.find({ syllabus: syllabusId }).sort({ order: 1 });

        return NextResponse.json({
            success: true,
            data: updatedConcepts,
            message: `${updatedConcepts.length} concepts synchronized`
        });

    } catch (error) {
        console.error("Error bulk syncing concepts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
