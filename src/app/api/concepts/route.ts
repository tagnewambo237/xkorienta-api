import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Concept from "@/models/Concept";
import mongoose from "mongoose";

// GET: Fetch all concepts for a syllabus
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const syllabusId = searchParams.get("syllabusId");

    if (!syllabusId || !mongoose.Types.ObjectId.isValid(syllabusId)) {
        return NextResponse.json({ error: "Invalid syllabus ID" }, { status: 400 });
    }

    try {
        await connectDB();

        const concepts = await Concept.find({ syllabus: syllabusId })
            .populate("parent", "title")
            .populate("learningUnit", "name")
            .sort({ order: 1 });

        return NextResponse.json({ success: true, data: concepts });
    } catch (error) {
        console.error("Error fetching concepts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new concept
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectDB();

        const body = await req.json();
        const { title, description, syllabusId, parentId, order, learningUnitId } = body;

        if (!title || !syllabusId) {
            return NextResponse.json({ error: "Title and syllabusId are required" }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(syllabusId)) {
            return NextResponse.json({ error: "Invalid syllabus ID" }, { status: 400 });
        }

        const concept = await Concept.create({
            title,
            description,
            syllabus: syllabusId,
            parent: parentId || null,
            order: order || 0,
            learningUnit: learningUnitId || null
        });

        return NextResponse.json({ success: true, data: concept }, { status: 201 });
    } catch (error) {
        console.error("Error creating concept:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PUT: Update a concept
export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectDB();

        const body = await req.json();
        const { id, title, description, parentId, order, learningUnitId } = body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid concept ID" }, { status: 400 });
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (parentId !== undefined) updateData.parent = parentId || null;
        if (order !== undefined) updateData.order = order;
        if (learningUnitId !== undefined) updateData.learningUnit = learningUnitId || null;

        const concept = await Concept.findByIdAndUpdate(id, updateData, { new: true });

        if (!concept) {
            return NextResponse.json({ error: "Concept not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: concept });
    } catch (error) {
        console.error("Error updating concept:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Delete a concept
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid concept ID" }, { status: 400 });
    }

    try {
        await connectDB();

        // Also delete all child concepts
        await Concept.deleteMany({ parent: id });

        const concept = await Concept.findByIdAndDelete(id);

        if (!concept) {
            return NextResponse.json({ error: "Concept not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Concept deleted" });
    } catch (error) {
        console.error("Error deleting concept:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
