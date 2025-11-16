import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salarySlips, faculty, salaryRates, timetable } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { facultyId: string } }
) {
  try {
    const facultyId = parseInt(params.facultyId);
    const { month, year } = await request.json();

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Validate faculty exists
    const facultyMember = await db
      .select()
      .from(faculty)
      .where(eq(faculty.id, facultyId))
      .limit(1);

    if (facultyMember.length === 0) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    // Get salary rates for faculty
    const rates = await db
      .select()
      .from(salaryRates)
      .where(eq(salaryRates.facultyId, facultyId))
      .limit(1);

    if (rates.length === 0) {
      return NextResponse.json(
        { error: 'Salary rates not configured for this faculty' },
        { status: 400 }
      );
    }

    const rate = rates[0];

    // Calculate workload for the specified month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const workload = await db
      .select({
        classType: timetable.classType,
        isExtraClass: timetable.isExtraClass,
        isMakeupClass: timetable.isMakeupClass,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
      })
      .from(timetable)
      .where(
        and(
          eq(timetable.facultyId, facultyId),
          sql`date(${timetable.createdAt}) >= date(${startDate.toISOString()})`,
          sql`date(${timetable.createdAt}) <= date(${endDate.toISOString()})`
        )
      );

    // Calculate hours and counts
    let totalLectures = 0;
    let totalPracticals = 0;
    let totalTutorials = 0;
    let extraClasses = 0;
    let makeupClasses = 0;
    let totalHours = 0;

    for (const entry of workload) {
      // Calculate duration
      const [startHour, startMin] = entry.startTime.split(':').map(Number);
      const [endHour, endMin] = entry.endTime.split(':').map(Number);
      const duration = (endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;
      
      totalHours += duration;

      if (entry.isExtraClass) extraClasses++;
      if (entry.isMakeupClass) makeupClasses++;

      switch (entry.classType.toLowerCase()) {
        case 'lecture':
          totalLectures++;
          break;
        case 'practical':
          totalPracticals++;
          break;
        case 'tutorial':
          totalTutorials++;
          break;
      }
    }

    // Calculate salary components
    const lectureSalary = totalLectures * rate.lectureRatePerHour;
    const practicalSalary = totalPracticals * rate.practicalRatePerHour;
    const tutorialSalary = totalTutorials * rate.tutorialRatePerHour;
    
    const baseSalary = lectureSalary + practicalSalary + tutorialSalary;
    const extraClassBonus = extraClasses * rate.extraClassBonus;
    const makeupClassBonus = makeupClasses * rate.makeupClassBonus;
    
    const grossSalary = baseSalary + extraClassBonus + makeupClassBonus;
    
    // Apply 5% PF deduction
    const deductions = Math.round(grossSalary * 0.05);
    const netSalary = grossSalary - deductions;

    const now = new Date().toISOString();

    // Check if salary slip already exists
    const existing = await db
      .select()
      .from(salarySlips)
      .where(
        and(
          eq(salarySlips.facultyId, facultyId),
          eq(salarySlips.month, month),
          eq(salarySlips.year, year)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing slip
      await db
        .update(salarySlips)
        .set({
          totalLectures,
          totalPracticals,
          totalTutorials,
          totalHours,
          hourlyRateLecture: rate.lectureRatePerHour,
          hourlyRatePractical: rate.practicalRatePerHour,
          hourlyRateTutorial: rate.tutorialRatePerHour,
          baseSalary,
          extraClassBonus,
          makeupClassBonus,
          grossSalary,
          deductions,
          netSalary,
          generatedAt: now,
        })
        .where(eq(salarySlips.id, existing[0].id));

      const updated = await db
        .select()
        .from(salarySlips)
        .where(eq(salarySlips.id, existing[0].id))
        .limit(1);

      return NextResponse.json({
        message: 'Salary slip updated successfully',
        slip: updated[0],
      });
    } else {
      // Create new slip
      const newSlip = await db
        .insert(salarySlips)
        .values({
          facultyId,
          month,
          year,
          totalLectures,
          totalPracticals,
          totalTutorials,
          totalHours,
          hourlyRateLecture: rate.lectureRatePerHour,
          hourlyRatePractical: rate.practicalRatePerHour,
          hourlyRateTutorial: rate.tutorialRatePerHour,
          baseSalary,
          extraClassBonus,
          makeupClassBonus,
          grossSalary,
          deductions,
          netSalary,
          generatedAt: now,
          createdAt: now,
        })
        .returning();

      return NextResponse.json({
        message: 'Salary slip generated successfully',
        slip: newSlip[0],
      });
    }
  } catch (error) {
    console.error('Error generating salary slip:', error);
    return NextResponse.json(
      { error: 'Failed to generate salary slip' },
      { status: 500 }
    );
  }
}
