import { UserRole, SchoolStatus } from "@/models/enums";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import School from "@/models/School";
import LearnerProfile from "@/models/LearnerProfile";
import PedagogicalProfile from "@/models/PedagogicalProfile";
import { ClassService } from "@/lib/services/ClassService";
import bcrypt from "bcryptjs";

export class RegistrationRepository {
    async findUserByEmail(email: string) {
        await connectDB();
        return User.findOne({ email });
    }

    async findSchoolById(schoolId: string) {
        await connectDB();
        return School.findById(schoolId);
    }

    async createUser(data: any) {
        await connectDB();
        return User.create(data);
    }

    async createLearnerProfile(data: any) {
        await connectDB();
        return LearnerProfile.create(data);
    }

    async createPedagogicalProfile(data: any) {
        await connectDB();
        return PedagogicalProfile.create(data);
    }

    async updateSchool(schoolId: string, update: any) {
        await connectDB();
        return School.findByIdAndUpdate(schoolId, update);
    }

    async enrollStudentInClass(classId: string, userId: string) {
        await connectDB();
        return ClassService.enrollStudent(classId, userId);
    }
}
