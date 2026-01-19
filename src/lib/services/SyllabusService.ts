import { SyllabusRepository } from "@/lib/repositories/SyllabusRepository";
import { SyllabusBuilder } from "@/lib/patterns/SyllabusBuilder";
import { SyllabusStatus } from "@/models/Syllabus";
import mongoose from "mongoose";

export class SyllabusService {

    static async getSyllabusById(id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error("Invalid syllabus ID");
        }

        const syllabus = await SyllabusRepository.findById(id);
        if (!syllabus) {
            throw new Error("Syllabus not found");
        }
        return syllabus;
    }

    static async updateSyllabus(id: string, userId: string, updatePayload: any) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error("Invalid syllabus ID");
        }

        const existingSyllabus = await SyllabusRepository.findById(id);
        if (!existingSyllabus) {
            throw new Error("Syllabus not found");
        }

        if (existingSyllabus.teacher.toString() !== userId) {
            throw new Error("Forbidden"); // Or specific usage error
        }

        const { title, description, structure, learningObjectives, status } = updatePayload;

        // Use Builder Pattern
        const builder = SyllabusBuilder.fromExisting(existingSyllabus)
            .setBasicInfo(title || existingSyllabus.title, description || existingSyllabus.description);

        // Rebuild Structure
        if (structure && Array.isArray(structure.chapters)) {
            builder.resetStructure();
            structure.chapters.forEach((chap: any) => {
                const chapterId = builder.addChapter(chap.title, chap.description);
                if (Array.isArray(chap.topics)) {
                    chap.topics.forEach((top: any) => {
                        const topicId = builder.addTopic(chapterId, top.title, top.content);

                        // Handle resources
                        if (Array.isArray(top.resources)) {
                            top.resources.forEach((res: any) => {
                                builder.addResource(chapterId, topicId, {
                                    title: res.title,
                                    type: res.type,
                                    url: res.url,
                                    content: res.content
                                });
                            });
                        }
                    });
                }
            });
        }

        // Rebuild Objectives
        if (learningObjectives && Array.isArray(learningObjectives)) {
            builder.resetObjectives();
            learningObjectives.forEach((obj: string) => builder.addObjective(obj));
        }

        const updateData = builder.build();

        // Preserve concepts by bypassing builder limitations if necessary
        // (Logic imported from original route)
        if (structure) {
            (updateData as any).structure = structure;
        }

        const { version: _, ...updateDataWithoutVersion } = updateData as any;

        const finalUpdate = {
            $set: {
                ...updateDataWithoutVersion,
                status: status || existingSyllabus.status,
            },
            $inc: { version: 1 }
        };

        const updatedSyllabus = await SyllabusRepository.update(id, finalUpdate);

        // Event Publishing
        // Dynamic imports to avoid circular dependencies if any, and keep it clean
        const { initEventSystem } = await import("@/lib/events");
        initEventSystem();

        const { EventPublisher } = await import("@/lib/events/EventPublisher");
        const { EventType } = await import("@/lib/events/types");

        const publisher = EventPublisher.getInstance();
        await publisher.publish({
            type: EventType.SYLLABUS_UPDATED,
            timestamp: new Date(),
            userId: new mongoose.Types.ObjectId(userId),
            data: {
                syllabusId: updatedSyllabus?._id,
                teacherId: userId,
                title: updatedSyllabus?.title,
                version: updatedSyllabus?.version
            }
        });

        return updatedSyllabus;
    }

    static async deleteSyllabus(id: string, userId: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error("Invalid syllabus ID");
        }

        const existingSyllabus = await SyllabusRepository.findById(id);
        if (!existingSyllabus) {
            throw new Error("Syllabus not found");
        }

        if (existingSyllabus.teacher.toString() !== userId) {
            throw new Error("Forbidden");
        }

        // Soft delete (Archive)
        // Ideally repository should handle this logic or just update
        // Using direct save/update here via repository update method would be cleaner
        // But the original code used .save(). Let's use Repository.update

        await SyllabusRepository.update(id, { status: SyllabusStatus.ARCHIVED });

        return true;
    }
}
