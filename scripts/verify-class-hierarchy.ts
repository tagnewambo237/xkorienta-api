
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../../lib/mongodb';
import School from '../../models/School';
import EducationLevel from '../../models/EducationLevel';
import Field from '../../models/Field';
import Class from '../../models/Class';
import User from '../../models/User'; // Needed for Class references
import { FieldCategory, Cycle, SubSystem, UserRole } from '../../models/enums';

async function main() {
    console.log('Connecting to DB...');
    await connectDB();
    console.log('Connected.');

    const timestamp = Date.now();
    const testSuffix = `_verify_${timestamp}`;

    // Store IDs for cleanup
    let schoolId: any;
    let teacherId: any;
    let levelId: any;
    let parentFieldId: any;
    let specialtyId: any;
    let classId: any;

    try {
        console.log('Creating test data...');

        // 1. Create a dummy School
        const school = await School.create({
            name: `Test School ${testSuffix}`,
            type: 'SECONDARY', // SchoolType.SECONDARY
            address: '123 Test Street, Test City',
            contactInfo: { email: `school_${timestamp}@test.com`, phone: '123456789' },
            status: 'VALIDATED',
            owner: new mongoose.Types.ObjectId(), // Fake owner ID for test
            isActive: true
        });
        schoolId = school._id;
        console.log('School created:', school._id);

        // 2. Create a dummy User (Main Teacher)
        const teacher = await User.create({
            name: 'Test Teacher',
            email: `teacher_${timestamp}@test.com`,
            role: UserRole.TEACHER,
            schools: [school._id],
            isActive: true
        });
        teacherId = teacher._id;
        console.log('Teacher created:', teacher._id);

        // 3. Create Education Level
        const level = await EducationLevel.create({
            name: `Level ${testSuffix}`,
            code: `LVL_${timestamp}`,
            subSystem: SubSystem.FRANCOPHONE,
            cycle: Cycle.LYCEE,
            order: 1, // rank -> order
            isActive: true,
            metadata: {
                displayName: { fr: 'Niveau Test', en: 'Test Level' },
                description: 'Test Description'
            }
        });
        levelId = level._id;
        console.log('EducationLevel created:', level._id);

        // 4. Create Parent Field (Filière/Série)
        // Note: FieldCategory.SERIE for Lycée
        const parentField = await Field.create({
            name: `Filiere ${testSuffix}`,
            code: `FIL_${timestamp}`,
            category: FieldCategory.SERIE,
            cycle: Cycle.LYCEE,
            subSystem: SubSystem.FRANCOPHONE,
            applicableLevels: [level._id],
            isActive: true,
            metadata: {
                displayName: { fr: 'Filiere Test', en: 'Test Field' }
            }
        });
        parentFieldId = parentField._id;
        console.log('Parent Field created:', parentField._id);

        // 5. Create Child Field (Specialty)
        // Note: FieldCategory.SPECIALITY seems appropriate for sub-specialty or university, 
        // but for this test we ensure it's a child of parentField
        const specialty = await Field.create({
            name: `Specialite ${testSuffix}`,
            code: `SPEC_${timestamp}`,
            category: FieldCategory.SERIE, // Or SPECIALITY, depending on logic. Let's use SERIE to be safe with enum if SPECIALITY implies higher ed
            cycle: Cycle.LYCEE,
            subSystem: SubSystem.FRANCOPHONE,
            applicableLevels: [level._id],
            parentField: parentField._id, // Hierarchy link
            isActive: true,
            metadata: {
                displayName: { fr: 'Specialite Test', en: 'Test Specialty' }
            }
        });
        specialtyId = specialty._id;
        console.log('Specialty created:', specialty._id);

        // 6. Create Class with both Field and Specialty
        const classObj = await Class.create({
            name: `Class ${testSuffix}`,
            school: school._id,
            mainTeacher: teacher._id,
            level: level._id,
            field: parentField._id,
            specialty: specialty._id, // <--- The new field we are testing
            academicYear: '2024-2025',
            isActive: true
        });
        classId = classObj._id;
        console.log('Class created:', classObj._id);

        // 7. Verify
        const fetchedClass = await Class.findById(classObj._id);

        // Explicitly cast or check existence
        if (!fetchedClass) {
            throw new Error('Class not found');
        }

        // We access the raw object value or cast it if TS complains
        const specialtyRef = fetchedClass.specialty;

        console.log('Fetched class specialty:', specialtyRef);

        if (specialtyRef && specialtyRef.toString() === specialty._id.toString()) {
            console.log('SUCCESS: Class has correct specialty reference.');
        } else {
            console.error('FAILURE: Class specialty incorrect or missing.', fetchedClass);
            process.exit(1);
        }

    } catch (error) {
        console.error('Error in verification:', error);
        process.exit(1);
    } finally {
        console.log('Cleaning up...');
        if (classId) await Class.deleteOne({ _id: classId });
        if (specialtyId) await Field.deleteOne({ _id: specialtyId });
        if (parentFieldId) await Field.deleteOne({ _id: parentFieldId });
        if (levelId) await EducationLevel.deleteOne({ _id: levelId });
        if (teacherId) await User.deleteOne({ _id: teacherId });
        if (schoolId) await School.deleteOne({ _id: schoolId });
        console.log('Cleanup done.');
        await mongoose.disconnect();
    }
}

main();
