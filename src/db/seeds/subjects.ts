import { db } from '@/db';
import { subjects } from '@/db/schema';

async function main() {
    const sampleSubjects = [
        {
            name: 'Data Structures',
            code: 'CS201',
            credits: 4,
        },
        {
            name: 'Algorithms',
            code: 'CS301',
            credits: 4,
        },
        {
            name: 'Database Systems',
            code: 'CS202',
            credits: 3,
        },
        {
            name: 'Calculus I',
            code: 'MATH101',
            credits: 4,
        },
        {
            name: 'Linear Algebra',
            code: 'MATH201',
            credits: 3,
        },
        {
            name: 'Differential Equations',
            code: 'MATH301',
            credits: 3,
        },
        {
            name: 'Physics I',
            code: 'PHY101',
            credits: 4,
        },
        {
            name: 'Quantum Mechanics',
            code: 'PHY301',
            credits: 3,
        },
        {
            name: 'Organic Chemistry',
            code: 'CHEM201',
            credits: 4,
        },
        {
            name: 'Digital Electronics',
            code: 'ECE201',
            credits: 3,
        },
        {
            name: 'Thermodynamics',
            code: 'ME201',
            credits: 3,
        },
        {
            name: 'Fluid Mechanics',
            code: 'ME301',
            credits: 3,
        },
        {
            name: 'Structural Analysis',
            code: 'CE301',
            credits: 4,
        },
        {
            name: 'Circuit Theory',
            code: 'EE201',
            credits: 3,
        },
        {
            name: 'Power Systems',
            code: 'EE301',
            credits: 4,
        },
    ];

    await db.insert(subjects).values(sampleSubjects);
    
    console.log('✅ Subjects seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});