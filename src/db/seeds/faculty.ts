import { db } from '@/db';
import { faculty } from '@/db/schema';

async function main() {
    const sampleFaculty = [
        {
            name: 'Dr. John Smith',
            email: 'john.smith@university.edu',
            department: 'Computer Science',
        },
        {
            name: 'Dr. Sarah Johnson',
            email: 'sarah.johnson@university.edu',
            department: 'Mathematics',
        },
        {
            name: 'Dr. Michael Brown',
            email: 'michael.brown@university.edu',
            department: 'Physics',
        },
        {
            name: 'Dr. Emily Davis',
            email: 'emily.davis@university.edu',
            department: 'Chemistry',
        },
        {
            name: 'Dr. Robert Wilson',
            email: 'robert.wilson@university.edu',
            department: 'Computer Science',
        },
        {
            name: 'Dr. Jennifer Martinez',
            email: 'jennifer.martinez@university.edu',
            department: 'Mathematics',
        },
        {
            name: 'Dr. David Anderson',
            email: 'david.anderson@university.edu',
            department: 'Electronics',
        },
        {
            name: 'Dr. Lisa Taylor',
            email: 'lisa.taylor@university.edu',
            department: 'Mechanical Engineering',
        },
        {
            name: 'Dr. James Thomas',
            email: 'james.thomas@university.edu',
            department: 'Civil Engineering',
        },
        {
            name: 'Dr. Mary White',
            email: 'mary.white@university.edu',
            department: 'Electrical Engineering',
        },
    ];

    await db.insert(faculty).values(sampleFaculty);
    
    console.log('✅ Faculty seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});