import { TeacherRepository } from "@/lib/repositories/TeacherRepository";

export interface TeacherStudent {
    _id: string;
    name: string;
    email: string;
    image?: string;
    studentCode?: string;
    classes: Array<{
        _id: string;
        name: string;
    }>;
}

export interface StudentWithClass {
    id: string;
    name: string;
    email: string;
    image?: string;
    studentCode?: string;
    createdAt?: string;
    className: string;
    classId: string;
    levelName: string;
}

export interface ClassOption {
    _id: string;
    name: string;
    studentCount: number;
}

export interface TeacherStudentsResult {
    students: TeacherStudent[];
    studentsWithClass: StudentWithClass[];
    classes: ClassOption[];
    stats: {
        totalStudents: number;
        totalClasses: number;
        averagePerClass: number;
    };
}

export class TeacherService {
    /**
     * Get all students from teacher's classes (for messaging)
     * Includes students from:
     * - Classes where teacher is mainTeacher
     * - Classes from teacher's syllabuses
     */
    static async getTeacherStudents(
        teacherId: string,
        search?: string,
        classId?: string
    ): Promise<TeacherStudentsResult> {
        const repo = new TeacherRepository();

        // 1. Get classes where teacher is mainTeacher
        const mainTeacherClassIds = await repo.findMainTeacherClassIds(teacherId);

        // 2. Get classes from teacher's syllabuses
        const syllabusClassIds = await repo.findSyllabusClassIds(teacherId);

        // 3. Combine and deduplicate
        const allClassIds = [...new Set([
            ...mainTeacherClassIds,
            ...syllabusClassIds
        ])];

        if (allClassIds.length === 0) {
            return {
                students: [],
                studentsWithClass: [],
                classes: [],
                stats: {
                    totalStudents: 0,
                    totalClasses: 0,
                    averagePerClass: 0
                }
            };
        }

        // 4. Fetch classes with students
        const classes = await repo.findClassesWithStudents(allClassIds, classId);

        // 5. Build students list with class info (grouped by student)
        const studentsMap = new Map<string, TeacherStudent>();

        // 6. Build flat list for studentsWithClass (one entry per student per class)
        const studentsWithClass: StudentWithClass[] = [];

        for (const cls of classes) {
            const classData = cls as unknown as {
                _id?: { toString: () => string };
                name: string;
                level?: { name: string };
                students?: Array<{
                    _id?: { toString: () => string };
                    name?: string;
                    email?: string;
                    image?: string;
                    studentCode?: string;
                    createdAt?: Date | string;
                }>;
            };

            const classStudents = classData.students || [];
            const levelName = classData.level?.name || '';

            for (const student of classStudents) {
                const studentId = student._id?.toString();
                if (!studentId) continue;

                // Apply search filter
                if (search) {
                    const searchLower = search.toLowerCase();
                    const matchName = student.name?.toLowerCase().includes(searchLower);
                    const matchEmail = student.email?.toLowerCase().includes(searchLower);
                    const matchCode = student.studentCode?.toLowerCase().includes(searchLower);
                    if (!matchName && !matchEmail && !matchCode) continue;
                }

                // For grouped students map
                if (!studentsMap.has(studentId)) {
                    studentsMap.set(studentId, {
                        _id: studentId,
                        name: student.name || 'Sans nom',
                        email: student.email || '',
                        image: student.image,
                        studentCode: student.studentCode,
                        classes: []
                    });
                }

                studentsMap.get(studentId)!.classes.push({
                    _id: classData._id?.toString() || '',
                    name: classData.name
                });

                // For flat list (studentsWithClass)
                studentsWithClass.push({
                    id: studentId,
                    name: student.name || 'Sans nom',
                    email: student.email || '',
                    image: student.image,
                    studentCode: student.studentCode,
                    createdAt: student.createdAt
                        ? (typeof student.createdAt === 'string'
                            ? student.createdAt
                            : student.createdAt.toISOString())
                        : undefined,
                    className: classData.name,
                    classId: classData._id?.toString() || '',
                    levelName
                });
            }
        }

        const students = Array.from(studentsMap.values());

        // 7. Build class options for filter dropdown
        const classOptions: ClassOption[] = classes.map(c => {
            const classData = c as unknown as {
                _id?: { toString: () => string };
                name: string;
                students?: unknown[];
            };
            return {
                _id: classData._id?.toString() || '',
                name: classData.name,
                studentCount: (classData.students || []).length
            };
        });

        // 8. Calculate stats
        const totalClasses = classes.length;
        const totalStudents = studentsWithClass.length;
        const averagePerClass = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;

        return {
            students,
            studentsWithClass,
            classes: classOptions,
            stats: {
                totalStudents,
                totalClasses,
                averagePerClass
            }
        };
    }
}

