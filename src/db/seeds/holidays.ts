import { db } from '@/db';
import { holidays } from '@/db/schema';

async function main() {
    const sampleHolidays = [
        {
            date: '2024-01-26',
            name: 'Republic Day',
            description: 'National holiday celebrating the adoption of the Constitution of India. All departments and classes are suspended for the day.',
            affectsDepartment: null,
            createdAt: new Date().toISOString(),
        },
        {
            date: '2024-02-15',
            name: 'Technical Symposium',
            description: 'Annual technical symposium organized by the Computer Science department. All CS classes are suspended to allow students and faculty to participate in the event.',
            affectsDepartment: 'Computer Science',
            createdAt: new Date().toISOString(),
        },
        {
            date: '2024-03-10',
            name: 'Math Conference',
            description: 'National Mathematics Conference hosted by the Mathematics department. Mathematics faculty and students will attend the conference, all math classes are cancelled.',
            affectsDepartment: 'Mathematics',
            createdAt: new Date().toISOString(),
        }
    ];

    await db.insert(holidays).values(sampleHolidays);
    
    console.log('✅ Holidays seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});