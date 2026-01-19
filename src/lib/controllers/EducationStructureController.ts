import { NextResponse } from "next/server";
import { EducationStructureService } from "@/lib/services/EducationStructureService";
import { SubSystem, Cycle } from "@/models/enums";

export class EducationStructureController {
    static async getEducationLevels(req: Request) {
        try {
            const { searchParams } = new URL(req.url);
            const filters: any = {};

            if (searchParams.get('subSystem')) {
                filters.subSystem = searchParams.get('subSystem') as SubSystem;
            }
            if (searchParams.get('cycle')) {
                filters.cycle = searchParams.get('cycle') as Cycle;
            }
            if (searchParams.get('isActive')) {
                filters.isActive = searchParams.get('isActive') === 'true';
            }

            const levels = await EducationStructureService.getEducationLevels(filters);

            return NextResponse.json({
                success: true,
                count: levels.length,
                data: levels
            });
        } catch (error: any) {
            console.error("[EducationStructure Controller] Get Levels Error:", error);
            return NextResponse.json(
                { success: false, message: "Internal server error" },
                { status: 500 }
            );
        }
    }

    static async getFields(req: Request) {
        try {
            const { searchParams } = new URL(req.url);
            const filters: any = {};

            if (searchParams.get('level')) {
                const levelParam = searchParams.get('level');
                if (levelParam?.includes(',')) {
                    filters.level = levelParam.split(',');
                } else {
                    filters.level = levelParam;
                }
            }
            if (searchParams.get('cycle')) {
                filters.cycle = searchParams.get('cycle') as Cycle;
            }
            if (searchParams.get('category')) {
                filters.category = searchParams.get('category');
            }
            if (searchParams.get('isActive')) {
                filters.isActive = searchParams.get('isActive') === 'true';
            }
            if (searchParams.get('parentField')) {
                filters.parentField = searchParams.get('parentField');
            }

            const fields = await EducationStructureService.getFields(filters);

            return NextResponse.json({
                success: true,
                count: fields.length,
                data: fields
            });
        } catch (error: any) {
            console.error("[EducationStructure Controller] Get Fields Error:", error);
            return NextResponse.json(
                { success: false, message: "Internal server error" },
                { status: 500 }
            );
        }
    }
}
