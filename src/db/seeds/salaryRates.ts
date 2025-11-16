import { db } from '@/db';
import { salaryRates } from '@/db/schema';

async function main() {
    const currentTimestamp = new Date().toISOString();
    
    const sampleSalaryRates = [
        {
            facultyId: 1,
            lectureRatePerHour: 800,
            practicalRatePerHour: 900,
            tutorialRatePerHour: 600,
            extraClassBonus: 25,
            makeupClassBonus: 15,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 2,
            lectureRatePerHour: 750,
            practicalRatePerHour: 850,
            tutorialRatePerHour: 580,
            extraClassBonus: 22,
            makeupClassBonus: 14,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 3,
            lectureRatePerHour: 780,
            practicalRatePerHour: 880,
            tutorialRatePerHour: 590,
            extraClassBonus: 24,
            makeupClassBonus: 13,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 4,
            lectureRatePerHour: 720,
            practicalRatePerHour: 820,
            tutorialRatePerHour: 560,
            extraClassBonus: 20,
            makeupClassBonus: 12,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 5,
            lectureRatePerHour: 650,
            practicalRatePerHour: 750,
            tutorialRatePerHour: 520,
            extraClassBonus: 18,
            makeupClassBonus: 10,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 6,
            lectureRatePerHour: 600,
            practicalRatePerHour: 700,
            tutorialRatePerHour: 480,
            extraClassBonus: 16,
            makeupClassBonus: 9,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 7,
            lectureRatePerHour: 550,
            practicalRatePerHour: 650,
            tutorialRatePerHour: 450,
            extraClassBonus: 14,
            makeupClassBonus: 8,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 8,
            lectureRatePerHour: 580,
            practicalRatePerHour: 680,
            tutorialRatePerHour: 460,
            extraClassBonus: 15,
            makeupClassBonus: 7,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 9,
            lectureRatePerHour: 520,
            practicalRatePerHour: 620,
            tutorialRatePerHour: 430,
            extraClassBonus: 12,
            makeupClassBonus: 6,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            facultyId: 10,
            lectureRatePerHour: 500,
            practicalRatePerHour: 600,
            tutorialRatePerHour: 400,
            extraClassBonus: 10,
            makeupClassBonus: 5,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        }
    ];

    await db.insert(salaryRates).values(sampleSalaryRates);
    
    console.log('✅ Salary rates seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});