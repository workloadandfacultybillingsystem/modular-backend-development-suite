import { db } from '@/db';
import { classrooms } from '@/db/schema';

async function main() {
    const sampleClassrooms = [
        {
            roomNumber: 'Room 101',
            building: 'Building A',
            capacity: 40,
        },
        {
            roomNumber: 'Room 102',
            building: 'Building A',
            capacity: 35,
        },
        {
            roomNumber: 'Room 201',
            building: 'Building A',
            capacity: 50,
        },
        {
            roomNumber: 'Room 202',
            building: 'Building A',
            capacity: 45,
        },
        {
            roomNumber: 'Lab 301',
            building: 'Building B',
            capacity: 30,
        },
        {
            roomNumber: 'Lab 302',
            building: 'Building B',
            capacity: 25,
        },
        {
            roomNumber: 'Room 401',
            building: 'Building C',
            capacity: 60,
        },
        {
            roomNumber: 'Room 402',
            building: 'Building C',
            capacity: 55,
        },
        {
            roomNumber: 'Seminar Hall 1',
            building: 'Building D',
            capacity: 100,
        },
        {
            roomNumber: 'Seminar Hall 2',
            building: 'Building D',
            capacity: 80,
        },
        {
            roomNumber: 'Lab 501',
            building: 'Building E',
            capacity: 20,
        },
        {
            roomNumber: 'Room 601',
            building: 'Building E',
            capacity: 40,
        },
    ];

    await db.insert(classrooms).values(sampleClassrooms);
    
    console.log('✅ Classrooms seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});