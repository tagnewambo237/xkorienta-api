import Syllabus, { ISyllabus } from "@/models/Syllabus";
import mongoose from "mongoose";

export class SyllabusRepository {
    static async findById(id: string): Promise<ISyllabus | null> {
        return await Syllabus.findById(id)
            .populate('subject', 'name code')
            .populate('school', 'name')
            .populate('teacher', 'name email');
    }

    static async update(id: string, updateData: any): Promise<ISyllabus | null> {
        return await Syllabus.findByIdAndUpdate(id, updateData, { new: true });
    }

    static async save(syllabus: any): Promise<ISyllabus> {
        // Handle save for existing instance if passed as document, or generic handling not ideal here.
        // Usually .save() is on the document instance.
        // For repo pattern without ORM instance passing, we usually use update or create.
        if (syllabus instanceof Syllabus) {
            return await syllabus.save();
        }
        throw new Error("Invalid syllabus document");
    }

    static async delete(id: string): Promise<ISyllabus | null> {
        return await Syllabus.findByIdAndDelete(id);
    }
}
