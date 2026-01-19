import School from "@/models/School";
import { SchoolStatus } from "@/models/enums";
import connectDB from "@/lib/mongodb";

export class SchoolRepository {
    async findActiveSchools(search?: string, type?: string) {
        await connectDB();
        const query: any = { isActive: true };

        if (type) {
            query.type = type;
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        return School.find(query)
            .populate('admins', 'name email')
            .sort({ name: 1 })
            .lean();
    }
}
