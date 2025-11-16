import { db } from '@/db';
import { syllabusRequirements } from '@/db/schema';

async function main() {
    const sampleSyllabusRequirements = [
        {
            subjectId: 1,
            semester: 'Semester 1',
            requiredLectureHours: 42,
            requiredPracticalHours: 28,
            requiredTutorialHours: 18,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 2,
            semester: 'Semester 1',
            requiredLectureHours: 40,
            requiredPracticalHours: 30,
            requiredTutorialHours: 16,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 3,
            semester: 'Semester 1',
            requiredLectureHours: 38,
            requiredPracticalHours: 26,
            requiredTutorialHours: 20,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 4,
            semester: 'Semester 1',
            requiredLectureHours: 45,
            requiredPracticalHours: 18,
            requiredTutorialHours: 17,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 5,
            semester: 'Semester 1',
            requiredLectureHours: 44,
            requiredPracticalHours: 16,
            requiredTutorialHours: 19,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 6,
            semester: 'Semester 1',
            requiredLectureHours: 42,
            requiredPracticalHours: 20,
            requiredTutorialHours: 18,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 7,
            semester: 'Semester 1',
            requiredLectureHours: 36,
            requiredPracticalHours: 28,
            requiredTutorialHours: 16,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 8,
            semester: 'Semester 1',
            requiredLectureHours: 34,
            requiredPracticalHours: 30,
            requiredTutorialHours: 15,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 9,
            semester: 'Semester 1',
            requiredLectureHours: 35,
            requiredPracticalHours: 27,
            requiredTutorialHours: 17,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 10,
            semester: 'Semester 1',
            requiredLectureHours: 40,
            requiredPracticalHours: 25,
            requiredTutorialHours: 19,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 11,
            semester: 'Semester 1',
            requiredLectureHours: 43,
            requiredPracticalHours: 12,
            requiredTutorialHours: 20,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 12,
            semester: 'Semester 1',
            requiredLectureHours: 45,
            requiredPracticalHours: 10,
            requiredTutorialHours: 18,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 13,
            semester: 'Semester 1',
            requiredLectureHours: 44,
            requiredPracticalHours: 14,
            requiredTutorialHours: 16,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 14,
            semester: 'Semester 1',
            requiredLectureHours: 38,
            requiredPracticalHours: 29,
            requiredTutorialHours: 17,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
        {
            subjectId: 15,
            semester: 'Semester 1',
            requiredLectureHours: 42,
            requiredPracticalHours: 13,
            requiredTutorialHours: 19,
            totalWeeks: 16,
            createdAt: new Date().toISOString(),
        },
    ];

    await db.insert(syllabusRequirements).values(sampleSyllabusRequirements);
    
    console.log('✅ Syllabus requirements seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});